const DAY_MAP = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

const toDateOnly = (value) => {
  if (!value) return null;

  // Jika sudah berupa tanggal YYYY-MM-DD
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (isNaN(date.getTime())) return null;

  // Konversi ke tanggal lokal Jakarta
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values = {};
  parts.forEach((part) => {
    values[part.type] = part.value;
  });

  return `${values.year}-${values.month}-${values.day}`;
};

const countWorkingDays = (startDate, endDate, workDays) => {
  if (!startDate || !endDate || !Array.isArray(workDays)) return 0;

  const allowedDays = new Set(
    workDays
      .map((day) => DAY_MAP[String(day).toUpperCase()])
      .filter((day) => day !== undefined),
  );

  const startString = toDateOnly(startDate);
  const endString = toDateOnly(endDate);

  if (!startString || !endString) return 0;

  const start = new Date(`${startString}T00:00:00Z`);
  const end = new Date(`${endString}T00:00:00Z`);

  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
    return 0;
  }

  let total = 0;

  for (
    let date = new Date(start);
    date <= end;
    date.setUTCDate(date.getUTCDate() + 1)
  ) {
    if (allowedDays.has(date.getUTCDay())) {
      total++;
    }
  }

  return total;
};

module.exports = countWorkingDays;
