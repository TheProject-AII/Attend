const pool = require("../config/db");

exports.getDashboard = async (req, res) => {
  try {
    const allowedPeriods = [7, 14, 30];
    const period = allowedPeriods.includes(Number(req.query.period))
      ? Number(req.query.period)
      : 7;

    const [
      totalEmployee,
      presentToday,
      leaveToday,
      pendingLeaveToday,
      lateToday,
      attendanceToday,
      attendanceChart,
      contractAnnouncements,
    ] = await Promise.all([
      // TOTAL EMPLOYEE
      pool.query(`
        SELECT COUNT(*) AS total
        FROM users
        WHERE role_id = 3
          AND status = true
      `),

      // PRESENT TODAY
      pool.query(`
        SELECT COUNT(*) AS total
        FROM attendance
        WHERE attendance_date =
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date
      `),

      // APPROVED LEAVE TODAY
      pool.query(`
        SELECT COUNT(*) AS total
        FROM leave_requests
        WHERE status = 'APPROVED'
          AND (NOW() AT TIME ZONE 'Asia/Jakarta')::date
              BETWEEN start_date AND end_date
      `),

      // PENDING LEAVE
      pool.query(`
        SELECT COUNT(*) AS total
        FROM leave_requests
        WHERE status IN (
          'PENDING',
          'PENDING_SUPERVISOR',
          'PENDING_MANAGER'
        )
      `),

      // LATE TODAY
      pool.query(`
        SELECT COUNT(*) AS total
        FROM attendance
        WHERE attendance_date =
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date
          AND check_in IS NOT NULL
          AND check_in::time > '09:00:00'
      `),

      // ATTENDANCE TODAY
      pool.query(`
        SELECT
          a.id,
          u.name,
          u.department,
          TO_CHAR(a.check_in, 'HH24:MI') AS check_in,
          CASE
            WHEN a.check_out IS NULL THEN NULL
            ELSE TO_CHAR(a.check_out, 'HH24:MI')
          END AS check_out,
          CASE
            WHEN a.check_out IS NOT NULL THEN 'Pulang'
            WHEN a.check_in::time > '09:00:00' THEN 'Terlambat'
            ELSE 'Hadir'
          END AS status
        FROM attendance a
        JOIN users u ON u.id = a.user_id
        WHERE a.attendance_date =
          (NOW() AT TIME ZONE 'Asia/Jakarta')::date
        ORDER BY a.check_in ASC
      `),

      // ATTENDANCE CHART
      pool.query(
        `
        WITH days AS (
          SELECT generate_series(
            (NOW() AT TIME ZONE 'Asia/Jakarta')::date
              - ($1 - 1) * INTERVAL '1 day',
            (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
            INTERVAL '1 day'
          )::date AS attendance_date
        )
        SELECT
          d.attendance_date,
          COALESCE(COUNT(a.id), 0) AS total
        FROM days d
        LEFT JOIN attendance a
          ON a.attendance_date = d.attendance_date
        GROUP BY d.attendance_date
        ORDER BY d.attendance_date
        `,
        [period],
      ),

      // CONTRACT EXPIRY ANNOUNCEMENTS
      pool.query(`
        SELECT
          id,
          name,
          employee_type,
          contract_end_date,
          (
            contract_end_date -
            (NOW() AT TIME ZONE 'Asia/Jakarta')::date
          )::integer AS remaining_days,
          TO_CHAR(contract_end_date, 'DD Mon YYYY')
            AS contract_end_date_label
        FROM users
        WHERE role_id = 3
          AND status = true
          AND UPPER(TRIM(COALESCE(employee_type, '')))
              LIKE 'KONTRAK%'
          AND contract_end_date IS NOT NULL
          AND contract_end_date <=
              (NOW() AT TIME ZONE 'Asia/Jakarta')::date + 14
        ORDER BY
          contract_end_date ASC,
          name ASC
      `),
    ]);

    // FORMAT ATTENDANCE CHART
    const chart = attendanceChart.rows.map((item) => ({
      day: new Date(item.attendance_date).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        timeZone: "Asia/Jakarta",
      }),
      total: Number(item.total),
    }));

    const total = Number(totalEmployee.rows[0].total);
    const present = Number(presentToday.rows[0].total);

    // FORMAT CONTRACT ANNOUNCEMENTS
    const announcements = contractAnnouncements.rows.map((employee) => {
      const days = Number(employee.remaining_days);

      let category = "Reminder";
      let severity = "info";
      let title = "Contract Expiring Soon";
      let description = "";

      if (days < 0) {
        category = "Expired";
        severity = "error";
        title = "Contract Expired";

        description =
          `Kontrak ${employee.name} sudah berakhir ` +
          `${Math.abs(days)} hari yang lalu. ` +
          `Harap segera ditindaklanjuti oleh HR.`;
      } else if (days === 0) {
        category = "Expiring Today";
        severity = "error";
        title = "Contract Expiring Today";

        description =
          `Kontrak ${employee.name} berakhir hari ini. ` +
          `Harap segera ditindaklanjuti oleh HR.`;
      } else if (days <= 3) {
        category = "Urgent";
        severity = "error";

        description =
          `Kontrak ${employee.name} akan berakhir ` + `dalam ${days} hari.`;
      } else if (days <= 7) {
        category = "Important";
        severity = "warning";

        description =
          `Kontrak ${employee.name} akan berakhir ` + `dalam ${days} hari.`;
      } else {
        category = "Reminder";
        severity = "info";

        description =
          `Kontrak ${employee.name} akan berakhir ` + `dalam ${days} hari.`;
      }

      return {
        id: `contract-${employee.id}`,
        type: "CONTRACT_EXPIRY",
        title,
        name: employee.name,
        employeeType: employee.employee_type,
        date: employee.contract_end_date_label,
        contractEndDate: employee.contract_end_date,
        remainingDays: days,
        category,
        severity,
        description,
      };
    });

    // DASHBOARD RESPONSE
    res.json({
      success: true,
      data: {
        totalEmployee: total,
        present,
        leave: Number(leaveToday.rows[0].total),
        pendingLeave: Number(pendingLeaveToday.rows[0].total),
        late: Number(lateToday.rows[0].total),
        notCheckIn: Math.max(0, total - present),
        chart,
        attendance: attendanceToday.rows,
        announcements,
      },
    });
  } catch (err) {
    console.error("GET DASHBOARD ERROR:", err);

    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};
