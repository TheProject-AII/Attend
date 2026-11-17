const pool = require("../config/db");

const HR_ROLE_ID = 2;
const FINANCE_ROLE_ID = 6;

const userIdOf = (req) => Number(req.user?.id);

async function checkRole(client, userId, roleId) {
  const result = await client.query(
    `SELECT id
     FROM users
     WHERE id = $1
       AND role_id = $2
       AND is_active = TRUE`,
    [userId, roleId],
  );

  return result.rows.length > 0;
}

// =====================================================
// EMPLOYEE: REQUEST CANCELLATION
// POST /:id/cancellation
// =====================================================
exports.requestCancellation = async (req, res) => {
  const employeeId = userIdOf(req);
  const tripId = Number(req.params.id);
  const reason = String(req.body.reason || "").trim();
  const client = await pool.connect();

  try {
    if (!Number.isInteger(tripId) || tripId <= 0 || !reason) {
      return res.status(400).json({
        message: "ID perjalanan dan alasan pembatalan wajib diisi.",
      });
    }

    await client.query("BEGIN");

    const tripResult = await client.query(
      `SELECT *
       FROM business_trips
       WHERE id = $1
         AND employee_id = $2
       FOR UPDATE`,
      [tripId, employeeId],
    );

    if (!tripResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Perjalanan dinas tidak ditemukan.",
      });
    }

    const trip = tripResult.rows[0];

    if (!["APPROVED", "ON_TRIP"].includes(trip.status)) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "Pembatalan hanya dapat diajukan setelah disetujui dan sebelum perjalanan dimulai.",
      });
    }

    const dateResult = await client.query(
      `SELECT CURRENT_DATE < $1::date AS before_departure`,
      [trip.departure_date],
    );

    if (!dateResult.rows[0].before_departure) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "Pembatalan hanya dapat diajukan sebelum tanggal keberangkatan.",
      });
    }

    const existing = await client.query(
      `SELECT id
       FROM business_trip_cancellations
       WHERE business_trip_id = $1`,
      [tripId],
    );

    if (existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        message:
          "Pengajuan pembatalan untuk perjalanan ini sudah pernah dibuat.",
      });
    }

    const disbursementResult = await client.query(
      `SELECT id, disbursement_amount, status
       FROM business_trip_disbursements
       WHERE business_trip_id = $1
       FOR UPDATE`,
      [tripId],
    );

    if (
      disbursementResult.rows.length &&
      disbursementResult.rows[0].status !== "PAID"
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message:
          "Status pencairan belum final. Silakan koordinasikan dengan Finance.",
      });
    }

    const disbursement = disbursementResult.rows[0] || null;
    const refundRequired = Boolean(disbursement);
    const refundAmount = refundRequired
      ? Number(disbursement.disbursement_amount)
      : 0;

    const hrResult = await client.query(
      `SELECT id
       FROM users
       WHERE role_id = $1
         AND is_active = TRUE
       ORDER BY id ASC
       LIMIT 1`,
      [HR_ROLE_ID],
    );

    if (!hrResult.rows.length) {
      throw new Error("Akun HR aktif tidak ditemukan.");
    }

    if (!trip.leader_id) {
      throw new Error("Atasan langsung karyawan belum ditentukan.");
    }

    const inserted = await client.query(
      `INSERT INTO business_trip_cancellations (
        business_trip_id,
        employee_id,
        cancellation_reason,
        refund_required,
        refund_amount,
        manager_id,
        hr_id,
        finance_status,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'PENDING_MANAGER')
      RETURNING *`,
      [
        tripId,
        employeeId,
        reason,
        refundRequired,
        refundAmount,
        trip.leader_id,
        hrResult.rows[0].id,
        refundRequired ? "PENDING" : "NOT_REQUIRED",
      ],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      message: "Pengajuan pembatalan berhasil dikirim ke Manager/SPV.",
      data: inserted.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("requestCancellation:", error);
    return res.status(400).json({ message: error.message });
  } finally {
    client.release();
  }
};

// =====================================================
// MANAGER: QUEUE
// GET /cancellations/manager
// =====================================================
exports.getManagerQueue = async (req, res) => {
  const userId = userIdOf(req);
  const result = await pool.query(
    `SELECT c.*, bt.trip_number, bt.employee_name,
            bt.destination, bt.departure_date, bt.return_date
     FROM business_trip_cancellations c
     JOIN business_trips bt ON bt.id = c.business_trip_id
     WHERE c.manager_id = $1
       AND c.status = 'PENDING_MANAGER'
     ORDER BY c.created_at ASC`,
    [userId],
  );

  return res.json({ data: result.rows });
};

// =====================================================
// MANAGER: ACTION
// POST /cancellations/:id/manager-action
// =====================================================
exports.managerAction = async (req, res) => {
  const userId = userIdOf(req);
  const cancellationId = Number(req.params.id);
  const action = String(req.body.action || "").toUpperCase();
  const comments = String(req.body.comments || "").trim();
  const client = await pool.connect();

  try {
    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ message: "Aksi tidak valid." });
    }

    await client.query("BEGIN");

    const result = await client.query(
      `SELECT *
       FROM business_trip_cancellations
       WHERE id = $1
       FOR UPDATE`,
      [cancellationId],
    );

    if (
      !result.rows.length ||
      Number(result.rows[0].manager_id) !== userId ||
      result.rows[0].status !== "PENDING_MANAGER"
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Pengajuan tidak ditemukan atau bukan wewenang Anda.",
      });
    }

    const status = action === "APPROVE" ? "PENDING_HR" : "REJECTED";

    await client.query(
      `UPDATE business_trip_cancellations
       SET manager_status = $2,
           manager_comments = $3,
           manager_action_at = NOW(),
           status = $4,
           updated_at = NOW()
       WHERE id = $1`,
      [
        cancellationId,
        action === "APPROVE" ? "APPROVED" : "REJECTED",
        comments || null,
        status,
      ],
    );

    await client.query("COMMIT");

    return res.json({
      message:
        action === "APPROVE"
          ? "Pembatalan diteruskan ke HR."
          : "Pengajuan pembatalan ditolak Manager/SPV.",
      status,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("managerAction:", error);
    return res.status(500).json({ message: "Gagal memproses pembatalan." });
  } finally {
    client.release();
  }
};

// =====================================================
// HR: QUEUE
// GET /cancellations/hr
// =====================================================
exports.getHRQueue = async (req, res) => {
  const userId = userIdOf(req);
  const client = await pool.connect();

  try {
    if (!(await checkRole(client, userId, HR_ROLE_ID))) {
      return res.status(403).json({ message: "Akses hanya untuk HR." });
    }

    const result = await client.query(
      `SELECT c.*, bt.trip_number, bt.employee_name,
              bt.destination, bt.departure_date, bt.return_date
       FROM business_trip_cancellations c
       JOIN business_trips bt ON bt.id = c.business_trip_id
       WHERE c.hr_id = $1
         AND c.status = 'PENDING_HR'
       ORDER BY c.created_at ASC`,
      [userId],
    );

    return res.json({ data: result.rows });
  } catch (error) {
    console.error("getHRQueue:", error);
    return res.status(403).json({ message: error.message });
  } finally {
    client.release();
  }
};

// =====================================================
// HR: ACTION
// POST /cancellations/:id/hr-action
// =====================================================
exports.hrAction = async (req, res) => {
  const userId = userIdOf(req);
  const cancellationId = Number(req.params.id);
  const action = String(req.body.action || "").toUpperCase();
  const comments = String(req.body.comments || "").trim();
  const client = await pool.connect();

  try {
    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({ message: "Aksi tidak valid." });
    }

    await client.query("BEGIN");

    if (!(await checkRole(client, userId, HR_ROLE_ID))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Akses hanya untuk HR." });
    }

    const result = await client.query(
      `SELECT c.*, bt.id AS trip_id
       FROM business_trip_cancellations c
       JOIN business_trips bt ON bt.id = c.business_trip_id
       WHERE c.id = $1
       FOR UPDATE OF c, bt`,
      [cancellationId],
    );

    if (
      !result.rows.length ||
      Number(result.rows[0].hr_id) !== userId ||
      result.rows[0].status !== "PENDING_HR"
    ) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        message: "Pengajuan tidak ditemukan atau bukan wewenang Anda.",
      });
    }

    const cancellation = result.rows[0];

    if (action === "REJECT") {
      await client.query(
        `UPDATE business_trip_cancellations
         SET hr_status = 'REJECTED',
             hr_comments = $2,
             hr_action_at = NOW(),
             status = 'REJECTED',
             updated_at = NOW()
         WHERE id = $1`,
        [cancellationId, comments || null],
      );
    } else {
      const nextStatus = cancellation.refund_required
        ? "PENDING_REFUND"
        : "CANCELLED";

      await client.query(
        `UPDATE business_trip_cancellations
         SET hr_status = 'APPROVED',
             hr_comments = $2,
             hr_action_at = NOW(),
             status = $3,
             updated_at = NOW()
         WHERE id = $1`,
        [cancellationId, comments || null, nextStatus],
      );

      if (!cancellation.refund_required) {
        await client.query(
          `UPDATE business_trips
           SET status = 'CANCELLED',
               current_approver_id = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [cancellation.trip_id],
        );
      }
    }

    await client.query("COMMIT");

    return res.json({
      message:
        action === "REJECT"
          ? "Pembatalan ditolak HR."
          : cancellation.refund_required
            ? "Disetujui HR. Menunggu Finance mencatat pengembalian dana."
            : "Pembatalan disetujui HR dan perjalanan dibatalkan.",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("hrAction:", error);
    return res.status(500).json({ message: "Gagal memproses pembatalan." });
  } finally {
    client.release();
  }
};

// =====================================================
// FINANCE: REFUND QUEUE
// GET /cancellations/finance
// =====================================================
exports.getFinanceQueue = async (req, res) => {
  const userId = userIdOf(req);
  const client = await pool.connect();

  try {
    if (!(await checkRole(client, userId, FINANCE_ROLE_ID))) {
      return res.status(403).json({ message: "Akses hanya untuk Finance." });
    }

    const result = await client.query(
      `SELECT c.*, bt.trip_number, bt.employee_name,
              bt.destination, bt.departure_date, bt.return_date
       FROM business_trip_cancellations c
       JOIN business_trips bt ON bt.id = c.business_trip_id
       WHERE c.status = 'PENDING_REFUND'
         AND c.finance_status = 'PENDING'
       ORDER BY c.created_at ASC`,
    );

    return res.json({ data: result.rows });
  } catch (error) {
    console.error("getFinanceQueue:", error);
    return res.status(403).json({ message: error.message });
  } finally {
    client.release();
  }
};

// =====================================================
// FINANCE: CONFIRM REFUND
// POST /cancellations/:id/refund
// =====================================================
exports.confirmRefund = async (req, res) => {
  const userId = userIdOf(req);
  const cancellationId = Number(req.params.id);
  const reference = String(req.body.reference || "").trim();
  const notes = String(req.body.notes || "").trim();
  const client = await pool.connect();

  try {
    if (!reference) {
      return res.status(400).json({
        message: "Nomor referensi pengembalian dana wajib diisi.",
      });
    }

    await client.query("BEGIN");

    if (!(await checkRole(client, userId, FINANCE_ROLE_ID))) {
      await client.query("ROLLBACK");
      return res.status(403).json({ message: "Akses hanya untuk Finance." });
    }

    const result = await client.query(
      `SELECT c.*, bt.id AS trip_id
       FROM business_trip_cancellations c
       JOIN business_trips bt ON bt.id = c.business_trip_id
       WHERE c.id = $1
       FOR UPDATE OF c, bt`,
      [cancellationId],
    );

    if (
      !result.rows.length ||
      result.rows[0].status !== "PENDING_REFUND" ||
      result.rows[0].finance_status !== "PENDING"
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Pembatalan ini belum menunggu pengembalian dana.",
      });
    }

    const cancellation = result.rows[0];
    const amount = Number(cancellation.refund_amount);

    await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [
      cancellation.employee_id,
    ]);

    const balanceResult = await client.query(
      `SELECT COALESCE(
         SUM(
           CASE
             WHEN direction = 'INCREASE' THEN amount
             WHEN direction = 'DECREASE' THEN -amount
             ELSE 0
           END
         ), 0
       ) AS current_balance
       FROM business_trip_balance_ledger
       WHERE employee_id = $1`,
      [cancellation.employee_id],
    );

    const currentBalance = Number(balanceResult.rows[0].current_balance);
    const afterCharge = currentBalance + amount;

    // Catat kewajiban pengembalian dana untuk audit.
    await client.query(
      `INSERT INTO business_trip_balance_ledger (
         employee_id, business_trip_id, entry_type,
         direction, amount, balance_after, description,
         reference_number, processed_by, transaction_date
       )
       VALUES ($1, $2, 'UNUSED_FUNDS', 'INCREASE',
               $3, $4, $5, $6, $7, CURRENT_DATE)`,
      [
        cancellation.employee_id,
        cancellation.business_trip_id,
        amount,
        afterCharge,
        "Kewajiban pengembalian dana pembatalan perjalanan dinas",
        reference,
        userId,
      ],
    );

    // Catat pembayaran kembali yang telah diverifikasi Finance.
    await client.query(
      `INSERT INTO business_trip_balance_ledger (
         employee_id, business_trip_id, entry_type,
         direction, amount, balance_after, description,
         reference_number, processed_by, transaction_date
       )
       VALUES ($1, $2, 'EMPLOYEE_PAYMENT', 'DECREASE',
               $3, $4, $5, $6, $7, CURRENT_DATE)`,
      [
        cancellation.employee_id,
        cancellation.business_trip_id,
        amount,
        currentBalance,
        "Pengembalian dana pembatalan perjalanan dinas telah diterima",
        reference,
        userId,
      ],
    );

    await client.query(
      `UPDATE business_trip_cancellations
       SET finance_status = 'PAID',
           refund_reference = $2,
           refund_payment_date = CURRENT_DATE,
           refund_notes = $3,
           refund_processed_by = $4,
           refund_processed_at = NOW(),
           status = 'CANCELLED',
           updated_at = NOW()
       WHERE id = $1`,
      [cancellationId, reference, notes || null, userId],
    );

    await client.query(
      `UPDATE business_trips
       SET status = 'CANCELLED',
           current_approver_id = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [cancellation.trip_id],
    );

    await client.query("COMMIT");

    return res.json({
      message: "Pengembalian dana dicatat. Perjalanan berhasil dibatalkan.",
      data: {
        refund_amount: amount,
        outstanding_balance: currentBalance,
        status: "CANCELLED",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("confirmRefund:", error);
    return res.status(500).json({
      message: error.message || "Gagal mencatat pengembalian dana.",
    });
  } finally {
    client.release();
  }
};
