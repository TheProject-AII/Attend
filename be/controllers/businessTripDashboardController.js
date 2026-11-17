const pool = require("../config/db");

const ROLE = {
  ADMIN_HR: 1,
  HR: 2,
  EMPLOYEE: 3,
  MANAGER: 5,
  FINANCE: 6,
  DIRECTOR: 7,
};

const getUserId = (req) => Number(req.user?.id);

async function getCurrentUser(client, userId) {
  const result = await client.query(
    `SELECT id, role_id, job_level, status
   FROM users
   WHERE id = $1`,
    [userId],
  );

  if (!result.rows.length || result.rows[0].status === false) {
    throw new Error("Akun tidak aktif atau tidak ditemukan.");
  }

  return result.rows[0];
}

// =====================================================
// EMPLOYEE: MY BUSINESS TRIP HISTORY
// GET /history/me
// =====================================================
exports.getMyTripHistory = async (req, res) => {
  const userId = getUserId(req);
  const page = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(
    Math.max(Number.parseInt(req.query.limit, 10) || 10, 1),
    100,
  );
  const offset = (page - 1) * limit;
  const status = String(req.query.status || "")
    .trim()
    .toUpperCase();

  const client = await pool.connect();

  try {
    const user = await getCurrentUser(client, userId);

    if (![ROLE.EMPLOYEE, ROLE.MANAGER].includes(Number(user.role_id))) {
      return res.status(403).json({
        message: "Endpoint ini hanya untuk peserta perjalanan dinas.",
      });
    }

    const params = [userId];
    let statusFilter = "";

    if (status) {
      params.push(status);
      statusFilter = `AND bt.status = $${params.length}`;
    }

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM business_trips bt
       WHERE bt.employee_id = $1
       ${statusFilter}`,
      params,
    );

    params.push(limit, offset);

    const result = await client.query(
      `SELECT
    bt.id,
    bt.trip_number,
    bt.employee_id,
    bt.employee_name,
    bt.employee_department,
    bt.employee_position,
    bt.employee_job_level,
    bt.destination,
    bt.purpose,
    bt.departure_date,
    bt.return_date,
    bt.duration_days,
    bt.hotel_nights,
    bt.transport_estimate,
    bt.hotel_estimate,
    bt.fnb_estimate,
    bt.total_estimate,
    bt.status,
    bt.submitted_at,
    bt.approved_at,
    bt.completed_at,
    bt.created_at,
    d.disbursement_amount,
    d.status AS disbursement_status,
    s.id AS settlement_id,
    s.status AS settlement_status,
    s.total_approved_expense,
    s.remaining_balance,
    s.additional_payment
       FROM business_trips bt
       LEFT JOIN business_trip_disbursements d
         ON d.business_trip_id = bt.id
       LEFT JOIN business_trip_settlements s
         ON s.business_trip_id = bt.id
       WHERE bt.employee_id = $1
       ${statusFilter}
       ORDER BY bt.created_at DESC
       LIMIT $${params.length - 1}
       OFFSET $${params.length}`,
      params,
    );

    return res.json({
      message: "Riwayat perjalanan dinas.",
      data: result.rows,
      pagination: {
        page,
        limit,
        total: countResult.rows[0].total,
        total_pages: Math.ceil(countResult.rows[0].total / limit),
      },
    });
  } catch (error) {
    console.error("getMyTripHistory:", error);
    return res.status(500).json({
      message: error.message || "Gagal mengambil riwayat perjalanan.",
    });
  } finally {
    client.release();
  }
};

// =====================================================
// ROLE-BASED DASHBOARD SUMMARY
// GET /dashboard/summary
// =====================================================
exports.getDashboardSummary = async (req, res) => {
  const userId = getUserId(req);
  const client = await pool.connect();

  try {
    const user = await getCurrentUser(client, userId);
    const roleId = Number(user.role_id);
    const jobLevel = String(user.job_level || "").toLowerCase();

    let summary = {};

    // ADMIN HR
    if (roleId === ROLE.ADMIN_HR) {
      const result = await client.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'PENDING_MANAGER')::int AS pending_manager,
           COUNT(*) FILTER (WHERE status = 'PENDING_HR')::int AS pending_hr,
           COUNT(*) FILTER (WHERE status = 'PENDING_DIRECTOR')::int AS pending_director,
           COUNT(*) FILTER (WHERE status = 'PENDING_FINANCE')::int AS pending_finance,
           COUNT(*) FILTER (WHERE status = 'ON_TRIP')::int AS on_trip,
           COUNT(*) FILTER (WHERE status = 'SETTLEMENT')::int AS settlement,
           COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'CANCELLED')::int AS cancelled,
           COUNT(*) FILTER (WHERE status = 'REJECTED')::int AS rejected
         FROM business_trips`,
      );

      summary = {
        role: "ADMIN_HR",
        trips: result.rows[0],
      };
    }

    // HR
    else if (roleId === ROLE.HR) {
      const [approval, cancellation, trips] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM business_trip_approvals
           WHERE approver_id = $1
             AND approval_stage = 'HR'
             AND status = 'PENDING'`,
          [userId],
        ),
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM business_trip_cancellations
           WHERE hr_id = $1
             AND status = 'PENDING_HR'`,
          [userId],
        ),
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM business_trips
           WHERE status = 'PENDING_HR'`,
        ),
      ]);

      summary = {
        role: "HR",
        pending_trip_approvals: approval.rows[0].total,
        pending_cancellations: cancellation.rows[0].total,
        total_pending_hr: trips.rows[0].total,
      };
    }

    // FINANCE
    else if (roleId === ROLE.FINANCE) {
      const [approvals, disbursements, settlements, refunds, balances] =
        await Promise.all([
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM business_trip_approvals
             WHERE approver_id = $1
               AND approval_stage = 'FINANCE'
               AND status = 'PENDING'`,
            [userId],
          ),
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM business_trips
             WHERE status = 'PENDING_FINANCE'
               AND current_approver_id = $1`,
            [userId],
          ),
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM business_trip_settlements
             WHERE status = 'SUBMITTED'`,
          ),
          client.query(
            `SELECT COUNT(*)::int AS total
             FROM business_trip_cancellations
             WHERE status = 'PENDING_REFUND'
               AND finance_status = 'PENDING'`,
          ),
          client.query(
            `SELECT COALESCE(SUM(balance), 0) AS total
             FROM (
               SELECT employee_id,
                 SUM(
                   CASE
                     WHEN direction = 'INCREASE' THEN amount
                     WHEN direction = 'DECREASE' THEN -amount
                     ELSE 0
                   END
                 ) AS balance
               FROM business_trip_balance_ledger
               GROUP BY employee_id
             ) balances
             WHERE balance > 0`,
          ),
        ]);

      summary = {
        role: "FINANCE",
        pending_approvals: approvals.rows[0].total,
        pending_disbursements: disbursements.rows[0].total,
        pending_settlements: settlements.rows[0].total,
        pending_refunds: refunds.rows[0].total,
        total_employee_outstanding: balances.rows[0].total,
      };
    }

    // DIRECTOR
    else if (roleId === ROLE.DIRECTOR) {
      const result = await client.query(
        `SELECT COUNT(*)::int AS total
         FROM business_trip_approvals
         WHERE approver_id = $1
           AND approval_stage = 'DIRECTOR'
           AND status = 'PENDING'`,
        [userId],
      );

      summary = {
        role: "DIRECTOR",
        pending_approvals: result.rows[0].total,
      };
    }

    // MANAGER OR SUPERVISOR
    else if (
      roleId === ROLE.MANAGER ||
      (roleId === ROLE.EMPLOYEE && jobLevel === "supervisor")
    ) {
      const [approvals, cancellations, ownTrips] = await Promise.all([
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM business_trip_approvals
           WHERE approver_id = $1
             AND approval_stage = 'MANAGER'
             AND status = 'PENDING'`,
          [userId],
        ),
        client.query(
          `SELECT COUNT(*)::int AS total
           FROM business_trip_cancellations
           WHERE manager_id = $1
             AND status = 'PENDING_MANAGER'`,
          [userId],
        ),
        client.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'ON_TRIP')::int AS on_trip,
             COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
           FROM business_trips
           WHERE employee_id = $1`,
          [userId],
        ),
      ]);

      summary = {
        role: "MANAGER",
        pending_approvals: approvals.rows[0].total,
        pending_cancellations: cancellations.rows[0].total,
        own_trips: ownTrips.rows[0],
      };
    }

    // EMPLOYEE
    else if (roleId === ROLE.EMPLOYEE) {
      const [trips, balance] = await Promise.all([
        client.query(
          `SELECT
             COUNT(*)::int AS total,
             COUNT(*) FILTER (WHERE status = 'DRAFT')::int AS draft,
             COUNT(*) FILTER (WHERE status = 'PENDING_MANAGER')::int AS pending,
             COUNT(*) FILTER (WHERE status = 'ON_TRIP')::int AS on_trip,
             COUNT(*) FILTER (WHERE status = 'SETTLEMENT')::int AS settlement,
             COUNT(*) FILTER (WHERE status = 'COMPLETED')::int AS completed
           FROM business_trips
           WHERE employee_id = $1`,
          [userId],
        ),
        client.query(
          `SELECT COALESCE(
             SUM(
               CASE
                 WHEN direction = 'INCREASE' THEN amount
                 WHEN direction = 'DECREASE' THEN -amount
                 ELSE 0
               END
             ), 0
           ) AS outstanding_balance
           FROM business_trip_balance_ledger
           WHERE employee_id = $1`,
          [userId],
        ),
      ]);

      summary = {
        role: "EMPLOYEE",
        trips: trips.rows[0],
        outstanding_balance: balance.rows[0].outstanding_balance,
      };
    } else {
      return res.status(403).json({
        message: "Role tidak memiliki akses ke dashboard Business Trip.",
      });
    }

    return res.json({
      message: "Dashboard Business Trip.",
      data: summary,
    });
  } catch (error) {
    console.error("getDashboardSummary:", error);
    return res.status(500).json({
      message: error.message || "Gagal mengambil ringkasan dashboard.",
    });
  } finally {
    client.release();
  }
};
