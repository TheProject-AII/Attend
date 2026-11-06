const pool = require("../config/db");

const { getPrivateFileUrl } = require("../services/storageService");
const countWorkingDays = require("../utils/countWorkingDays");
exports.leaveRequests = async (req, res) => {
  try {
    const leaderId = Number(req.user.id);
    const status = req.query.status || "PENDING_SUPERVISOR";

    const params = [leaderId];
    let statusFilter = "";

    if (status !== "ALL") {
      params.push(status);
      statusFilter = ` AND lr.status = $2`;
    }

    const result = await pool.query(
      `
  SELECT
    lr.id,
    lr.leave_type,
    lr.leave_type_id,
    lt.name AS leave_type_name,
    lr.leave_category,
    lr.start_date,
    lr.end_date,
    lr.reason,
    lr.attachment,
    lr.status,
    lr.created_at,
    lr.approved_at,
    u.id AS employee_id,
    u.name,
    u.email,
    'LEAVE' AS request_type,
    NULL::timestamp AS old_check_in,
    NULL::timestamp AS new_check_in,
    NULL::timestamp AS old_check_out,
    NULL::timestamp AS new_check_out
  FROM leave_requests lr
  JOIN users u ON u.id = lr.user_id
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  WHERE u.leader_id = $1
  ${statusFilter}

  UNION ALL

  SELECT
    aer.id,
    'PERUBAHAN ABSENSI' AS leave_type,
    NULL::integer AS leave_type_id,
    NULL::varchar AS leave_type_name,
    NULL::varchar AS leave_category,
    a.attendance_date AS start_date,
    a.attendance_date AS end_date,
    aer.reason,
    NULL::text AS attachment,
    aer.status,
    aer.created_at,
    aer.approved_at,
    u.id AS employee_id,
    u.name,
    u.email,
    'ATTENDANCE_EDIT' AS request_type,
    aer.old_check_in,
    aer.new_check_in,
    aer.old_check_out,
    aer.new_check_out
  FROM attendance_edit_requests aer
  JOIN users u ON u.id = aer.user_id
  JOIN attendance a ON a.id = aer.attendance_id
  WHERE u.leader_id = $1
  ${status !== "ALL" ? "AND aer.status = $2" : ""}

  ORDER BY created_at DESC
  `,
      params,
    );

    const summary = await pool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE request_status = 'PENDING_SUPERVISOR'
        ) AS pending,
        COUNT(*) FILTER (
          WHERE request_status = 'APPROVED'
        ) AS approved,
        COUNT(*) FILTER (
          WHERE request_status = 'REJECTED'
        ) AS rejected,
        COUNT(*) AS total
      FROM (
        SELECT lr.status AS request_status
        FROM leave_requests lr
        JOIN users u ON u.id = lr.user_id
        WHERE u.leader_id = $1

        UNION ALL

        SELECT aer.status AS request_status
        FROM attendance_edit_requests aer
        JOIN users u ON u.id = aer.user_id
        WHERE u.leader_id = $1
      ) requests
      `,
      [leaderId],
    );

    return res.json({
      success: true,
      summary: summary.rows[0],
      data: result.rows,
    });
  } catch (err) {
    console.error("LEAVE REQUESTS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.leaveDetail = async (req, res) => {
  try {
    const { id } = req.params;

    const actorId = Number(req.user.id);
    const role = String(req.user.role || "")
      .trim()
      .toLowerCase();

    const isHR = ["hr", "admin hr"].includes(role);
    const isManager = role === "manager";

    if (!isHR && !isManager) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses.",
      });
    }

    let sql = `
  SELECT
    lr.*,
    u.id AS employee_id,
    u.name,
    u.email,
    u.department,
    u.position,
    u.photo,
    u.leave_balance,
    whs.work_days,

    lt.name AS leave_type_name,
    lt.category AS master_leave_category,
    lt.entitlement_days,
    lt.is_paid,
    lt.deduct_annual_balance,
    lt.requires_document,

    COALESCE(
      lt.deduct_annual_balance,
      CASE
        WHEN lr.leave_type = 'CUTI'
          AND (
            lr.leave_category = 'TAHUNAN'
            OR lr.leave_category IS NULL
          )
        THEN TRUE
        ELSE FALSE
      END
    ) AS should_deduct_annual

  FROM leave_requests lr
  JOIN users u ON u.id = lr.user_id
  LEFT JOIN working_hours_settings whs
  ON whs.id = u.working_hours_setting_id
  AND whs.is_active = TRUE
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  WHERE lr.id = $1
`;

    const params = [id];

    if (isManager) {
      params.push(actorId);
      sql += ` AND u.leader_id = $${params.length}`;
    }

    const result = await pool.query(sql, params);

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Data tidak ditemukan.",
      });
    }

    const data = result.rows[0];

    let attachment_url = null;

    if (data.attachment) {
      try {
        attachment_url = await getPrivateFileUrl(data.attachment);
      } catch (error) {
        console.error("GAGAL MEMBUAT URL ATTACHMENT MANAGER:", error.message);
      }
    }

    data.attachment_url = attachment_url;

    console.log("MANAGER ATTACHMENT:", {
      attachment: data.attachment,
      attachment_url: data.attachment_url,
    });
    if (!Array.isArray(data.work_days)) {
      return res.status(400).json({
        success: false,
        message: "Pengaturan hari kerja karyawan belum tersedia.",
      });
    }

    const leaveDays = countWorkingDays(
      data.start_date,
      data.end_date,
      data.work_days,
    );
    if (leaveDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Tanggal pengajuan tidak mencakup hari kerja.",
      });
    }
    const isAnnualLeave = data.should_deduct_annual === true;
    data.leave_days = leaveDays;

    data.remaining_leave = isAnnualLeave
      ? Math.max(0, data.leave_balance - leaveDays)
      : data.leave_balance;

    data.can_approve = isAnnualLeave ? data.leave_balance >= leaveDays : true;
    console.log("ATTACHMENT URL:", data.attachment_url);
    return res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("LEAVE DETAIL ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail pengajuan.",
    });
  }
};

exports.approveLeave = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { note, deduct_leave = false } = req.body;

    const actorId = Number(req.user.id);
    const role = String(req.user.role || "")
      .trim()
      .toLowerCase();

    const isHR = ["hr", "admin hr"].includes(role);
    const isManager = role === "manager";

    if (!isHR && !isManager) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses approval.",
      });
    }

    const result = await client.query(
      `
  SELECT
    lr.*,
    u.leave_balance,
    u.leader_id,
u.working_hours_setting_id,
whs.work_days,
    lt.name AS leave_type_name,
    lt.category AS master_leave_category,
    lt.deduct_annual_balance,

    COALESCE(
      lt.deduct_annual_balance,
      CASE
        WHEN lr.leave_type = 'CUTI'
          AND (
            lr.leave_category = 'TAHUNAN'
            OR lr.leave_category IS NULL
          )
        THEN TRUE
        ELSE FALSE
      END
    ) AS should_deduct_annual

  FROM leave_requests lr
  JOIN users u ON u.id = lr.user_id
  LEFT JOIN working_hours_settings whs
  ON whs.id = u.working_hours_setting_id
  AND whs.is_active = TRUE
  LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
  FOR UPDATE OF lr
  `,
      [id],
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan.",
      });
    }

    const leave = result.rows[0];

    if (isManager && Number(leave.leader_id) !== actorId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "Pengajuan ini bukan milik karyawan Anda.",
      });
    }

    if (leave.status !== "PENDING_SUPERVISOR") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Pengajuan sudah diproses.",
      });
    }

    if (!Array.isArray(leave.work_days)) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Pengaturan hari kerja karyawan belum tersedia.",
      });
    }

    const leaveDays = countWorkingDays(
      leave.start_date,
      leave.end_date,
      leave.work_days,
    );

    if (leaveDays <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Tanggal pengajuan tidak mencakup hari kerja.",
      });
    }

    const isAnnualLeave = leave.should_deduct_annual === true;

    const isSickLeaveDeducted =
      leave.leave_type === "SAKIT" && deduct_leave === true;

    const shouldDeductLeave = isAnnualLeave || isSickLeaveDeducted;

    if (shouldDeductLeave && Number(leave.leave_balance) < leaveDays) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Sisa cuti tidak mencukupi.",
      });
    }

    if (shouldDeductLeave) {
      await client.query(
        `
        UPDATE users
        SET leave_balance = leave_balance - $1
        WHERE id = $2
        `,
        [leaveDays, leave.user_id],
      );
    }

    await client.query(
      `
      UPDATE leave_requests
      SET
        status = 'APPROVED',
        approval_note = $1,
        approved_by = $2,
        approved_at = NOW(),
        deduct_leave = $3,
        updated_at = NOW()
      WHERE id = $4
      `,
      [note || null, actorId, shouldDeductLeave, id],
    );

    await client.query(
      `
      INSERT INTO notifications (
        user_id, title, message, type, reference_id
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        leave.user_id,
        "Pengajuan Disetujui",
        `Pengajuan ${leave.leave_type_name || leave.leave_type} Anda telah disetujui.`,
        "LEAVE_APPROVED",
        leave.id,
      ],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Pengajuan berhasil disetujui.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("APPROVE LEAVE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal menyetujui pengajuan.",
    });
  } finally {
    client.release();
  }
};

exports.rejectLeave = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { note } = req.body;

    const actorId = Number(req.user.id);
    const role = String(req.user.role || "")
      .trim()
      .toLowerCase();

    const isHR = ["hr", "admin hr"].includes(role);
    const isManager = role === "manager";

    if (!isHR && !isManager) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses approval.",
      });
    }

    const result = await client.query(
      `
     SELECT
  lr.*,
  u.leader_id,
  lt.name AS leave_type_name
FROM leave_requests lr
JOIN users u ON u.id = lr.user_id
LEFT JOIN leave_types lt ON lt.id = lr.leave_type_id
WHERE lr.id = $1
FOR UPDATE OF lr
      `,
      [id],
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan.",
      });
    }

    const leave = result.rows[0];

    if (isManager && Number(leave.leader_id) !== actorId) {
      await client.query("ROLLBACK");
      return res.status(403).json({
        success: false,
        message: "Pengajuan ini bukan milik karyawan Anda.",
      });
    }

    if (leave.status !== "PENDING_SUPERVISOR") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Pengajuan sudah diproses.",
      });
    }

    await client.query(
      `
      UPDATE leave_requests
      SET
        status = 'REJECTED',
        approval_note = $1,
        approved_by = $2,
        approved_at = NOW(),
        updated_at = NOW()
      WHERE id = $3
      `,
      [note || null, actorId, id],
    );

    await client.query(
      `
      INSERT INTO notifications (
        user_id, title, message, type, reference_id
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        leave.user_id,
        "Pengajuan Ditolak",
        note
          ? `Pengajuan ${leave.leave_type_name || leave.leave_type} Anda ditolak. Alasan: ${note}`
          : `Pengajuan ${leave.leave_type_name || leave.leave_type} Anda ditolak.`,
        "LEAVE_REJECTED",
        leave.id,
      ],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Pengajuan berhasil ditolak.",
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("REJECT LEAVE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal menolak pengajuan.",
    });
  } finally {
    client.release();
  }
};

exports.attendanceEditDetail = async (req, res) => {
  try {
    const { id } = req.params;
    const supervisorId = req.user.id;

    const result = await pool.query(
      `
            SELECT
                aer.id,
                aer.attendance_id,
                aer.user_id,

                aer.old_check_in,
                aer.new_check_in,

                aer.old_check_out,
                aer.new_check_out,

                aer.reason,
                aer.status,
                aer.created_at,
                aer.approved_at,
                aer.rejection_reason,

                a.attendance_date,

                u.name,
                u.email,
                u.department,
                u.position,
                u.photo

            FROM attendance_edit_requests aer

            JOIN attendance a
                ON a.id = aer.attendance_id

            JOIN users u
                ON u.id = aer.user_id

            WHERE aer.id = $1
              AND u.leader_id = $2
            `,
      [id, supervisorId],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Pengajuan perubahan absensi tidak ditemukan.",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.approveAttendanceEdit = async (req, res) => {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query("BEGIN");
    transactionStarted = true;

    const { id } = req.params;
    const { note } = req.body;
    const supervisorId = Number(req.user.id);

    const requestResult = await client.query(
      `
      SELECT
        aer.*,
        a.attendance_date,
        a.check_in,
        a.check_out,
        u.leader_id AS supervisor_id,
        u.name
      FROM attendance_edit_requests aer
      JOIN attendance a
        ON a.id = aer.attendance_id
      JOIN users u
        ON u.id = aer.user_id
      WHERE aer.id = $1
      FOR UPDATE OF aer
      `,
      [id],
    );

    if (!requestResult.rows.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan.",
      });
    }

    const request = requestResult.rows[0];

    if (Number(request.supervisor_id) !== supervisorId) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses.",
      });
    }

    if (request.status !== "PENDING_SUPERVISOR") {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(400).json({
        success: false,
        message: "Pengajuan sudah diproses.",
      });
    }

    // Kunci per karyawan.
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
      17001,
      Number(request.user_id),
    ]);

    const finalCheckIn = request.new_check_in ?? request.check_in;

    const finalCheckOut = request.new_check_out ?? request.check_out;

    // Update jam absensi.
    // PostgreSQL menghitung keterlambatan
    // berdasarkan waktu lokal yang tersimpan.
    await client.query(
      `
      UPDATE attendance
      SET
        check_in = $1,
        check_out = $2,

        is_late = CASE
          WHEN UPPER(
            COALESCE(attendance_type, 'OFFICE')
          ) = 'OFFICE'
          AND $1::timestamp IS NOT NULL
          THEN $1::timestamp::time > TIME '08:00'
          ELSE FALSE
        END,

        late_minutes = CASE
          WHEN UPPER(
            COALESCE(attendance_type, 'OFFICE')
          ) = 'OFFICE'
          AND $1::timestamp IS NOT NULL
          THEN GREATEST(
            0,
            CEIL(
              EXTRACT(
                EPOCH FROM (
                  $1::timestamp::time - TIME '08:00'
                )
              ) / 60
            )
          )::integer
          ELSE 0
        END

      WHERE id = $3
      `,
      [finalCheckIn, finalCheckOut, request.attendance_id],
    );

    await client.query(
      `
      UPDATE attendance_edit_requests
      SET
        status = 'APPROVED',
        approved_by = $1,
        approved_at = NOW(),
        rejection_reason = NULL,
        updated_at = NOW()
      WHERE id = $2
      `,
      [supervisorId, id],
    );

    // Rebuild saldo utang dan pembayaran FIFO.
    const {
      reconcileEmployeeLateCompensation,
    } = require("../services/lateCompensationService");

    const compensation = await reconcileEmployeeLateCompensation(
      client,
      request.user_id,
    );

    await client.query(
      `
      INSERT INTO notifications (
        user_id,
        title,
        message,
        type,
        reference_id
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [
        request.user_id,
        "Perubahan Absensi Disetujui",
        "Pengajuan perubahan absensi Anda telah disetujui.",
        "ATTENDANCE_EDIT_APPROVED",
        request.id,
      ],
    );

    await client.query("COMMIT");
    transactionStarted = false;

    return res.json({
      success: true,
      message: "Perubahan absensi berhasil disetujui.",
      compensation: {
        totalLateMinutes: compensation.total_late_minutes,
        totalPaidMinutes: compensation.total_paid_minutes,
        outstandingMinutes: compensation.outstanding_minutes,
      },
    });
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("APPROVE ATTENDANCE ROLLBACK:", rollbackError);
      }
    }

    console.error("APPROVE ATTENDANCE EDIT:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal menyetujui perubahan absensi.",
    });
  } finally {
    client.release();
  }
};

exports.rejectAttendanceEdit = async (req, res) => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const { id } = req.params;
    const { note } = req.body;

    const supervisorId = req.user.id;

    const result = await client.query(
      `
            SELECT
                aer.*,
                u.leader_id AS supervisor_id,
                u.name

            FROM attendance_edit_requests aer

            JOIN users u
                ON u.id = aer.user_id

            WHERE aer.id = $1

            FOR UPDATE
            `,
      [id],
    );

    if (result.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        success: false,
        message: "Pengajuan tidak ditemukan.",
      });
    }

    const request = result.rows[0];

    if (request.supervisor_id !== supervisorId) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki akses.",
      });
    }

    if (request.status !== "PENDING_SUPERVISOR") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Pengajuan sudah diproses.",
      });
    }

    await client.query(
      `
            UPDATE attendance_edit_requests
            SET
                status = 'REJECTED',
                approved_by = $1,
                approved_at = NOW(),
                rejection_reason = $2,
                updated_at = NOW()

            WHERE id = $3
            `,
      [supervisorId, note || null, id],
    );

    await client.query(
      `
            INSERT INTO notifications
            (
                user_id,
                title,
                message,
                type,
                reference_id
            )
            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5
            )
            `,
      [
        request.user_id,
        "Perubahan Absensi Ditolak",
        note
          ? `Pengajuan perubahan absensi Anda ditolak. Alasan: ${note}`
          : "Pengajuan perubahan absensi Anda ditolak.",
        "ATTENDANCE_EDIT_REJECTED",
        request.id,
      ],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Pengajuan perubahan absensi ditolak.",
    });
  } catch (err) {
    await client.query("ROLLBACK");

    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  } finally {
    client.release();
  }
};

exports.adminLeaveHistory = async (req, res) => {
  try {
    const { start_date, end_date, employee, department, status, leave_type } =
      req.query;

    let sql = `
      SELECT
        lr.id,
        lr.user_id AS employee_id,
        u.name AS employee_name,
        u.email,
        u.department,
        u.photo AS employee_photo,
        u.position,

        lr.leave_type,
        lr.leave_category,
        lr.start_date,
        lr.end_date,
        lr.reason,
        lr.attachment,
        lr.status,
        lr.approval_note,
        lr.created_at,
        lr.approved_at,
        lr.approved_by,

        approver.name AS approved_by_name

      FROM leave_requests lr

      JOIN users u
        ON u.id = lr.user_id

      LEFT JOIN users approver
        ON approver.id = lr.approved_by

      WHERE 1 = 1
    `;

    const params = [];

    if (start_date) {
      params.push(start_date);
      sql += ` AND lr.end_date >= $${params.length}`;
    }

    if (end_date) {
      params.push(end_date);
      sql += ` AND lr.start_date <= $${params.length}`;
    }

    if (employee) {
      params.push(`%${employee}%`);
      sql += ` AND u.name ILIKE $${params.length}`;
    }

    if (department) {
      params.push(department);
      sql += ` AND u.department = $${params.length}`;
    }

    if (status && status !== "ALL") {
      params.push(status);
      sql += ` AND lr.status = $${params.length}`;
    }

    if (leave_type && leave_type !== "ALL") {
      params.push(leave_type);
      sql += ` AND lr.leave_type = $${params.length}`;
    }

    sql += ` ORDER BY lr.created_at DESC`;

    const result = await pool.query(sql, params);

    // Generate private URL untuk foto setiap karyawan
    const data = await Promise.all(
      result.rows.map(async (request) => {
        let employee_photo = null;
        let attachment_url = null;

        // URL foto karyawan
        if (request.employee_photo) {
          try {
            employee_photo = await getPrivateFileUrl(request.employee_photo);
          } catch (error) {
            console.error("Gagal membuat URL foto:", error.message);
          }
        }

        // URL attachment cuti/izin
        if (request.attachment) {
          try {
            attachment_url = await getPrivateFileUrl(request.attachment);
          } catch (error) {
            console.error("Gagal membuat URL attachment:", error.message);
          }
        }

        return {
          ...request,
          employee_photo,
          attachment_url,
        };
      }),
    );
    return res.json({
      success: true,
      total: data.length,
      data,
    });
  } catch (err) {
    console.error("ADMIN LEAVE HISTORY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat cuti dan izin.",
    });
  }
};
