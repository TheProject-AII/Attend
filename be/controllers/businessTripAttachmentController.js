const pool = require("../config/db");
const {
  uploadToStorage,
  getPrivateFileUrl,
  deleteFromStorage,
} = require("../services/storageService");

const STORAGE_FOLDER = "business_trips";

const ALLOWED_TYPES = [
  "TRIP_REQUEST",
  "TRANSPORT_TICKET",
  "HOTEL_RECEIPT",
  "FNB_RECEIPT",
  "OTHER_RECEIPT",
  "TRIP_REPORT",
  "RETURN_PROOF",
  "OTHER",
];

async function canAccessTrip(client, tripId, userId) {
  const result = await client.query(
    `SELECT bt.id
     FROM business_trips bt
     WHERE bt.id = $1
       AND (
         bt.employee_id = $2
         OR bt.leader_id = $2
         OR EXISTS (
           SELECT 1
           FROM business_trip_approvals a
           WHERE a.business_trip_id = bt.id
             AND a.approver_id = $2
         )
         OR EXISTS (
           SELECT 1
           FROM users u
           WHERE u.id = $2
             AND u.role_id IN (1, 2, 6, 7)
             AND u.is_active = TRUE
         )
       )
     LIMIT 1`,
    [tripId, userId],
  );

  return result.rows.length > 0;
}

// =====================================================
// UPLOAD ATTACHMENTS
// =====================================================
exports.uploadAttachments = async (req, res) => {
  const userId = Number(req.user?.id);
  const tripId = Number(req.params.id);
  const files = req.files || [];
  const uploadedKeys = [];

  if (!Number.isInteger(tripId) || tripId <= 0) {
    return res.status(400).json({ message: "ID perjalanan tidak valid." });
  }

  if (!files.length) {
    return res.status(400).json({ message: "Pilih minimal satu file." });
  }

  const attachmentType = String(
    req.body.attachment_type || "OTHER",
  ).toUpperCase();

  if (!ALLOWED_TYPES.includes(attachmentType)) {
    return res.status(400).json({
      message: "Jenis lampiran tidak valid.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const tripResult = await client.query(
      `SELECT id, employee_id, status
       FROM business_trips
       WHERE id = $1
       FOR UPDATE`,
      [tripId],
    );

    if (!tripResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Perjalanan dinas tidak ditemukan.",
      });
    }

    if (!(await canAccessTrip(client, tripId, userId))) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Tidak memiliki akses ke perjalanan ini.",
      });
    }

    const settlementId = req.body.settlement_id
      ? Number(req.body.settlement_id)
      : null;

    if (settlementId !== null) {
      if (!Number.isInteger(settlementId) || settlementId <= 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "ID settlement tidak valid.",
        });
      }

      const settlementResult = await client.query(
        `SELECT id
         FROM business_trip_settlements
         WHERE id = $1
           AND business_trip_id = $2`,
        [settlementId, tripId],
      );

      if (!settlementResult.rows.length) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Settlement tidak sesuai dengan perjalanan.",
        });
      }
    }

    const insertedAttachments = [];

    for (const file of files) {
      const storageKey = await uploadToStorage(file, STORAGE_FOLDER);
      uploadedKeys.push(storageKey);

      const result = await client.query(
        `INSERT INTO business_trip_attachments (
          business_trip_id,
          settlement_id,
          attachment_type,
          original_filename,
          stored_filename,
          file_path,
          mime_type,
          file_size,
          description,
          uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING
          id,
          business_trip_id,
          settlement_id,
          attachment_type,
          original_filename,
          mime_type,
          file_size,
          description,
          uploaded_at`,
        [
          tripId,
          settlementId,
          attachmentType,
          file.originalname,
          storageKey.split("/").pop(),
          storageKey,
          file.mimetype,
          file.size,
          String(req.body.description || "").trim() || null,
          userId,
        ],
      );

      insertedAttachments.push(result.rows[0]);
    }

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Lampiran berhasil diunggah.",
      data: insertedAttachments,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    await Promise.all(
      uploadedKeys.map((key) =>
        deleteFromStorage(key).catch((storageError) =>
          console.error("Gagal membersihkan file:", storageError),
        ),
      ),
    );

    console.error("uploadAttachments:", error);

    return res.status(500).json({
      message: "Gagal mengunggah lampiran.",
      error: error.message,
    });
  } finally {
    client.release();
  }
};

// =====================================================
// LIST ATTACHMENTS
// =====================================================
exports.getAttachments = async (req, res) => {
  const userId = Number(req.user?.id);
  const tripId = Number(req.params.id);
  const client = await pool.connect();

  try {
    if (!(await canAccessTrip(client, tripId, userId))) {
      return res.status(403).json({
        message: "Tidak memiliki akses ke lampiran perjalanan ini.",
      });
    }

    const result = await client.query(
      `SELECT
  a.id,
  a.business_trip_id,
  a.settlement_id,
  a.attachment_type,
  a.original_filename,
  a.mime_type,
  a.file_size,
  a.description,
  a.uploaded_by,
  u.name AS uploaded_by_name,
  a.uploaded_at
FROM business_trip_attachments a
LEFT JOIN users u ON u.id = a.uploaded_by
WHERE a.business_trip_id = $1
ORDER BY a.uploaded_at DESC`,
      [tripId],
    );

    return res.json({
      message: "Daftar lampiran perjalanan.",
      data: result.rows,
    });
  } catch (error) {
    console.error("getAttachments:", error);
    return res.status(500).json({
      message: "Gagal mengambil lampiran.",
    });
  } finally {
    client.release();
  }
};

// =====================================================
// GET PRIVATE FILE URL
// =====================================================
exports.getAttachmentUrl = async (req, res) => {
  const userId = Number(req.user?.id);
  const attachmentId = Number(req.params.attachmentId);
  const client = await pool.connect();

  try {
    const result = await client.query(
      `SELECT
         a.id,
         a.file_path,
         a.original_filename,
         a.mime_type,
         a.business_trip_id
       FROM business_trip_attachments a
       WHERE a.id = $1`,
      [attachmentId],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Lampiran tidak ditemukan.",
      });
    }

    const attachment = result.rows[0];

    if (!(await canAccessTrip(client, attachment.business_trip_id, userId))) {
      return res.status(403).json({
        message: "Tidak memiliki akses ke file ini.",
      });
    }

    const url = await getPrivateFileUrl(attachment.file_path);

    return res.json({
      message: "URL file berhasil dibuat.",
      data: {
        url,
        filename: attachment.original_filename,
        mime_type: attachment.mime_type,
        expires_in: 300,
      },
    });
  } catch (error) {
    console.error("getAttachmentUrl:", error);
    return res.status(500).json({
      message: "Gagal membuat URL lampiran.",
    });
  } finally {
    client.release();
  }
};
