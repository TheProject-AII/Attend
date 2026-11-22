/**
 * Automatic Late Compensation + Company Time Credit
 *
 * Rules:
 * - OFFICE attendance only.
 * - Work schedule from employee_work_schedule_history.
 * - Fallback initial schedule from users.working_hours_setting_id.
 * - Weekday late: ceil minutes after office_start_time.
 * - Weekday extra: floor minutes after office_end_time.
 * - Non-working day: full attendance duration is compensation.
 * - Compensation pays employee debt FIFO first.
 * - Remaining compensation becomes Company Time Credit.
 * - Existing Company Credit is consumed before creating new debt.
 * - Company Credit carries across payroll periods.
 * - All mutations use caller's transaction/client.
 *
 * Timestamps are Asia/Jakarta local timestamps without timezone.
 */

const ADMIN_LOCK_KEY = 17001;

async function lockEmployee(client, userId) {
  await client.query("SELECT pg_advisory_xact_lock($1, $2)", [
    ADMIN_LOCK_KEY,
    Number(userId),
  ]);
}

function parseWorkDays(value) {
  if (Array.isArray(value)) return value;

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function minutesBetween(start, end, rounding = "floor") {
  if (!start || !end) return 0;

  const seconds = Number(end) - Number(start);
  if (seconds <= 0) return 0;

  return Math.max(
    0,
    rounding === "ceil" ? Math.ceil(seconds / 60) : Math.floor(seconds / 60),
  );
}

async function ensureInitialScheduleHistory(client, employeeId) {
  await client.query(
    `
    INSERT INTO employee_work_schedule_history (
      user_id,
      working_hours_setting_id,
      effective_from
    )
    SELECT
      u.id,
      u.working_hours_setting_id,
      whs.effective_date
    FROM users u
    JOIN working_hours_settings whs
      ON whs.id = u.working_hours_setting_id
    WHERE u.id = $1
      AND NOT EXISTS (
        SELECT 1
        FROM employee_work_schedule_history h
        WHERE h.user_id = u.id
      )
    `,
    [employeeId],
  );
}

async function getEmployeeSchedule(client, employeeId, date) {
  const result = await client.query(
    `
    SELECT
      h.working_hours_setting_id,
      whs.work_schedule,
      whs.work_days,
      whs.office_start_time,
      whs.office_end_time
    FROM employee_work_schedule_history h
    JOIN working_hours_settings whs
      ON whs.id = h.working_hours_setting_id
    WHERE h.user_id = $1
      AND h.effective_from <= $2
      AND (
        h.effective_until IS NULL
        OR h.effective_until >= $2
      )
    ORDER BY h.effective_from DESC, h.id DESC
    LIMIT 1
    `,
    [employeeId, date],
  );

  return result.rows[0] || null;
}

async function getCreditBalance(client, employeeId) {
  const result = await client.query(
    `
    SELECT COALESCE(
      SUM(
        CASE
          WHEN transaction_type = 'EARNED' THEN minutes
          WHEN transaction_type = 'USED' THEN -minutes
          ELSE 0
        END
      ),
      0
    )::integer AS balance
    FROM attendance_company_credit_ledger
    WHERE user_id = $1
    `,
    [employeeId],
  );

  return Number(result.rows[0].balance || 0);
}

async function addCreditTransaction(
  client,
  employeeId,
  attendanceId,
  date,
  type,
  minutes,
  description,
) {
  if (minutes <= 0) return;

  await client.query(
    `
    INSERT INTO attendance_company_credit_ledger (
      user_id,
      attendance_id,
      transaction_date,
      transaction_type,
      minutes,
      description
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    `,
    [employeeId, attendanceId, date, type, minutes, description],
  );
}

async function createDebt(client, employeeId, attendanceId, date, minutes) {
  if (minutes <= 0) return;

  await client.query(
    `
    INSERT INTO attendance_late_debts (
      attendance_id,
      user_id,
      debt_date,
      late_minutes,
      paid_minutes,
      remaining_minutes,
      status
    )
    VALUES ($1, $2, $3, $4, 0, $4, 'UNPAID')
    `,
    [attendanceId, employeeId, date, minutes],
  );
}

async function payDebtFIFO(
  client,
  employeeId,
  attendanceId,
  date,
  availableMinutes,
) {
  let remaining = availableMinutes;
  let paidToday = 0;

  if (remaining <= 0) {
    return { remaining, paidToday };
  }

  const debts = await client.query(
    `
    SELECT id, remaining_minutes
    FROM attendance_late_debts
    WHERE user_id = $1
      AND remaining_minutes > 0
      AND debt_date <= $2
    ORDER BY debt_date ASC, id ASC
    FOR UPDATE
    `,
    [employeeId, date],
  );

  for (const debt of debts.rows) {
    if (remaining <= 0) break;

    const payment = Math.min(remaining, Number(debt.remaining_minutes || 0));

    if (payment <= 0) continue;

    await client.query(
      `
      INSERT INTO attendance_late_payments (
        debt_id,
        attendance_id,
        user_id,
        payment_date,
        paid_minutes
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [debt.id, attendanceId, employeeId, date, payment],
    );

    await client.query(
      `
      UPDATE attendance_late_debts
      SET
        paid_minutes = paid_minutes + $1,
        remaining_minutes = GREATEST(0, remaining_minutes - $1),
        status = CASE
          WHEN remaining_minutes - $1 <= 0 THEN 'PAID'
          ELSE 'PARTIAL'
        END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [payment, debt.id],
    );

    remaining -= payment;
    paidToday += payment;
  }

  return { remaining, paidToday };
}

async function reconcileEmployeeLateCompensation(client, userId) {
  const employeeId = Number(userId);

  if (!Number.isInteger(employeeId) || employeeId <= 0) {
    throw new Error("User ID tidak valid");
  }

  await lockEmployee(client, employeeId);

  await ensureInitialScheduleHistory(client, employeeId);

  const scheduleResult = await client.query(
    `
    SELECT MIN(effective_from)::date AS first_effective_date
    FROM employee_work_schedule_history
    WHERE user_id = $1
    `,
    [employeeId],
  );

  const cutoff = scheduleResult.rows[0].first_effective_date;

  // Belum memiliki jadwal: jangan mengubah ledger existing.
  if (!cutoff) {
    const summary = await getSummary(client, employeeId);
    return {
      userId: employeeId,
      processedAttendance: 0,
      ...summary,
      history: [],
      scheduleMissing: true,
    };
  }

  // Ambil attendance yang termasuk periode kebijakan baru.
  const attendanceResult = await client.query(
    `
    SELECT
      id,
      attendance_date,
      attendance_type,
      check_in,
      check_out,
      EXTRACT(EPOCH FROM check_in)::numeric AS check_in_epoch,
      EXTRACT(EPOCH FROM check_out)::numeric AS check_out_epoch,
      EXTRACT(EPOCH FROM check_in::time)::numeric AS check_in_seconds,
      EXTRACT(EPOCH FROM check_out::time)::numeric AS check_out_seconds,
      TO_CHAR(attendance_date, 'FMDay') AS weekday
    FROM attendance
    WHERE user_id = $1
      AND attendance_date >= $2
      AND check_in IS NOT NULL
      AND check_out IS NOT NULL
      AND UPPER(COALESCE(attendance_type, 'OFFICE')) = 'OFFICE'
    ORDER BY attendance_date, check_in, id
    FOR UPDATE
    `,
    [employeeId, cutoff],
  );

  // Hapus transaksi hasil perhitungan ulang mulai cutoff.
  // Ledger sebelum cutoff dipertahankan.
  await client.query(
    `
    DELETE FROM attendance_late_payments
    WHERE user_id = $1
      AND payment_date >= $2
    `,
    [employeeId, cutoff],
  );

  await client.query(
    `
    DELETE FROM attendance_late_debts
    WHERE user_id = $1
      AND debt_date >= $2
    `,
    [employeeId, cutoff],
  );

  await client.query(
    `
    DELETE FROM attendance_late_processing
    WHERE user_id = $1
      AND attendance_id IN (
        SELECT id
        FROM attendance
        WHERE user_id = $1
          AND attendance_date >= $2
      )
    `,
    [employeeId, cutoff],
  );

  await client.query(
    `
    DELETE FROM attendance_company_credit_ledger
    WHERE user_id = $1
      AND transaction_date >= $2
    `,
    [employeeId, cutoff],
  );

  // Rekonsiliasi saldo utang lama berdasarkan pembayaran
  // yang berasal dari periode sebelum cutoff.
  await client.query(
    `
    UPDATE attendance_late_debts d
    SET
      paid_minutes = COALESCE((
        SELECT SUM(p.paid_minutes)
        FROM attendance_late_payments p
        WHERE p.debt_id = d.id
      ), 0)::integer,
      remaining_minutes = GREATEST(
        0,
        d.late_minutes - COALESCE((
          SELECT SUM(p.paid_minutes)
          FROM attendance_late_payments p
          WHERE p.debt_id = d.id
        ), 0)
      )::integer,
      status = CASE
        WHEN d.late_minutes - COALESCE((
          SELECT SUM(p.paid_minutes)
          FROM attendance_late_payments p
          WHERE p.debt_id = d.id
        ), 0) <= 0 THEN 'PAID'
        WHEN COALESCE((
          SELECT SUM(p.paid_minutes)
          FROM attendance_late_payments p
          WHERE p.debt_id = d.id
        ), 0) > 0 THEN 'PARTIAL'
        ELSE 'UNPAID'
      END,
      updated_at = CURRENT_TIMESTAMP
    WHERE d.user_id = $1
      AND d.debt_date < $2
    `,
    [employeeId, cutoff],
  );

  const history = [];

  for (const attendance of attendanceResult.rows) {
    const attendanceId = Number(attendance.id);
    const date = attendance.attendance_date;

    const schedule = await getEmployeeSchedule(client, employeeId, date);

    // Jadwal belum berlaku atau tidak ditemukan.
    // Jangan membuat utang/kredit berdasarkan asumsi.
    if (!schedule) continue;

    const workDays = parseWorkDays(schedule.work_days);
    const weekday = String(attendance.weekday).trim();

    const isWorkingDay = workDays.includes(weekday);

    const startSeconds =
      Number(String(schedule.office_start_time).split(":")[0]) * 3600 +
      Number(String(schedule.office_start_time).split(":")[1]) * 60 +
      Number(String(schedule.office_start_time).split(":")[2] || 0);

    const endSeconds =
      Number(String(schedule.office_end_time).split(":")[0]) * 3600 +
      Number(String(schedule.office_end_time).split(":")[1]) * 60 +
      Number(String(schedule.office_end_time).split(":")[2] || 0);

    const checkInSeconds = Number(attendance.check_in_seconds);
    const checkOutSeconds = Number(attendance.check_out_seconds);

    const checkInEpoch = Number(attendance.check_in_epoch);
    const checkOutEpoch = Number(attendance.check_out_epoch);

    let lateMinutes = 0;
    let debtMinutes = 0;
    let compensationMinutes = 0;

    if (isWorkingDay) {
      // Hari kerja normal: keterlambatan setelah jam masuk.
      lateMinutes = minutesBetween(startSeconds, checkInSeconds, "ceil");

      // Kelebihan kerja setelah jam pulang.
      compensationMinutes = minutesBetween(
        endSeconds,
        checkOutSeconds,
        "floor",
      );

      // Gunakan saldo Company Credit terlebih dahulu.
      const creditBalance = await getCreditBalance(client, employeeId);

      const creditUsed = Math.min(lateMinutes, creditBalance);

      if (creditUsed > 0) {
        await addCreditTransaction(
          client,
          employeeId,
          attendanceId,
          date,
          "USED",
          creditUsed,
          "Mengurangi keterlambatan hari kerja",
        );
      }

      debtMinutes = lateMinutes - creditUsed;
    } else {
      // Hari non-kerja: seluruh durasi attendance
      // menjadi kompensasi, tanpa potongan istirahat.
      compensationMinutes = Math.max(
        0,
        Math.floor((checkOutEpoch - checkInEpoch) / 60),
      );
    }

    await client.query(
      `
      UPDATE attendance
      SET
        is_late = $1,
        late_minutes = $2
      WHERE id = $3
      `,
      [
        isWorkingDay && lateMinutes > 0,
        isWorkingDay ? lateMinutes : 0,
        attendanceId,
      ],
    );

    // Catat utang terlebih dahulu agar kompensasi
    // hari yang sama bisa membayar utang tersebut.
    if (debtMinutes > 0) {
      await createDebt(client, employeeId, attendanceId, date, debtMinutes);
    }

    // Kompensasi membayar utang FIFO.
    const paymentResult = await payDebtFIFO(
      client,
      employeeId,
      attendanceId,
      date,
      compensationMinutes,
    );

    const creditEarned = paymentResult.remaining;

    if (creditEarned > 0) {
      await addCreditTransaction(
        client,
        employeeId,
        attendanceId,
        date,
        "EARNED",
        creditEarned,
        isWorkingDay
          ? "Kelebihan jam kerja setelah jam pulang"
          : "Kompensasi kerja pada hari non-kerja",
      );
    }

    await client.query(
      `
      INSERT INTO attendance_late_processing (
        attendance_id,
        user_id,
        processed_at
      )
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      `,
      [attendanceId, employeeId],
    );

    history.push({
      attendanceId,
      date,
      weekday,
      isWorkingDay,
      lateMinutes,
      debtMinutes,
      compensationMinutes,
      paidToday: paymentResult.paidToday,
      creditUsed: isWorkingDay ? lateMinutes - debtMinutes : 0,
      creditEarned,
    });
  }

  const summary = await getSummary(client, employeeId);

  return {
    userId: employeeId,
    processedAttendance: history.length,
    ...summary,
    history,
  };
}

async function getSummary(client, employeeId) {
  const debtResult = await client.query(
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
    [employeeId],
  );

  const creditResult = await client.query(
    `
    SELECT
      COALESCE(SUM(
        CASE
          WHEN transaction_type = 'EARNED' THEN minutes
          ELSE 0
        END
      ), 0)::integer AS total_credit_earned,

      COALESCE(SUM(
        CASE
          WHEN transaction_type = 'USED' THEN minutes
          ELSE 0
        END
      ), 0)::integer AS total_credit_used,

      COALESCE(SUM(
        CASE
          WHEN transaction_type = 'EARNED' THEN minutes
          WHEN transaction_type = 'USED' THEN -minutes
          ELSE 0
        END
      ), 0)::integer AS company_credit_minutes
    FROM attendance_company_credit_ledger
    WHERE user_id = $1
    `,
    [employeeId],
  );

  return {
    ...debtResult.rows[0],
    ...creditResult.rows[0],
  };
}

async function processLateCompensation(client, attendanceId) {
  const result = await client.query(
    `
    SELECT id, user_id
    FROM attendance
    WHERE id = $1
    `,
    [attendanceId],
  );

  if (!result.rows.length) {
    throw new Error("Absensi tidak ditemukan");
  }

  const attendance = result.rows[0];

  const summary = await reconcileEmployeeLateCompensation(
    client,
    attendance.user_id,
  );

  const current = summary.history.find(
    (item) => Number(item.attendanceId) === Number(attendanceId),
  );

  return {
    success: true,
    attendanceId: Number(attendanceId),
    lateMinutes: current?.lateMinutes || 0,
    debtMinutes: current?.debtMinutes || 0,
    extraMinutes: current?.compensationMinutes || 0,
    paidToday: current?.paidToday || 0,
    creditUsed: current?.creditUsed || 0,
    creditEarned: current?.creditEarned || 0,
    totalLateMinutes: summary.total_late_minutes,
    totalPaidMinutes: summary.total_paid_minutes,
    outstandingMinutes: summary.outstanding_minutes,
    companyCreditMinutes: summary.company_credit_minutes,
  };
}

module.exports = {
  lockEmployee,
  processLateCompensation,
  reconcileEmployeeLateCompensation,
};
