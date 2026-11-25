const fs = require("fs/promises");
const pool = require("../config/db");
const { verifyAttendanceFace } = require("../services/faceRecognitionService");
const {
  uploadToStorage,
  deleteFromStorage,
} = require("../services/storageService");
const {
  processLateCompensation,
} = require("../services/lateCompensationService");

const MAX_OFFLINE_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

const ALLOWED_TYPES = [
  "OFFICE",
  "WFH",
  "CLIENT",
  "MEETING",
  "BUSINESS_TRIP",
  "OTHER",
];

function parseOccurredAt(value) {
  if (typeof value !== "string" || !/(Z|[+-]\d{2}:\d{2})$/i.test(value)) {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

// Attendance menyimpan timestamp Jakarta tanpa timezone.
function toJakartaTimestamp(date) {
  return new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
}

async function removeTempFile(file) {
  if (!file?.path) return;

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("OFFLINE TEMP CLEANUP:", error);
    }
  }
}

async function uploadSelfie(file) {
  const buffer = await fs.readFile(file.path);

  return uploadToStorage(
    {
      buffer,
      originalname:
        file.originalname || file.filename || "offline-attendance.jpg",
      mimetype: file.mimetype || "image/jpeg",
    },
    "attendance",
  );
}

function validateCoordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lng = Number(longitude);

  return {
    lat,
    lng,
    valid:
      latitude !== undefined &&
      longitude !== undefined &&
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180,
  };
}

exports.syncOffline = async (req, res) => {
  const userId = Number(req.user.id);

  const {
    transaction_id: transactionId,
    action,
    occurred_at: occurredAtRaw,
    latitude,
    longitude,
    is_mock_location: isMockLocation,
    attendance_type: attendanceType = "OFFICE",
    notes = "",
  } = req.body;

  let client;
  let uploadedPhotoKey = null;
  let photoCommitted = false;

  try {
    // Validasi fake GPS
    if (String(isMockLocation).toLowerCase() === "true") {
      return res.status(403).json({
        success: false,
        code: "MOCK_LOCATION_DETECTED",
        message: "Fake GPS terdeteksi. Absensi offline ditolak.",
      });
    }

    // Validasi UUID transaksi
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        String(transactionId || ""),
      )
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_TRANSACTION_ID",
        message: "ID transaksi offline tidak valid.",
      });
    }

    // Validasi action
    const normalizedAction = String(action || "").toUpperCase();

    if (!["CHECK_IN", "CHECK_OUT"].includes(normalizedAction)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ACTION",
        message: "Jenis absensi offline tidak valid.",
      });
    }

    // Validasi tipe absensi
    const normalizedType = String(attendanceType).toUpperCase();

    if (!ALLOWED_TYPES.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        code: "INVALID_ATTENDANCE_TYPE",
        message: "Tipe absensi tidak valid.",
      });
    }

    // Validasi waktu
    const occurredAt = parseOccurredAt(occurredAtRaw);

    if (!occurredAt) {
      return res.status(400).json({
        success: false,
        code: "INVALID_OCCURRED_AT",
        message:
          "Waktu absensi harus menggunakan ISO timestamp dengan zona waktu.",
      });
    }

    // Validasi koordinat
    const {
      lat,
      lng,
      valid: validCoordinates,
    } = validateCoordinates(latitude, longitude);

    if (!validCoordinates) {
      return res.status(400).json({
        success: false,
        code: "INVALID_COORDINATES",
        message: "Koordinat GPS tidak valid.",
      });
    }

    // Validasi foto
    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        code: "PHOTO_REQUIRED",
        message: "Foto selfie wajib disertakan untuk sinkronisasi.",
      });
    }

    const now = Date.now();
    const ageMs = now - occurredAt.getTime();

    const jakartaOccurredAt = toJakartaTimestamp(occurredAt);
    const attendanceDate = jakartaOccurredAt.slice(0, 10);

    // Lebih dari 24 jam atau waktu terlalu jauh ke masa depan.
    const needsReview =
      ageMs > MAX_OFFLINE_AGE_MS || ageMs < -MAX_FUTURE_SKEW_MS;

    // Face Recognition tetap wajib.
    const faceResult = await verifyAttendanceFace(userId, req.file.path);

    if (!faceResult?.matched) {
      return res.status(403).json({
        success: false,
        code: "FACE_NOT_MATCHED",
        message: "Wajah tidak cocok. Transaksi offline belum disinkronkan.",
      });
    }

    // Upload foto ke storage.
    uploadedPhotoKey = await uploadSelfie(req.file);

    client = await pool.connect();

    await client.query("BEGIN");

    // Idempotency: satu UUID hanya boleh diproses sekali per user.
    await client.query(
      `
      INSERT INTO attendance_offline_sync
        (
          user_id,
          transaction_id,
          action,
          sync_status
        )
      VALUES ($1, $2::uuid, $3, 'PROCESSING')
      ON CONFLICT (user_id, transaction_id)
      DO NOTHING
      `,
      [userId, transactionId, normalizedAction],
    );

    const syncRow = await client.query(
      `
      SELECT *
      FROM attendance_offline_sync
      WHERE user_id = $1
        AND transaction_id = $2::uuid
      FOR UPDATE
      `,
      [userId, transactionId],
    );

    const previous = syncRow.rows[0];

    if (previous.action !== normalizedAction) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        code: "TRANSACTION_ID_CONFLICT",
        message: "ID transaksi sudah digunakan untuk jenis absensi berbeda.",
      });
    }

    // Kalau sudah pernah berhasil atau masuk review, jangan proses ulang.
    if (
      previous.sync_status === "SYNCED" ||
      previous.sync_status === "NEEDS_REVIEW"
    ) {
      await client.query("COMMIT");

      return res.status(previous.sync_status === "SYNCED" ? 200 : 202).json(
        previous.response || {
          success: previous.sync_status === "SYNCED",
          sync_status: previous.sync_status,
          message: "Transaksi ini sudah pernah diterima server.",
        },
      );
    }

    // Transaksi di luar batas waktu masuk NEEDS_REVIEW.
    if (needsReview) {
      const response = {
        success: false,
        sync_status: "NEEDS_REVIEW",
        code: "OFFLINE_TIME_OUT_OF_RANGE",
        message:
          "Waktu absensi di luar batas sinkronisasi 24 jam atau terdeteksi waktu dari masa depan. Menunggu pemeriksaan HR.",
        transaction_id: transactionId,
        occurred_at: occurredAt.toISOString(),
      };

      await client.query(
        `
        UPDATE attendance_offline_sync
        SET
          sync_status = 'NEEDS_REVIEW',
          response = $3::jsonb,
          error_message = $4,
          updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
          AND transaction_id = $2::uuid
        `,
        [userId, transactionId, JSON.stringify(response), response.message],
      );

      await client.query("COMMIT");

      return res.status(202).json(response);
    }

    let attendanceRow;

    // =====================================================
    // CHECK IN OFFLINE
    // =====================================================
    if (normalizedAction === "CHECK_IN") {
      const existing = await client.query(
        `
        SELECT id, check_in, check_out
        FROM attendance
        WHERE user_id = $1
          AND attendance_date = $2::date
        LIMIT 1
        `,
        [userId, attendanceDate],
      );

      if (existing.rows.length) {
        const response = {
          success: false,
          sync_status: "FAILED",
          code: "ATTENDANCE_ALREADY_EXISTS",
          message: "Data absensi pada tanggal tersebut sudah tersedia.",
          attendance_id: existing.rows[0].id,
        };

        await client.query(
          `
          UPDATE attendance_offline_sync
          SET
            sync_status = 'FAILED',
            response = $3::jsonb,
            error_message = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
            AND transaction_id = $2::uuid
          `,
          [userId, transactionId, JSON.stringify(response), response.message],
        );

        await client.query("COMMIT");

        return res.status(409).json(response);
      }

      const inserted = await client.query(
        `
        WITH employee_schedule AS (
          SELECT
            whs.office_start_time,
            whs.work_days
          FROM users u

          LEFT JOIN LATERAL (
            SELECT h.working_hours_setting_id
            FROM employee_work_schedule_history h
            WHERE h.user_id = u.id
              AND h.effective_from <= $2::date
              AND (
                h.effective_until IS NULL
                OR h.effective_until >= $2::date
              )
            ORDER BY h.effective_from DESC, h.id DESC
            LIMIT 1
          ) history ON TRUE

          LEFT JOIN working_hours_settings whs
            ON whs.id = COALESCE(
              history.working_hours_setting_id,
              u.working_hours_setting_id
            )

          WHERE u.id = $1
        ),

        rule AS (
          SELECT
            office_start_time,
            work_days,

            CASE
              WHEN work_days IS NOT NULL
              THEN work_days ? TO_CHAR($2::date, 'FMDay')
              ELSE FALSE
            END AS is_working_day

          FROM employee_schedule
        )

        INSERT INTO attendance (
          user_id,
          attendance_date,
          check_in,
          check_in_lat,
          check_in_lng,
          photo_path,
          attendance_type,
          notes,
          status,
          is_late,
          late_minutes
        )

        SELECT
          $1,
          $2::date,
          $3::timestamp,
          $4,
          $5,
          $6,
          $7,
          $8,
          'Hadir',

          CASE
            WHEN $7 = 'OFFICE'
              AND rule.is_working_day
              AND rule.office_start_time IS NOT NULL
            THEN $3::timestamp::time > rule.office_start_time
            ELSE FALSE
          END,

          CASE
            WHEN $7 = 'OFFICE'
              AND rule.is_working_day
              AND rule.office_start_time IS NOT NULL
            THEN GREATEST(
              0,
              CEIL(
                EXTRACT(
                  EPOCH FROM (
                    $3::timestamp::time -
                    rule.office_start_time
                  )
                ) / 60
              )
            )::integer
            ELSE 0
          END

        FROM rule

        RETURNING
          id,
          attendance_date,
          check_in,
          is_late,
          late_minutes
        `,
        [
          userId,
          attendanceDate,
          jakartaOccurredAt,
          lat,
          lng,
          uploadedPhotoKey,
          normalizedType,
          notes,
        ],
      );

      attendanceRow = inserted.rows[0];

      if (!attendanceRow) {
        throw new Error("Gagal menyimpan absensi check-in offline.");
      }
    } else {
      // =====================================================
      // CHECK OUT OFFLINE
      // =====================================================
      const existing = await client.query(
        `
        SELECT id, attendance_type
        FROM attendance
        WHERE user_id = $1
          AND attendance_date = $2::date
          AND check_in IS NOT NULL
          AND check_out IS NULL
        FOR UPDATE
        `,
        [userId, attendanceDate],
      );

      if (!existing.rows.length) {
        const response = {
          success: false,
          sync_status: "FAILED",
          code: "CHECK_IN_NOT_FOUND",
          message:
            "Check-in untuk tanggal tersebut belum ditemukan. Sinkronkan check-in terlebih dahulu.",
        };

        await client.query(
          `
          UPDATE attendance_offline_sync
          SET
            sync_status = 'FAILED',
            response = $3::jsonb,
            error_message = $4,
            updated_at = CURRENT_TIMESTAMP
          WHERE user_id = $1
            AND transaction_id = $2::uuid
          `,
          [userId, transactionId, JSON.stringify(response), response.message],
        );

        await client.query("COMMIT");

        return res.status(409).json(response);
      }

      const attendanceId = existing.rows[0].id;

      const updated = await client.query(
        `
        UPDATE attendance
        SET
          check_out = $2::timestamp,
          check_out_lat = $3,
          check_out_lng = $4,
          check_out_photo_path = $5,
          status = 'Pulang'
        WHERE id = $1

        RETURNING
          id,
          attendance_date,
          check_in,
          check_out,
          attendance_type
        `,
        [attendanceId, jakartaOccurredAt, lat, lng, uploadedPhotoKey],
      );

      attendanceRow = updated.rows[0];

      // Pertahankan perhitungan kompensasi existing.
      if (attendanceRow.attendance_type === "OFFICE") {
        await processLateCompensation(client, attendanceId);
      }
    }

    // Simpan status sinkronisasi.
    const response = {
      success: true,
      sync_status: "SYNCED",
      message:
        normalizedAction === "CHECK_IN"
          ? "Check-in offline berhasil disinkronkan."
          : "Check-out offline berhasil disinkronkan.",
      transaction_id: transactionId,
      data: attendanceRow,
    };

    await client.query(
      `
      UPDATE attendance_offline_sync
      SET
        attendance_id = $3,
        sync_status = 'SYNCED',
        response = $4::jsonb,
        error_message = NULL,
        updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
        AND transaction_id = $2::uuid
      `,
      [userId, transactionId, attendanceRow.id, JSON.stringify(response)],
    );

    await client.query("COMMIT");

    photoCommitted = true;

    return res.json(response);
  } catch (error) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch {}
    }

    console.error("OFFLINE ATTENDANCE SYNC ERROR:", error);

    return res.status(500).json({
      success: false,
      code: error.code || "OFFLINE_SYNC_ERROR",
      message: "Sinkronisasi absensi offline gagal. Silakan coba lagi.",
    });
  } finally {
    if (client) client.release();

    if (uploadedPhotoKey && !photoCommitted) {
      try {
        await deleteFromStorage(uploadedPhotoKey);
      } catch (error) {
        console.error("OFFLINE PHOTO STORAGE CLEANUP:", error);
      }
    }

    await removeTempFile(req.file);
  }
};
