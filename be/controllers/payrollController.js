const pool = require("../config/db");
const roundRupiah = (value) => Math.round(Number(value || 0));

const getTerCategory = (ptkpStatus) => {
  const status = String(ptkpStatus || "").toUpperCase();

  if (["TK/0", "TK/1", "K/0"].includes(status)) return "A";
  if (["TK/2", "TK/3", "K/1", "K/2"].includes(status)) return "B";
  if (status === "K/3") return "C";

  return null;
};

const calculatePayroll = async (client, employee, periodEnd) => {
  const basic = Number(employee.basic_salary || 0);
  const position = Number(employee.position_allowance || 0);
  const transport = Number(employee.transport_allowance || 0);
  const meal = Number(employee.meal_allowance || 0);

  const gross = basic + position + transport + meal;

  // BPJS berdasarkan gaji pokok sesuai kebijakan payroll ini.
  const jhtRate = 2;
  const jpRate = 1;
  const healthRate = 1;

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
          whs.work_schedule,
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
      const basic = Number(employee.basic_salary || 0);
      const position = Number(employee.position_allowance || 0);
      const transport = Number(employee.transport_allowance || 0);
      const meal = Number(employee.meal_allowance || 0);

      const calculation = await calculatePayroll(
        client,
        employee,
        period.end_date,
      );

      const divisor = employee.work_schedule === "6_DAYS" ? 26 : 22;

      const totalDeduction =
        calculation.jht +
        calculation.jp +
        calculation.health +
        calculation.pph21;

      const netSalary = calculation.gross - totalDeduction;

      await client.query(
        `INSERT INTO payroll_details (
          payroll_period_id, user_id, salary_id, ptkp_status,
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
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,$16,$17,
          $18,$19,$20,$21,$22,$23,$24
        )`,
        [
          periodId,
          employee.user_id,
          employee.salary_id,
          employee.ptkp_status || null,
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

// SUBMIT PAYROLL FOR APPROVAL
exports.submitPayrollApproval = async (req, res) => {
  const { periodId } = req.params;
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
       SET status = 'REVIEW',
           updated_at = NOW()
       WHERE id = $1`,
      [periodId],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Payroll berhasil diajukan untuk approval HR / Finance.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("SUBMIT PAYROLL APPROVAL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengajukan payroll untuk approval.",
    });
  } finally {
    client.release();
  }
};

// APPROVE PAYROLL
exports.approvePayroll = async (req, res) => {
  const { periodId } = req.params;
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

    if (period.rows[0].status !== "REVIEW") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: "Hanya payroll berstatus REVIEW yang dapat disetujui.",
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

    await client.query(
      `UPDATE payroll_periods
       SET status = 'APPROVED',
           approved_by = $1,
           approved_at = NOW(),
           updated_at = NOW()
       WHERE id = $2`,
      [req.user.id, periodId],
    );

    await client.query("COMMIT");

    return res.json({
      success: true,
      message: "Payroll berhasil disetujui.",
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("APPROVE PAYROLL ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal menyetujui payroll.",
    });
  } finally {
    client.release();
  }
};

// GET PAYROLL DETAILS BY PERIOD
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
    const divisor = Number(old.payroll_divisor || 22);

    // Potongan absensi
    const basicDeduction = roundRupiah(
      ((sickWithout + unpaidLeave) * basic) / divisor,
    );

    const transportDeduction = roundRupiah((sickWith * transport) / divisor);

    const mealDeduction = roundRupiah((sickWith * meal) / divisor);

    const gross = basic + position + transport + meal;

    const calculation = await calculatePayroll(
      client,
      {
        basic_salary: basic,
        position_allowance: position,
        transport_allowance: transport,
        meal_allowance: meal,
        ptkp_status: ptkpStatus,
      },
      old.period_end_date,
    );

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
        sick_without_document_days = $6,
        sick_with_document_days = $7,
        unpaid_leave_days = $8,
        basic_salary_deduction = $9,
        transport_deduction = $10,
        meal_deduction = $11,
        bpjs_jht_rate = $12,
        bpjs_jp_rate = $13,
        bpjs_health_rate = $14,
        bpjs_jp_base = $15,
        bpjs_health_base = $16,
        bpjs_tk_deduction = $17,
        bpjs_health_deduction = $18,
        pph21_ter_category = $19,
        pph21_ter_rate = $20,
        pph21_taxable_income = $21,
        pph21_deduction = $22,
        gross_salary = $23,
        total_deduction = $24,
        net_salary = $25,
        updated_by = $26,
        updated_at = NOW()
       WHERE id = $27`,
      [
        basic,
        position,
        transport,
        meal,
        ptkpStatus,
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
