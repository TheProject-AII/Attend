const pool = require("../config/db");

const FINANCE_ROLE_ID = 6;

// =====================================================
// VALIDASI AKUN FINANCE
// =====================================================
async function getFinanceUser(client, userId) {
  const result = await client.query(
    `
    SELECT
      u.id,
      u.name,
      u.role_id,
      u.status
    FROM users u
    WHERE u.id = $1
      AND u.role_id = $2
      AND u.status = TRUE
    LIMIT 1
    `,
    [userId, FINANCE_ROLE_ID],
  );

  return result.rows[0] || null;
}

// =====================================================
// GET DAFTAR PENGAJUAN MENUNGGU PENCAIRAN
// GET /api/business-trips/approvals/finance/queue
// =====================================================
exports.getFinanceQueue = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const financeResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
        AND role_id = $2
        AND status = TRUE
      LIMIT 1
      `,
      [userId, FINANCE_ROLE_ID],
    );

    if (!financeResult.rowCount) {
      return res.status(403).json({
        success: false,
        message: "Akses hanya untuk Finance.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        bt.id,
        bt.trip_number,
        bt.employee_id,
        bt.employee_name,
        bt.employee_nik,
        bt.employee_department,
        bt.employee_position,
        bt.employee_job_level,
        bt.destination,
        bt.purpose,
        bt.departure_date,
        bt.return_date,
        bt.duration_days,
        bt.hotel_nights,
        bt.transport_estimate,
        bt.hotel_estimate,
        bt.fnb_estimate,
        bt.total_estimate,
        bt.status,
        bt.approved_at,
        bt.submitted_at,

        u.bank_name,
        u.bank_account_number,

        a.id AS approval_id,
        a.approval_step,
        a.approval_stage,
        a.status AS approval_status

      FROM business_trips bt

      INNER JOIN business_trip_approvals a
        ON a.business_trip_id = bt.id

      LEFT JOIN users u
        ON u.id = bt.employee_id

      WHERE a.approver_id = $1
        AND a.approval_stage = 'FINANCE'
        AND a.status = 'PENDING'
        AND bt.status = 'PENDING_FINANCE'
        AND bt.current_approver_id = $1

        AND NOT EXISTS (
          SELECT 1
          FROM business_trip_disbursements d
          WHERE d.business_trip_id = bt.id
        )

      ORDER BY bt.id ASC
      `,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET FINANCE QUEUE ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar pencairan Business Trip.",
    });
  }
};

// =====================================================
// GET DETAIL PENCAIRAN
// GET /api/business-trips/finance/:id
// =====================================================
exports.getFinanceDetail = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const tripId = Number(req.params.id);

    if (!Number.isSafeInteger(tripId) || tripId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Business Trip tidak valid.",
      });
    }

    const financeResult = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
        AND role_id = $2
        AND status = TRUE
      LIMIT 1
      `,
      [userId, FINANCE_ROLE_ID],
    );

    if (!financeResult.rowCount) {
      return res.status(403).json({
        success: false,
        message: "Akses hanya untuk Finance.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        bt.*,

        u.bank_name,
        u.bank_account_number,

        a.id AS approval_id,
        a.approval_stage,
        a.approval_status,
        a.approval_step

      FROM business_trips bt

      LEFT JOIN users u
        ON u.id = bt.employee_id

      INNER JOIN LATERAL (
        SELECT
          id,
          approval_stage,
          status AS approval_status,
          approval_step
        FROM business_trip_approvals
        WHERE business_trip_id = bt.id
          AND approver_id = $2
          AND approval_stage = 'FINANCE'
          AND status = 'PENDING'
        ORDER BY approval_step DESC
        LIMIT 1
      ) a ON TRUE

      WHERE bt.id = $1
        AND bt.status = 'PENDING_FINANCE'
        AND bt.current_approver_id = $2

      LIMIT 1
      `,
      [tripId, userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan atau bukan wewenang Finance.",
      });
    }

    const trip = result.rows[0];

    return res.json({
      success: true,
      data: {
        ...trip,
        disbursement_amount: Number(trip.total_estimate),
        recipient: {
          employee_id: trip.employee_id,
          name: trip.employee_name,
          bank_name: trip.bank_name,
          bank_account_number: trip.bank_account_number,
        },
      },
    });
  } catch (error) {
    console.error("GET FINANCE DETAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pencairan.",
    });
  }
};

// =====================================================
// PROCESS FULL DISBURSEMENT
// POST /api/business-trips/finance/:id/disburse
// =====================================================
exports.disburse = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = Number(req.user.id);
    const tripId = Number(req.params.id);

    const paymentMethod = String(
      req.body.payment_method || "BANK_TRANSFER",
    ).toUpperCase();

    const paymentReference =
      typeof req.body.payment_reference === "string"
        ? req.body.payment_reference.trim()
        : "";

    const notes =
      typeof req.body.notes === "string" ? req.body.notes.trim() : "";

    if (!Number.isSafeInteger(tripId) || tripId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Business Trip tidak valid.",
      });
    }

    if (!["BANK_TRANSFER", "CASH"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Metode pembayaran tidak valid.",
      });
    }

    if (paymentMethod === "BANK_TRANSFER" && !paymentReference) {
      return res.status(400).json({
        success: false,
        message: "Nomor referensi transfer wajib diisi.",
      });
    }

    await client.query("BEGIN");

    // -----------------------------------------------
    // VALIDASI FINANCE
    // -----------------------------------------------
    const finance = await getFinanceUser(client, userId);

    if (!finance) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Akses hanya untuk Finance.",
      });
    }

    // -----------------------------------------------
    // LOCK PENGAJUAN
    // -----------------------------------------------
    const tripResult = await client.query(
      `
      SELECT *
      FROM business_trips
      WHERE id = $1
      FOR UPDATE
      `,
      [tripId],
    );

    if (!tripResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Business Trip tidak ditemukan.",
      });
    }

    const trip = tripResult.rows[0];

    if (
      trip.status !== "PENDING_FINANCE" ||
      Number(trip.current_approver_id) !== userId
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Pengajuan belum siap dicairkan atau bukan wewenang Anda.",
      });
    }

    // -----------------------------------------------
    // LOCK APPROVAL FINANCE
    // -----------------------------------------------
    const approvalResult = await client.query(
      `
      SELECT *
      FROM business_trip_approvals
      WHERE business_trip_id = $1
        AND approver_id = $2
        AND approval_stage = 'FINANCE'
        AND status = 'PENDING'
      FOR UPDATE
      `,
      [tripId, userId],
    );

    if (!approvalResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Approval Finance sudah diproses atau tidak ditemukan.",
      });
    }

    const approval = approvalResult.rows[0];

    // -----------------------------------------------
    // VALIDASI NOMINAL
    // -----------------------------------------------
    const disbursementAmount = Number(trip.total_estimate);

    if (!Number.isFinite(disbursementAmount) || disbursementAmount <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Estimasi pencairan tidak valid.",
      });
    }

    // Pastikan belum ada pencairan sebelumnya.
    const existingDisbursement = await client.query(
      `
      SELECT id
      FROM business_trip_disbursements
      WHERE business_trip_id = $1
      `,
      [tripId],
    );

    if (existingDisbursement.rowCount) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Pencairan untuk pengajuan ini sudah tercatat.",
      });
    }

    // Ambil rekening penerima terbaru dari users.
    const recipientResult = await client.query(
      `
      SELECT
        id,
        name,
        bank_name,
        bank_account_number
      FROM users
      WHERE id = $1
        AND status = TRUE
      LIMIT 1
      `,
      [trip.employee_id],
    );

    if (!recipientResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Data penerima pencairan tidak ditemukan.",
      });
    }

    const recipient = recipientResult.rows[0];

    // -----------------------------------------------
    // CATAT PENCAIRAN 100%
    // -----------------------------------------------
    const disbursementResult = await client.query(
      `
      INSERT INTO business_trip_disbursements (
        business_trip_id,
        disbursement_amount,
        recipient_id,
        recipient_name,
        bank_name,
        bank_account_number,
        payment_method,
        payment_reference,
        payment_date,
        status,
        notes,
        processed_by,
        processed_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, CURRENT_DATE, 'PAID',
        $9, $10, NOW(), NOW(), NOW()
      )
      RETURNING *
      `,
      [
        tripId,
        disbursementAmount,
        recipient.id,
        recipient.name,
        recipient.bank_name,
        recipient.bank_account_number,
        paymentMethod,
        paymentReference || null,
        notes || null,
        userId,
      ],
    );

    // -----------------------------------------------
    // SELESAIKAN APPROVAL FINANCE
    // -----------------------------------------------
    await client.query(
      `
      UPDATE business_trip_approvals
      SET
        status = 'APPROVED',
        comments = $1,
        action_at = NOW(),
        updated_at = NOW()
      WHERE id = $2
      `,
      [notes || "Pencairan dana berhasil diproses.", approval.id],
    );

    // -----------------------------------------------
    // UBAH STATUS MENJADI ON_TRIP
    // -----------------------------------------------
    await client.query(
      `
      UPDATE business_trips
      SET
        status = 'ON_TRIP',
        current_approver_id = NULL,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
      `,
      [tripId],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Pencairan Business Trip berhasil dicatat.",
      data: {
        disbursement: disbursementResult.rows[0],
        trip: {
          id: trip.id,
          trip_number: trip.trip_number,
          status: "ON_TRIP",
        },
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("FINANCE ROLLBACK ERROR:", rollbackError);
    }

    console.error("BUSINESS TRIP DISBURSEMENT ERROR:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "Pencairan sudah pernah tercatat untuk pengajuan ini.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal memproses pencairan Business Trip.",
    });
  } finally {
    client.release();
  }
};
