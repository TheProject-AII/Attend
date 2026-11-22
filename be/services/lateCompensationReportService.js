const pool = require("../config/db");

/**
 * Mengambil riwayat kompensasi beserta saldo berjalan.
 *
 * Saldo utang:
 * - late_minutes menambah utang.
 * - paid_today mengurangi utang.
 *
 * Company Time Credit:
 * - EARNED menambah saldo kredit.
 * - USED mengurangi saldo kredit.
 *
 * Saldo berjalan tidak di-reset berdasarkan periode payroll.
 */
async function getEmployeeLateHistory(userId) {
  const result = await pool.query(
    `
    WITH daily AS (
      SELECT
        a.id AS attendance_id,
        a.attendance_date,
        a.check_in,
        a.check_out,
        a.attendance_type,

        COALESCE(d.late_minutes, 0)::integer
          AS late_minutes,

        COALESCE(p.paid_today, 0)::integer
          AS paid_today,

        COALESCE(d.paid_minutes, 0)::integer
          AS debt_paid_minutes,

        COALESCE(d.remaining_minutes, 0)::integer
          AS debt_remaining_minutes,

        COALESCE(d.status, 'NO_DEBT')
          AS debt_status,

        COALESCE(c.company_credit_earned, 0)::integer
          AS company_credit_earned,

        COALESCE(c.company_credit_used, 0)::integer
          AS company_credit_used,

        (
          COALESCE(c.company_credit_earned, 0)
          - COALESCE(c.company_credit_used, 0)
        )::integer AS company_credit_net

      FROM attendance a

      JOIN attendance_late_processing alp
        ON alp.attendance_id = a.id

      LEFT JOIN attendance_late_debts d
        ON d.attendance_id = a.id

      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(lp.paid_minutes), 0)::integer
            AS paid_today
        FROM attendance_late_payments lp
        WHERE lp.attendance_id = a.id
      ) p ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            SUM(cl.minutes) FILTER (
              WHERE cl.transaction_type = 'EARNED'
            ), 0
          )::integer AS company_credit_earned,

          COALESCE(
            SUM(cl.minutes) FILTER (
              WHERE cl.transaction_type = 'USED'
            ), 0
          )::integer AS company_credit_used

        FROM attendance_company_credit_ledger cl
        WHERE cl.attendance_id = a.id
          AND cl.user_id = a.user_id
      ) c ON TRUE

      WHERE a.user_id = $1
    ),

    running AS (
      SELECT
        daily.*,

        COALESCE(
          SUM(late_minutes - paid_today)
          OVER (
            ORDER BY
              attendance_date ASC,
              check_in ASC NULLS FIRST,
              attendance_id ASC
            ROWS BETWEEN
              UNBOUNDED PRECEDING
              AND CURRENT ROW
          ),
          0
        )::integer AS closing_balance,

        COALESCE(
          SUM(company_credit_net)
          OVER (
            ORDER BY
              attendance_date ASC,
              check_in ASC NULLS FIRST,
              attendance_id ASC
            ROWS BETWEEN
              UNBOUNDED PRECEDING
              AND CURRENT ROW
          ),
          0
        )::integer AS closing_company_credit_balance

      FROM daily
    )

    SELECT
      *,

      (
        closing_balance
        - late_minutes
        + paid_today
      )::integer AS opening_balance,

      (
        closing_company_credit_balance
        - company_credit_earned
        + company_credit_used
      )::integer AS opening_company_credit_balance

    FROM running

    ORDER BY
      attendance_date DESC,
      check_in DESC NULLS LAST,
      attendance_id DESC
    `,
    [userId],
  );

  return result.rows;
}

module.exports = {
  getEmployeeLateHistory,
};
