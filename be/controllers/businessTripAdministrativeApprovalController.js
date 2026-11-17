const pool = require("../config/db");

const ROLE_IDS = {
  HR: 2,
  DIRECTOR: 7,
};

const STAGES = {
  HR: {
    roleId: ROLE_IDS.HR,
    approvalStage: "HR",
    currentStatus: "PENDING_HR",
    nextStage: "DIRECTOR",
    nextStatus: "PENDING_DIRECTOR",
    nextRoleId: ROLE_IDS.DIRECTOR,
    nextStep: 3,
  },
  DIRECTOR: {
    roleId: ROLE_IDS.DIRECTOR,
    approvalStage: "DIRECTOR",
    currentStatus: "PENDING_DIRECTOR",
    nextStage: "FINANCE",
    nextStatus: "PENDING_FINANCE",
    nextRoleId: 6,
    nextStep: 4,
  },
};

// =====================================================
// VALIDASI USER ADMINISTRATIF
// Role diambil ulang dari database, bukan dari body.
// =====================================================
async function getAuthorizedUser(client, userId, expectedRoleId) {
  const result = await client.query(
    `
    SELECT
      u.id,
      u.name,
      u.role_id,
      u.status,
      r.name AS role_name
    FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.id = $1
      AND u.status = TRUE
    LIMIT 1
    `,
    [userId],
  );

  if (!result.rowCount) {
    return null;
  }

  const user = result.rows[0];

  if (Number(user.role_id) !== expectedRoleId) {
    return null;
  }

  return user;
}

// =====================================================
// GET DAFTAR PENDING HR
// GET /api/business-trips/approvals/hr
// =====================================================
exports.getHRApprovals = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const userResult = await pool.query(
      `
      SELECT id, role_id, status
      FROM users
      WHERE id = $1
        AND status = TRUE
      LIMIT 1
      `,
      [userId],
    );

    if (
      !userResult.rowCount ||
      Number(userResult.rows[0].role_id) !== ROLE_IDS.HR
    ) {
      return res.status(403).json({
        success: false,
        message: "Akses hanya untuk HR.",
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
        a.approver_name
      FROM business_trip_approvals a
      JOIN business_trips bt
        ON bt.id = a.business_trip_id
      WHERE a.approver_id = $1
        AND a.approval_stage = 'HR'
        AND a.status = 'PENDING'
        AND bt.status = 'PENDING_HR'
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
    console.error("GET HR APPROVALS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar approval HR.",
    });
  }
};

// =====================================================
// GET DAFTAR PENDING DIRECTOR
// GET /api/business-trips/approvals/director
// =====================================================
exports.getDirectorApprovals = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const userResult = await pool.query(
      `
      SELECT id, role_id, status
      FROM users
      WHERE id = $1
        AND status = TRUE
      LIMIT 1
      `,
      [userId],
    );

    if (
      !userResult.rowCount ||
      Number(userResult.rows[0].role_id) !== ROLE_IDS.DIRECTOR
    ) {
      return res.status(403).json({
        success: false,
        message: "Akses hanya untuk Director.",
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
        a.approver_name
      FROM business_trip_approvals a
      JOIN business_trips bt
        ON bt.id = a.business_trip_id
      WHERE a.approver_id = $1
        AND a.approval_stage = 'DIRECTOR'
        AND a.status = 'PENDING'
        AND bt.status = 'PENDING_DIRECTOR'
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
    console.error("GET DIRECTOR APPROVALS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil daftar approval Director.",
    });
  }
};

// =====================================================
// GENERIC HR / DIRECTOR ACTION
// =====================================================
async function processAdministrativeApproval(req, res, stage) {
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

    // Pastikan user benar-benar HR atau Director.
    const authorizedUser = await getAuthorizedUser(
      client,
      userId,
      stage.roleId,
    );

    if (!authorizedUser) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: `Akses hanya untuk ${stage.approvalStage}.`,
      });
    }

    // Lock pengajuan.
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
      trip.status !== stage.currentStatus ||
      Number(trip.current_approver_id) !== userId
    ) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Pengajuan bukan wewenang Anda atau sudah diproses.",
      });
    }

    // Lock approval aktif.
    const approvalResult = await client.query(
      `
      SELECT *
      FROM business_trip_approvals
      WHERE business_trip_id = $1
        AND approver_id = $2
        AND approval_stage = $3
        AND status = 'PENDING'
      FOR UPDATE
      `,
      [tripId, userId, stage.approvalStage],
    );

    if (!approvalResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Approval tidak ditemukan atau sudah diproses.",
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
        message: `Pengajuan ditolak oleh ${stage.approvalStage}.`,
      });
    }

    // -----------------------------------------------
    // APPROVE: CARI APPROVER TAHAP BERIKUTNYA
    // -----------------------------------------------
    const nextApproverResult = await client.query(
      `
      SELECT
        u.id,
        u.name,
        r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.role_id = $1
        AND u.status = TRUE
      ORDER BY u.id ASC
      LIMIT 1
      `,
      [stage.nextRoleId],
    );

    if (!nextApproverResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: `Akun ${stage.nextStage} aktif belum tersedia.`,
      });
    }

    const nextApprover = nextApproverResult.rows[0];

    // Selesaikan approval saat ini.
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

    // Buat approval berikutnya.
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
      VALUES ($1, $2, $3, $4, $5, $6, 'PENDING', NOW(), NOW())
      `,
      [
        tripId,
        stage.nextStep,
        stage.nextStage,
        nextApprover.id,
        nextApprover.name,
        nextApprover.role_name,
      ],
    );

    // Pindahkan status pengajuan.
    await client.query(
      `
      UPDATE business_trips
      SET
        status = $1,
        current_approver_id = $2,
        updated_at = NOW()
      WHERE id = $3
      `,
      [stage.nextStatus, nextApprover.id, tripId],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: `Pengajuan disetujui dan diteruskan ke ${stage.nextStage}.`,
      next_approver: {
        id: nextApprover.id,
        name: nextApprover.name,
        role: nextApprover.role_name,
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("ADMIN APPROVAL ROLLBACK ERROR:", rollbackError);
    }

    console.error(`${stage.approvalStage} ACTION ERROR:`, error);

    return res.status(500).json({
      success: false,
      message: "Gagal memproses approval Business Trip.",
    });
  } finally {
    client.release();
  }
}

// =====================================================
// HR ACTION
// =====================================================
exports.hrAction = async (req, res) => {
  return processAdministrativeApproval(req, res, STAGES.HR);
};

// =====================================================
// DIRECTOR ACTION
// =====================================================
exports.directorAction = async (req, res) => {
  return processAdministrativeApproval(req, res, STAGES.DIRECTOR);
};
