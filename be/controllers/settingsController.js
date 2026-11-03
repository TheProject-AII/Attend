const pool = require("../config/db");

// // GET OVERTIME SETTINGS
// exports.getOvertimeSettings = async (req, res) => {
//   try {
//     const result = await pool.query(`
//       SELECT
//         id,
//         weekday_rate,
//         weekend_rate,
//         created_at,
//         updated_at
//       FROM overtime_settings
//       ORDER BY id ASC
//       LIMIT 1
//     `);

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Pengaturan tarif lembur belum tersedia.",
//       });
//     }

//     return res.json({
//       success: true,
//       data: result.rows[0],
//     });
//   } catch (err) {
//     console.error("GET OVERTIME SETTINGS ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// // UPDATE OVERTIME SETTINGS
// exports.updateOvertimeSettings = async (req, res) => {
//   try {
//     const { weekday_rate, weekend_rate } = req.body;

//     if (weekday_rate === undefined || weekend_rate === undefined) {
//       return res.status(400).json({
//         success: false,
//         message: "Tarif weekday dan weekend wajib diisi.",
//       });
//     }

//     const weekdayRate = Number(weekday_rate);
//     const weekendRate = Number(weekend_rate);

//     if (
//       !Number.isFinite(weekdayRate) ||
//       !Number.isFinite(weekendRate) ||
//       weekdayRate < 0 ||
//       weekendRate < 0
//     ) {
//       return res.status(400).json({
//         success: false,
//         message: "Tarif harus berupa angka dan tidak boleh kurang dari 0.",
//       });
//     }

//     const result = await pool.query(
//       `
//         UPDATE overtime_settings
//         SET
//           weekday_rate = $1,
//           weekend_rate = $2,
//           updated_at = NOW()
//         WHERE id = (
//           SELECT id
//           FROM overtime_settings
//           ORDER BY id ASC
//           LIMIT 1
//         )
//         RETURNING *
//       `,
//       [weekdayRate, weekendRate],
//     );

//     if (result.rows.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: "Pengaturan tarif lembur belum tersedia.",
//       });
//     }

//     return res.json({
//       success: true,
//       message: "Pengaturan tarif lembur berhasil diperbarui.",
//       data: result.rows[0],
//     });
//   } catch (err) {
//     console.error("UPDATE OVERTIME SETTINGS ERROR:", err);

//     return res.status(500).json({
//       success: false,
//       message: err.message,
//     });
//   }
// };

// GET WORKING HOURS SETTINGS
exports.getWorkingHoursSettings = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        work_schedule,
        weekly_work_hours,
        work_days,
        office_start_time,
        office_end_time,
        effective_date,
        is_active
      FROM working_hours_settings
      WHERE is_active = true
      ORDER BY id ASC
    `);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (err) {
    console.error("GET WORKING HOURS SETTINGS ERROR:", err);

    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

exports.updateWorkingHoursSettings = async (req, res) => {
  try {
    const { id } = req.params;
    const { office_start_time, office_end_time } = req.body;

    if (
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(office_start_time || "") ||
      !/^([01]\d|2[0-3]):[0-5]\d$/.test(office_end_time || "")
    ) {
      return res.status(400).json({
        success: false,
        message: "Format jam harus HH:mm.",
      });
    }

    if (office_start_time >= office_end_time) {
      return res.status(400).json({
        success: false,
        message: "Jam pulang harus lebih besar dari jam masuk.",
      });
    }

    const result = await pool.query(
      `
        UPDATE working_hours_settings
        SET office_start_time = $1,
            office_end_time = $2,
            updated_at = NOW()
        WHERE id = $3
        RETURNING *
      `,
      [office_start_time, office_end_time, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Working hours setting tidak ditemukan.",
      });
    }

    return res.json({
      success: true,
      message: "Working hours berhasil diperbarui.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("UPDATE WORKING HOURS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
