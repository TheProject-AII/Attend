const pool = require("../config/db");

const ALLOWED_ROLES = ["ADMIN", "HR", "ADMIN HR"];

function isAdminOrHR(user) {
  const role = String(user?.role_name || user?.role?.name || user?.role || "")
    .toUpperCase()
    .trim();

  return ALLOWED_ROLES.includes(role);
}

function normalizeTime(value) {
  const text = String(value || "").trim();

  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) {
    return null;
  }

  const [hours, minutes, seconds = "00"] = text.split(":");

  if (Number(hours) > 23 || Number(minutes) > 59 || Number(seconds) > 59) {
    return null;
  }

  return `${hours}:${minutes}:${seconds}`;
}

function getJakartaToday() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

exports.getSettings = async (req, res) => {
  try {
    if (!isAdminOrHR(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    const [settingsResult, versionsResult] = await Promise.all([
      pool.query(`
          SELECT *
          FROM attendance_late_settings
          WHERE id = 1
        `),

      pool.query(`
          SELECT
            id,
            effective_date::text AS effective_date,
            office_start_time::text AS office_start_time,
            office_end_time::text AS office_end_time,
            late_tolerance_minutes,
            late_rounding,
            compensation_rounding,
            payment_method,
            attendance_type,
            is_active,
            created_at
          FROM attendance_late_setting_versions
          ORDER BY effective_date DESC
        `),
    ]);

    return res.json({
      success: true,
      data: settingsResult.rows[0] || null,
      versions: versionsResult.rows,
    });
  } catch (error) {
    console.error("GET LATE SETTINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil pengaturan.",
    });
  }
};

exports.updateSettings = async (req, res) => {
  if (!isAdminOrHR(req.user)) {
    return res.status(403).json({
      success: false,
      message: "Akses ditolak.",
    });
  }

  const {
    effective_date,
    office_start_time,
    office_end_time,
    late_tolerance_minutes,
    late_rounding,
    compensation_rounding,
    payment_method,
    attendance_type,
    is_active,
  } = req.body || {};

  const startTime = normalizeTime(office_start_time);
  const endTime = normalizeTime(office_end_time);
  const tolerance = Number(late_tolerance_minutes);

  if (!startTime || !endTime || startTime >= endTime) {
    return res.status(400).json({
      success: false,
      message: "Jam masuk dan jam pulang tidak valid.",
    });
  }

  if (!Number.isInteger(tolerance) || tolerance < 0 || tolerance > 1440) {
    return res.status(400).json({
      success: false,
      message: "Toleransi harus 0–1440 menit.",
    });
  }

  if (
    !["CEIL", "FLOOR"].includes(late_rounding) ||
    !["CEIL", "FLOOR"].includes(compensation_rounding)
  ) {
    return res.status(400).json({
      success: false,
      message: "Metode pembulatan tidak valid.",
    });
  }

  if (
    payment_method !== "FIFO" ||
    attendance_type !== "OFFICE" ||
    typeof is_active !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Konfigurasi tidak valid.",
    });
  }

  if (
    typeof effective_date !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(effective_date)
  ) {
    return res.status(400).json({
      success: false,
      message: "Tanggal mulai berlaku wajib YYYY-MM-DD.",
    });
  }

  const parsedDate = new Date(`${effective_date}T00:00:00Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== effective_date
  ) {
    return res.status(400).json({
      success: false,
      message: "Tanggal mulai berlaku tidak valid.",
    });
  }

  const today = getJakartaToday();

  if (effective_date <= today) {
    return res.status(400).json({
      success: false,
      message: "Tanggal mulai berlaku harus setelah hari ini.",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Serialisasi perubahan Settings.
    await client.query("SELECT pg_advisory_xact_lock($1, $2)", [17002, 1]);

    // Versi kebijakan hanya boleh ditambahkan
    // setelah versi terakhir yang sudah tersimpan.
    const latestResult = await client.query(`
      SELECT effective_date::text AS effective_date
      FROM attendance_late_setting_versions
      ORDER BY effective_date DESC
      LIMIT 1
    `);

    const latestDate = latestResult.rows[0]?.effective_date;

    if (latestDate && effective_date <= latestDate) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Tanggal kebijakan baru harus setelah versi terakhir.",
      });
    }

    const values = [
      effective_date,
      startTime,
      endTime,
      tolerance,
      late_rounding,
      compensation_rounding,
      payment_method,
      attendance_type,
      is_active,
    ];

    const versionResult = await client.query(
      `
      INSERT INTO attendance_late_setting_versions (
        effective_date,
        office_start_time,
        office_end_time,
        late_tolerance_minutes,
        late_rounding,
        compensation_rounding,
        payment_method,
        attendance_type,
        is_active
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9
      )
      RETURNING
        id,
        effective_date::text AS effective_date
      `,
      values,
    );

    const settingsResult = await client.query(
      `
      UPDATE attendance_late_settings
      SET
        office_start_time = $1,
        office_end_time = $2,
        late_tolerance_minutes = $3,
        late_rounding = $4,
        compensation_rounding = $5,
        payment_method = $6,
        attendance_type = $7,
        is_active = $8,
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
      `,
      values.slice(1),
    );

    if (!settingsResult.rows.length) {
      throw new Error("Pengaturan utama belum tersedia.");
    }

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Kebijakan baru berhasil dijadwalkan.",
      data: settingsResult.rows[0],
      version: versionResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("UPDATE LATE SETTINGS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menyimpan kebijakan.",
    });
  } finally {
    client.release();
  }
};
