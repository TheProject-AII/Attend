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

    // Buat approval berikutnya.

    // =============================================
    // KHUSUS DIRECTOR: TERBITKAN SPD OTOMATIS
    // =============================================

    let issuedLetter = null;

    if (stage.approvalStage === "DIRECTOR") {
      const currentYear = new Date().getFullYear();

      const letterNumber = `SPD/${trip.trip_number || trip.id}/${currentYear}`;

      // Ambil identitas perusahaan berdasarkan karyawan yang mengajukan.
      const employeeCompanyResult = await client.query(
        `
        SELECT
          u.id AS employee_id,
          u.name AS employee_name,
          u.nik AS employee_nik,
          u.position AS employee_position,
          u.department AS employee_department,

          c.id AS company_id,
          c.name AS company_name,
          c.address AS company_address,
          c.phone AS company_phone,
          c.email AS company_email,
          c.logo_path AS company_logo_path

        FROM users u
        LEFT JOIN companies c
          ON c.id = u.company_id
        WHERE u.id = $1
        LIMIT 1
        `,
        [trip.employee_id],
      );

      if (!employeeCompanyResult.rowCount) {
        throw new Error("Data karyawan tidak ditemukan.");
      }

      const employeeCompany = employeeCompanyResult.rows[0];

      if (!employeeCompany.company_id) {
        throw new Error(
          "Karyawan belum terhubung dengan perusahaan. Periksa company_id.",
        );
      }

      if (!employeeCompany.company_logo_path) {
        throw new Error(
          `Logo perusahaan ${employeeCompany.company_name} belum diatur.`,
        );
      }

      const issuedAt = new Date().toISOString();

      // Snapshot seluruh data SPD ketika Direktur menyetujui.
      const letterData = {
        trip_number: trip.trip_number,

        employee_name: trip.employee_name || employeeCompany.employee_name,

        employee_nik: trip.employee_nik || employeeCompany.employee_nik,

        employee_position:
          trip.employee_position || employeeCompany.employee_position,

        employee_department:
          trip.employee_department || employeeCompany.employee_department,

        destination: trip.destination,
        purpose: trip.purpose,
        departure_date: trip.departure_date,
        return_date: trip.return_date,
        duration_days: trip.duration_days,

        issued_at: issuedAt,

        // Snapshot identitas perusahaan.
        company: {
          id: employeeCompany.company_id,
          name: employeeCompany.company_name,
          address: employeeCompany.company_address,
          phone: employeeCompany.company_phone,
          email: employeeCompany.company_email,
          logo_path: employeeCompany.company_logo_path,
        },

        // Field tambahan agar kompatibel dengan controller PDF.
        company_name: employeeCompany.company_name,
        company_address: employeeCompany.company_address,
        company_phone: employeeCompany.company_phone,
        company_email: employeeCompany.company_email,
        company_logo_path: employeeCompany.company_logo_path,
      };

      const letterResult = await client.query(
        `
        INSERT INTO business_trip_letters (
          business_trip_id,
          letter_number,
          issued_at,
          issued_by,
          letter_data,
          created_at,
          updated_at
        )
        VALUES ($1, $2, NOW(), $3, $4::jsonb, NOW(), NOW())
        ON CONFLICT (business_trip_id) DO NOTHING
        RETURNING *
        `,
        [tripId, letterNumber, userId, JSON.stringify(letterData)],
      );

      if (letterResult.rowCount) {
        issuedLetter = letterResult.rows[0];
      } else {
        const existingLetter = await client.query(
          `
          SELECT *
          FROM business_trip_letters
          WHERE business_trip_id = $1
          LIMIT 1
          `,
          [tripId],
        );

        if (!existingLetter.rowCount) {
          throw new Error("SPD gagal diterbitkan.");
        }

        issuedLetter = existingLetter.rows[0];
      }
    }

    // =============================================
    // SELESAIKAN APPROVAL SAAT INI
    // =============================================

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

    // =============================================
    // BUAT APPROVAL BERIKUTNYA
    // =============================================

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

    // =============================================
    // UPDATE STATUS PENGAJUAN
    // =============================================

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
      message:
        stage.approvalStage === "DIRECTOR"
          ? "Pengajuan disetujui. SPD berhasil diterbitkan dan diteruskan ke Finance."
          : `Pengajuan disetujui dan diteruskan ke ${stage.nextStage}.`,
      next_approver: {
        id: nextApprover.id,
        name: nextApprover.name,
        role: nextApprover.role_name,
      },
      letter: issuedLetter
        ? {
            id: issuedLetter.id,
            letter_number: issuedLetter.letter_number,
            download_url: `/api/business-trips/${tripId}/letter/pdf`,
          }
        : null,
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

// =====================================================
// GET SEMUA BUSINESS TRIP UNTUK MONITORING HR
// GET /api/business-trips/hr/all
// =====================================================
exports.getAllBusinessTripsHR = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    // Validasi akun HR
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

          latest_approval.approval_stage,
          latest_approval.approval_status,
          latest_approval.approver_name,
          latest_approval.approval_comments,
          latest_approval.action_at,

          disbursement.id AS disbursement_id,
          disbursement.disbursement_amount,
          disbursement.payment_method,
          disbursement.payment_reference,
          disbursement.payment_date,
          disbursement.disbursement_status,
          disbursement.payment_notes,
          disbursement.processed_by_name,
          disbursement.processed_at,

          letter.letter_number,

          COALESCE(approval_history.history, '[]'::json) AS approval_history

        FROM business_trips bt

        LEFT JOIN LATERAL (
          SELECT
            a.approval_stage,
            a.status AS approval_status,
            a.approver_name,
            a.comments AS approval_comments,
            a.action_at
          FROM business_trip_approvals a
          WHERE a.business_trip_id = bt.id
          ORDER BY a.approval_step DESC, a.id DESC
          LIMIT 1
        ) latest_approval ON TRUE

        LEFT JOIN LATERAL (
          SELECT
            d.id,
            d.disbursement_amount,
            d.payment_method,
            d.payment_reference,
            d.payment_date,
            d.status AS disbursement_status,
            d.notes AS payment_notes,
            u.name AS processed_by_name,
            d.processed_at
          FROM business_trip_disbursements d
          LEFT JOIN users u ON u.id = d.processed_by
          WHERE d.business_trip_id = bt.id
          ORDER BY d.id DESC
          LIMIT 1
        ) disbursement ON TRUE

        LEFT JOIN LATERAL (
          SELECT l.letter_number
          FROM business_trip_letters l
          WHERE l.business_trip_id = bt.id
          ORDER BY l.id DESC
          LIMIT 1
        ) letter ON TRUE

        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'id', h.id,
              'approval_step', h.approval_step,
              'approval_stage', h.approval_stage,
              'approver_name', h.approver_name,
              'approver_role', h.approver_role,
              'status', h.status,
              'comments', h.comments,
              'action_at', h.action_at
            )
            ORDER BY h.approval_step ASC, h.id ASC
          ) AS history
          FROM business_trip_approvals h
          WHERE h.business_trip_id = bt.id
        ) approval_history ON TRUE

        ORDER BY bt.submitted_at DESC NULLS LAST, bt.id DESC
      `,
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET ALL BUSINESS TRIPS HR ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil seluruh data Business Trip.",
    });
  }
};
