const pool = require("../config/db");
const fs = require("fs");
const {
  uploadToStorage,
  deleteFromStorage,
  getPrivateFileUrl,
} = require("../services/storageService");
const countWorkingDays = require("../utils/countWorkingDays");
// GET ACTIVE LEAVE TYPES
exports.getTypes = async (req, res) => {
  try {
    const result = await pool.query(
      `
  SELECT
    lt.id,
    lt.name,
    lt.category,
    lt.entitlement_days,
    lt.is_paid,
    lt.deduct_annual_balance,
    lt.requires_approval,
    lt.requires_document,
    whs.work_days
  FROM leave_types lt
  CROSS JOIN users u
  LEFT JOIN working_hours_settings whs
    ON whs.id = u.working_hours_setting_id
   AND whs.is_active = TRUE
  WHERE u.id = $1
    AND lt.is_active = TRUE
  ORDER BY
    CASE lt.category
      WHEN 'ANNUAL' THEN 1
      WHEN 'SPECIAL' THEN 2
      WHEN 'OTHER' THEN 3
      ELSE 4
    END,
    lt.id ASC
  `,
      [req.user.id],
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("GET LEAVE TYPES ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil jenis cuti.",
    });
  }
};

exports.create = async (req, res) => {
  let uploadedAttachment = null;
  let requestInserted = false;

  try {
    const userId = req.user.id;
    const {
      leave_type,
      leave_category,
      leave_type_id,
      start_date,
      end_date,
      start_time,
      end_time,
      reason,
    } = req.body;
    // VALIDASI KELENGKAPAN DATA
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Data belum lengkap.",
      });
    }
    // VALIDATION
    // GET EMPLOYEE WORK SCHEDULE
    const scheduleResult = await pool.query(
      `
  SELECT whs.work_days
  FROM users u
  JOIN working_hours_settings whs
    ON whs.id = u.working_hours_setting_id
  WHERE u.id = $1
    AND whs.is_active = TRUE
  `,
      [userId],
    );

    if (!scheduleResult.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Pengaturan hari kerja karyawan belum tersedia.",
      });
    }

    const workDays = scheduleResult.rows[0].work_days;

    const leaveDays = countWorkingDays(start_date, end_date, workDays);

    if (leaveDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Tanggal pengajuan tidak mencakup hari kerja.",
      });
    }

    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

    // PERMISSION
    if (leave_type === "IZIN") {
      if (!start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: "Jam mulai dan selesai izin wajib diisi.",
        });
      }

      if (start_date !== end_date) {
        return res.status(400).json({
          success: false,
          message: "Permission hanya berlaku untuk satu hari.",
        });
      }

      if (
        !timePattern.test(start_time) ||
        !timePattern.test(end_time) ||
        start_time >= end_time
      ) {
        return res.status(400).json({
          success: false,
          message: "Rentang jam permission tidak valid.",
        });
      }
    }

    // EARLY CHECKOUT PERMISSION
    if (leave_type === "IZIN_PULANG_AWAL") {
      if (!start_time || !end_time) {
        return res.status(400).json({
          success: false,
          message: "Jam mulai dan selesai izin wajib diisi.",
        });
      }

      if (start_date !== end_date) {
        return res.status(400).json({
          success: false,
          message: "Izin pulang awal hanya berlaku untuk satu hari.",
        });
      }

      if (
        !timePattern.test(start_time) ||
        !timePattern.test(end_time) ||
        start_time >= end_time ||
        end_time > "17:00"
      ) {
        return res.status(400).json({
          success: false,
          message: "Rentang jam izin pulang awal tidak valid.",
        });
      }
    }

    // CHECK EXISTING REQUEST
    // CHECK EXISTING EARLY LEAVE REQUEST
    if (leave_type === "IZIN_PULANG_AWAL") {
      const exists = await pool.query(
        `
    SELECT id
    FROM leave_requests
    WHERE user_id = $1
      AND leave_type = 'IZIN_PULANG_AWAL'
      AND status = 'APPROVED'
      AND start_date = $2
      AND end_date = $2
      AND start_time < $4::time
      AND end_time > $3::time
    LIMIT 1;
    `,
        [userId, start_date, start_time, end_time],
      );

      if (exists.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Masih ada pengajuan pada rentang waktu tersebut.",
        });
      }
    }

    let selectedLeaveType = null;

    if (leave_type === "CUTI") {
      if (!leave_type_id) {
        return res.status(400).json({
          success: false,
          message: "Jenis cuti wajib dipilih.",
        });
      }

      const typeResult = await pool.query(
        `SELECT *
     FROM leave_types
     WHERE id = $1 AND is_active = TRUE`,
        [leave_type_id],
      );

      if (typeResult.rows.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Jenis cuti tidak ditemukan atau sudah tidak aktif.",
        });
      }

      selectedLeaveType = typeResult.rows[0];

      // =====================================
      // VALIDASI MAKSIMAL HARI CUTI KHUSUS
      // =====================================

      const entitlementDays = Number(selectedLeaveType.entitlement_days);

      if (
        selectedLeaveType.category === "SPECIAL" &&
        Number.isFinite(entitlementDays) &&
        entitlementDays > 0 &&
        leaveDays > entitlementDays
      ) {
        return res.status(400).json({
          success: false,
          code: "LEAVE_ENTITLEMENT_EXCEEDED",
          message: `Rentang tanggal yang dipilih adalah ${leaveDays} hari kerja, sedangkan ${selectedLeaveType.name} maksimal ${entitlementDays} hari kerja.`,
          data: {
            leave_days: leaveDays,
            entitlement_days: entitlementDays,
            excess_days: leaveDays - entitlementDays,
          },
        });
      }

      // =====================================
      // VALIDASI LAMPIRAN
      // =====================================

      if (selectedLeaveType.requires_document && !req.file) {
        return res.status(400).json({
          success: false,
          message: "Dokumen pendukung wajib dilampirkan.",
        });
      }
    }
    // UPLOAD ATTACHMENT TO NEON STORAGE
    if (req.file) {
      uploadedAttachment = await uploadToStorage(req.file, "leave");
    }

    // INSERT LEAVE REQUEST
    // INSERT LEAVE REQUEST
    const leaveResult = await pool.query(
      `
  INSERT INTO leave_requests
  (
    user_id,
    leave_type,
    leave_type_id,
    leave_category,
    start_date,
    end_date,
    start_time,
    end_time,
    reason,
    attachment,
    status,
    deduct_leave
  )
  VALUES (
    $1, $2, $3, $4, $5, $6,
    $7, $8, $9, $10, $11, $12
  )
  RETURNING id
  `,
      [
        userId,
        leave_type,
        selectedLeaveType?.id || null,
        selectedLeaveType?.category || null,
        start_date,
        end_date,
        ["IZIN", "IZIN_PULANG_AWAL"].includes(leave_type) ? start_time : null,
        ["IZIN", "IZIN_PULANG_AWAL"].includes(leave_type) ? end_time : null,
        reason,
        uploadedAttachment,
        "PENDING_SUPERVISOR",
        false,
      ],
    );

    requestInserted = true;

    // GET EMPLOYEE AND SUPERVISOR
    const employee = await pool.query(
      `
      SELECT name, leader_id
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    const supervisor = employee.rows[0];

    if (supervisor?.leader_id) {
      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          title,
          message,
          type,
          reference_id
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          supervisor.leader_id,
          "Pengajuan Baru",
          `${supervisor.name} mengajukan ${leave_type}.`,
          "LEAVE_PENDING",
          leaveResult.rows[0].id,
        ],
      );
    }

    return res.json({
      success: true,
      message: "Pengajuan berhasil dikirim.",
    });
  } catch (err) {
    console.error("LEAVE CREATE ERROR:", err);

    // CLEANUP STORAGE IF DATABASE INSERT FAILED
    if (uploadedAttachment && !requestInserted) {
      try {
        await deleteFromStorage(uploadedAttachment);
      } catch (storageError) {
        console.error("STORAGE CLEANUP ERROR:", storageError);
      }
    }

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.history = async (req, res) => {
  console.log("=== HISTORY CONTROLLER TERPANGGIL ===");

  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
     lr.id,
    lr.leave_type,
    lr.leave_category,
    lr.start_date,
    lr.end_date,
    whs.work_days,
    lr.reason,
    lr.attachment,
    lr.status,
    lr.approval_note,
    lr.created_at,

    'LEAVE' AS request_type,

    NULL::timestamp AS old_check_in,
    NULL::timestamp AS new_check_in,
    NULL::timestamp AS old_check_out,
    NULL::timestamp AS new_check_out

FROM leave_requests lr
JOIN users u ON u.id = lr.user_id
LEFT JOIN working_hours_settings whs
  ON whs.id = u.working_hours_setting_id
  AND whs.is_active = TRUE

WHERE lr.user_id = $1


            UNION ALL


        SELECT
    aer.id,

    'PERUBAHAN ABSENSI' AS leave_type,

    NULL::varchar(50) AS leave_category,

    a.attendance_date AS start_date,
    a.attendance_date AS end_date,
NULL::jsonb AS work_days,
    aer.reason,

    NULL::text AS attachment,

    CASE
        WHEN aer.status = 'PENDING'
            THEN 'PENDING_SUPERVISOR'
        ELSE aer.status
    END AS status,

    CASE
        WHEN aer.status = 'REJECTED'
            THEN aer.rejection_reason
        ELSE NULL
    END AS approval_note,

    aer.created_at,

    'ATTENDANCE_EDIT' AS request_type,

    aer.old_check_in,
    aer.new_check_in,
    aer.old_check_out,
    aer.new_check_out

FROM attendance_edit_requests aer

JOIN attendance a
    ON a.id = aer.attendance_id

WHERE aer.user_id = $1
            `,
      [userId],
    );

    // =========================
    // SALDO CUTI
    // =========================

    const balance = await pool.query(
      `
            SELECT leave_balance

            FROM users

            WHERE id = $1
            `,
      [userId],
    );
    const leaveBalance = Number(balance.rows[0]?.leave_balance || 0);
    const summaryResult = await pool.query(
      `
  SELECT
    lr.leave_type,
    lr.leave_category,
    lr.start_date,
    lr.end_date,
    lr.deduct_leave,
    lr.status,
    whs.work_days,
    lt.category AS master_leave_category,
    lt.deduct_annual_balance
  FROM leave_requests lr
  JOIN users u ON u.id = lr.user_id
  LEFT JOIN working_hours_settings whs
    ON whs.id = u.working_hours_setting_id
    AND whs.is_active = TRUE
  LEFT JOIN leave_types lt
    ON lt.id = lr.leave_type_id
  WHERE lr.user_id = $1
    AND lr.status = 'APPROVED'
  `,
      [userId],
    );
    const leaveSummary = {
      cuti_taken_days: 0,
      sick_deduction_days: 0,
      special_leave_days: 0,
    };

    for (const item of summaryResult.rows) {
      if (!Array.isArray(item.work_days)) continue;

      const days = countWorkingDays(
        item.start_date,
        item.end_date,
        item.work_days,
      );

      if (item.leave_type === "CUTI") {
        const isAnnual =
          item.deduct_annual_balance === true ||
          item.master_leave_category === "ANNUAL" ||
          item.leave_category === "TAHUNAN" ||
          item.leave_category === null;

        const isSpecial =
          item.master_leave_category === "SPECIAL" ||
          ["MENIKAH", "MELAHIRKAN", "KELUARGA_MENINGGAL"].includes(
            item.leave_category,
          );

        if (isAnnual) {
          leaveSummary.cuti_taken_days += days;
        } else if (isSpecial) {
          leaveSummary.special_leave_days += days;
        }
      }

      if (item.leave_type === "SAKIT" && item.deduct_leave === true) {
        leaveSummary.sick_deduction_days += days;
      }
    }
    const historyData = await Promise.all(
      result.rows.map(async (item) => {
        let attachment_url = null;

        if (item.attachment && item.attachment.startsWith("leave/")) {
          try {
            attachment_url = await getPrivateFileUrl(item.attachment);
          } catch (storageError) {
            console.error("GET LEAVE ATTACHMENT URL ERROR:", storageError);
          }
        }

        const leaveDays =
          item.request_type === "LEAVE" && Array.isArray(item.work_days)
            ? countWorkingDays(item.start_date, item.end_date, item.work_days)
            : null;

        console.log("DEBUG LEAVE HISTORY:", {
          id: item.id,
          start_date: item.start_date,
          end_date: item.end_date,
          work_days: item.work_days,
          leave_days: leaveDays,
        });

        return {
          ...item,
          leave_days: leaveDays,
          attachment_url,
        };
      }),
    );

    return res.json({
      success: true,

      summary: {
        leave_balance: leaveBalance,

        cuti_taken_days: Number(leaveSummary.cuti_taken_days || 0),

        sick_deduction_days: Number(leaveSummary.sick_deduction_days || 0),

        special_leave_days: Number(leaveSummary.special_leave_days || 0),
      },

      data: historyData,
    });
  } catch (err) {
    console.error("LEAVE HISTORY ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
