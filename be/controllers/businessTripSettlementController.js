const pool = require("../config/db");

const FINANCE_ROLE_ID = 6;

const toAmount = (value, fieldName) => {
  const amount = Number(value ?? 0);

  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`${fieldName} harus berupa angka nol atau lebih.`);
  }

  return amount;
};

const getUserId = (req) => Number(req.user?.id);

const getFinanceUser = async (client, userId) => {
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
};

// =====================================================
// EMPLOYEE: SUBMIT SETTLEMENT
// =====================================================
exports.submitSettlement = async (req, res) => {
  const userId = getUserId(req);
  const tripId = Number(req.params.id);

  if (!userId || !Number.isInteger(tripId) || tripId <= 0) {
    return res.status(400).json({ message: "ID perjalanan tidak valid." });
  }

  const client = await pool.connect();

  try {
    const actualTransport = toAmount(req.body.actual_transport, "Transport");
    const actualHotel = toAmount(req.body.actual_hotel, "Hotel");
    const actualFnb = toAmount(req.body.actual_fnb, "F&B");
    const actualOther = toAmount(req.body.actual_other, "Biaya lainnya");
    const employeeNotes = String(req.body.employee_notes || "").trim();

    await client.query("BEGIN");

    const tripResult = await client.query(
      `SELECT *
       FROM business_trips
       WHERE id = $1
         AND employee_id = $2
       FOR UPDATE`,
      [tripId, userId],
    );

    if (!tripResult.rows.length) {
      await client.query("ROLLBACK");
      return res
        .status(404)
        .json({ message: "Perjalanan dinas tidak ditemukan." });
    }

    const trip = tripResult.rows[0];

    if (trip.status !== "ON_TRIP" && trip.status !== "SETTLEMENT") {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Perjalanan ini belum dapat dipertanggungjawabkan.",
      });
    }

    const dateCheck = await client.query(
      `SELECT CURRENT_DATE >= $1::date AS can_settle`,
      [trip.return_date],
    );

    if (!dateCheck.rows[0].can_settle) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Settlement hanya dapat diajukan setelah tanggal kembali.",
      });
    }

    const disbursementResult = await client.query(
      `SELECT id, disbursement_amount, status
       FROM business_trip_disbursements
       WHERE business_trip_id = $1
       FOR UPDATE`,
      [tripId],
    );

    if (
      !disbursementResult.rows.length ||
      disbursementResult.rows[0].status !== "PAID"
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Dana perjalanan belum tercatat dibayarkan oleh Finance.",
      });
    }

    const disbursement = disbursementResult.rows[0];

    // F&B merupakan uang harian tetap, bukan reimbursement struk.
    const approvedTransport = actualTransport;
    const approvedHotelCap =
      Number(trip.hotel_nights) * Number(trip.hotel_rate);
    const approvedHotel = Math.min(actualHotel, approvedHotelCap);
    const approvedFnb = Number(trip.duration_days) * Number(trip.fnb_rate);

    // Biaya lainnya menunggu pemeriksaan Finance.
    const approvedOther = 0;

    const totalApproved =
      approvedTransport + approvedHotel + approvedFnb + approvedOther;

    const disbursedAmount = Number(disbursement.disbursement_amount);
    const remainingBalance = Math.max(disbursedAmount - totalApproved, 0);
    const additionalPayment = Math.max(totalApproved - disbursedAmount, 0);

    const existingResult = await client.query(
      `SELECT id, status
       FROM business_trip_settlements
       WHERE business_trip_id = $1
       FOR UPDATE`,
      [tripId],
    );

    let settlement;

    if (existingResult.rows.length) {
      const existing = existingResult.rows[0];

      if (existing.status !== "REJECTED" && existing.status !== "DRAFT") {
        await client.query("ROLLBACK");
        return res.status(400).json({
          message: "Settlement sudah diajukan dan sedang diproses.",
        });
      }

      const updated = await client.query(
        `UPDATE business_trip_settlements
         SET disbursement_id = $2,
             disbursed_amount = $3,
             actual_transport = $4,
             actual_hotel = $5,
             actual_fnb = $6,
             actual_other = $7,
             approved_transport = $8,
             approved_hotel = $9,
             approved_fnb = $10,
             approved_other = $11,
             total_approved_expense = $12,
             remaining_balance = $13,
             additional_payment = $14,
             status = 'SUBMITTED',
             employee_notes = $15,
             finance_notes = NULL,
             submitted_at = NOW(),
             verified_by = NULL,
             verified_at = NULL,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [
          existing.id,
          disbursement.id,
          disbursedAmount,
          actualTransport,
          actualHotel,
          actualFnb,
          actualOther,
          approvedTransport,
          approvedHotel,
          approvedFnb,
          approvedOther,
          totalApproved,
          remainingBalance,
          additionalPayment,
          employeeNotes,
        ],
      );

      settlement = updated.rows[0];
    } else {
      const inserted = await client.query(
        `INSERT INTO business_trip_settlements (
          business_trip_id,
          disbursement_id,
          disbursed_amount,
          actual_transport,
          actual_hotel,
          actual_fnb,
          actual_other,
          approved_transport,
          approved_hotel,
          approved_fnb,
          approved_other,
          total_approved_expense,
          remaining_balance,
          additional_payment,
          status,
          employee_notes,
          submitted_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13, $14,
          'SUBMITTED', $15, NOW()
        )
        RETURNING *`,
        [
          tripId,
          disbursement.id,
          disbursedAmount,
          actualTransport,
          actualHotel,
          actualFnb,
          actualOther,
          approvedTransport,
          approvedHotel,
          approvedFnb,
          approvedOther,
          totalApproved,
          remainingBalance,
          additionalPayment,
          employeeNotes,
        ],
      );

      settlement = inserted.rows[0];
    }

    await client.query(
      `UPDATE business_trips
       SET status = 'SETTLEMENT',
           updated_at = NOW()
       WHERE id = $1`,
      [tripId],
    );

    await client.query("COMMIT");

    return res.status(200).json({
      message: "Settlement berhasil diajukan ke Finance.",
      data: settlement,
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("submitSettlement:", error);

    return res.status(400).json({
      message: error.message || "Gagal mengajukan settlement.",
    });
  } finally {
    client.release();
  }
};

// =====================================================
// FINANCE: SETTLEMENT QUEUE
// =====================================================
exports.getFinanceSettlementQueue = async (req, res) => {
  const userId = getUserId(req);
  const client = await pool.connect();

  try {
    await getFinanceUser(client, userId);

    const result = await client.query(
      `SELECT
         s.id AS settlement_id,
         s.status AS settlement_status,
         s.disbursed_amount,
         s.total_approved_expense,
         s.remaining_balance,
         s.additional_payment,
         s.submitted_at,
         bt.id AS business_trip_id,
         bt.trip_number,
         bt.employee_id,
         bt.employee_name,
         bt.employee_nik,
         bt.employee_department,
         bt.employee_position,
         bt.destination,
         bt.purpose,
         bt.departure_date,
         bt.return_date,
         bt.duration_days
       FROM business_trip_settlements s
       JOIN business_trips bt ON bt.id = s.business_trip_id
       WHERE s.status = 'SUBMITTED'
         AND bt.status = 'SETTLEMENT'
       ORDER BY s.submitted_at ASC`,
    );

    return res.json({
      message: "Daftar settlement Finance.",
      data: result.rows,
    });
  } catch (error) {
    console.error("getFinanceSettlementQueue:", error);
    return res.status(403).json({ message: error.message });
  } finally {
    client.release();
  }
};

// =====================================================
// FINANCE: SETTLEMENT DETAIL
// =====================================================
exports.getFinanceSettlementDetail = async (req, res) => {
  const userId = getUserId(req);
  const settlementId = Number(req.params.id);
  const client = await pool.connect();

  try {
    await getFinanceUser(client, userId);

    if (!Number.isInteger(settlementId) || settlementId <= 0) {
      return res.status(400).json({ message: "ID settlement tidak valid." });
    }

    const result = await client.query(
      `SELECT
         s.*,
         bt.trip_number,
         bt.employee_id,
         bt.employee_name,
         bt.employee_nik,
         bt.employee_department,
         bt.employee_position,
         bt.employee_job_level,
         bt.destination,
         bt.purpose,
         bt.departure_date,
         bt.return_date,
         bt.duration_days,
         bt.hotel_nights,
         bt.hotel_rate,
         bt.fnb_rate
       FROM business_trip_settlements s
       JOIN business_trips bt ON bt.id = s.business_trip_id
       WHERE s.id = $1`,
      [settlementId],
    );

    if (!result.rows.length) {
      return res.status(404).json({ message: "Settlement tidak ditemukan." });
    }

    return res.json({
      message: "Detail settlement.",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("getFinanceSettlementDetail:", error);
    return res.status(403).json({ message: error.message });
  } finally {
    client.release();
  }
};

// =====================================================
// FINANCE: VERIFY SETTLEMENT
// =====================================================
exports.verifySettlement = async (req, res) => {
  const userId = getUserId(req);
  const settlementId = Number(req.params.id);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await getFinanceUser(client, userId);

    if (!Number.isInteger(settlementId) || settlementId <= 0) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "ID settlement tidak valid." });
    }

    const settlementResult = await client.query(
      `SELECT
         s.*,
         bt.id AS trip_id,
         bt.employee_id,
         bt.status AS trip_status,
         bt.hotel_nights,
         bt.hotel_rate,
         bt.duration_days,
         bt.fnb_rate
       FROM business_trip_settlements s
       JOIN business_trips bt ON bt.id = s.business_trip_id
       WHERE s.id = $1
       FOR UPDATE OF s, bt`,
      [settlementId],
    );

    if (!settlementResult.rows.length) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Settlement tidak ditemukan." });
    }

    const settlement = settlementResult.rows[0];

    if (
      settlement.status !== "SUBMITTED" ||
      settlement.trip_status !== "SETTLEMENT"
    ) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        message: "Settlement ini tidak dalam status menunggu verifikasi.",
      });
    }

    const approvedTransport = toAmount(
      req.body.approved_transport ?? settlement.approved_transport,
      "Transport disetujui",
    );
    const approvedHotel = toAmount(
      req.body.approved_hotel ?? settlement.approved_hotel,
      "Hotel disetujui",
    );
    const approvedFnb = toAmount(
      req.body.approved_fnb ?? settlement.approved_fnb,
      "F&B disetujui",
    );
    const approvedOther = toAmount(
      req.body.approved_other ?? settlement.approved_other,
      "Biaya lainnya disetujui",
    );

    if (approvedTransport > Number(settlement.actual_transport)) {
      throw new Error("Transport disetujui tidak boleh melebihi biaya aktual.");
    }

    const hotelCap =
      Number(settlement.hotel_nights) * Number(settlement.hotel_rate);

    if (
      approvedHotel > Number(settlement.actual_hotel) ||
      approvedHotel > hotelCap
    ) {
      throw new Error(
        "Biaya hotel yang disetujui melebihi biaya aktual atau batas hotel.",
      );
    }

    const fixedFnb =
      Number(settlement.duration_days) * Number(settlement.fnb_rate);

    if (approvedFnb !== fixedFnb) {
      throw new Error(
        `F&B harus sesuai uang harian tetap sebesar Rp${fixedFnb.toLocaleString("id-ID")}.`,
      );
    }

    if (approvedOther > Number(settlement.actual_other)) {
      throw new Error(
        "Biaya lainnya disetujui tidak boleh melebihi biaya aktual.",
      );
    }

    const totalApproved =
      approvedTransport + approvedHotel + approvedFnb + approvedOther;

    const disbursedAmount = Number(settlement.disbursed_amount);
    const remainingBalance = Math.max(disbursedAmount - totalApproved, 0);
    const additionalPayment = Math.max(totalApproved - disbursedAmount, 0);

    const financeNotes = String(req.body.finance_notes || "").trim();

    await client.query(
      `UPDATE business_trip_settlements
       SET approved_transport = $2,
           approved_hotel = $3,
           approved_fnb = $4,
           approved_other = $5,
           total_approved_expense = $6,
           remaining_balance = $7,
           additional_payment = $8,
           status = 'VERIFIED',
           finance_notes = $9,
           verified_by = $10,
           verified_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [
        settlementId,
        approvedTransport,
        approvedHotel,
        approvedFnb,
        approvedOther,
        totalApproved,
        remainingBalance,
        additionalPayment,
        financeNotes,
        userId,
      ],
    );

    // Catat sisa dana sebagai outstanding karyawan.
    if (remainingBalance > 0) {
      await client.query(`SELECT id FROM users WHERE id = $1 FOR UPDATE`, [
        settlement.employee_id,
      ]);

      const balanceResult = await client.query(
        `SELECT COALESCE(
           SUM(
             CASE
               WHEN direction = 'INCREASE' THEN amount
               WHEN direction = 'DECREASE' THEN -amount
               ELSE 0
             END
           ), 0
         ) AS current_balance
         FROM business_trip_balance_ledger
         WHERE employee_id = $1`,
        [settlement.employee_id],
      );

      const currentBalance = Number(balanceResult.rows[0].current_balance);
      const newBalance = currentBalance + remainingBalance;

      await client.query(
        `INSERT INTO business_trip_balance_ledger (
          employee_id,
          business_trip_id,
          settlement_id,
          entry_type,
          direction,
          amount,
          balance_after,
          description,
          processed_by,
          transaction_date
        )
        VALUES (
          $1, $2, $3,
          'UNUSED_FUNDS',
          'INCREASE',
          $4, $5,
          $6, $7, CURRENT_DATE
        )`,
        [
          settlement.employee_id,
          settlement.trip_id,
          settlementId,
          remainingBalance,
          newBalance,
          `Sisa dana perjalanan dinas ${settlement.trip_id}`,
          userId,
        ],
      );
    }

    await client.query(
      `UPDATE business_trips
       SET status = 'COMPLETED',
           completed_at = NOW(),
           updated_at = NOW()
       WHERE id = $1`,
      [settlement.trip_id],
    );

    await client.query("COMMIT");

    return res.json({
      message: "Settlement berhasil diverifikasi.",
      data: {
        settlement_id: settlementId,
        total_approved_expense: totalApproved,
        remaining_balance: remainingBalance,
        additional_payment: additionalPayment,
        status: "VERIFIED",
      },
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    console.error("verifySettlement:", error);

    return res.status(400).json({
      message: error.message || "Gagal memverifikasi settlement.",
    });
  } finally {
    client.release();
  }
};
