const pool = require("../config/db");

const ADMIN_ROLES = ["ADMIN", "HR", "ADMIN HR"];

const isAdmin = (user) =>
  ADMIN_ROLES.includes(String(user.role || "").toUpperCase());

const validDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ""));

const {
  getEmployeeLateHistory,
} = require("../services/lateCompensationReportService");

const parsePagination = (query) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);

  const limit = Math.min(
    100,
    Math.max(1, Number.parseInt(query.limit, 10) || 20),
  );

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

// ==================================================
// GET /api/late-compensation/my-summary
// Ringkasan keterlambatan karyawan sendiri
// ==================================================
exports.mySummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        COALESCE(SUM(late_minutes), 0)::integer
          AS total_late_minutes,
        COALESCE(SUM(paid_minutes), 0)::integer
          AS total_paid_minutes,
        COALESCE(SUM(remaining_minutes), 0)::integer
          AS outstanding_minutes,
        COUNT(*)::integer AS total_late_days,
        COUNT(*) FILTER (
          WHERE status = 'PAID'
        )::integer AS paid_days,
        COUNT(*) FILTER (
          WHERE remaining_minutes > 0
        )::integer AS unpaid_days
      FROM attendance_late_debts
      WHERE user_id = $1
      `,
      [userId],
    );

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("MY LATE SUMMARY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil ringkasan keterlambatan.",
    });
  }
};

// ==================================================
// GET /api/late-compensation/my-history
// Riwayat utang dan pembayaran karyawan
// ==================================================

exports.myHistory = async (req, res) => {
  try {
    const userId = Number(req.user.id);

    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      100,
      Math.max(1, Number.parseInt(req.query.limit, 10) || 10),
    );

    const history = await getEmployeeLateHistory(userId);

    const total = history.length;
    const offset = (page - 1) * limit;

    return res.json({
      success: true,
      data: history.slice(offset, offset + limit),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("MY LATE HISTORY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat kompensasi.",
    });
  }
};

// ==================================================
// GET /api/late-compensation/employees
// Daftar saldo seluruh karyawan (Admin/HR)
// ==================================================

exports.employees = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    const page = Math.max(1, parseInt(req.query.page, 10) || 1);

    const limit = Math.min(
      100,
      Math.max(1, parseInt(req.query.limit, 10) || 10),
    );

    const offset = (page - 1) * limit;

    const search = String(req.query.search || "").trim();

    const status = String(req.query.status || "ALL").toUpperCase();

    if (!["ALL", "DEBT", "PAID"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Filter status tidak valid.",
      });
    }

    const baseQuery = `
      WITH employee_summary AS (
        SELECT
          u.id,
          u.name,
          u.email,
          u.company_email,
          u.department,

          COALESCE(
            SUM(d.late_minutes), 0
          )::integer AS total_late_minutes,

          COALESCE(
            SUM(d.paid_minutes), 0
          )::integer AS total_paid_minutes,

          COALESCE(
            SUM(d.remaining_minutes), 0
          )::integer AS outstanding_minutes

        FROM users u

        INNER JOIN attendance_late_debts d
          ON d.user_id = u.id

        GROUP BY
          u.id,
          u.name,
          u.email,
          u.company_email,
          u.department
      ),

      filtered_employees AS (
        SELECT *
        FROM employee_summary
        WHERE
          (
            $1 = ''
            OR name ILIKE '%' || $1 || '%'
            OR email ILIKE '%' || $1 || '%'
            OR company_email ILIKE '%' || $1 || '%'
          )
          AND (
            $2 = 'ALL'
            OR (
              $2 = 'DEBT'
              AND outstanding_minutes > 0
            )
            OR (
              $2 = 'PAID'
              AND outstanding_minutes = 0
            )
          )
      )
    `;

    const countResult = await pool.query(
      `
        ${baseQuery}
        SELECT COUNT(*)::integer AS total
        FROM filtered_employees
      `,
      [search, status],
    );

    const dataResult = await pool.query(
      `
        ${baseQuery}
        SELECT *
        FROM filtered_employees
        ORDER BY
          outstanding_minutes DESC,
          name ASC,
          id ASC
        LIMIT $3 OFFSET $4
      `,
      [search, status, limit, offset],
    );

    const total = Number(countResult.rows[0]?.total || 0);

    return res.json({
      success: true,
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("GET LATE COMPENSATION EMPLOYEES ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data kompensasi karyawan.",
    });
  }
};

// ==================================================
// GET /api/late-compensation/employees/:id
// Detail saldo karyawan (Admin/HR)
// ==================================================
exports.employeeDetail = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    const userId = Number(req.params.id);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "ID karyawan tidak valid.",
      });
    }

    const employeeResult = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        department,
        position
      FROM users
      WHERE id = $1
      `,
      [userId],
    );

    if (!employeeResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: "Employee Not Found.",
      });
    }

    const summaryResult = await pool.query(
      `
      SELECT
        COALESCE(SUM(late_minutes), 0)::integer
          AS total_late_minutes,

        COALESCE(SUM(paid_minutes), 0)::integer
          AS total_paid_minutes,

        COALESCE(SUM(remaining_minutes), 0)::integer
          AS outstanding_minutes

      FROM attendance_late_debts
      WHERE user_id = $1
      `,
      [userId],
    );

    // STEP 11:
    // Gunakan service history yang sama
    // dengan Employee App.
    const history = await getEmployeeLateHistory(userId);

    return res.json({
      success: true,
      employee: employeeResult.rows[0],
      summary: summaryResult.rows[0],
      history,
    });
  } catch (error) {
    console.error("EMPLOYEE LATE DETAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail keterlambatan.",
    });
  }
};

// ==================================================
// GET /api/late-compensation/payments
// Riwayat cicilan lintas karyawan (Admin/HR)
// ==================================================
exports.payments = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    const { page, limit, offset } = parsePagination(req.query);

    const { start_date, end_date } = req.query;

    if (
      (start_date && !validDate(start_date)) ||
      (end_date && !validDate(end_date))
    ) {
      return res.status(400).json({
        success: false,
        message: "Format tanggal harus YYYY-MM-DD.",
      });
    }

    const countResult = await pool.query(
      `
      SELECT COUNT(*)::integer AS total
      FROM attendance_late_payments p
      WHERE ($1::date IS NULL OR p.payment_date >= $1)
        AND ($2::date IS NULL OR p.payment_date <= $2)
      `,
      [start_date || null, end_date || null],
    );

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.user_id,
        u.name,
        u.department,
        p.debt_id,
        d.debt_date,
        p.attendance_id,
        p.payment_date,
        p.paid_minutes,
        d.remaining_minutes,
        d.status AS debt_status

      FROM attendance_late_payments p

      JOIN attendance_late_debts d
        ON d.id = p.debt_id

      JOIN users u
        ON u.id = p.user_id

      WHERE ($1::date IS NULL OR p.payment_date >= $1)
        AND ($2::date IS NULL OR p.payment_date <= $2)

      ORDER BY
        p.payment_date DESC,
        p.id DESC

      LIMIT $3 OFFSET $4
      `,
      [start_date || null, end_date || null, limit, offset],
    );

    const total = countResult.rows[0].total;

    return res.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("LATE PAYMENTS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil riwayat pembayaran.",
    });
  }
};

exports.globalSummary = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    const result = await pool.query(`
      SELECT
        COUNT(DISTINCT user_id)::integer
          AS total_employees_with_late,

        COUNT(DISTINCT user_id)
          FILTER (WHERE remaining_minutes > 0)::integer
          AS employees_with_debt,

        COALESCE(SUM(late_minutes), 0)::integer
          AS total_late_minutes,

        COALESCE(SUM(paid_minutes), 0)::integer
          AS total_paid_minutes,

        COALESCE(SUM(remaining_minutes), 0)::integer
          AS outstanding_minutes

      FROM attendance_late_debts
    `);

    return res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("GLOBAL LATE SUMMARY ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil ringkasan kompensasi.",
    });
  }
};
