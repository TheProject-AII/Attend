const pool = require("../config/db");

// =====================================================
// GET PENDING APPROVAL MANAGER / SUPERVISOR
// GET /api/business-trips/approvals/manager
// =====================================================
exports.getManagerApprovals = async (req, res) => {
  try {
    const userId = Number(req.user.id);

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
        bt.submitted_at,
        a.id AS approval_id,
        a.approval_stage,
        a.approval_step,
        a.status AS approval_status
      FROM business_trip_approvals a
      INNER JOIN business_trips bt
        ON bt.id = a.business_trip_id
      WHERE a.approver_id = $1
        AND a.approval_stage = 'MANAGER'
        AND a.status = 'PENDING'
        AND bt.status = 'PENDING_MANAGER'
        AND bt.current_approver_id = $1
      ORDER BY bt.submitted_at ASC, bt.id ASC
      `,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET MANAGER APPROVALS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar approval.",
    });
  }
};

// =====================================================
// GET DETAIL PENGAJUAN UNTUK APPROVER
// GET /api/business-trips/approvals/:id
// =====================================================
exports.getApprovalDetail = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const tripId = Number(req.params.id);

    if (!Number.isInteger(tripId) || tripId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Business Trip tidak valid.",
      });
    }

    const result = await pool.query(
      `
      SELECT
        bt.*,
        a.id AS approval_id,
        a.approval_stage,
        a.approval_step,
        a.status AS approval_status,
        a.approver_name,
        a.approver_role
      FROM business_trip_approvals a
      INNER JOIN business_trips bt
        ON bt.id = a.business_trip_id
      WHERE bt.id = $1
        AND a.approver_id = $2
        AND a.status = 'PENDING'
        AND bt.current_approver_id = $2
      ORDER BY a.approval_step ASC
      LIMIT 1
      `,
      [tripId, userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan atau bukan wewenang Anda.",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("GET APPROVAL DETAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pengajuan.",
    });
  }
};

// =====================================================
// APPROVE / REJECT MANAGER
// POST /api/business-trips/approvals/:id/manager-action
// =====================================================
exports.managerAction = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = Number(req.user.id);
    const tripId = Number(req.params.id);

    const action = String(req.body.action || "").toUpperCase();
    const comments =
      typeof req.body.comments === "string" ? req.body.comments.trim() : "";

    if (!Number.isInteger(tripId) || tripId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID Business Trip tidak valid.",
      });
    }

    if (!["APPROVE", "REJECT"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Aksi harus APPROVE atau REJECT.",
      });
    }

    if (action === "REJECT" && !comments) {
      return res.status(400).json({
        success: false,
        message: "Alasan penolakan wajib diisi.",
      });
    }

    await client.query("BEGIN");

    // Lock pengajuan agar tidak diproses bersamaan.
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
        message: "Pengajuan Business Trip tidak ditemukan.",
      });
    }

    const trip = tripResult.rows[0];

    if (
      trip.status !== "PENDING_MANAGER" ||
      Number(trip.current_approver_id) !== userId
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Pengajuan ini bukan wewenang approval Anda.",
      });
    }

    // Lock approval yang sedang aktif.
    const approvalResult = await client.query(
      `
      SELECT *
      FROM business_trip_approvals
      WHERE business_trip_id = $1
        AND approver_id = $2
        AND approval_stage = 'MANAGER'
        AND status = 'PENDING'
      FOR UPDATE
      `,
      [tripId, userId],
    );

    if (!approvalResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Approval sudah diproses atau tidak tersedia.",
      });
    }

    const approval = approvalResult.rows[0];

    // -----------------------------------------------
    // REJECT
    // -----------------------------------------------
    if (action === "REJECT") {
      await client.query(
        `
        UPDATE business_trip_approvals
        SET
          status = 'REJECTED',
          comments = $1,
          action_at = NOW(),
          updated_at = NOW()
        WHERE id = $2
        `,
        [comments, approval.id],
      );

      await client.query(
        `
        UPDATE business_trips
        SET
          status = 'REJECTED',
          rejection_reason = $1,
          current_approver_id = NULL,
          updated_at = NOW()
        WHERE id = $2
        `,
        [comments, tripId],
      );

      await client.query("COMMIT");

      return res.json({
        success: true,
        message: "Pengajuan Business Trip berhasil ditolak.",
      });
    }

    // -----------------------------------------------
    // APPROVE MANAGER
    // Cari akun HR berdasarkan role_id = 2.
    // Bukan berdasarkan nama atau ID user tertentu.
    // -----------------------------------------------
    const hrResult = await client.query(
      `
      SELECT
        u.id,
        u.name,
        r.name AS role_name
      FROM users u
      INNER JOIN roles r
        ON r.id = u.role_id
      WHERE u.role_id = 2
        AND u.status = TRUE
      ORDER BY u.id ASC
      LIMIT 1
      `,
    );

    if (!hrResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Akun HR aktif belum tersedia.",
      });
    }

    const hr = hrResult.rows[0];

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
      [comments || null, approval.id],
    );

    // Buat tahap HR.
    await client.query(
      `
      INSERT INTO business_trip_approvals (
        business_trip_id,
        approval_step,
        approval_stage,
        approver_id,
        approver_name,
        approver_role,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, 2, 'HR', $2, $3, $4,
        'PENDING', NOW(), NOW()
      )
      `,
      [tripId, hr.id, hr.name, hr.role_name],
    );

    await client.query(
      `
      UPDATE business_trips
      SET
        status = 'PENDING_HR',
        current_approver_id = $1,
        updated_at = NOW()
      WHERE id = $2
      `,
      [hr.id, tripId],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Pengajuan disetujui dan diteruskan ke HR.",
      next_approver: {
        id: hr.id,
        name: hr.name,
        role: hr.role_name,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("APPROVAL ROLLBACK ERROR:", rollbackError);
    }

    console.error("MANAGER ACTION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memproses approval Business Trip.",
    });
  } finally {
    client.release();
  }
};
