const fs = require("fs");
const pool = require("../config/db");
const haversine = require("../utils/haversine");
// const { verifyAttendanceFace } = require("../services/faceRecognitionService");
const fsPromises = require("fs/promises");
const {
  processLateCompensation,
} = require("../services/lateCompensationService");

const {
  uploadToStorage,
  deleteFromStorage,
  getPrivateFileUrl,
} = require("../services/storageService");

async function uploadAttendanceSelfie(file) {
  if (!file?.path) {
    throw new Error("File selfie tidak ditemukan.");
  }

  const buffer = await fsPromises.readFile(file.path);

  return uploadToStorage(
    {
      buffer,
      originalname: file.originalname || file.filename || "selfie.jpg",
      mimetype: file.mimetype || "image/jpeg",
    },
    "attendance",
  );
}

async function cleanupAttendanceSelfie(file) {
  if (!file?.path) return;

  try {
    await fsPromises.unlink(file.path);
  } catch (err) {
    if (err.code !== "ENOENT") {
      console.error("Gagal menghapus selfie sementara:", err);
    }
  }
}

function validateMockLocation(req, res) {
  const isMockLocation = String(req.body.is_mock_location ?? "").toLowerCase();

  if (isMockLocation === "true") {
    res.status(403).json({
      success: false,
      code: "MOCK_LOCATION_DETECTED",
      message:
        "Fake GPS terdeteksi. Matikan aplikasi GPS palsu sebelum melakukan absensi.",
    });

    return false;
  }

  return true;
}

/*
|--------------------------------------------------------------------------
| TODAY
|--------------------------------------------------------------------------
*/

exports.today = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
          *,
          CASE
              WHEN check_in IS NOT NULL THEN
                  CONCAT(
                      EXTRACT(HOUR FROM (COALESCE(check_out, NOW()) - check_in))::int,
                      ' Jam ',
                      EXTRACT(MINUTE FROM (COALESCE(check_out, NOW()) - check_in))::int,
                      ' Menit'
                  )
              ELSE NULL
          END AS working_hours
      FROM attendance
      WHERE user_id = $1
      AND attendance_date = (now() AT TIME ZONE 'Asia/Jakarta')::date
      LIMIT 1
      `,
      [userId],
    );

    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: {
          checkIn: null,
          checkOut: null,
          status: "Belum Check In",
          workingHours: null,
        },
      });
    }

    const attendance = result.rows[0];

    return res.json({
      success: true,
      data: {
        checkIn: attendance.check_in,
        checkOut: attendance.check_out,
        status: attendance.status,
        workingHours: attendance.working_hours,
      },
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| HISTORY
|--------------------------------------------------------------------------
*/

exports.history = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
            SELECT
                a.id,
                a.attendance_date,

                a.check_in AT TIME ZONE 'Asia/Jakarta'
                    AS check_in,

                a.check_out AT TIME ZONE 'Asia/Jakarta'
                    AS check_out,

                a.status,
                a.attendance_type,
                a.notes,

                -- =========================
                -- EDIT REQUEST TERAKHIR
                -- =========================

                aer.id AS edit_request_id,

                aer.status AS edit_request_status,

                aer.reason AS edit_request_reason,

                aer.new_check_in AS edit_new_check_in,

                aer.new_check_out AS edit_new_check_out,

                aer.rejection_reason
                    AS edit_rejection_reason,

                -- =========================
                -- STATUS ABSENSI
                -- =========================

                CASE
                    WHEN
                        (
                            a.check_in
                            AT TIME ZONE 'Asia/Jakarta'
                        )::time <= TIME '08:00:00'

                    THEN 'Tepat Waktu'

                    ELSE 'Terlambat'
                END AS attendance_status,

                -- =========================
                -- MENIT TERLAMBAT
                -- =========================

                CASE
                    WHEN
                        (
                            a.check_in
                            AT TIME ZONE 'Asia/Jakarta'
                        )::time > TIME '08:00:00'

                    THEN FLOOR(
                        EXTRACT(
                            EPOCH FROM (
                                (
                                    a.check_in
                                    AT TIME ZONE 'Asia/Jakarta'
                                )::time
                                - TIME '08:00:00'
                            )
                        ) / 60
                    )::int

                    ELSE 0
                END AS late_minutes,

                -- =========================
                -- JAM KERJA
                -- =========================

                CASE
                    WHEN a.check_out IS NOT NULL

                    THEN CONCAT(
                        EXTRACT(
                            HOUR FROM
                            (a.check_out - a.check_in)
                        )::int,
                        'j ',
                        EXTRACT(
                            MINUTE FROM
                            (a.check_out - a.check_in)
                        )::int,
                        'm'
                    )

                    ELSE '-'
                END AS working_hours

            FROM attendance a

            LEFT JOIN LATERAL (
                SELECT
                    aer.*
                FROM attendance_edit_requests aer
                WHERE aer.attendance_id = a.id
                  AND aer.user_id = a.user_id
                ORDER BY aer.created_at DESC
                LIMIT 1
            ) aer ON true

            WHERE a.user_id = $1

            ORDER BY a.attendance_date DESC
            `,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
/*
|--------------------------------------------------------------------------
| CHART
|--------------------------------------------------------------------------
*/

exports.chart = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
            SELECT
                DATE(attendance_date) as date,
                status
            FROM attendance
            WHERE user_id=$1
            ORDER BY attendance_date
            `,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

/*
|--------------------------------------------------------------------------
| CHECK IN
|--------------------------------------------------------------------------
*/

exports.checkIn = async (req, res) => {
  let uploadedPhotoKey = null;
  let attendanceSaved = false;

  try {
    const userId = req.user.id;

    if (!validateMockLocation(req, res)) {
      return;
    }
    const startedAt = performance.now();

    const logDuration = (label) => {
      console.log(
        `[CHECK-IN] ${label}: ${(
          (performance.now() - startedAt) /
          1000
        ).toFixed(2)} detik`,
      );
    };

    const {
      latitude,
      longitude,
      attendance_type = "OFFICE",
      notes = "",
    } = req.body;

    const lat = Number(latitude);
    const lng = Number(longitude);
    console.log("[CHECK-IN FILE DEBUG]", {
      fileReceived: !!req.file,
      fieldname: req.file?.fieldname,
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      path: req.file?.path,
    });
    if (!req.file?.path) {
      return res.status(400).json({
        success: false,
        message: "Foto selfie wajib diambil.",
      });
    }

    if (
      latitude == null ||
      longitude == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Koordinat tidak valid.",
      });
    }

    const officeResult = await pool.query(
      `
      SELECT o.*
      FROM users u
      JOIN companies o
        ON u.company_id = o.id
      WHERE u.id = $1
      `,
      [userId],
    );

    if (!officeResult.rows.length) {
      return res.status(400).json({
        success: false,
        message: "Office location has not been set.",
      });
    }

    const office = officeResult.rows[0];

    const distance = haversine(
      lat,
      lng,
      Number(office.latitude),
      Number(office.longitude),
    );

    const normalizedType = String(attendance_type).toUpperCase();

    const allowedTypes = [
      "OFFICE",
      "WFH",
      "CLIENT",
      "MEETING",
      "BUSINESS_TRIP",
      "OTHER",
    ];

    if (!allowedTypes.includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Attendance type is not valid.",
      });
    }

    if (normalizedType === "OFFICE" && distance > Number(office.radius)) {
      return res.status(400).json({
        success: false,
        message: "You are outside the office radius.",
        distance: Math.round(distance),
        radius: office.radius,
      });
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM attendance
      WHERE user_id = $1
        AND attendance_date =
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date
      LIMIT 1
      `,
      [userId],
    );
    logDuration("Database validation complete");

    if (existing.rows.length) {
      return res.status(400).json({
        success: false,
        message: "You have already checked in today.",
      });
    }

    const uploadStart = performance.now();

    uploadedPhotoKey = await uploadAttendanceSelfie(req.file);

    console.log(
      `[CHECK-IN] Upload Neon Storage: ${(
        (performance.now() - uploadStart) /
        1000
      ).toFixed(2)} detik`,
    );

    const insertStart = performance.now();
    const result = await pool.query(
      `
  WITH jakarta_clock AS (
    SELECT
      NOW() AT TIME ZONE 'Asia/Jakarta' AS jakarta_now
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
  jakarta_now::date,
  jakarta_now,
  $2,
  $3,
  $4,
  $5::text,
  $6,
  'Hadir',
  CASE
    WHEN $5::text = 'OFFICE'
    THEN jakarta_now::time > TIME '08:00'
    ELSE FALSE
  END,
  CASE
    WHEN $5::text = 'OFFICE'
    THEN GREATEST(
      0,
      CEIL(
        EXTRACT(
          EPOCH FROM (
            jakarta_now::time - TIME '08:00'
          )
        ) / 60
      )
    )::integer
    ELSE 0
  END
FROM jakarta_clock
RETURNING
  id,
  attendance_date,
  check_in,
  is_late,
  late_minutes
  `,
      [userId, lat, lng, uploadedPhotoKey, normalizedType, notes],
    );

    attendanceSaved = true;

    console.log(
      `[CHECK-IN] Simpan Attendance: ${(
        (performance.now() - insertStart) /
        1000
      ).toFixed(2)} detik`,
    );

    logDuration("Total proses Check-In");
    return res.json({
      success: true,
      message: "Check In berhasil.",
      office: office.companies_name,
      distance: Math.round(distance),
      attendance_type: normalizedType,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("CHECK IN ERROR:", err);

    if (err.code === "23505") {
      return res.status(409).json({
        success: false,
        message: "You have already checked in today.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Check-in failed. Please try again.",
    });
  } finally {
    if (uploadedPhotoKey && !attendanceSaved) {
      try {
        await deleteFromStorage(uploadedPhotoKey);
      } catch (err) {
        console.error("CHECK IN PHOTO CLEANUP:", err);
      }
    }

    await cleanupAttendanceSelfie(req.file);
  }
};

/*
|--------------------------------------------------------------------------
| CHECK OUT
|--------------------------------------------------------------------------
*/

exports.checkOut = async (req, res) => {
  const userId = req.user.id;
  const selfiePath = req.file?.path;

  let uploadedPhotoKey = null;
  let attendanceSaved = false;
  let client = null;
  let transactionStarted = false;

  try {
    const { latitude, longitude } = req.body;
    if (!validateMockLocation(req, res)) {
      return;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (
      latitude == null ||
      longitude == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return res.status(400).json({
        success: false,
        message: "Latitude dan Longitude tidak valid.",
      });
    }

    if (!selfiePath) {
      return res.status(400).json({
        success: false,
        message: "A facial selfie is required for check-out.",
      });
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM attendance
      WHERE user_id = $1
        AND attendance_date =
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date
        AND check_out IS NULL
      LIMIT 1
      `,
      [userId],
    );

    if (!existing.rows.length) {
      return res.status(400).json({
        success: false,
        message: "You have not checked in or have already checked out.",
      });
    }

    // Upload foto setelah wajah terverifikasi.
    uploadedPhotoKey = await uploadAttendanceSelfie(req.file);
    client = await pool.connect();

    await client.query("BEGIN");
    transactionStarted = true;

    // Satu karyawan hanya boleh memiliki satu
    // proses perhitungan saldo pada saat bersamaan.
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [17001, userId]);

    const result = await client.query(
      `
      UPDATE attendance
      SET
        check_out =
          NOW() AT TIME ZONE 'Asia/Jakarta',
        check_out_lat = $1,
        check_out_lng = $2,
        check_out_photo_path = $3,
        status = 'Pulang'
      WHERE user_id = $4
        AND attendance_date =
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date
        AND check_out IS NULL
      RETURNING id
      `,
      [lat, lng, uploadedPhotoKey, userId],
    );

    if (!result.rows.length) {
      await client.query("ROLLBACK");
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message:
          "Check-out has been processed, or attendance data has changed.",
      });
    }

    const attendanceId = result.rows[0].id;

    // Proses kompensasi dalam transaksi yang sama.
    const compensation = await processLateCompensation(client, attendanceId);

    await client.query("COMMIT");
    transactionStarted = false;
    attendanceSaved = true;

    return res.json({
      success: true,
      message: "Check Out berhasil.",
      attendanceId,
      compensation,
    });
  } catch (err) {
    if (client && transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("CHECK OUT ROLLBACK ERROR:", rollbackError);
      }
    }

    console.error("CHECK OUT ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Check-out failed. Please try again.",
    });
  } finally {
    if (client) {
      client.release();
    }

    if (uploadedPhotoKey && !attendanceSaved) {
      try {
        await deleteFromStorage(uploadedPhotoKey);
      } catch (cleanupError) {
        console.error("CHECK OUT PHOTO CLEANUP:", cleanupError);
      }
    }

    await cleanupAttendanceSelfie(req.file);
  }
};

exports.list = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT *
            FROM announcements
            WHERE
                is_active = TRUE
            ORDER BY sort_order ASC
        `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

function getWorkingDays(year, month) {
  let total = 0;

  const lastDay = new Date(year, month, 0).getDate();

  for (let day = 1; day <= lastDay; day++) {
    const date = new Date(year, month - 1, day);

    const weekDay = date.getDay();

    // Minggu = 0
    // Sabtu = 6
    if (weekDay !== 0 && weekDay !== 6) {
      total++;
    }
  }

  return total;
}

async function getSummaryData(
  month,
  year,
  workingDays,
  department = "",
  search = "",
) {
  const result = await pool.query(
    `
            SELECT
                u.id,
                u.name,
                u.department,

               COUNT(DISTINCT a.attendance_date) AS present,

                SUM(
                    CASE
                        WHEN a.is_late = true THEN 1
                        ELSE 0
                    END
                ) AS late,

                SUM(
                    COALESCE(a.late_minutes, 0)
                ) AS late_minutes,
COALESCE(leave_summary.cuti,0) AS leave,

COALESCE(leave_summary.izin,0) AS permission,

COALESCE(leave_summary.sakit,0) AS sick,(
   COUNT(DISTINCT a.attendance_date)
    +
    COALESCE(leave_summary.cuti,0)
    +
    COALESCE(leave_summary.izin,0)
    +
    COALESCE(leave_summary.sakit,0)
) AS attendance_total,

GREATEST(

0,

$3
-
(
    COUNT(DISTINCT a.attendance_date)
        +
    COALESCE(leave_summary.cuti,0)
    +
    COALESCE(leave_summary.izin,0)
    +
    COALESCE(leave_summary.sakit,0)
)

) AS alpha,

ROUND(

(
(
COUNT(a.id)
+
COALESCE(leave_summary.cuti,0)
+
COALESCE(leave_summary.izin,0)
+
COALESCE(leave_summary.sakit,0)
)::numeric

/

NULLIF($3,0)

)*100

,2)

AS percent
            FROM users u
LEFT JOIN attendance a
ON
    a.user_id = u.id

AND EXTRACT(MONTH FROM a.attendance_date) = $1

AND EXTRACT(YEAR FROM a.attendance_date) = $2
                LEFT JOIN (

    SELECT

        user_id,

        SUM(
            CASE
                WHEN leave_type='CUTI'
                AND status='APPROVED'
                 AND approved_by IS NOT NULL
                THEN (end_date-start_date)+1
                ELSE 0
            END
        ) AS cuti,

        SUM(
            CASE
                WHEN leave_type='IZIN'
                AND status='APPROVED'
                 AND approved_by IS NOT NULL
                THEN (end_date-start_date)+1
                ELSE 0
            END
        ) AS izin,

        SUM(
            CASE
                WHEN leave_type='SAKIT'
                AND status='APPROVED'
                 AND approved_by IS NOT NULL
                THEN (end_date-start_date)+1
                ELSE 0
            END
        ) AS sakit

  FROM leave_requests

WHERE

EXTRACT(MONTH FROM start_date) = $1

AND

EXTRACT(YEAR FROM start_date) = $2

GROUP BY user_id

) leave_summary

ON leave_summary.user_id = u.id

           WHERE
    u.role_id = 3

AND
(
    $4 = ''
    OR u.department = $4
) AND
(
    $5 = ''

    OR LOWER(u.name)

    LIKE LOWER('%' || $5 || '%')
)

          GROUP BY
    u.id,
    u.name,
    u.department,
    leave_summary.cuti,
    leave_summary.izin,
    leave_summary.sakit

            ORDER BY
                u.name
        `,
    [month, year, workingDays, department || "", search || ""],
  );
  return result;
}

exports.getAttendanceSummary = async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;

  const year = Number(req.query.year) || new Date().getFullYear();

  const department = req.query.department || "";

  const search = req.query.search || "";
  const workingDays = getWorkingDays(year, month);
  try {
    const result = await getSummaryData(
      month,

      year,

      workingDays,

      department,

      search,
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const month = Number(req.query.month);
    const year = Number(req.query.year);

    const result = await pool.query(
      `
            SELECT
                attendance_date,
                check_in,
                check_out,
                status,
                is_late,
                late_minutes,
                attendance_type
            FROM attendance
            WHERE user_id = $1
              AND EXTRACT(MONTH FROM attendance_date) = $2
              AND EXTRACT(YEAR FROM attendance_date) = $3
            ORDER BY check_in DESC
            `,
      [id, month, year],
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getDailyAttendance = async (req, res) => {
  const {
    date,

    department,

    status,

    search,
  } = req.query;
  try {
    // kalau frontend tidak kirim tanggal,
    // otomatis pakai tanggal hari ini
    const queryDate = date || new Date().toISOString().slice(0, 10);
    const result = await pool.query(
      `
    SELECT
    u.id,
    a.id AS attendance_id,
    u.name,
    u.department,
    u.photo AS photo,
      a.check_in AT TIME ZONE 'Asia/Jakarta' AS check_in,
    a.check_out AT TIME ZONE 'Asia/Jakarta' AS check_out,

    COALESCE(a.status,'Belum Check In') AS status,

    COALESCE(a.is_late,false) AS is_late,

    COALESCE(a.late_minutes,0) AS late_minutes,

    a.photo_path,
    a.check_out_photo_path,
    a.check_in_lat,

    a.check_in_lng,
    a.check_out_lat,
    a.check_out_lng

FROM users u

LEFT JOIN attendance a
ON
    a.user_id = u.id
AND
(
    $1::date IS NULL
    OR a.attendance_date = $1
)

WHERE
    u.role_id = 3

AND (
    $2 = ''
    OR u.department = $2
)

AND (
    $3 = ''
    OR COALESCE(a.status,'Belum Check In') = $3
)

AND (
    $4 = ''
    OR LOWER(u.name) LIKE LOWER('%' || $4 || '%')
)

ORDER BY u.name;

        `,
      [queryDate, department, status, search],
    );

    const attendance = await Promise.all(
      result.rows.map(async (item) => {
        let photoUrl = null;

        if (item.photo) {
          try {
            photoUrl = await getPrivateFileUrl(item.photo);
          } catch (photoError) {
            console.error(
              `Gagal membuat URL foto karyawan ID ${item.id}:`,
              photoError.message,
            );
          }
        }

        return {
          ...item,
          photoUrl,
        };
      }),
    );

    return res.json({
      success: true,
      data: attendance,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getAttendancePhoto = async (req, res) => {
  try {
    const { id, type } = req.params;
    const userId = req.user.id;
    const role = String(req.user.role || "")
      .trim()
      .toUpperCase();

    const allowedRoles = ["ADMIN", "HR", "ADMIN HR"];
    const isAdmin = allowedRoles.includes(role);

    // Validasi jenis foto
    if (!["check-in", "check-out"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid photo type.",
      });
    }

    // Ambil data absensi
    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        photo_path,
        check_out_photo_path
      FROM attendance
      WHERE id = $1
      LIMIT 1
      `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Attendance data not found.",
      });
    }

    const attendance = result.rows[0];

    // Admin / HR boleh melihat foto karyawan.
    // Karyawan biasa hanya boleh melihat fotonya sendiri.
    const isOwner = String(attendance.user_id) === String(userId);

    if (!isAdmin && !isOwner) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this photo.",
      });
    }

    // Tentukan foto masuk atau pulang
    const photoKey =
      type === "check-in"
        ? attendance.photo_path
        : attendance.check_out_photo_path;

    if (!photoKey) {
      return res.status(404).json({
        success: false,
        message: "Attendance photo is not available.",
      });
    }

    // Hanya terima file dari Neon Storage folder attendance
    if (typeof photoKey !== "string" || !photoKey.startsWith("attendance/")) {
      return res.status(404).json({
        success: false,
        message: "Old photo is not available in Storage.",
      });
    }

    // Buat URL privat, berlaku 5 menit
    const url = await getPrivateFileUrl(photoKey);

    return res.json({
      success: true,
      data: {
        url,
        expiresIn: 300,
      },
    });
  } catch (err) {
    console.error("GET ATTENDANCE PHOTO ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve attendance photo.",
    });
  }
};

exports.getDepartments = async (req, res) => {
  try {
    const result = await pool.query(`
            SELECT DISTINCT department
            FROM users
            WHERE role_id = 3
              AND department IS NOT NULL
            ORDER BY department
        `);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getEmployeeOfMonth = async (req, res) => {
  const month = Number(req.query.month) || new Date().getMonth() + 1;

  const year = Number(req.query.year) || new Date().getFullYear();

  const workingDays = getWorkingDays(year, month);

  try {
    const result = await getSummaryData(month, year, workingDays);

    const ranking = result.rows
      .sort((a, b) => {
        // Alpha paling sedikit
        if (Number(a.alpha) !== Number(b.alpha)) {
          return Number(a.alpha) - Number(b.alpha);
        }

        // Persentase paling tinggi
        if (Number(a.percent) !== Number(b.percent)) {
          return Number(b.percent) - Number(a.percent);
        }

        // Telat paling sedikit
        if (Number(a.late) !== Number(b.late)) {
          return Number(a.late) - Number(b.late);
        }

        // Menit telat paling sedikit
        if (Number(a.late_minutes) !== Number(b.late_minutes)) {
          return Number(a.late_minutes) - Number(b.late_minutes);
        }

        // Hadir paling banyak
        if (Number(a.present) !== Number(b.present)) {
          return Number(b.present) - Number(a.present);
        }

        return a.name.localeCompare(b.name);
      })
      .slice(0, 5);

    res.json({
      success: true,
      data: ranking,
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.getDashboardSummary = async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const result = await pool.query(
      `
            SELECT

                COUNT(*) FILTER (
                    WHERE a.check_in IS NOT NULL
                ) AS hadir,

                COUNT(*) FILTER (
                    WHERE a.is_late = true
                ) AS terlambat,

                COUNT(*) FILTER (
                    WHERE a.check_in IS NOT NULL
                    AND a.check_out IS NULL
                ) AS belum_pulang,

                (
                    SELECT COUNT(*)
                    FROM users u
                    WHERE
                        u.role_id = 3
                        AND NOT EXISTS (
                            SELECT 1
                            FROM attendance x
                            WHERE
                                x.user_id = u.id
                                AND x.attendance_date = $1
                        )
                ) AS belum_checkin

            FROM attendance a

            WHERE a.attendance_date = $1
            `,
      [today],
    );

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

exports.createEditRequest = async (req, res) => {
  try {
    const userId = req.user.id;

    const { attendance_id, new_check_in, new_check_out, reason } = req.body;

    // =========================
    // VALIDASI
    // =========================

    if (!attendance_id) {
      return res.status(400).json({
        success: false,
        message: "Attendance ID is required.",
      });
    }

    if (!new_check_in && !new_check_out) {
      return res.status(400).json({
        success: false,
        message: "Check-in time or check-out time is required.",
      });
    }

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reason for change is required.",
      });
    }

    // =========================
    // AMBIL ABSENSI + SUPERVISOR
    // =========================

    const attendanceResult = await pool.query(
      `
            SELECT
                a.id,
                a.user_id,
                a.check_in,
                a.check_out,
                a.attendance_date,

                u.leader_id 

            FROM attendance a

            JOIN users u
                ON u.id = a.user_id

            WHERE a.id = $1
              AND a.user_id = $2
            `,
      [attendance_id, userId],
    );

    if (attendanceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Data absensi tidak ditemukan.",
      });
    }

    const attendance = attendanceResult.rows[0];

    // =========================
    // CEK SUPERVISOR
    // =========================

    if (!attendance.leader_id) {
      return res.status(400).json({
        success: false,
        message: "Leader for this employee is not set.",
      });
    }

    // =========================
    // CEK REQUEST PENDING
    // =========================

    const pendingResult = await pool.query(
      `
            SELECT id

            FROM attendance_edit_requests

            WHERE attendance_id = $1
              AND user_id = $2
              AND status = 'PENDING_SUPERVISOR'

            LIMIT 1
            `,
      [attendance_id, userId],
    );

    if (pendingResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This request for an attendance change is still awaiting approval.",
      });
    }

    // =========================
    // CEK SUDAH APPROVED
    // =========================

    const approvedResult = await pool.query(
      `
            SELECT id

            FROM attendance_edit_requests

            WHERE attendance_id = $1
              AND user_id = $2
              AND status = 'APPROVED'

            LIMIT 1
            `,
      [attendance_id, userId],
    );

    if (approvedResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message:
          "This attendance has already been corrected and cannot be changed again.",
      });
    }

    // =========================
    // SIMPAN REQUEST
    // =========================

    const result = await pool.query(
      `
            INSERT INTO attendance_edit_requests
            (
                attendance_id,
                user_id,
                old_check_in,
                new_check_in,
                old_check_out,
                new_check_out,
                reason,
                status
            )

            VALUES
            (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                'PENDING_SUPERVISOR'
            )

            RETURNING *
            `,
      [
        attendance.id,
        userId,
        attendance.check_in,
        new_check_in || null,
        attendance.check_out,
        new_check_out || null,
        reason.trim(),
      ],
    );

    const editRequest = result.rows[0];

    // =========================
    // NOTIFICATION KE ATASAN
    // =========================

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
        attendance.leader_id,

        "Perubahan Absensi",

        "Ada pengajuan perubahan absensi yang membutuhkan persetujuan Anda.",

        "ATTENDANCE_EDIT_PENDING",

        editRequest.id,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Attendance change request submitted successfully.",
      data: editRequest,
    });
  } catch (err) {
    console.error(err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
