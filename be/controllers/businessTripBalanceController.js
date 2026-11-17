const pool = require("../config/db");

const FINANCE_ROLE_ID = 6;

const getUserId = (req) => Number(req.user?.id);

async function ensureFinance(client, userId) {
  const result = await client.query(
    `SELECT id, role_id, is_active
     FROM users
     WHERE id = $1`,
    [userId],
  );

  if (
    !result.rows.length ||
    Number(result.rows[0].role_id) !== FINANCE_ROLE_ID ||
    result.rows[0].is_active === false
  ) {
    throw new Error("Akses hanya untuk Finance.");
  }
}

const BALANCE_SQL = `
  SELECT COALESCE(
    SUM(
      CASE
        WHEN direction = 'INCREASE' THEN amount
        WHEN direction = 'DECREASE' THEN -amount
        ELSE 0
      END
    ),
    0
  ) AS outstanding_balance
  FROM business_trip_balance_ledger
  WHERE employee_id = $1
`;

// =====================================================
// EMPLOYEE: MY OUTSTANDING BALANCE
// GET /api/business-trips/balance/me
// =====================================================
exports.getMyBalance = async (req, res) => {
  const userId = getUserId(req);
  const client = await pool.connect();

  try {
    const balanceResult = await client.query(BALANCE_SQL, [userId]);

    const historyResult = await client.query(
      `SELECT
         l.id,
         l.business_trip_id,
         l.settlement_id,
         l.entry_type,
         l.direction,
         l.amount,
         l.balance_after,
         l.description,
         l.reference_number,
         l.transaction_date,
         l.created_at,
         bt.trip_number,
         bt.destination,
         bt.departure_date,
         bt.return_date
       FROM business_trip_balance_ledger l
       LEFT JOIN business_trips bt
         ON bt.id = l.business_trip_id
       WHERE l.employee_id = $1
       ORDER BY l.transaction_date DESC, l.id DESC`,
      [userId],
    );

    return res.json({
      message: "Outstanding balance karyawan.",
      data: {
        employee_id: userId,
        outstanding_balance: balanceResult.rows[0].outstanding_balance,
        transactions: historyResult.rows,
      },
    });
  } catch (error) {
    console.error("getMyBalance:", error);
    return res.status(500).json({
      message: "Gagal mengambil outstanding balance.",
    });
  } finally {
    client.release();
  }
};

// =====================================================
// FINANCE: ALL EMPLOYEE BALANCES
// GET /api/business-trips/finance/balances
// =====================================================
exports.getAllBalances = async (req, res) => {
  const userId = getUserId(req);
  const client = await pool.connect();

  try {
    await ensureFinance(client, userId);

    const result = await client.query(
      `WITH balances AS (
         SELECT
           employee_id,
           SUM(
             CASE
               WHEN direction = 'INCREASE' THEN amount
               WHEN direction = 'DECREASE' THEN -amount
               ELSE 0
             END
           ) AS outstanding_balance,
           COUNT(*) AS transaction_count,
           MAX(transaction_date) AS last_transaction_date
         FROM business_trip_balance_ledger
         GROUP BY employee_id
       ),
       employee_profiles AS (
         SELECT DISTINCT ON (employee_id)
           employee_id,
           employee_name,
           employee_nik,
           employee_department,
           employee_position,
           employee_job_level
         FROM business_trips
         ORDER BY employee_id, created_at DESC
       )
       SELECT
         b.employee_id,
         ep.employee_name,
         ep.employee_nik,
         ep.employee_department,
         ep.employee_position,
         ep.employee_job_level,
         b.outstanding_balance,
         b.transaction_count,
         b.last_transaction_date
       FROM balances b
       LEFT JOIN employee_profiles ep
         ON ep.employee_id = b.employee_id
       WHERE b.outstanding_balance > 0
       ORDER BY b.outstanding_balance DESC, ep.employee_name ASC`,
    );

    return res.json({
      message: "Daftar outstanding balance karyawan.",
      data: result.rows,
    });
  } catch (error) {
    console.error("getAllBalances:", error);
    return res.status(403).json({
      message: error.message || "Tidak dapat mengambil saldo karyawan.",
    });
  } finally {
    client.release();
  }
};

// =====================================================
// FINANCE: EMPLOYEE BALANCE DETAIL
// GET /api/business-trips/finance/balances/:employeeId
// =====================================================
exports.getEmployeeBalanceDetail = async (req, res) => {
  const userId = getUserId(req);
  const employeeId = Number(req.params.employeeId);
  const client = await pool.connect();

  try {
    await ensureFinance(client, userId);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
      return res.status(400).json({
        message: "ID karyawan tidak valid.",
      });
    }

    const employeeResult = await client.query(
      `SELECT DISTINCT ON (employee_id)
         employee_id,
         employee_name,
         employee_nik,
         employee_department,
         employee_position,
         employee_job_level
       FROM business_trips
       WHERE employee_id = $1
       ORDER BY employee_id, created_at DESC`,
      [employeeId],
    );

    const balanceResult = await client.query(BALANCE_SQL, [employeeId]);

    const historyResult = await client.query(
      `SELECT
         l.id,
         l.business_trip_id,
         l.settlement_id,
         l.entry_type,
         l.direction,
         l.amount,
         l.balance_after,
         l.description,
         l.reference_number,
         l.transaction_date,
         l.created_at,
         bt.trip_number,
         bt.destination,
         bt.departure_date,
         bt.return_date
       FROM business_trip_balance_ledger l
       LEFT JOIN business_trips bt
         ON bt.id = l.business_trip_id
       WHERE l.employee_id = $1
       ORDER BY l.transaction_date DESC, l.id DESC`,
      [employeeId],
    );

    return res.json({
      message: "Detail outstanding balance karyawan.",
      data: {
        employee: employeeResult.rows[0] || {
          id: employeeId,
          employee_name: null,
        },
        outstanding_balance: balanceResult.rows[0].outstanding_balance,
        transactions: historyResult.rows,
      },
    });
  } catch (error) {
    console.error("getEmployeeBalanceDetail:", error);
    return res.status(403).json({
      message: error.message || "Gagal mengambil detail saldo.",
    });
  } finally {
    client.release();
  }
};
