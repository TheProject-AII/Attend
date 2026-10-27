const ExcelJS = require("exceljs");
const pool = require("../config/db");

function isAdmin(user) {
  const role = String(user?.role_name || user?.role?.name || user?.role || "")
    .trim()
    .toUpperCase();

  return ["ADMIN", "HR", "ADMIN HR"].includes(role);
}

function minutes(value) {
  return Number(value || 0);
}

function formatDate(value) {
  if (!value) return "";
  return String(value).slice(0, 10);
}

function styleSheet(sheet) {
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: sheet.columnCount },
  };

  const header = sheet.getRow(1);
  header.height = 27;

  header.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF243B53" },
    };
    cell.alignment = {
      vertical: "middle",
      wrapText: true,
    };
  });

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;

    if (rowNumber % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF1F5F9" },
        };
      });
    }
  });
}

exports.exportExcel = async (req, res) => {
  try {
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Akses ditolak.",
      });
    }

    const status = String(req.query.status || "ALL").toUpperCase();

    const search = String(req.query.search || "").trim();

    if (!["ALL", "DEBT", "PAID"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Filter status tidak valid.",
      });
    }

    // Filter karyawan sama dengan endpoint employees.
    const employeeResult = await pool.query(
      `
      WITH employee_summary AS (
        SELECT
          u.id,
          u.name,
          u.email,
          u.company_email,
          u.department,
          COALESCE(SUM(d.late_minutes), 0)::integer
            AS total_late_minutes,
          COALESCE(SUM(d.paid_minutes), 0)::integer
            AS total_paid_minutes,
          COALESCE(SUM(d.remaining_minutes), 0)::integer
            AS outstanding_minutes
        FROM users u
        INNER JOIN attendance_late_debts d
          ON d.user_id = u.id
        GROUP BY
          u.id,
          u.name,
          u.email,
          u.company_email,
          u.department
      )
      SELECT *
      FROM employee_summary
      WHERE (
        $1 = ''
        OR name ILIKE '%' || $1 || '%'
        OR email ILIKE '%' || $1 || '%'
        OR company_email ILIKE '%' || $1 || '%'
      )
      AND (
        $2 = 'ALL'
        OR ($2 = 'DEBT' AND outstanding_minutes > 0)
        OR ($2 = 'PAID' AND outstanding_minutes = 0)
      )
      ORDER BY outstanding_minutes DESC, name ASC, id ASC
      `,
      [search, status],
    );

    const employees = employeeResult.rows;
    const employeeIds = employees.map((employee) => Number(employee.id));

    let dailyRows = [];
    let paymentRows = [];

    if (employeeIds.length) {
      const [dailyResult, paymentResult] = await Promise.all([
        pool.query(
          `
            SELECT
              a.user_id,
              a.id AS attendance_id,
              a.attendance_date::text AS attendance_date,
              a.attendance_type,
              a.check_in::text AS check_in,
              a.check_out::text AS check_out,
              COALESCE(d.late_minutes, 0)::integer
                AS late_minutes,
              COALESCE(d.paid_minutes, 0)::integer
                AS debt_paid_minutes,
              COALESCE(d.remaining_minutes, 0)::integer
                AS debt_remaining_minutes,
              COALESCE(d.status, 'NO_DEBT')
                AS debt_status,
              COALESCE(p.paid_today, 0)::integer
                AS paid_today
            FROM attendance a
            INNER JOIN attendance_late_processing alp
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
            WHERE a.user_id = ANY($1::integer[])
            ORDER BY
              a.user_id ASC,
              a.attendance_date ASC,
              a.check_in ASC,
              a.id ASC
            `,
          [employeeIds],
        ),

        pool.query(
          `
            SELECT
              lp.user_id,
              lp.payment_date::text AS payment_date,
              lp.attendance_id AS payment_attendance_id,
              d.attendance_id AS debt_attendance_id,
              d.debt_date::text AS debt_date,
              d.late_minutes,
              d.paid_minutes AS total_debt_paid,
              d.remaining_minutes,
              d.status AS debt_status,
              lp.paid_minutes AS payment_minutes
            FROM attendance_late_payments lp
            INNER JOIN attendance_late_debts d
              ON d.id = lp.debt_id
            WHERE lp.user_id = ANY($1::integer[])
            ORDER BY
              lp.payment_date ASC,
              lp.id ASC
            `,
          [employeeIds],
        ),
      ]);

      dailyRows = dailyResult.rows;
      paymentRows = paymentResult.rows;
    }

    const employeeMap = new Map(
      employees.map((employee) => [Number(employee.id), employee]),
    );

    const workbook = new ExcelJS.Workbook();

    workbook.creator = "HRIS";
    workbook.created = new Date();

    // SHEET 1 - RINGKASAN
    const summarySheet = workbook.addWorksheet("Ringkasan Karyawan");

    summarySheet.columns = [
      { header: "No", key: "no", width: 8 },
      { header: "ID", key: "id", width: 12 },
      { header: "Nama", key: "name", width: 30 },
      { header: "Email Kantor", key: "email", width: 34 },
      { header: "Departemen", key: "department", width: 23 },
      { header: "Total Terlambat (Menit)", key: "late", width: 27 },
      { header: "Terbayar (Menit)", key: "paid", width: 23 },
      { header: "Sisa Utang (Menit)", key: "outstanding", width: 25 },
      { header: "Status", key: "status", width: 18 },
    ];

    employees.forEach((employee, index) => {
      const outstanding = minutes(employee.outstanding_minutes);

      summarySheet.addRow({
        no: index + 1,
        id: Number(employee.id),
        name: employee.name || "",
        email: employee.company_email || employee.email || "",
        department: employee.department || "",
        late: minutes(employee.total_late_minutes),
        paid: minutes(employee.total_paid_minutes),
        outstanding,
        status: outstanding > 0 ? "Masih Ada Utang" : "Sudah Lunas",
      });
    });

    styleSheet(summarySheet);

    // SHEET 2 - RIWAYAT HARIAN
    const dailySheet = workbook.addWorksheet("Riwayat Harian");

    dailySheet.columns = [
      { header: "ID Karyawan", key: "userId", width: 15 },
      { header: "Nama", key: "name", width: 30 },
      { header: "Tanggal", key: "date", width: 17 },
      { header: "Tipe Absensi", key: "type", width: 20 },
      { header: "Check In", key: "checkIn", width: 27 },
      { header: "Check Out", key: "checkOut", width: 27 },
      { header: "Terlambat (Menit)", key: "late", width: 23 },
      { header: "Dibayar Hari Ini (Menit)", key: "paidToday", width: 29 },
      { header: "Utang Hari Ini Terbayar (Menit)", key: "debtPaid", width: 34 },
      { header: "Sisa Utang Hari Ini (Menit)", key: "remaining", width: 31 },
      { header: "Status Utang Hari Ini", key: "status", width: 24 },
      { header: "Saldo Akhir (Menit)", key: "balance", width: 23 },
    ];

    const balances = new Map();

    dailyRows.forEach((item) => {
      const userId = Number(item.user_id);
      const employee = employeeMap.get(userId);

      const previousBalance = balances.get(userId) || 0;
      const closingBalance =
        previousBalance + minutes(item.late_minutes) - minutes(item.paid_today);

      balances.set(userId, closingBalance);

      dailySheet.addRow({
        userId,
        name: employee?.name || "",
        date: formatDate(item.attendance_date),
        type: item.attendance_type || "",
        checkIn: item.check_in || "",
        checkOut: item.check_out || "",
        late: minutes(item.late_minutes),
        paidToday: minutes(item.paid_today),
        debtPaid: minutes(item.debt_paid_minutes),
        remaining: minutes(item.debt_remaining_minutes),
        status: item.debt_status,
        balance: closingBalance,
      });
    });

    styleSheet(dailySheet);

    // SHEET 3 - PEMBAYARAN FIFO
    const paymentSheet = workbook.addWorksheet("Pembayaran FIFO");

    paymentSheet.columns = [
      { header: "ID Karyawan", key: "userId", width: 15 },
      { header: "Nama", key: "name", width: 30 },
      { header: "Tanggal Kompensasi", key: "paymentDate", width: 25 },
      {
        header: "ID Absensi Kompensasi",
        key: "paymentAttendanceId",
        width: 27,
      },
      { header: "Tanggal Utang", key: "debtDate", width: 21 },
      { header: "ID Absensi Utang", key: "debtAttendanceId", width: 24 },
      { header: "Utang Awal (Menit)", key: "late", width: 23 },
      { header: "Dibayar Transaksi Ini (Menit)", key: "payment", width: 32 },
      { header: "Total Utang Terbayar (Menit)", key: "totalPaid", width: 32 },
      { header: "Sisa Utang (Menit)", key: "remaining", width: 23 },
      { header: "Status Utang", key: "status", width: 20 },
    ];

    paymentRows.forEach((item) => {
      const employee = employeeMap.get(Number(item.user_id));

      paymentSheet.addRow({
        userId: Number(item.user_id),
        name: employee?.name || "",
        paymentDate: formatDate(item.payment_date),
        paymentAttendanceId: Number(item.payment_attendance_id),
        debtDate: formatDate(item.debt_date),
        debtAttendanceId: Number(item.debt_attendance_id),
        late: minutes(item.late_minutes),
        payment: minutes(item.payment_minutes),
        totalPaid: minutes(item.total_debt_paid),
        remaining: minutes(item.remaining_minutes),
        status: item.debt_status,
      });
    });

    styleSheet(paymentSheet);

    const filename =
      `Late_Compensation_${status}_` +
      `${new Date().toISOString().slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );

    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    return res.end();
  } catch (error) {
    console.error("EXPORT LATE COMPENSATION ERROR:", error);

    if (res.headersSent) {
      return res.destroy(error);
    }

    return res.status(500).json({
      success: false,
      message: "Gagal export Late Compensation.",
    });
  }
};
