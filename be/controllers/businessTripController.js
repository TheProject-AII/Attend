const pool = require("../config/db");

// =====================================================
// GET MY BUSINESS TRIP CONTEXT
// =====================================================
exports.getMyContext = async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `
      SELECT
        u.id,
        u.nik,
        u.name,
        u.email,
        u.department,
        u.department_id,
        u.position,
        u.job_level,
        u.company_id,
        u.leader_id,
        u.status,
        r.name AS role_name,
        leader.name AS leader_name,
        leader.position AS leader_position,
        leader.job_level AS leader_job_level,
        rate.id AS rate_id,
        rate.hotel_limit,
        rate.fnb_rate,
        rate.transport_policy,
        rate.effective_from,
        rate.effective_until
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN users leader ON leader.id = u.leader_id
      LEFT JOIN LATERAL (
        SELECT *
        FROM business_trip_rates br
        WHERE br.job_level = u.job_level
          AND br.is_active = TRUE
          AND br.effective_from <= CURRENT_DATE
          AND (
            br.effective_until IS NULL
            OR br.effective_until >= CURRENT_DATE
          )
        ORDER BY br.effective_from DESC, br.id DESC
        LIMIT 1
      ) rate ON TRUE
      WHERE u.id = $1
      LIMIT 1
      `,
      [userId],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Data karyawan tidak ditemukan.",
      });
    }

    const user = result.rows[0];

    const eligibleRole =
      user.role_name === "Employee" || user.role_name === "Manager";

    const eligibleLevel = ["Staff", "Supervisor", "Manager"].includes(
      user.job_level,
    );

    if (!eligibleRole || !eligibleLevel || user.status !== true) {
      return res.status(403).json({
        success: false,
        message: "Akun tidak memiliki akses Business Trip.",
      });
    }

    if (!user.leader_id) {
      return res.status(400).json({
        success: false,
        message: "Atasan langsung belum ditentukan. Hubungi HR.",
      });
    }

    if (!user.rate_id) {
      return res.status(400).json({
        success: false,
        message: "Tarif Business Trip belum tersedia.",
      });
    }

    return res.json({
      success: true,
      data: {
        employee: {
          id: user.id,
          nik: user.nik,
          name: user.name,
          email: user.email,
          department: user.department,
          department_id: user.department_id,
          position: user.position,
          job_level: user.job_level,
          company_id: user.company_id,
        },
        leader: {
          id: user.leader_id,
          name: user.leader_name,
          position: user.leader_position,
          job_level: user.leader_job_level,
        },
        rate: {
          id: user.rate_id,
          transport_policy: user.transport_policy,
          hotel_limit: Number(user.hotel_limit),
          fnb_rate: Number(user.fnb_rate),
          effective_from: user.effective_from,
          effective_until: user.effective_until,
        },
      },
    });
  } catch (error) {
    console.error("BUSINESS TRIP CONTEXT ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil profil Business Trip.",
    });
  }
};

// =====================================================
// CREATE AND SUBMIT BUSINESS TRIP
// POST /api/business-trips
// =====================================================
exports.create = async (req, res) => {
  const client = await pool.connect();

  try {
    const userId = req.user.id;

    const {
      destination,
      purpose,
      departure_date,
      return_date,
      transport_estimate,
      notes,
    } = req.body;

    // -----------------------------------------------
    // VALIDASI INPUT
    // -----------------------------------------------
    if (
      typeof destination !== "string" ||
      !destination.trim() ||
      typeof purpose !== "string" ||
      !purpose.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Tujuan dan keperluan perjalanan wajib diisi.",
      });
    }

    const validDate = (value) =>
      typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);

    if (!validDate(departure_date) || !validDate(return_date)) {
      return res.status(400).json({
        success: false,
        message: "Format tanggal harus YYYY-MM-DD.",
      });
    }

    const transportAmount = Number(transport_estimate);

    if (
      !Number.isFinite(transportAmount) ||
      transportAmount < 0 ||
      transportAmount > 100000000000
    ) {
      return res.status(400).json({
        success: false,
        message: "Estimasi transport tidak valid.",
      });
    }

    if (notes != null && typeof notes !== "string") {
      return res.status(400).json({
        success: false,
        message: "Format catatan tidak valid.",
      });
    }

    // -----------------------------------------------
    // MULAI TRANSAKSI
    // -----------------------------------------------
    await client.query("BEGIN");

    // Ambil profil terbaru dari database.
    const employeeResult = await client.query(
      `
      SELECT
        u.id,
        u.nik,
        u.name,
        u.department,
        u.position,
        u.job_level,
        u.company_id,
        u.leader_id,
        u.status,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      FOR UPDATE OF u
      `,
      [userId],
    );

    if (!employeeResult.rowCount) {
      throw new Error("Data karyawan tidak ditemukan.");
    }

    const employee = employeeResult.rows[0];

    const eligibleRole =
      employee.role_name === "Employee" || employee.role_name === "Manager";

    const eligibleLevel = ["Staff", "Supervisor", "Manager"].includes(
      employee.job_level,
    );

    if (!eligibleRole || !eligibleLevel || employee.status !== true) {
      await client.query("ROLLBACK");

      return res.status(403).json({
        success: false,
        message: "Akun tidak diizinkan mengajukan Business Trip.",
      });
    }

    if (!employee.leader_id) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Atasan langsung belum ditentukan. Hubungi HR.",
      });
    }

    // -----------------------------------------------
    // VALIDASI ATASAN
    // -----------------------------------------------
    const leaderResult = await client.query(
      `
      SELECT
        u.id,
        u.name,
        u.position,
        u.job_level,
        u.status,
        r.name AS role_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      WHERE u.id = $1
      `,
      [employee.leader_id],
    );

    if (!leaderResult.rowCount || leaderResult.rows[0].status !== true) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Atasan tidak ditemukan atau sudah tidak aktif.",
      });
    }

    const leader = leaderResult.rows[0];

    // -----------------------------------------------
    // AMBIL TARIF BERDASARKAN TANGGAL BERANGKAT
    // -----------------------------------------------
    const rateResult = await client.query(
      `
      SELECT
        id,
        job_level,
        transport_policy,
        hotel_limit,
        fnb_rate,
        effective_from,
        effective_until
      FROM business_trip_rates
      WHERE job_level = $1
        AND is_active = TRUE
        AND effective_from <= $2::date
        AND (
          effective_until IS NULL
          OR effective_until >= $2::date
        )
      ORDER BY effective_from DESC, id DESC
      LIMIT 1
      `,
      [employee.job_level, departure_date],
    );

    if (!rateResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message:
          "Tarif Business Trip tidak ditemukan untuk tanggal keberangkatan.",
      });
    }

    const rate = rateResult.rows[0];

    // -----------------------------------------------
    // HITUNG DURASI DAN ESTIMASI DI POSTGRESQL
    // -----------------------------------------------
    const calculationResult = await client.query(
      `
      SELECT
        ($2::date - $1::date + 1)::integer AS duration_days,
        ($2::date - $1::date)::integer AS hotel_nights,
        (
          ($2::date - $1::date)::numeric
          * $3::numeric
        ) AS hotel_estimate,
        (
          ($2::date - $1::date + 1)::numeric
          * $4::numeric
        ) AS fnb_estimate
      WHERE $2::date >= $1::date
      `,
      [departure_date, return_date, rate.hotel_limit, rate.fnb_rate],
    );

    if (!calculationResult.rowCount) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        success: false,
        message: "Tanggal pulang tidak boleh sebelum tanggal berangkat.",
      });
    }

    const calculation = calculationResult.rows[0];

    const hotelEstimate = Number(calculation.hotel_estimate);
    const fnbEstimate = Number(calculation.fnb_estimate);

    const totalEstimate = transportAmount + hotelEstimate + fnbEstimate;

    // -----------------------------------------------
    // SIMPAN PENGAJUAN
    // -----------------------------------------------
    const tripResult = await client.query(
      `
      INSERT INTO business_trips (
        employee_id,
        employee_name,
        employee_nik,
        employee_department,
        employee_position,
        employee_job_level,
        company_id,
        leader_id,

        destination,
        purpose,
        departure_date,
        return_date,
        duration_days,
        hotel_nights,

        hotel_rate,
        fnb_rate,

        transport_estimate,
        hotel_estimate,
        fnb_estimate,
        total_estimate,

        current_approver_id,
        status,
        notes,

        submitted_at,
        created_at,
        updated_at
      )
      VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20,
        $21, 'PENDING_MANAGER', $22,
        NOW(), NOW(), NOW()
      )
      RETURNING *
      `,
      [
        employee.id,
        employee.name,
        employee.nik,
        employee.department,
        employee.position,
        employee.job_level,
        employee.company_id,
        employee.leader_id,

        destination.trim(),
        purpose.trim(),
        departure_date,
        return_date,
        calculation.duration_days,
        calculation.hotel_nights,

        rate.hotel_limit,
        rate.fnb_rate,

        transportAmount,
        hotelEstimate,
        fnbEstimate,
        totalEstimate,

        leader.id,
        notes?.trim() || null,
      ],
    );

    const trip = tripResult.rows[0];

    // -----------------------------------------------
    // GENERATE NOMOR PENGAJUAN
    // -----------------------------------------------
    const tripNumber = `BT-${new Date().getFullYear()}-${String(trip.id).padStart(6, "0")}`;

    await client.query(
      `
      UPDATE business_trips
      SET trip_number = $1,
          updated_at = NOW()
      WHERE id = $2
      `,
      [tripNumber, trip.id],
    );

    // -----------------------------------------------
    // CATAT APPROVAL PERTAMA
    // -----------------------------------------------
    await client.query(
      `
      INSERT INTO business_trip_approvals (
        business_trip_id,
        approval_step,
        approval_stage,
        approver_id,
        approver_name,
        approver_role,
        status,
        created_at,
        updated_at
      )
      VALUES (
        $1, 1, 'MANAGER', $2, $3, $4,
        'PENDING', NOW(), NOW()
      )
      `,
      [
        trip.id,
        leader.id,
        leader.name,
        leader.job_level || leader.position || leader.role_name || "Leader",
      ],
    );

    await client.query("COMMIT");

    return res.status(201).json({
      success: true,
      message: "Pengajuan Business Trip berhasil dikirim ke atasan.",
      data: {
        ...trip,
        trip_number: tripNumber,
        calculation: {
          duration_days: Number(calculation.duration_days),
          hotel_nights: Number(calculation.hotel_nights),
          transport_estimate: transportAmount,
          hotel_estimate: hotelEstimate,
          fnb_estimate: fnbEstimate,
          total_estimate: totalEstimate,
        },
        first_approver: {
          id: leader.id,
          name: leader.name,
        },
      },
    });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error("BUSINESS TRIP ROLLBACK ERROR:", rollbackError);
    }

    console.error("CREATE BUSINESS TRIP ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal membuat pengajuan Business Trip.",
    });
  } finally {
    client.release();
  }
};
