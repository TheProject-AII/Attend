const pool = require("../config/db");
const PDFDocument = require("pdfkit");
const path = require("path");
const fs = require("fs");

const ROLE = {
  HR: 2,
  FINANCE: 6,
  DIRECTOR: 7,
};

const COLORS = {
  navy: "#203D65",
  label: "#E9EDF3",
  border: "#B9C3CF",
  text: "#222222",
  muted: "#777777",
};

function getValue(...values) {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value);
    }
  }

  return "-";
}

function formatDate(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

function formatDateTime(value) {
  if (!value) return "-";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  const datePart = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);

  const timePart = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Jakarta",
  }).format(date);

  return `${datePart} | ${timePart} WIB`;
}

// =============================================
// DURASI BERDASARKAN KELIPATAN 24 JAM
// =============================================

function calculateTripDuration(departure, returning) {
  if (!departure || !returning) {
    return {
      days: "-",
      nights: "-",
      hours: 0,
    };
  }

  const start = new Date(departure);
  const end = new Date(returning);

  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    return {
      days: "-",
      nights: "-",
      hours: 0,
    };
  }

  const totalHours = (end.getTime() - start.getTime()) / 3600000;

  return {
    days: Math.ceil(totalHours / 24),
    nights: Math.floor(totalHours / 24),
    hours: totalHours,
  };
}

// =============================================
// VALIDASI PATH LOGO PERUSAHAAN
// =============================================

function resolveCompanyLogo(logoPath) {
  if (!logoPath || typeof logoPath !== "string" || logoPath === "-") {
    throw new Error("Company logo has not been configured.");
  }

  const backendDir = path.resolve(__dirname, "..");

  const normalized = logoPath.trim().replace(/\\/g, "/").replace(/^\/+/, "");

  const resolved = path.resolve(backendDir, normalized);
  const relative = path.relative(backendDir, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Invalid company logo path.");
  }

  if (!fs.existsSync(resolved)) {
    throw new Error(`Company logo file not found: ${resolved}`);
  }

  const extension = path.extname(resolved).toLowerCase();

  if (![".png", ".jpg", ".jpeg"].includes(extension)) {
    throw new Error("Company logo must be PNG, JPG, or JPEG.");
  }

  return resolved;
}

// =============================================
// SECTION HEADER
// =============================================

function drawSection(doc, title, y) {
  const x = 55;
  const width = 485;
  const height = 18;

  doc.rect(x, y, width, height).fill(COLORS.navy);

  doc
    .fillColor("#FFFFFF")
    .font("Times-Bold")
    .fontSize(9)
    .text(title, x + 7, y + 4, {
      width: width - 14,
      height: 12,
    });

  doc.fillColor(COLORS.text);

  return y + height;
}

// =============================================
// CHECKBOX OPTIONS
// =============================================

function drawCheckboxOptions(doc, options, x, y, maxWidth) {
  let currentX = x;
  let currentY = y;

  const boxSize = 8;
  const gap = 4;
  const itemGap = 9;
  const fontSize = 7.5;

  options.forEach((option) => {
    doc.font("Times-Roman").fontSize(fontSize);

    const labelWidth = doc.widthOfString(option.label);
    const itemWidth = boxSize + gap + labelWidth + itemGap;

    if (currentX + itemWidth > x + maxWidth) {
      currentX = x;
      currentY += 12;
    }

    // Draw checkbox.
    doc
      .rect(currentX, currentY + 1, boxSize, boxSize)
      .lineWidth(0.8)
      .strokeColor("#333333")
      .stroke();

    // Draw checkmark.
    if (option.checked) {
      doc
        .moveTo(currentX + 1.5, currentY + 5)
        .lineTo(currentX + 3.5, currentY + 7)
        .lineTo(currentX + 7, currentY + 2)
        .lineWidth(1.2)
        .strokeColor(COLORS.navy)
        .stroke();
    }

    doc
      .fillColor(COLORS.text)
      .font("Times-Roman")
      .fontSize(fontSize)
      .text(option.label, currentX + boxSize + gap, currentY, {
        lineBreak: false,
      });

    currentX += itemWidth;
  });

  doc.fillColor(COLORS.text);
}

// =============================================
// TABLE
// =============================================

function drawTable(doc, rows, startY, options = {}) {
  const x = 55;
  const width = 485;
  const labelWidth = options.labelWidth || 160;
  const valueWidth = width - labelWidth;
  const fontSize = options.fontSize || 8.5;
  const minHeight = options.minHeight || 18;

  let y = startY;

  rows.forEach((row) => {
    const label = String(row.label || "");
    const value = String(row.value ?? "-");

    doc.font("Times-Roman").fontSize(fontSize);

    const labelHeight = doc.heightOfString(label, {
      width: labelWidth - 12,
      lineGap: 1,
    });

    const valueHeight = row.checkboxOptions
      ? 32
      : doc.heightOfString(value, {
          width: valueWidth - 12,
          lineGap: 1,
        });

    const rowHeight = Math.max(
      minHeight,
      Math.max(labelHeight, valueHeight) + 7,
    );

    // Label cell.
    doc
      .rect(x, y, labelWidth, rowHeight)
      .fillAndStroke(COLORS.label, COLORS.border);

    // Value cell.
    doc
      .rect(x + labelWidth, y, valueWidth, rowHeight)
      .fillAndStroke("#FFFFFF", COLORS.border);

    // Label text.
    doc
      .fillColor(COLORS.text)
      .font("Times-Bold")
      .fontSize(fontSize)
      .text(label, x + 6, y + 4, {
        width: labelWidth - 12,
        lineGap: 1,
      });

    // Value text or checkboxes.
    if (row.checkboxOptions) {
      drawCheckboxOptions(
        doc,
        row.checkboxOptions,
        x + labelWidth + 7,
        y + 4,
        valueWidth - 14,
      );
    } else {
      doc
        .fillColor(COLORS.text)
        .font("Times-Roman")
        .fontSize(fontSize)
        .text(value, x + labelWidth + 6, y + 4, {
          width: valueWidth - 12,
          lineGap: 1,
        });
    }

    y += rowHeight;
  });

  return y;
}

// =============================================
// SIGNATURE SECTION
// REVISI: KOTAK TANDA TANGAN KOSONG
// TANPA GARIS DAN TANPA TANDA KURUNG
// =============================================

function drawSignatureSection(doc, signatories, startY) {
  const x = 55;
  const width = 485;
  const colWidth = width / 3;

  const headers = ["ASSIGNED EMPLOYEE", "ACKNOWLEDGED BY (HRD)", "APPROVED BY"];

  const headerHeight = 18;
  const signatureHeight = 43;
  const detailHeight = 34;

  // =====================================
  // HEADER ROW
  // =====================================

  headers.forEach((header, index) => {
    const cellX = x + index * colWidth;

    doc
      .rect(cellX, startY, colWidth, headerHeight)
      .fillAndStroke(COLORS.label, COLORS.border);

    doc
      .fillColor(COLORS.text)
      .font("Times-Bold")
      .fontSize(7.5)
      .text(header, cellX + 3, startY + 5, {
        width: colWidth - 6,
        align: "center",
      });
  });

  const signatureY = startY + headerHeight;

  // =====================================
  // KOTAK TANDA TANGAN KOSONG
  // TIDAK ADA TEKS ATAU GARIS
  // =====================================

  for (let i = 0; i < 3; i++) {
    const cellX = x + i * colWidth;

    doc
      .rect(cellX, signatureY, colWidth, signatureHeight)
      .fillAndStroke("#FFFFFF", COLORS.border);
  }

  // =====================================
  // NAMA DAN JABATAN
  // =====================================

  const detailY = signatureY + signatureHeight;

  signatories.forEach((person, index) => {
    const cellX = x + index * colWidth;

    doc
      .rect(cellX, detailY, colWidth, detailHeight)
      .fillAndStroke("#F8F9FB", COLORS.border);

    // Name.
    doc
      .fillColor(COLORS.muted)
      .font("Times-Roman")
      .fontSize(7.5)
      .text(person.name || "-", cellX + 4, detailY + 5, {
        width: colWidth - 8,
        align: "center",
      });

    // Position.
    doc
      .fillColor(COLORS.muted)
      .font("Times-Roman")
      .fontSize(7.5)
      .text(person.position || "-", cellX + 4, detailY + 19, {
        width: colWidth - 8,
        align: "center",
      });
  });

  doc.fillColor(COLORS.text);

  return detailY + detailHeight;
}

// =============================================
// MAIN DOWNLOAD SPD
// =============================================

exports.downloadSPD = async (req, res) => {
  try {
    const userId = Number(req.user.id);
    const tripId = Number(req.params.id);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0 ||
      !Number.isSafeInteger(tripId) ||
      tripId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user or business trip ID.",
      });
    }

    // =====================================
    // LOAD TRIP AND COMPANY
    // =====================================

    const result = await pool.query(
      `
      SELECT
        bt.*,

        l.id AS letter_id,
        l.letter_number,
        l.issued_at,
        l.letter_data,

        requester.role_id,

        employee.id AS employee_master_id,
        employee.name AS employee_master_name,
        employee.nik AS employee_master_nik,
        employee.phone AS employee_master_phone,
        employee.position AS employee_master_position,
        employee.department AS employee_master_department,
        employee.leader_id,

        company.id AS company_id,
        company.name AS company_name,
        company.address AS company_address,
        company.logo_path AS company_logo_path

      FROM business_trip_letters l

      JOIN business_trips bt
        ON bt.id = l.business_trip_id

      JOIN users requester
        ON requester.id = $2

      LEFT JOIN users employee
        ON employee.id = bt.employee_id

      LEFT JOIN companies company
        ON company.id = employee.company_id

      WHERE bt.id = $1
        AND requester.status = TRUE
        AND (
          requester.role_id IN ($3, $4, $5)
          OR bt.employee_id = $2
        )

      LIMIT 1
      `,
      [tripId, userId, ROLE.HR, ROLE.FINANCE, ROLE.DIRECTOR],
    );

    if (!result.rowCount) {
      return res.status(404).json({
        success: false,
        message: "Travel assignment not found or access denied.",
      });
    }

    const trip = result.rows[0];

    // =====================================
    // READ SNAPSHOT
    // =====================================

    const letterData =
      trip.letter_data && typeof trip.letter_data === "object"
        ? trip.letter_data
        : {};

    const snapshotCompany =
      letterData.company && typeof letterData.company === "object"
        ? letterData.company
        : {};

    const company = {
      id: snapshotCompany.id || trip.company_id,

      name: getValue(
        letterData.company_name,
        snapshotCompany.name,
        trip.company_name,
      ),

      address: getValue(
        letterData.company_address,
        snapshotCompany.address,
        trip.company_address,
      ),

      logo_path: getValue(
        letterData.company_logo_path,
        snapshotCompany.logo_path,
        trip.company_logo_path,
      ),
    };

    if (company.name === "-") {
      return res.status(400).json({
        success: false,
        message: "Employee company information is missing.",
      });
    }

    const logoPath = resolveCompanyLogo(company.logo_path);

    // =====================================
    // AUTHORIZING OFFICER
    // =====================================

    let authorizingOfficer = {
      name: "-",
      position: "-",
      department: "-",
    };

    if (trip.leader_id) {
      const leaderResult = await pool.query(
        `
        SELECT
          name,
          position,
          department
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [trip.leader_id],
      );

      if (leaderResult.rowCount) {
        const leader = leaderResult.rows[0];

        authorizingOfficer = {
          name: getValue(leader.name),
          position: getValue(leader.position),
          department: getValue(leader.department),
        };
      }
    }

    // =====================================
    // HR AND DIRECTOR APPROVAL
    // =====================================

    const approvalResult = await pool.query(
      `
      SELECT
        approval_stage,
        approver_name,
        approver_id,
        status
      FROM business_trip_approvals
      WHERE business_trip_id = $1
        AND approval_stage IN (
          'HR',
          'DIRECTOR'
        )
      ORDER BY approval_step ASC
      `,
      [tripId],
    );

    const hrApproval = approvalResult.rows.find(
      (item) => item.approval_stage === "HR" && item.status === "APPROVED",
    );

    const directorApproval = approvalResult.rows.find(
      (item) =>
        item.approval_stage === "DIRECTOR" && item.status === "APPROVED",
    );

    const hrName = getValue(hrApproval?.approver_name);

    const directorName = getValue(directorApproval?.approver_name);

    // =====================================
    // DURATION
    // =====================================

    const departureValue = letterData.departure_date || trip.departure_date;

    const returnValue = letterData.return_date || trip.return_date;

    const duration = calculateTripDuration(departureValue, returnValue);

    // =====================================
    // DOCUMENT DATA
    // =====================================

    const transportation = getValue(
      letterData.mode_of_transportation,
      letterData.transportation,
      trip.mode_of_transportation,
      trip.transportation,
    );

    const expenseCoverage = getValue(
      letterData.expense_coverage,
      letterData.expense_allowance_coverage,
      trip.expense_coverage,
      trip.expense_allowance_coverage,
    );

    const accommodation = getValue(
      letterData.accommodation,
      letterData.accommodation_name,
      trip.accommodation,
      trip.accommodation_name,
    );

    const data = {
      employeeName: getValue(
        letterData.employee_name,
        trip.employee_name,
        trip.employee_master_name,
      ),

      employeeNik: getValue(
        letterData.employee_nik,
        trip.employee_nik,
        trip.employee_master_nik,
      ),

      employeePosition: getValue(
        letterData.employee_position,
        trip.employee_position,
        trip.employee_master_position,
      ),

      employeeDepartment: getValue(
        letterData.employee_department,
        trip.employee_department,
        trip.employee_master_department,
      ),

      employeePhone: getValue(
        letterData.employee_phone,
        trip.employee_phone,
        trip.employee_master_phone,
      ),

      destination: getValue(letterData.destination, trip.destination),

      purpose: getValue(letterData.purpose, trip.purpose),

      departure: formatDateTime(departureValue),

      returnDate: formatDateTime(returnValue),

      durationDays: duration.days,
      durationNights: duration.nights,

      transportation,
      accommodation,
      expenseCoverage,

      letterNumber: getValue(trip.letter_number),

      issuedDate: formatDate(trip.issued_at),

      issuedCity: getValue(letterData.issued_city, trip.issued_city, "Jakarta"),
    };

    // =====================================
    // CREATE PDF
    // =====================================

    const filename = `Travel-Assignment-${String(
      trip.trip_number || trip.id,
    ).replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;

    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 25,
        bottom: 20,
        left: 55,
        right: 55,
      },
      bufferPages: true,
    });

    res.setHeader("Content-Type", "application/pdf");

    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);

    doc.on("error", (error) => {
      console.error("PDF STREAM ERROR:", error);

      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy(error);
      }
    });

    doc.pipe(res);

    // =====================================
    // COMPANY HEADER
    // =====================================

    doc.image(logoPath, 65, 25, {
      fit: [65, 65],
      align: "center",
      valign: "center",
    });

    doc
      .fillColor(COLORS.text)
      .font("Times-Bold")
      .fontSize(12)
      .text(company.name.toUpperCase(), 145, 35, {
        width: 390,
      });

    doc.font("Times-Roman").fontSize(9).text(company.address, 145, 52, {
      width: 390,
      lineGap: 1,
    });

    doc
      .moveTo(55, 100)
      .lineTo(540, 100)
      .lineWidth(1)
      .strokeColor(COLORS.border)
      .stroke();

    // =====================================
    // TITLE
    // =====================================

    doc
      .fillColor(COLORS.text)
      .font("Times-Bold")
      .fontSize(15)
      .text("EMPLOYEE TRAVEL ASSIGNMENT", 55, 114, {
        width: 485,
        align: "center",
        underline: true,
      });

    doc
      .font("Times-Roman")
      .fontSize(9)
      .text(`Reference No.: ${data.letterNumber}`, 55, 136, {
        width: 485,
        align: "center",
      });

    // =====================================
    // INTRODUCTION
    // =====================================

    let y = 155;

    doc
      .font("Times-Roman")
      .fontSize(9)
      .text(
        `The undersigned below, on behalf of the Management of ${company.name}, hereby assigns and authorizes the following employee to undertake an official business trip:`,
        55,
        y,
        {
          width: 485,
          align: "justify",
          lineGap: 2,
        },
      );

    y = doc.y + 7;

    // =====================================
    // SECTION I
    // =====================================

    y = drawSection(doc, "I. AUTHORIZING OFFICER (PEMBERI TUGAS)", y);

    y = drawTable(
      doc,
      [
        {
          label: "Full Name",
          value: authorizingOfficer.name,
        },
        {
          label: "Job Title / Position",
          value: authorizingOfficer.position,
        },
        {
          label: "Department / Division",
          value: authorizingOfficer.department,
        },
      ],
      y,
      {
        minHeight: 18,
      },
    );

    y += 14;

    // =====================================
    // SECTION II
    // =====================================

    y = drawSection(doc, "II. ASSIGNED EMPLOYEE DETAILS (PENERIMA TUGAS)", y);

    y = drawTable(
      doc,
      [
        {
          label: "Full Name",
          value: data.employeeName,
        },
        {
          label: "Employee ID (NIK)",
          value: data.employeeNik,
        },
        {
          label: "Job Title / Position",
          value: data.employeePosition,
        },
        {
          label: "Department / Unit",
          value: data.employeeDepartment,
        },
        {
          label: "Phone / WhatsApp",
          value: data.employeePhone,
        },
      ],
      y,
      {
        minHeight: 18,
      },
    );

    y += 14;

    // =====================================
    // SECTION III
    // =====================================

    y = drawSection(
      doc,
      "III. BUSINESS TRAVEL ITINERARY & ASSIGNMENT DETAILS",
      y,
    );

    y = drawTable(
      doc,
      [
        {
          label: "Destination City / Location",
          value: data.destination,
        },
        {
          label: "Purpose of Travel",
          value: data.purpose,
        },
        {
          label: "Departure Date & Time",
          value: data.departure,
        },
        {
          label: "Return Date & Time",
          value: data.returnDate,
        },
        {
          label: "Duration",
          value:
            data.durationDays !== "-"
              ? `${data.durationDays} Day(s) / ${data.durationNights} Night(s)`
              : "-",
        },
        {
          label: "Mode of Transportation",
          checkboxOptions: [
            {
              label: "Flight",
              checked: /flight|pesawat/i.test(transportation),
            },
            {
              label: "Train",
              checked: /train|kereta/i.test(transportation),
            },
            {
              label: "Company Car",
              checked: /company car|mobil perusahaan/i.test(transportation),
            },
            {
              label: "Rental / Online Transport",
              checked: /rental|online transport|taksi/i.test(transportation),
            },
            {
              label: "Other",
              checked: /other|lainnya/i.test(transportation),
            },
          ],
        },
        {
          label: "Accommodation / Lodging",
          value: accommodation,
        },
        {
          label: "Expense & Allowance Coverage",
          checkboxOptions: [
            {
              label: "Company-Funded (Reimbursement)",
              checked: /reimbursement|company-funded|company funded/i.test(
                expenseCoverage,
              ),
            },
            {
              label: "Cash Advance (Kasbon)",
              checked: /cash advance|kasbon/i.test(expenseCoverage),
            },
            {
              label: "Client-Covered",
              checked: /client-covered|client covered/i.test(expenseCoverage),
            },
          ],
        },
      ],
      y,
      {
        labelWidth: 160,
        fontSize: 8,
        minHeight: 18,
      },
    );

    y += 10;

    // =====================================
    // TRAVEL POLICY
    // =====================================

    doc
      .fillColor(COLORS.text)
      .font("Times-Roman")
      .fontSize(8.5)
      .text(
        "The assigned employee is expected to carry out this assignment responsibly in accordance with company policies and submit a post-travel report along with original expense receipts to the HR & Finance Department no later than 3 / 5 working days upon return.",
        55,
        y,
        {
          width: 485,
          align: "justify",
          lineGap: 2,
        },
      );

    y = doc.y + 10;

    // =====================================
    // CLOSING
    // =====================================

    doc
      .font("Times-Roman")
      .fontSize(8.5)
      .text(
        "This Travel Assignment Letter is issued for official use and relevant institutional coordination.",
        55,
        y,
        {
          width: 485,
          align: "justify",
        },
      );

    y = doc.y + 8;

    doc
      .font("Times-Bold")
      .fontSize(8.5)
      .text(`Issued in: ${data.issuedCity}, ${data.issuedDate}`, 55, y, {
        width: 485,
        align: "right",
      });

    y = doc.y + 8;

    // =====================================
    // SIGNATURES
    // =====================================

    const signatureBottom = drawSignatureSection(
      doc,
      [
        {
          name: data.employeeName,
          position: data.employeePosition,
        },
        {
          name: hrName,
          position: "HR Department",
        },
        {
          name: directorName,
          position: "Director / Manager",
        },
      ],
      y,
    );

    // =====================================
    // FOOTER
    // =====================================

    doc
      .fillColor(COLORS.muted)
      .font("Times-Italic")
      .fontSize(8)
      .text(company.name, 55, signatureBottom + 4, {
        width: 485,
        align: "left",
      });

    // =====================================
    // PAGE CHECK
    // =====================================

    if (signatureBottom + 20 > doc.page.height - 15) {
      console.warn("Travel Assignment content may exceed one A4 page.");
    }

    doc.end();
  } catch (error) {
    console.error("DOWNLOAD SPD ERROR:", error);

    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Failed to generate Employee Travel Assignment.",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }

    res.end();
  }
};
