const cron = require("node-cron");
const pool = require("../config/db");

const runAutoCheckout = async () => {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(`
      WITH jakarta_time AS (
        SELECT NOW() AT TIME ZONE 'Asia/Jakarta' AS local_now
      )
      INSERT INTO attendance_auto_checkouts (
        attendance_id,
        auto_checkout_time,
        reason,
        created_at
      )
      SELECT
        a.id,
        DATE(a.attendance_date) + TIME '18:30',
        'Not manually checked out by 18:30',
        NOW() AT TIME ZONE 'Asia/Jakarta'
      FROM attendance a
      CROSS JOIN jakarta_time j
      WHERE
        a.attendance_date = j.local_now::date
        AND a.check_in IS NOT NULL
        AND a.check_out IS NULL
        AND j.local_now::time >= TIME '18:30'
      ON CONFLICT (attendance_id) DO NOTHING
      RETURNING attendance_id;
    `);

    await client.query("COMMIT");

    console.log(`[AUTO CHECKOUT] ${result.rowCount} records processed`);
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[AUTO CHECKOUT ERROR]", error);
  } finally {
    client.release();
  }
};

const startAutoCheckoutJob = () => {
  cron.schedule(
    "30 18 * * *",
    async () => {
      console.log("[AUTO CHECKOUT] Running at 18:30 WIB");
      await runAutoCheckout();
    },
    {
      timezone: "Asia/Jakarta",
    },
  );

  // Mengejar proses yang terlewat jika server restart setelah 18:30
  const jakartaTime = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Jakarta",
    }),
  );

  if (
    jakartaTime.getHours() > 18 ||
    (jakartaTime.getHours() === 18 && jakartaTime.getMinutes() >= 30)
  ) {
    runAutoCheckout();
  }

  console.log("[AUTO CHECKOUT] Scheduler initialized");
};

module.exports = startAutoCheckoutJob;
