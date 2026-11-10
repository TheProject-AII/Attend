const pool = require("../config/db");

// GET MASTER TER
exports.getRates = async (req, res) => {
  try {
    const { category, year } = req.query;

    const values = [];
    const conditions = [];

    if (category && ["A", "B", "C"].includes(category)) {
      values.push(category);
      conditions.push(`category = $${values.length}`);
    }

    if (year && /^\d{4}$/.test(year)) {
      values.push(`${year}-01-01`);
      conditions.push(`effective_start <= $${values.length}::date`);

      values.push(`${year}-12-31`);
      conditions.push(
        `(effective_end IS NULL OR effective_end >= $${values.length}::date)`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const result = await pool.query(
      `
      SELECT *
      FROM pph21_ter_rates
      ${where}
      ORDER BY category ASC, min_income ASC, effective_start DESC
      `,
      values,
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET TER RATES:", error);

    res.status(500).json({
      success: false,
      message: "Gagal mengambil master TER.",
    });
  }
};

// CREATE MASTER TER
exports.createRate = async (req, res) => {
  const {
    category,
    min_income,
    max_income,
    rate,
    effective_start,
    effective_end,
  } = req.body;

  try {
    if (
      !["A", "B", "C"].includes(category) ||
      min_income === undefined ||
      rate === undefined ||
      !effective_start
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Kategori, batas penghasilan, tarif, dan tanggal berlaku wajib diisi.",
      });
    }

    const min = Number(min_income);
    const max =
      max_income === "" || max_income == null ? null : Number(max_income);
    const percentage = Number(rate);

    if (
      !Number.isFinite(min) ||
      min < 0 ||
      (max !== null && (!Number.isFinite(max) || max < min)) ||
      !Number.isFinite(percentage) ||
      percentage < 0 ||
      percentage > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Rentang penghasilan atau tarif tidak valid.",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO pph21_ter_rates (
        category,
        min_income,
        max_income,
        rate,
        effective_start,
        effective_end,
        created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
      `,
      [
        category,
        min,
        max,
        percentage,
        effective_start,
        effective_end || null,
        req.user?.id || null,
      ],
    );

    res.status(201).json({
      success: true,
      message: "Tarif TER berhasil ditambahkan.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("CREATE TER RATE:", error);

    res.status(500).json({
      success: false,
      message: "Gagal menambahkan tarif TER.",
    });
  }
};

// UPDATE MASTER TER
exports.updateRate = async (req, res) => {
  const { id } = req.params;

  const {
    category,
    min_income,
    max_income,
    rate,
    effective_start,
    effective_end,
  } = req.body;

  const min = Number(min_income);
  const max =
    max_income === "" || max_income == null ? null : Number(max_income);
  const percentage = Number(rate);

  if (
    !["A", "B", "C"].includes(category) ||
    !Number.isFinite(min) ||
    min < 0 ||
    (max !== null && (!Number.isFinite(max) || max < min)) ||
    !Number.isFinite(percentage) ||
    percentage < 0 ||
    percentage > 100 ||
    !effective_start
  ) {
    return res.status(400).json({
      success: false,
      message: "Data tarif TER tidak valid.",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE pph21_ter_rates
      SET
        category = $1,
        min_income = $2,
        max_income = $3,
        rate = $4,
        effective_start = $5,
        effective_end = $6,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
      `,
      [
        category,
        min,
        max,
        percentage,
        effective_start,
        effective_end || null,
        id,
      ],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Tarif TER tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      message: "Tarif TER berhasil diperbarui.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("UPDATE TER RATE:", error);

    res.status(500).json({
      success: false,
      message: "Gagal memperbarui tarif TER.",
    });
  }
};

// DELETE MASTER TER
exports.deleteRate = async (req, res) => {
  try {
    const result = await pool.query(
      `
      DELETE FROM pph21_ter_rates
      WHERE id = $1
      RETURNING id
      `,
      [req.params.id],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Tarif TER tidak ditemukan.",
      });
    }

    res.json({
      success: true,
      message: "Tarif TER berhasil dihapus.",
    });
  } catch (error) {
    console.error("DELETE TER RATE:", error);

    res.status(500).json({
      success: false,
      message: "Gagal menghapus tarif TER.",
    });
  }
};
