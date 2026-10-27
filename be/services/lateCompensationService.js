
/**
 * Automatic Late Compensation
 *
 * Aturan sementara:
 * - Berlaku untuk attendance_type OFFICE.
 * - Jam masuk 08:00 WIB.
 * - Jam pulang 17:00 WIB.
 * - Keterlambatan dibulatkan ke atas per menit.
 * - Kompensasi setelah 17:00 dibulatkan ke bawah.
 * - Pembayaran utang menggunakan FIFO.
 * - Pulang awal tidak menambah utang.
 * - Kelebihan kompensasi tidak menjadi saldo kredit.
 *
 * Penting:
 * Kolom attendance.check_in/check_out diasumsikan
 * berisi waktu lokal Asia/Jakarta (timestamp tanpa timezone).
 *
 * Semua fungsi mutasi menerima PostgreSQL client
 * yang sudah berada di dalam transaksi.
 */

const OFFICE_START = "08:00:00";
const OFFICE_END = "17:00:00";

async function lockEmployee(client, userId) {
    await client.query(
        "SELECT pg_advisory_xact_lock($1, $2)",
        [17001, Number(userId)]
    );
}

/**
 * Bangun ulang ledger keterlambatan karyawan.
 *
 * Panggil setelah memperoleh advisory lock karyawan.
 * Fungsi ini tidak melakukan COMMIT atau ROLLBACK.
 */
async function reconcileEmployeeLateCompensation(
    client,
    userId
) {
    const employeeId = Number(userId);

    if (!Number.isInteger(employeeId) || employeeId <= 0) {
        throw new Error("User ID tidak valid");
    }

    // Ambil absensi lengkap dan urutkan dari paling lama.
    // Semua perhitungan jam dilakukan PostgreSQL agar
    // timestamp tanpa timezone tidak bergeser di Node.js.
    const attendanceResult = await client.query(
        `
    SELECT
      a.id,
      a.user_id,
      a.attendance_date,
      a.attendance_type,
      a.check_in,
      a.check_out,

      CASE
        WHEN UPPER(
          COALESCE(a.attendance_type, 'OFFICE')
        ) = 'OFFICE'
        THEN GREATEST(
          0,
          CEIL(
            EXTRACT(
              EPOCH FROM (
                a.check_in::time - $2::time
              )
            ) / 60
          )
        )::integer
        ELSE 0
      END AS calculated_late,

      CASE
        WHEN UPPER(
          COALESCE(a.attendance_type, 'OFFICE')
        ) = 'OFFICE'
        THEN GREATEST(
          0,
          FLOOR(
            EXTRACT(
              EPOCH FROM (
                a.check_out::time - $3::time
              )
            ) / 60
          )
        )::integer
        ELSE 0
      END AS calculated_extra

    FROM attendance a
    WHERE a.user_id = $1
      AND a.check_in IS NOT NULL
      AND a.check_out IS NOT NULL

    ORDER BY
      a.attendance_date ASC,
      a.check_in ASC,
      a.id ASC

    FOR UPDATE OF a
    `,
        [employeeId, OFFICE_START, OFFICE_END]
    );

    // Hapus ledger turunan milik karyawan.
    // Semua dilakukan dalam satu transaksi:
    // jika terjadi error, ledger lama kembali melalui rollback.
    await client.query(
        `
    DELETE FROM attendance_late_payments
    WHERE user_id = $1
    `,
        [employeeId]
    );

    await client.query(
        `
    DELETE FROM attendance_late_debts
    WHERE user_id = $1
    `,
        [employeeId]
    );

    await client.query(
        `
    DELETE FROM attendance_late_processing
    WHERE user_id = $1
    `,
        [employeeId]
    );

    const history = [];

    for (const attendance of attendanceResult.rows) {
        const attendanceId = Number(attendance.id);
        const lateMinutes = Number(
            attendance.calculated_late || 0
        );
        const extraMinutes = Number(
            attendance.calculated_extra || 0
        );

        // Sinkronkan kolom attendance dengan aturan 08:00.
        await client.query(
            `
      UPDATE attendance
      SET
        is_late = $1,
        late_minutes = $2
      WHERE id = $3
      `,
            [
                lateMinutes > 0,
                lateMinutes,
                attendanceId,
            ]
        );

        // Simpan utang keterlambatan baru.
        if (lateMinutes > 0) {
            await client.query(
                `
        INSERT INTO attendance_late_debts (
          attendance_id,
          user_id,
          debt_date,
          late_minutes,
          paid_minutes,
          status
        )
        VALUES ($1, $2, $3, $4, 0, 'UNPAID')
        `,
                [
                    attendanceId,
                    employeeId,
                    attendance.attendance_date,
                    lateMinutes,
                ]
            );
        }

        let availableMinutes = extraMinutes;
        let paidToday = 0;

        // Ambil utang tertua yang belum lunas.
        const debtResult = await client.query(
            `
      SELECT
        id,
        remaining_minutes
      FROM attendance_late_debts
      WHERE user_id = $1
        AND remaining_minutes > 0
        AND debt_date <= $2
      ORDER BY debt_date ASC, id ASC
      FOR UPDATE
      `,
            [employeeId, attendance.attendance_date]
        );

        for (const debt of debtResult.rows) {
            if (availableMinutes <= 0) break;

            const payment = Math.min(
                availableMinutes,
                Number(debt.remaining_minutes)
            );

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
                [
                    debt.id,
                    attendanceId,
                    employeeId,
                    attendance.attendance_date,
                    payment,
                ]
            );

            await client.query(
                `
        UPDATE attendance_late_debts
        SET
          paid_minutes = paid_minutes + $1,
          status = CASE
            WHEN paid_minutes + $1 >= late_minutes
              THEN 'PAID'
            ELSE 'PARTIAL'
          END,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $2
        `,
                [payment, debt.id]
            );

            availableMinutes -= payment;
            paidToday += payment;
        }

        // Tandai absensi sudah diproses,
        // termasuk hari tanpa keterlambatan.
        await client.query(
            `
      INSERT INTO attendance_late_processing (
        attendance_id,
        user_id
      )
      VALUES ($1, $2)
      `,
            [attendanceId, employeeId]
        );

        history.push({
            attendanceId,
            date: attendance.attendance_date,
            lateMinutes,
            extraMinutes,
            paidToday,
        });
    }

    const summaryResult = await client.query(
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
        [employeeId]
    );

    return {
        userId: employeeId,
        processedAttendance: history.length,
        ...summaryResult.rows[0],
        history,
    };
}

/**
 * Dipanggil dari Check-out.
 * Controller sudah melakukan BEGIN dan advisory lock.
 */
async function processLateCompensation(
    client,
    attendanceId
) {
    const result = await client.query(
        `
    SELECT
      id,
      user_id
    FROM attendance
    WHERE id = $1
    `,
        [attendanceId]
    );

    if (!result.rows.length) {
        throw new Error("Absensi tidak ditemukan");
    }

    const attendance = result.rows[0];

    const summary =
        await reconcileEmployeeLateCompensation(
            client,
            attendance.user_id
        );

    const currentAttendance = summary.history.find(
        (item) =>
            Number(item.attendanceId) === Number(attendanceId)
    );

    return {
        success: true,
        attendanceId: Number(attendanceId),
        lateMinutes: currentAttendance?.lateMinutes || 0,
        extraMinutes: currentAttendance?.extraMinutes || 0,
        paidToday: currentAttendance?.paidToday || 0,
        totalLateMinutes: summary.total_late_minutes,
        totalPaidMinutes: summary.total_paid_minutes,
        outstandingMinutes: summary.outstanding_minutes,
    };
}

module.exports = {
    lockEmployee,
    processLateCompensation,
    reconcileEmployeeLateCompensation,
};
