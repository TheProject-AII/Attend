const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
  uploadToStorage,
  deleteFromStorage,
} = require("../services/storageService");
const {
  invalidateEmployeePhotoCache,
} = require("../services/faceRecognitionService");
const { getPrivateFileUrl } = require("../services/storageService");

exports.login = async (req, res) => {
  const { email, password } = req.body;
  let client;

  try {
    const result = await pool.query(
      `
      SELECT u.*, r.name AS role_name
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
      `,
      [email],
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Email tidak ditemukan",
      });
    }

    const user = result.rows[0];

    if (user.status !== true) {
      return res.status(403).json({
        success: false,
        message: "Akun belum aktif. Hubungi Divisi HRD.",
      });
    }

    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      return res.status(401).json({
        success: false,
        message: "Password salah",
      });
    }

    const isEmployee = String(user.role_name).toLowerCase() === "employee";

    client = await pool.connect();

    await client.query("BEGIN");

    if (isEmployee) {
      await client.query("SELECT pg_advisory_xact_lock($1::bigint)", [user.id]);

      const active = await client.query(
        `
        SELECT session_id
        FROM active_sessions
        WHERE user_id = $1
          AND expires_at > NOW()
        `,
        [user.id],
      );

      if (active.rows.length > 0) {
        await client.query("ROLLBACK");

        return res.status(409).json({
          success: false,
          message:
            "Akun sedang login di perangkat lain. Silakan logout terlebih dahulu.",
        });
      }
    }

    const sessionId = crypto.randomUUID();

    await client.query(
      `
      INSERT INTO active_sessions (
        user_id,
        session_id,
        created_at,
        last_activity_at,
        expires_at
      )
      VALUES (
        $1, $2, NOW(), NOW(), NOW() + INTERVAL '1 day'
      )
      ON CONFLICT (user_id)
      DO UPDATE SET
        session_id = EXCLUDED.session_id,
        created_at = NOW(),
        last_activity_at = NOW(),
        expires_at = EXCLUDED.expires_at
      `,
      [user.id, sessionId],
    );

    await client.query("COMMIT");

    const token = jwt.sign(
      {
        id: user.id,
        role_id: user.role_id,
        role: user.role_name,
        sessionId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role_id: user.role_id,
        role: user.role_name,
      },
    });
  } catch (err) {
    if (client) {
      try {
        await client.query("ROLLBACK");
      } catch (_) {}
    }

    console.error("Login error:", err);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  } finally {
    if (client) client.release();
  }
};

// controllers/authController.js

exports.recordActivity = async (req, res) => {
  try {
    // Pencatatan aktivitas hanya untuk Admin
    if (String(req.user.role).toLowerCase() !== "admin") {
      return res.json({ success: true });
    }

    const result = await pool.query(
      `
      UPDATE active_sessions
      SET last_activity_at = NOW()
      WHERE user_id = $1
        AND session_id = $2
        AND expires_at > NOW()
        AND last_activity_at > NOW() - INTERVAL '1 hour'
      RETURNING session_id
      `,
      [req.user.id, req.user.sessionId],
    );

    if (result.rowCount === 0) {
      return res.status(401).json({
        success: false,
        message: "Sesi berakhir. Silakan login kembali.",
      });
    }

    return res.json({ success: true });
  } catch (err) {
    console.error("Record activity error:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mencatat aktivitas",
    });
  }
};

exports.logout = async (req, res) => {
  try {
    if (req.user.role?.toLowerCase() === "employee") {
      await pool.query(
        `
  DELETE FROM active_sessions
  WHERE user_id = $1
    AND session_id = $2
  `,
        [req.user.id, req.user.sessionId],
      );
    }

    return res.json({
      success: true,
      message: "Logout berhasil",
    });
  } catch (err) {
    console.error("Logout error:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal logout",
    });
  }
};

exports.me = async (req, res) => {
  try {
    const result = await pool.query(
      `
SELECT
  u.id,
  u.role_id,
  r.name AS role,
  u.nik,
  u.name,
  u.email,
  u.department,
  u.position,
  u.photo,
  u.status,
  u.face_enrolled_at,
  (
    u.face_embedding IS NOT NULL
    AND u.face_enrolled_at IS NOT NULL
  ) AS face_enrolled
FROM users u
JOIN roles r ON r.id = u.role_id
WHERE u.id = $1
`,
      [req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User tidak ditemukan",
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (err) {
    console.error(err);

    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// Import lainnya tetap ada di bagian atas file.

const employeeDocumentFields = [
  "photo",
  "ktp",
  "npwp",
  "bpjs_kesehatan",
  "bpjs_tk",
  "kk",
];

async function uploadEmployeeDocuments(files) {
  const paths = {};
  const uploadedKeys = [];

  try {
    for (const field of employeeDocumentFields) {
      const file = files?.[field]?.[0];

      if (!file) {
        paths[field] = null;
        continue;
      }

      const folder = field === "photo" ? "photos" : field;

      const key = await uploadToStorage(file, folder);

      paths[field] = key;
      uploadedKeys.push(key);
    }

    return { paths, uploadedKeys };
  } catch (error) {
    await Promise.allSettled(uploadedKeys.map((key) => deleteFromStorage(key)));

    throw error;
  }
}

async function cleanupUploadedDocuments(keys) {
  await Promise.allSettled(keys.map((key) => deleteFromStorage(key)));
}

exports.createEmployee = async (req, res) => {
  const client = await pool.connect();

  let uploadedKeys = [];
  let transactionStarted = false;
  let committed = false;
  try {
    const {
      nik,
      name,
      email,
      phone,
      department,
      position,
      role_id,
      job_description, // TAMBAHAN
      join_date,
      address,
      employee_type,
      contract_start_date,
      contract_end_date,
      company_id,
      supervisor_id,
    } = req.body;

    // =========================
    // VALIDASI
    // =========================

    if (!nik || !name || !email || !department || !role_id) {
      return res.status(400).json({
        success: false,
        message: "NIK, nama, email, dan departemen wajib diisi",
      });
    }

    if (!/^\d{16}$/.test(nik)) {
      return res.status(400).json({
        success: false,
        message: "NIK harus terdiri dari 16 digit",
      });
    }

    // =========================
    // CEK NIK / EMAIL
    // =========================

    const existing = await pool.query(
      `
            SELECT id
            FROM users
            WHERE nik = $1
               OR email = $2
            LIMIT 1
            `,
      [nik, email],
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "NIK atau email sudah terdaftar",
      });
    }

    const roleCheck = await pool.query(
      `
    SELECT id, name
    FROM roles
    WHERE id = $1
    LIMIT 1
  `,
      [role_id],
    );

    if (roleCheck.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Jabatan tidak valid",
      });
    }

    const defaultPassword = `so-mak${nik.slice(-4)}`;

    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // =========================
    // UPLOAD FILE KE NEON
    // =========================

    const uploaded = await uploadEmployeeDocuments(req.files);

    uploadedKeys = uploaded.uploadedKeys;

    const paths = uploaded.paths;
    // =========================
    // TRANSACTION
    // =========================

    await client.query("BEGIN");
    transactionStarted = true;
    const result = await client.query(
      `
  INSERT INTO users (
    role_id, nik, name, email, password,
    phone, department, position, job_description,
    photo, ktp, npwp, bpjs_kesehatan, bpjs_tk, kk,
    join_date, address, status,
    employee_type, contract_start_date, contract_end_date,
    company_id, supervisor_id
  )
  VALUES (
    $1, $2, $3, $4, $5,
    $6, $7, $8, $9,
    $10, $11, $12, $13, $14, $15,
    $16, $17, true,
    $18, $19, $20, $21, $22
  )
  RETURNING
    id, role_id, nik, name, email, phone,
    department, position, job_description,
    photo, ktp, npwp, bpjs_kesehatan, bpjs_tk, kk,
    join_date, address, status,
    employee_type, contract_start_date, contract_end_date
  `,
      [
        role_id,
        nik,
        name,
        email,
        hashedPassword,
        phone || null,
        department,
        position || null,
        paths.photo,
        paths.ktp,
        paths.npwp,
        paths.bpjs_kesehatan,
        paths.bpjs_tk,
        paths.kk,
        join_date || null,
        address || null,
        employee_type || "TETAP",
        contract_start_date || null,
        contract_end_date || null,
        company_id || null,
        supervisor_id || null,
      ],
    );
    await client.query("COMMIT");
    committed = true;
    transactionStarted = false;

    try {
      await sendEmail({
        to: email,

        subject: "Attendance Account Successfully Created",

        html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 24px;
        color: #333;
      ">

        <h2 style="margin-bottom: 20px;">
          Akun Aplikasi Absensi
        </h2>

        <p>
          Halo <strong>${name}</strong>,
        </p>

        <p>
          Akun Anda telah berhasil dibuat oleh administrator.
        </p>

        <div style="
          background: #f4f6f8;
          padding: 18px;
          border-radius: 8px;
          margin: 20px 0;
        ">

          <p style="margin: 6px 0;">
            <strong>Email:</strong> ${email}
          </p>

          <p style="margin: 6px 0;">
            <strong>Password sementara:</strong>
            ${defaultPassword}
          </p>

        </div>

        <p>
          Silakan gunakan email dan password sementara tersebut
          untuk login ke Aplikasi Attend.
        </p>

        <p>
          Setelah berhasil login, segera ubah password Anda
          demi keamanan akun.
        </p>

        <p style="
          color: #777;
          font-size: 13px;
          margin-top: 30px;
        ">
          Jangan bagikan password ini kepada orang lain.
        </p>

        <hr style="
          border: 0;
          border-top: 1px solid #ddd;
          margin: 25px 0;
        ">

        <p style="
          font-size: 12px;
          color: #888;
        ">
          Email ini dikirim otomatis oleh sistem KJI Attendance.
        </p>

      </div>
    `,
      });
    } catch (emailError) {
      console.error("SEND EMPLOYEE EMAIL ERROR:", emailError);

      // Akun tetap berhasil dibuat.
      // Email gagal tidak membatalkan INSERT.
    }

    return res.status(201).json({
      success: true,
      message:
        "Karyawan berhasil dibuat dan password sementara dikirim ke email.",
      data: result.rows[0],
    });
  } catch (err) {
    if (transactionStarted) {
      try {
        await client.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("ROLLBACK ERROR:", rollbackError);
      }
    }

    if (!committed && uploadedKeys.length > 0) {
      await cleanupUploadedDocuments(uploadedKeys);
    }

    console.error("CREATE EMPLOYEE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal membuat karyawan",
    });
  } finally {
    client.release();
  }
};

// exports.getEmployees = async (req, res) => {
//   try {
//     const result = await pool.query(`
//             SELECT
//                 u.id,
//                 u.nik,
//                 u.name,
//                 u.email,
//                 u.company_email,
//                 u.phone,
//                 u.department,
//                 u.nip,
//                   u.company_id,
//                   c.name AS company_name,
//                   u.placement,
//                   u.job_level,
//                 u.position,
//                 u.photo,
//                 u.status,
//                 u.employee_type,
//                 u.contract_start_date,
//                 u.contract_end_date,
//                 u.join_date,
//                 u.address,
//                 u.office_location_id,
//                 u.supervisor_id,
//                 u.ktp,
//                 u.npwp,
//                 u.bpjs_kesehatan,
//                 u.bpjs_tk,
//                 u.kk
//             FROM users u
//             LEFT JOIN companies c ON u.company_id = c.id
//            WHERE (u.role_id = 3 OR u.nip IS NOT NULL)
//             ORDER BY u.name ASC
//         `);

//     return res.json({
//       success: true,
//       data: result.rows,
//     });
//   } catch (err) {
//     console.error("GET EMPLOYEES ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: "Gagal mengambil data karyawan",
//     });
//   }
// };

exports.getEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.nik,
        u.name,
        u.email,
        u.company_email,
        u.phone,
        u.department,
        u.nip,
        u.company_id,
        c.name AS company_name,
        u.placement,
        u.job_level,
        u.position,
        u.job_description,
        u.photo,
        u.status,
        u.employee_type,
        u.contract_start_date,
        u.contract_end_date,
        u.join_date,
        u.address,
        u.company_id,
        u.supervisor_id,
        u.ktp,
        u.npwp,
        u.bpjs_kesehatan,
        u.bpjs_tk,
        u.kk
      FROM users u
      LEFT JOIN companies c ON u.company_id = c.id
      WHERE (u.role_id = 3 OR u.nip IS NOT NULL)
      ORDER BY u.name ASC
    `);

    const employees = await Promise.all(
      result.rows.map(async (employee) => {
        let photoUrl = null;

        if (employee.photo) {
          try {
            photoUrl = await getPrivateFileUrl(employee.photo);
          } catch (photoError) {
            console.error(
              `Gagal membuat URL foto karyawan ID ${employee.id}:`,
              photoError.message,
            );
          }
        }

        return {
          ...employee,
          photoUrl,
        };
      }),
    );

    return res.json({
      success: true,
      data: employees,
    });
  } catch (err) {
    console.error("GET EMPLOYEES ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data karyawan",
    });
  }
};

exports.getRoles = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name
      FROM roles
      ORDER BY id ASC
    `);

    return res.status(200).json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("GET ROLES ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data jabatan",
    });
  }
};

exports.updateEmployee = async (req, res) => {
  let uploadedKeys = [];
  try {
    const { id } = req.params;
    const oldPhotoResult = await pool.query(
      `SELECT photo
FROM users
WHERE id = $1`,
      [id],
    );

    if (oldPhotoResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    const oldPhoto = oldPhotoResult.rows[0].photo;
    const {
      nik,
      name,
      email,
      phone,
      department,
      position,
      job_description,
      join_date,
      address,
      employee_type,
      contract_start_date,
      contract_end_date,
      company_id,
      supervisor_id,
    } = req.body;

    // =========================
    // UPLOAD DOKUMEN KE NEON
    // =========================

    const uploaded = await uploadEmployeeDocuments(req.files);

    uploadedKeys = uploaded.uploadedKeys;

    const paths = uploaded.paths;

    const result = await pool.query(
      `
  UPDATE users
  SET
    role_id = (
    SELECT id FROM roles WHERE name = 'Employee'
  ),
    nik = $1,
    name = $2,
    email = $3,
    phone = $4,
    department = $5,
    position = $6,
    join_date = $7,
    address = $8,
    employee_type = $9,
    contract_start_date = $10,
    contract_end_date = $11,
    company_id = $12,
    supervisor_id = $13,
    job_description = $14,
    photo = COALESCE($15, photo),
    face_embedding = CASE
      WHEN $15 IS NOT NULL THEN NULL
      ELSE face_embedding
    END,
    face_enrolled_at = CASE
      WHEN $15 IS NOT NULL THEN NULL
      ELSE face_enrolled_at
    END,
    ktp = COALESCE($16, ktp),
    npwp = COALESCE($17, npwp),
    bpjs_kesehatan = COALESCE($18, bpjs_kesehatan),
    bpjs_tk = COALESCE($19, bpjs_tk),
    kk = COALESCE($20, kk),
    updated_at = NOW()
  WHERE id = $21
  RETURNING *;
  `,
      [
        nik, // $1
        name, // $2
        email, // $3
        phone, // $4
        department, // $5
        position, // $6
        join_date || null, // $7
        address, // $8
        employee_type, // $9
        [
          "PROBATION",
          "KONTRAK_3_BULAN",
          "KONTRAK_6_BULAN",
          "KONTRAK_12_BULAN",
        ].includes(employee_type)
          ? contract_start_date || null
          : null, // $10

        [
          "PROBATION",
          "KONTRAK_3_BULAN",
          "KONTRAK_6_BULAN",
          "KONTRAK_12_BULAN",
        ].includes(employee_type)
          ? contract_end_date || null
          : null, // $11
        company_id || null, // $12
        supervisor_id || null, // $13
        job_description || null, // $14
        paths.photo, // $15
        paths.ktp, // $16
        paths.npwp, // $17
        paths.bpjs_kesehatan, // $18
        paths.bpjs_tk, // $19
        paths.kk, // $20
        id, // $21
      ],
    );

    if (result.rows.length === 0) {
      await cleanupUploadedDocuments(uploadedKeys);

      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }
    if (paths.photo) {
      invalidateEmployeePhotoCache(oldPhoto);
    }
    return res.json({
      success: true,
      message: "Data karyawan berhasil diperbarui",
      data: result.rows[0],
    });
  } catch (err) {
    if (uploadedKeys.length > 0) {
      await cleanupUploadedDocuments(uploadedKeys);
    }

    console.error("UPDATE EMPLOYEE ERROR:", err.message);
    console.error("ERROR CODE:", err.code);
    console.error("ERROR DETAIL:", err.detail);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui data karyawan",
    });
  }
};

exports.deactivateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
            UPDATE users
            SET
                status = false,
                updated_at = NOW()
            WHERE id = $1
              AND role_id = 3
            RETURNING
                id,
                name,
                email,
                status
            `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    return res.json({
      success: true,
      message: "Karyawan berhasil dinonaktifkan",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("DEACTIVATE EMPLOYEE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal menonaktifkan karyawan",
    });
  }
};

exports.activateEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
            UPDATE users
            SET
                status = true,
                updated_at = NOW()
                
            WHERE id = $1
              AND role_id = 3
            RETURNING
                id,
                name,
                email,
                status
            `,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found",
      });
    }

    return res.json({
      success: true,
      message: "Karyawan berhasil diaktifkan",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("ACTIVATE EMPLOYEE ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengaktifkan karyawan",
    });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email, nik_last4 } = req.body;

    if (
      typeof email !== "string" ||
      typeof nik_last4 !== "string" ||
      !email.trim() ||
      !/^\d{4}$/.test(nik_last4)
    ) {
      return res.status(400).json({
        success: false,
        message: "Email dan 4 digit terakhir NIK wajib diisi.",
      });
    }

    const result = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER($1)
        AND RIGHT(nik, 4) = $2
        AND status = TRUE
      LIMIT 1
      `,
      [email.trim(), nik_last4],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Verifikasi gagal. Periksa kembali data Anda.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query(
      `
      UPDATE users
      SET reset_password_token = $1,
          reset_password_expires = $2,
          updated_at = NOW()
      WHERE id = $3
      `,
      [resetToken, expires, result.rows[0].id],
    );

    return res.json({
      success: true,
      message: "Verifikasi berhasil.",
      resetToken,
    });
  } catch (err) {
    console.error("FORGOT PASSWORD ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal memproses reset password.",
    });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password, password_confirmation } = req.body;

    if (
      typeof token !== "string" ||
      !token ||
      typeof password !== "string" ||
      typeof password_confirmation !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Data reset password tidak lengkap.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password minimal 8 karakter.",
      });
    }

    if (password !== password_confirmation) {
      return res.status(400).json({
        success: false,
        message: "Konfirmasi password tidak sama.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      UPDATE users
      SET password = $1,
          reset_password_token = NULL,
          reset_password_expires = NULL,
          updated_at = NOW()
      WHERE reset_password_token = $2
        AND reset_password_expires > NOW()
        AND status = TRUE
      RETURNING id
      `,
      [hashedPassword, token],
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Token reset tidak valid atau sudah kedaluwarsa.",
      });
    }

    return res.json({
      success: true,
      message: "Password berhasil diubah. Silakan login kembali.",
    });
  } catch (err) {
    console.error("RESET PASSWORD ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengubah password.",
    });
  }
};

exports.getFaceEnrollmentStatus = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         (face_embedding IS NOT NULL AND face_enrolled_at IS NOT NULL)
           AS face_enrolled,
         (photo IS NOT NULL AND photo <> '') AS has_reference_photo
       FROM users
       WHERE id = $1 AND status = TRUE`,
      [req.user.id],
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found Or Account Deactive.",
      });
    }

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    console.error("FACE ENROLLMENT STATUS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal memeriksa status registrasi wajah.",
    });
  }
};

exports.getEmployeeJobDescriptions = async (req, res) => {
  try {
    const { nip } = req.params;
    const { frequency } = req.query;

    const allowedFrequencies = [
      "Daily",
      "Weekly",
      "Monthly",
      "Yearly",
      "Ad-hoc",
    ];

    if (frequency && !allowedFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        message: "Frekuensi Job Description tidak valid.",
      });
    }

    const values = [nip];

    let sql = `
      SELECT
        id,
        employee_nip,
        frequency,
        task_number,
        title,
        description,
        minutes,
        hours,
        created_at,
        updated_at
      FROM employee_job_descriptions
      WHERE employee_nip = $1
    `;

    if (frequency) {
      values.push(frequency);
      sql += ` AND frequency = $2`;
    }

    sql += `
      ORDER BY
        CASE frequency
          WHEN 'Daily' THEN 1
          WHEN 'Weekly' THEN 2
          WHEN 'Monthly' THEN 3
          WHEN 'Yearly' THEN 4
          WHEN 'Ad-hoc' THEN 5
          ELSE 6
        END,
        id ASC
    `;

    const result = await pool.query(sql, values);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("GET JOB DESCRIPTIONS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil Job Description.",
    });
  }
};

exports.createEmployeeJobDescription = async (req, res) => {
  try {
    const { nip } = req.params;

    const { frequency, task_number, title, description, minutes, hours } =
      req.body;

    const allowedFrequencies = [
      "Daily",
      "Weekly",
      "Monthly",
      "Yearly",
      "Ad-hoc",
    ];

    if (!nip) {
      return res.status(400).json({
        success: false,
        message: "NIP karyawan wajib diisi.",
      });
    }

    if (
      !allowedFrequencies.includes(frequency) ||
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Kategori dan judul tugas wajib diisi dengan benar.",
      });
    }

    const parseDuration = (value) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const parsed = Number(value);

      return Number.isFinite(parsed) && parsed >= 0 ? parsed : NaN;
    };

    const parsedMinutes = parseDuration(minutes);
    const parsedHours = parseDuration(hours);

    if (
      (parsedMinutes !== null &&
        (!Number.isInteger(parsedMinutes) || Number.isNaN(parsedMinutes))) ||
      (parsedHours !== null &&
        (!Number.isFinite(parsedHours) || Number.isNaN(parsedHours))) ||
      (parsedMinutes === null && parsedHours === null)
    ) {
      return res.status(400).json({
        success: false,
        message: "Isi durasi menit atau jam dengan angka yang valid.",
      });
    }

    const result = await pool.query(
      `
        INSERT INTO employee_job_descriptions (
          employee_nip,
          frequency,
          task_number,
          title,
          description,
          minutes,
          hours
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        nip,
        frequency,
        task_number?.trim() || null,
        title.trim(),
        description?.trim() || null,
        parsedMinutes,
        parsedHours,
      ],
    );

    return res.status(201).json({
      success: true,
      message: "Job Description berhasil ditambahkan.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("CREATE JOB DESCRIPTION ERROR:", err);

    if (err.code === "23503") {
      return res.status(400).json({
        success: false,
        message: "NIP karyawan tidak ditemukan.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Gagal menambahkan Job Description.",
    });
  }
};
