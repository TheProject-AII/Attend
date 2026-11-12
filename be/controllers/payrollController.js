const pool = require("../config/db");
const PRIDE_ROLES = {
  ADMIN_HR: 1,
  HR: 2,
  FINANCE: 6,
  DIRECTOR: 7,
};

const getRoleId = (req) => Number(req.user?.role_id);

const hasRole = (req, ...roleIds) => roleIds.includes(getRoleId(req));
const roundRupiah = (value) => Math.round(Number(value || 0));

const getTerCategory = (ptkpStatus) => {
  const status = String(ptkpStatus || "").toUpperCase();

  if (["TK/0", "TK/1", "K/0"].includes(status)) return "A";
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(status)) return "B";
  if (status === "K/3") return "C";

  return null;
};

const calculatePayroll = async (client, employee, periodEnd) => {
  const employeeType = String(employee.employee_type || "").toUpperCase();
  const isIntern = employeeType === "KONTRAK_INTERN";
  const isProbation = ["PROBATION", "KONTRAK_3_BULAN"].includes(employeeType);
  const divisor = Number(
    employee.payroll_divisor || (employee.work_schedule === "6_DAYS" ? 26 : 22),
  );
  const presentDays = Number(employee.intern_present_days || 0);
  const internFactor = isIntern && divisor > 0 ? presentDays / divisor : 1;

  const basic = Number(employee.basic_salary || 0) * internFactor;
  const position = Number(employee.position_allowance || 0) * internFactor;
  const transport = Number(employee.transport_allowance || 0) * internFactor;
  const meal = Number(employee.meal_allowance || 0) * internFactor;

  const gross = roundRupiah(basic + position + transport + meal);

  // BPJS tidak dipotong untuk probation dan intern.
  const hasBpjsDeduction = !isProbation && !isIntern;
  const jhtRate = hasBpjsDeduction ? 2 : 0;
  const jpRate = hasBpjsDeduction ? 1 : 0;
  const healthRate = hasBpjsDeduction ? 1 : 0;

  // Plafon JP 2026. Perlu diperbarui mengikuti ketentuan tahun berikutnya.
  const jpCap = 11086300;

  const jht = roundRupiah(basic * (jhtRate / 100));
  const jpBase = Math.min(basic, jpCap);
  const jp = roundRupiah(jpBase * (jpRate / 100));

  const healthBase = basic;
  const health = roundRupiah(healthBase * (healthRate / 100));

  const category = getTerCategory(employee.ptkp_status);

  let terRate = 0;
  let pph21 = 0;

  if (category && gross > 0) {
    const terResult = await client.query(
      `SELECT rate
       FROM pph21_ter_rates
       WHERE category = $1
         AND min_income <= $2
         AND (max_income IS NULL OR max_income >= $2)
         AND effective_start <= $3::date
         AND (effective_end IS NULL OR effective_end >= $3::date)
       ORDER BY effective_start DESC
       LIMIT 1`,
      [category, gross, periodEnd],
    );

    if (terResult.rowCount > 0) {
      terRate = Number(terResult.rows[0].rate || 0);
      pph21 = roundRupiah(gross * (terRate / 100));
    }
  }

  return {
    gross,
    jhtRate,
    jpRate,
    healthRate,
    jht,
    jpBase,
    jp,
    healthBase,
    health,
    category,
    terRate,
    pph21,
    employeeType,
    isIntern,
    isProbation,
    presentDays,
    internFactor,
  };
};

// GET: Daftar karyawan dan master salary
exports.getEmployees = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id AS user_id,
        u.nik,
        u.nip,
        u.name,
        u.department,
        u.position,
        u.company_id,
        u.working_hours_setting_id,
        whs.work_schedule,
        es.id AS salary_id,
        COALESCE(es.position_allowance, 0) AS position_allowance,
        COALESCE(es.basic_salary, 0) AS basic_salary,
        COALESCE(es.transport_allowance, 0) AS transport_allowance,
        COALESCE(es.meal_allowance, 0) AS meal_allowance,
        es.effective_date
      FROM users u
      LEFT JOIN working_hours_settings whs
        ON whs.id = u.working_hours_setting_id
      LEFT JOIN employee_salaries es
        ON es.user_id = u.id
        AND es.end_date IS NULL
      WHERE u.status = true
  AND COALESCE(u.is_system_account, FALSE) = FALSE
      ORDER BY u.name ASC
    `);

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Get payroll employees:", error);
    res.status(500).json({
      success: false,
      message: "Gagal mengambil data karyawan",
    });
  }
};

// POST: Simpan atau update master salary
exports.saveSalary = async (req, res) => {
  const {
    user_id,
    basic_salary,
    position_allowance = 0,
    transport_allowance,
    meal_allowance,
    effective_date,
  } = req.body;

  const client = await pool.connect();

  try {
    if (
      !user_id ||
      basic_salary == null ||
      transport_allowance == null ||
      meal_allowance == null ||
      !effective_date
    ) {
      return res.status(400).json({
        success: false,
        message: "Semua komponen gaji wajib diisi",
      });
    }

    const values = [
      basic_salary,
      position_allowance,
      transport_allowance,
      meal_allowance,
    ];

    if (values.some((v) => !Number.isFinite(Number(v)) || Number(v) < 0)) {
      return res.status(400).json({
        success: false,
        message: "Nominal gaji tidak valid",
      });
    }

    await client.query("BEGIN");

    const employee = await client.query(
      "SELECT id FROM users WHERE id = $1 AND status = true",
      [user_id],
    );

    if (!employee.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Karyawan tidak ditemukan",
      });
    }

    const current = await client.query(
      `SELECT * FROM employee_salaries
       WHERE user_id = $1 AND end_date IS NULL
       FOR UPDATE`,
      [user_id],
    );

    if (current.rowCount) {
      const old = current.rows[0];

      const unchanged =
        Number(old.basic_salary) === Number(basic_salary) &&
        Number(old.position_allowance || 0) === Number(position_allowance) &&
        Number(old.transport_allowance) === Number(transport_allowance) &&
        Number(old.meal_allowance) === Number(meal_allowance);

      if (unchanged) {
        await client.query("ROLLBACK");
        return res.json({
          success: true,
          message: "Tidak ada perubahan nominal",
        });
      }

      if (effective_date <= old.effective_date) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message:
            "Tanggal efektif harus setelah tanggal efektif gaji sebelumnya",
        });
      }

      await client.query(
        `UPDATE employee_salaries
         SET end_date = $1::date - INTERVAL '1 day',
             updated_at = NOW()
         WHERE id = $2`,
        [effective_date, old.id],
      );
    }

    const saved = await client.query(
      `INSERT INTO employee_salaries (
        user_id,
        basic_salary,
        position_allowance,
        transport_allowance,
        meal_allowance,
        effective_date,
        created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        user_id,
        basic_salary,
        position_allowance,
        transport_allowance,
        meal_allowance,
        effective_date,
        req.user?.id || null,
      ],
    );

    await client.query("COMMIT");

    res.json({
      success: true,
      message: "Master salary berhasil disimpan",
      data: saved.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Save salary:", error);

    res.status(500).json({
      success: false,
      message: "Gagal menyimpan salary",
    });
  } finally {
    client.release();
  }
};

// GET PAYROLL PERIODS
exports.getPeriods = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        pp.id,
        pp.period_name,
        TO_CHAR(pp.start_date, 'YYYY-MM-DD') AS start_date,
        TO_CHAR(pp.end_date, 'YYYY-MM-DD') AS end_date,
        TO_CHAR(pp.payment_date, 'YYYY-MM-DD') AS payment_date,
        pp.status,
        pp.created_by,
        pp.approved_by,
        pp.approved_at,
        pp.created_at,
        pp.updated_at,
        EXISTS (
          SELECT 1
          FROM payroll_details pd
          WHERE pd.payroll_period_id = pp.id
        ) AS is_generated
      FROM payroll_periods pp
      ORDER BY pp.start_date DESC
    `);

    return res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("GET PAYROLL PERIODS:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil periode payroll.",
    });
  }
};

// CREATE PAYROLL PERIOD
exports.createPeriod = async (req, res) => {
  const { month } = req.body;

  if (!month || !/^\d{4}-\d{2}$/.test(month)) {
    return res.status(400).json({
      success: false,
      message: "Format bulan harus YYYY-MM.",
    });
  }

  const client = await pool.connect();

  try {
    const [year, monthNumber] = month.split("-").map(Number);

    if (monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        success: false,
        message: "Bulan tidak valid.",
      });
    }

    // Cut-off: tanggal 21 bulan sebelumnya
    const startDate = new Date(Date.UTC(year, monthNumber - 2, 21));

    // Cut-off: tanggal 20 bulan berjalan
    const endDate = new Date(Date.UTC(year, monthNumber - 1, 20));

    // Pembayaran: hari terakhir bulan berjalan
    const paymentDate = new Date(Date.UTC(year, monthNumber, 0));

    const formatDate = (date) => date.toISOString().slice(0, 10);

    const start = formatDate(startDate);
    const end = formatDate(endDate);

    const payment = formatDate(paymentDate);

    const periodName = new Date(
      Date.UTC(year, monthNumber - 1, 1),
    ).toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    });

    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT id
       FROM payroll_periods
       WHERE start_date = $1
          OR end_date = $2`,
      [start, end],
    );

    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");

      return res.status(409).json({
        success: false,
        message: "Periode payroll bulan tersebut sudah tersedia.",
      });
    }

    const result = await client.query(
      `INSERT INTO payroll_periods
       (period_name, start_date, end_date, payment_date, status, created_by)
       VALUES ($1, $2, $3, $4, 'DRAFT', $5)
       RETURNING *`,
      [periodName, start, end, payment, req.user?.id || null],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Periode payroll berhasil dibuat.",
      data: result.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("CREATE PAYROLL PERIOD:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal membuat periode payroll.",
    });
  } finally {
    client.release();
  }
};

// GENERATE PAYROLL
exports.generatePayroll = async (req, res) => {
  const { periodId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const periodResult = await client.query(
      `SELECT * FROM payroll_periods WHERE id = $1 FOR UPDATE`,
      [periodId],
    );

    if (!periodResult.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Periode payroll tidak ditemukan.",
      });
    }

    const period = periodResult.rows[0];

    if (period.status !== "DRAFT") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Hanya periode DRAFT yang dapat di-generate.",
      });
    }

    const existing = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM payroll_details
       WHERE payroll_period_id = $1`,
      [periodId],
    );

    if (existing.rows[0].total > 0) {
      await client.query("ROLLBACK");
      return res.status(409).json({
        success: false,
        message: "Payroll periode ini sudah pernah di-generate.",
      });
    }

    const employees = await client.query(
      `SELECT
          u.id AS user_id,
          u.ptkp_status,
          u.employee_type,
          whs.work_schedule,
          CASE
            WHEN UPPER(COALESCE(u.employee_type, '')) = 'KONTRAK_INTERN'
            THEN (
              SELECT COUNT(DISTINCT a.attendance_date)::int
              FROM attendance a
              WHERE a.user_id = u.id
                AND a.status = 'Hadir'
                AND a.attendance_date >= $1::date
                AND a.attendance_date <= $2::date
            )
            ELSE 0
          END AS intern_present_days,
          salary.id AS salary_id,
          COALESCE(salary.basic_salary, 0) AS basic_salary,
          COALESCE(salary.position_allowance, 0) AS position_allowance,
          COALESCE(salary.transport_allowance, 0) AS transport_allowance,
          COALESCE(salary.meal_allowance, 0) AS meal_allowance
       FROM users u
       LEFT JOIN working_hours_settings whs
         ON whs.id = u.working_hours_setting_id
       LEFT JOIN LATERAL (
          SELECT es.*
          FROM employee_salaries es
          WHERE es.user_id = u.id
            AND es.effective_date <= $2::date
            AND (es.end_date IS NULL OR es.end_date >= $1::date)
          ORDER BY es.effective_date DESC, es.id DESC
          LIMIT 1
       ) salary ON TRUE
       WHERE u.status = TRUE
  AND COALESCE(u.is_system_account, FALSE) = FALSE
       ORDER BY u.name ASC`,
      [period.start_date, period.end_date],
    );

    if (!employees.rowCount) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Tidak ada karyawan aktif.",
      });
    }

    for (const employee of employees.rows) {
      const divisor = employee.work_schedule === "6_DAYS" ? 26 : 22;
      const calculation = await calculatePayroll(
        client,
        { ...employee, payroll_divisor: divisor },
        period.end_date,
      );

      // Simpan nominal master salary sebagai snapshot; prorata intern hanya diterapkan
      // pada gross_salary melalui calculatePayroll().
      const basic = Number(employee.basic_salary || 0);
      const position = Number(employee.position_allowance || 0);
      const transport = Number(employee.transport_allowance || 0);
      const meal = Number(employee.meal_allowance || 0);

      const totalDeduction =
        calculation.jht +
        calculation.jp +
        calculation.health +
        calculation.pph21;

      const netSalary = calculation.gross - totalDeduction;

      await client.query(
        `INSERT INTO payroll_details (
          payroll_period_id, user_id, salary_id, ptkp_status,
          employee_type, intern_present_days,
          basic_salary, position_allowance,
          transport_allowance, meal_allowance,
          work_schedule, payroll_divisor,
          bpjs_jht_rate, bpjs_jp_rate, bpjs_health_rate,
          bpjs_jp_base, bpjs_health_base,
          bpjs_tk_deduction, bpjs_health_deduction,
          pph21_ter_category, pph21_ter_rate,
          pph21_taxable_income, pph21_deduction,
          gross_salary, total_deduction, net_salary
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
          $13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
        )`,
        [
          periodId,
          employee.user_id,
          employee.salary_id,
          employee.ptkp_status || null,
          employee.employee_type || null,
          calculation.presentDays,
          basic,
          position,
          transport,
          meal,
          employee.work_schedule,
          divisor,
          calculation.jhtRate,
          calculation.jpRate,
          calculation.healthRate,
          calculation.jpBase,
          calculation.healthBase,
          calculation.jht + calculation.jp,
          calculation.health,
          calculation.category,
          calculation.terRate,
          calculation.gross,
          calculation.pph21,
          calculation.gross,
          totalDeduction,
          netSalary,
        ],
      );
    }

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Payroll berhasil di-generate.",
      data: {
        period_id: Number(periodId),
        total_employees: employees.rowCount,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("GENERATE PAYROLL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal generate payroll.",
      detail: error.message,
    });
  } finally {
    client.release();
  }
};

// SUBMIT PAYROLL: HR -> FINANCE
exports.submitPayrollApproval = async (req, res) => {
  if (!hasRole(req, PRIDE_ROLES.HR, PRIDE_ROLES.ADMIN_HR)) {
    return res.status(403).json({
      success: false,
      message: "Hanya HR yang dapat mengajukan payroll.",
    });
  }

  const { periodId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const period = await client.query(
      `SELECT * FROM payroll_periods
       WHERE id = $1 FOR UPDATE`,
      [periodId],
    );

    if (!period.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Periode payroll tidak ditemukan.",
      });
    }

    if (period.rows[0].status !== "DRAFT") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Hanya payroll DRAFT yang dapat diajukan.",
      });
    }

    const details = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM payroll_details
       WHERE payroll_period_id = $1`,
      [periodId],
    );

    if (details.rows[0].total === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Generate payroll terlebih dahulu.",
      });
    }

    await client.query(
      `UPDATE payroll_periods
       SET status = 'PENDING_FINANCE',
           updated_at = NOW()
       WHERE id = $1`,
      [periodId],
    );

    await client.query(
      `INSERT INTO payroll_approval_logs
       (payroll_period_id, approval_stage, action, approved_by, notes)
       VALUES ($1, 'HR', 'SUBMITTED', $2, $3)`,
      [periodId, req.user.id, req.body?.notes || "Payroll diajukan oleh HR."],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Payroll berhasil diajukan ke Finance.",
      data: { status: "PENDING_FINANCE" },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("SUBMIT PAYROLL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengajukan payroll.",
      detail: error.message,
    });
  } finally {
    client.release();
  }
};

// APPROVE PAYROLL: FINANCE -> DIRECTOR -> APPROVED
exports.approvePayroll = async (req, res) => {
  const roleId = getRoleId(req);

  let currentStatus;
  let nextStatus;
  let approvalStage;
  let successMessage;

  if (roleId === PRIDE_ROLES.FINANCE) {
    currentStatus = "PENDING_FINANCE";
    nextStatus = "PENDING_DIRECTOR";
    approvalStage = "FINANCE";
    successMessage = "Payroll disetujui Finance dan diteruskan ke Director.";
  } else if (roleId === PRIDE_ROLES.DIRECTOR) {
    currentStatus = "PENDING_DIRECTOR";
    nextStatus = "APPROVED";
    approvalStage = "DIRECTOR";
    successMessage = "Payroll berhasil disetujui Director.";
  } else {
    return res.status(403).json({
      success: false,
      message: "Hanya Finance atau Director yang dapat menyetujui payroll.",
    });
  }

  const { periodId } = req.params;
  const notes = req.body?.notes || null;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const period = await client.query(
      `SELECT * FROM payroll_periods
       WHERE id = $1
       FOR UPDATE`,
      [periodId],
    );

    if (!period.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Periode payroll tidak ditemukan.",
      });
    }

    if (period.rows[0].status !== currentStatus) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `Approval tidak sesuai. Status payroll saat ini: ${period.rows[0].status}.`,
      });
    }

    const details = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM payroll_details
       WHERE payroll_period_id = $1`,
      [periodId],
    );

    if (details.rows[0].total === 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Detail payroll tidak ditemukan.",
      });
    }

    const isFinalApproval = nextStatus === "APPROVED";

    // Update status payroll
    await client.query(
      `UPDATE payroll_periods
       SET status = $1,
           approved_by = CASE WHEN $3 = TRUE THEN $2 ELSE approved_by END,
           approved_at = CASE WHEN $3 = TRUE THEN NOW() ELSE approved_at END,
           updated_at = NOW()
       WHERE id = $4`,
      [nextStatus, req.user.id, isFinalApproval, periodId],
    );

    // Catat riwayat approval
    await client.query(
      `INSERT INTO payroll_approval_logs
       (payroll_period_id, approval_stage, action, approved_by, notes)
       VALUES ($1, $2, 'APPROVED', $3, $4)`,
      [periodId, approvalStage, req.user.id, notes],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: successMessage,
      data: {
        status: nextStatus,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("APPROVE PAYROLL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menyetujui payroll.",
      detail: error.message,
    });
  } finally {
    client.release();
  }
};

// REJECT PAYROLL: FINANCE / DIRECTOR -> DRAFT
exports.rejectPayroll = async (req, res) => {
  const roleId = getRoleId(req);

  let currentStatus;
  let approvalStage;

  if (roleId === PRIDE_ROLES.FINANCE) {
    currentStatus = "PENDING_FINANCE";
    approvalStage = "FINANCE";
  } else if (roleId === PRIDE_ROLES.DIRECTOR) {
    currentStatus = "PENDING_DIRECTOR";
    approvalStage = "DIRECTOR";
  } else {
    return res.status(403).json({
      success: false,
      message: "Hanya Finance atau Director yang dapat menolak payroll.",
    });
  }

  const notes = String(req.body?.notes || "").trim();

  if (!notes) {
    return res.status(400).json({
      success: false,
      message: "Alasan penolakan wajib diisi.",
    });
  }

  const { periodId } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const period = await client.query(
      `SELECT * FROM payroll_periods
       WHERE id = $1 FOR UPDATE`,
      [periodId],
    );

    if (!period.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Periode payroll tidak ditemukan.",
      });
    }

    if (period.rows[0].status !== currentStatus) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Payroll tidak berada pada tahap approval Anda.",
      });
    }

    await client.query(
      `UPDATE payroll_periods
       SET status = 'DRAFT',
           approved_by = NULL,
           approved_at = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [periodId],
    );

    await client.query(
      `INSERT INTO payroll_approval_logs
       (payroll_period_id, approval_stage, action, approved_by, notes)
       VALUES ($1, $2, 'REJECTED', $3, $4)`,
      [periodId, approvalStage, req.user.id, notes],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Payroll ditolak dan dikembalikan ke HR untuk diperbaiki.",
      data: { status: "DRAFT" },
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("REJECT PAYROLL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menolak payroll.",
      detail: error.message,
    });
  } finally {
    client.release();
  }
};

// GET PAYROLL DETAILS BY PERIOD
exports.getPayrollDetails = async (req, res) => {
  try {
    const { periodId } = req.params;

    const periodResult = await pool.query(
      `SELECT id, period_name, start_date, end_date,
              payment_date, status
       FROM payroll_periods
       WHERE id = $1`,
      [periodId],
    );

    if (periodResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Periode payroll tidak ditemukan.",
      });
    }

    const details = await pool.query(
      `SELECT
          pd.id,
          pd.payroll_period_id,
          pd.user_id,
          pd.employee_type,
          COALESCE(pd.intern_present_days, 0) AS intern_present_days,
          pd.position_allowance,
          pd.bpjs_jht_rate,
          pd.bpjs_jp_rate,
          pd.bpjs_health_rate,
          pd.bpjs_jp_base,
          pd.bpjs_health_base,
          pd.pph21_ter_category,
          pd.pph21_ter_rate,
          pd.pph21_taxable_income,
          u.name,
          u.nik,
          u.nip,
          u.department,
          u.position,
          u.company_id,
          c.name AS company_name,
          u.bank_name,
          u.bank_account_number,
          COALESCE(pd.ptkp_status, u.ptkp_status) AS ptkp_status,
          pd.salary_id,
          pd.basic_salary,
          pd.transport_allowance,
          pd.meal_allowance,
          pd.work_schedule,
          pd.payroll_divisor,
          pd.sick_without_document_days,
          pd.sick_with_document_days,
          pd.unpaid_leave_days,
          pd.basic_salary_deduction,
          pd.transport_deduction,
          pd.meal_deduction,
          pd.bpjs_tk_deduction,
          pd.bpjs_health_deduction,
          pd.pph21_deduction,
          pd.gross_salary,
          pd.total_deduction,
          pd.net_salary
       FROM payroll_details pd
       JOIN users u ON u.id = pd.user_id
       LEFT JOIN companies c ON c.id = u.company_id
       WHERE pd.payroll_period_id = $1
       ORDER BY u.name ASC`,
      [periodId],
    );

    const terRates = await pool.query(
      `SELECT category, min_income, max_income, rate
       FROM pph21_ter_rates
       WHERE effective_start <= $1::date
         AND (effective_end IS NULL OR effective_end >= $1::date)
       ORDER BY category, min_income`,
      [periodResult.rows[0].end_date],
    );

    return res.json({
      success: true,
      period: periodResult.rows[0],
      ter_rates: terRates.rows,
      data: details.rows,
      total_employees: details.rows.length,
    });
  } catch (error) {
    console.error("GET PAYROLL DETAILS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil detail payroll.",
    });
  }
};

exports.updatePayrollDetails = async (req, res) => {
  const { periodId, detailId } = req.params;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `SELECT
    pd.*,
    COALESCE(pd.ptkp_status, u.ptkp_status) AS ptkp_status,
    pp.status AS period_status,
    pp.end_date AS period_end_date
    FROM payroll_details pd
    JOIN payroll_periods pp ON pp.id = pd.payroll_period_id
    JOIN users u ON u.id = pd.user_id
    WHERE pd.id = $1
      AND pd.payroll_period_id = $2
    FOR UPDATE OF pd, pp`,
      [detailId, periodId],
    );

    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Detail payroll tidak ditemukan.",
      });
    }

    const old = result.rows[0];

    if (old.period_status !== "DRAFT") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Payroll hanya dapat diedit saat status DRAFT.",
      });
    }

    const numberFields = [
      "basic_salary",
      "position_allowance",
      "transport_allowance",
      "meal_allowance",
      "sick_without_document_days",
      "sick_with_document_days",
      "unpaid_leave_days",
    ];

    for (const field of numberFields) {
      if (
        req.body[field] !== undefined &&
        (!Number.isFinite(Number(req.body[field])) ||
          Number(req.body[field]) < 0)
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `Nilai ${field} tidak valid.`,
        });
      }
    }

    const basic = Number(req.body.basic_salary ?? old.basic_salary);
    const position = Number(
      req.body.position_allowance ?? old.position_allowance,
    );
    const transport = Number(
      req.body.transport_allowance ?? old.transport_allowance,
    );
    const meal = Number(req.body.meal_allowance ?? old.meal_allowance);

    const sickWithout = Number(
      req.body.sick_without_document_days ??
        old.sick_without_document_days ??
        0,
    );

    const sickWith = Number(
      req.body.sick_with_document_days ?? old.sick_with_document_days ?? 0,
    );

    const unpaidLeave = Number(
      req.body.unpaid_leave_days ?? old.unpaid_leave_days ?? 0,
    );

    const ptkpStatus = req.body.ptkp_status ?? old.ptkp_status;
    const employeeType = String(old.employee_type || "").toUpperCase();
    const isIntern = employeeType === "KONTRAK_INTERN";
    const isProbation = ["PROBATION", "KONTRAK_3_BULAN"].includes(employeeType);
    const divisor = Number(old.payroll_divisor || 22);

    // Jumlah hari intern dihitung ulang dari absensi berstatus Hadir.
    // Hari Dibayar intern:
    // Gunakan input manual HR jika dikirim.
    // Jika tidak, pertahankan nilai sebelumnya.
    let internPresentDays = Number(old.intern_present_days || 0);

    if (isIntern && req.body.intern_present_days !== undefined) {
      const inputDays = Number(req.body.intern_present_days);

      if (!Number.isInteger(inputDays) || inputDays < 0 || inputDays > 31) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: "Hari Dibayar harus berupa angka bulat antara 0 sampai 31.",
        });
      }

      internPresentDays = inputDays;
    }

    const internFactor =
      isIntern && divisor > 0 ? internPresentDays / divisor : 1;

    const basicDeduction = roundRupiah(
      ((sickWithout + unpaidLeave) * basic) / divisor,
    );

    const transportDeduction = roundRupiah((sickWith * transport) / divisor);

    const mealDeduction = roundRupiah((sickWith * meal) / divisor);

    const calculation = await calculatePayroll(
      client,
      {
        basic_salary: basic,
        position_allowance: position,
        transport_allowance: transport,
        meal_allowance: meal,
        ptkp_status: ptkpStatus,
        employee_type: employeeType,
        intern_present_days: internPresentDays,
        payroll_divisor: divisor,
      },
      old.period_end_date,
    );

    const gross = calculation.gross;

    const attendanceDeduction =
      basicDeduction + transportDeduction + mealDeduction;
    const totalDeduction =
      attendanceDeduction +
      calculation.jht +
      calculation.jp +
      calculation.health +
      calculation.pph21;

    const netSalary = gross - totalDeduction;

    await client.query(
      `UPDATE payroll_details SET
        basic_salary = $1,
        position_allowance = $2,
        transport_allowance = $3,
        meal_allowance = $4,
        ptkp_status = $5,
        intern_present_days = $6,
        sick_without_document_days = $7,
        sick_with_document_days = $8,
        unpaid_leave_days = $9,
        basic_salary_deduction = $10,
        transport_deduction = $11,
        meal_deduction = $12,
        bpjs_jht_rate = $13,
        bpjs_jp_rate = $14,
        bpjs_health_rate = $15,
        bpjs_jp_base = $16,
        bpjs_health_base = $17,
        bpjs_tk_deduction = $18,
        bpjs_health_deduction = $19,
        pph21_ter_category = $20,
        pph21_ter_rate = $21,
        pph21_taxable_income = $22,
        pph21_deduction = $23,
        gross_salary = $24,
        total_deduction = $25,
        net_salary = $26,
        updated_by = $27,
        updated_at = NOW()
       WHERE id = $28`,
      [
        basic,
        position,
        transport,
        meal,
        ptkpStatus,
        internPresentDays,
        sickWithout,
        sickWith,
        unpaidLeave,
        basicDeduction,
        transportDeduction,
        mealDeduction,
        calculation.jhtRate,
        calculation.jpRate,
        calculation.healthRate,
        calculation.jpBase,
        calculation.healthBase,
        calculation.jht + calculation.jp,
        calculation.health,
        calculation.category,
        calculation.terRate,
        gross,
        calculation.pph21,
        gross,
        totalDeduction,
        netSalary,
        req.user?.id || null,
        detailId,
      ],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Payroll berhasil diperbarui.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("UPDATE PAYROLL DETAIL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui payroll.",
      detail: error.message,
    });
  } finally {
    client.release();
  }
};
