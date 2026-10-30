const pool = require("../config/db");
const fs = require("fs");
const {
  uploadToStorage,
  deleteFromStorage,
  getPrivateFileUrl,
} = require("../services/storageService");

exports.create = async (req, res) => {
  let uploadedAttachment = null;
  let requestInserted = false;

  try {
    const userId = req.user.id;

    const {
      leave_type,
      leave_category,
      start_date,
      end_date,
      start_time,
      end_time,
      reason,
    } = req.body;

    // VALIDATION
    if (!leave_type || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        message: "Data belum lengkap.",
      });
    }

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

      const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

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

    const today = new Date().toISOString().split("T")[0];

    if (start_date < today) {
      return res.status(400).json({
        success: false,
        message: "Tanggal pengajuan tidak boleh sebelum hari ini.",
      });
    }

    if (end_date < start_date) {
      return res.status(400).json({
        success: false,
        message: "Tanggal selesai tidak valid.",
      });
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

    // UPLOAD ATTACHMENT TO NEON STORAGE
    if (req.file) {
      uploadedAttachment = await uploadToStorage(req.file, "leave");
    }

    // INSERT LEAVE REQUEST
    const leaveResult = await pool.query(
      `
      INSERT INTO leave_requests
      (
        user_id,
        leave_type,
        leave_category,
        start_date,
        end_date,
        reason,
        attachment,
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id
      `,
      [
        userId,
        leave_type,
        leave_type === "CUTI" ? leave_category : null,
        start_date,
        end_date,
        reason,
        uploadedAttachment,
        "PENDING_SUPERVISOR",
      ],
    );

    requestInserted = true;

    // GET EMPLOYEE AND SUPERVISOR
    const employee = await pool.query(
      `
      SELECT name, supervisor_id
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    const supervisor = employee.rows[0];

    if (supervisor?.supervisor_id) {
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
          supervisor.supervisor_id,
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
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
    id,
    leave_type,
    leave_category,
    start_date,
    end_date,
    reason,
    attachment,
    status,
    approval_note,
    created_at,

    'LEAVE' AS request_type,

    NULL::timestamp AS old_check_in,
    NULL::timestamp AS new_check_in,
    NULL::timestamp AS old_check_out,
    NULL::timestamp AS new_check_out

FROM leave_requests

WHERE user_id = $1


            UNION ALL


        SELECT
    aer.id,

    'PERUBAHAN ABSENSI' AS leave_type,

    NULL::varchar(50) AS leave_category,

    a.attendance_date AS start_date,
    a.attendance_date AS end_date,

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

        COALESCE(
    SUM(
        CASE
            WHEN leave_type = 'CUTI'
             AND status = 'APPROVED'
             AND (
                 leave_category = 'TAHUNAN'
                 OR leave_category IS NULL
             )
            THEN (
                end_date - start_date + 1
            )
            ELSE 0
        END
    ),
    0
)::int AS cuti_taken_days,

        COALESCE(
            SUM(
                CASE
                 WHEN leave_type = 'SAKIT'
 AND status = 'APPROVED'
 AND deduct_leave = true
THEN (
    end_date - start_date + 1
)
                    ELSE 0
                END
            ),
            0
        )::int AS sick_deduction_days,

        COALESCE(
            SUM(
                CASE
                    WHEN leave_type = 'CUTI'
                     AND leave_category IN (
                         'MENIKAH',
                         'MELAHIRKAN',
                         'KELUARGA_MENINGGAL'
                     )
                     AND status = 'APPROVED'
                    THEN (
                        end_date - start_date + 1
                    )
                    ELSE 0
                END
            ),
            0
        )::int AS special_leave_days

    FROM leave_requests

    WHERE user_id = $1
    `,
      [userId],
    );
    const leaveSummary = summaryResult.rows[0] || {};
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

        return {
          ...item,
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
