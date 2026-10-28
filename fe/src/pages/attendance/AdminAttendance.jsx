import { useState, useEffect } from "react";

import { Box, Button, Stack, Tabs, Tab } from "@mui/material";

import dayjs from "dayjs";

import DownloadIcon from "@mui/icons-material/Download";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import AttendanceSummaryTable from "../../components/attendance/AttendanceSummaryTable";
import DailyFilter from "../../components/layout/DailyFilter";
import SummaryFilter from "../../components/attendance/SummaryFilter";
import DailySummaryCards from "../../components/attendance/DailySummaryCards";

import attendanceService from "../../services/attService";
import DailyAttendanceTable from "../../components/DailyAttendanceTable";

export default function AdminAttendance() {
  const [loadingDaily, setLoadingDaily] = useState(false);

  const [loadingSummary, setLoadingSummary] = useState(false);

  const [dailyAttendance, setDailyAttendance] = useState([]);

  const [filters, setFilters] = useState({
    date: dayjs(),
    department: "",
    status: "",
    search: "",
  });

  const [dailySummary, setDailySummary] = useState({
    hadir: 0,
    terlambat: 0,
    belum_pulang: 0,
    belum_checkin: 0,
  });

  const [summaryData, setSummaryData] = useState([]);

  const [summaryFilters, setSummaryFilters] = useState({
    month: dayjs().month() + 1,

    year: dayjs().year(),

    department: "",

    search: "",
  });

  const [departments, setDepartments] = useState([]);

  const [tab, setTab] = useState(0);

  // =========================
  // INITIAL LOAD
  // =========================

  useEffect(() => {
    loadDailySummary();

    loadSummary(summaryFilters);

    loadDepartments();

    loadDailyAttendance(filters);
  }, []);

  // =========================
  // DEPARTMENTS
  // =========================

  const loadDepartments = async () => {
    try {
      const result = await attendanceService.getDepartments();

      setDepartments(result.data);
    } catch (err) {
      console.error(err);
    }
  };

  // =========================
  // LOAD SUMMARY
  // =========================

  const loadSummary = async (params = summaryFilters) => {
    try {
      setLoadingSummary(true);

      const result = await attendanceService.getAttendanceSummary(params);

      setSummaryData(result.data || []);
    } catch (err) {
      console.error(err);

      setSummaryData([]);
    } finally {
      setLoadingSummary(false);
    }
  };

  // =========================
  // LOAD DAILY ATTENDANCE
  // =========================

  const loadDailyAttendance = async (params = filters) => {
    try {
      setLoadingDaily(true);

      const payload = {
        ...params,

        date: params.date ? dayjs(params.date).format("YYYY-MM-DD") : "",
      };

      const result = await attendanceService.getDailyAttendance(payload);

      setDailyAttendance(result.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingDaily(false);
    }
  };

  // =========================
  // DAILY SUMMARY
  // =========================

  const loadDailySummary = async () => {
    try {
      const result = await attendanceService.getSummary();

      setDailySummary(result.data);
    } catch (err) {
      console.error(err);
    }
  };

  // =====================================================
  // HELPER DATA EXPORT
  // =====================================================

  const getEmployeeName = (item) => {
    return item.name || item.employee_name || item.nama || item.employee || "-";
  };

  const getDepartment = (item) => {
    return (
      item.department ||
      item.department_name ||
      item.division ||
      item.division_name ||
      item.departemen ||
      "-"
    );
  };

  const getValue = (item, keys, defaultValue = 0) => {
    for (const key of keys) {
      if (item[key] !== undefined && item[key] !== null) {
        return item[key];
      }
    }

    return defaultValue;
  };

  // =====================================================
  // FORMAT MONTH
  // =====================================================

  const getMonthName = () => {
    return dayjs()
      .month(Number(summaryFilters.month) - 1)
      .format("MMMM");
  };

  // =====================================================
  // EXPORT DATA
  // =====================================================

  const getExportData = () => {
    return summaryData.map((item, index) => {
      const hadir = Number(getValue(item, ["hadir", "present", "total_hadir"]));

      const terlambat = Number(
        getValue(item, ["terlambat", "late", "total_terlambat"]),
      );

      const menitTelat = Number(
        getValue(item, ["menit_telat", "late_minutes", "total_late_minutes"]),
      );

      const cuti = Number(getValue(item, ["cuti", "total_cuti"]));

      const izin = Number(getValue(item, ["izin", "total_izin"]));

      const sakit = Number(getValue(item, ["sakit", "total_sakit"]));

      const alpha = Number(getValue(item, ["alpha", "total_alpha"]));

      let kehadiran = getValue(
        item,
        [
          "kehadiran",
          "attendance_percentage",
          "attendance_percent",
          "persentase_kehadiran",
        ],
        null,
      );

      if (kehadiran === null) {
        const totalHari = hadir + cuti + izin + sakit + alpha;

        kehadiran = totalHari > 0 ? (hadir / totalHari) * 100 : 0;
      }

      if (typeof kehadiran === "string") {
        kehadiran = kehadiran.replace("%", "");
      }

      return {
        "No.": index + 1,

        Employee: getEmployeeName(item),

        Department: getDepartment(item),

        Present: hadir,

        "Late Arrivals": terlambat,

        "Late Minutes": menitTelat,

        Leave: cuti,

        Permission: izin,

        "Sick Leave": sakit,

        Alpha: alpha,

        Attendance: `${Number(kehadiran).toFixed(2)}%`,
      };
    });
  };

  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  const handleExportExcel = () => {
    if (!summaryData || summaryData.length === 0) {
      alert("There is no attendance summary data to export.");
      return;
    }

    const exportData = getExportData();

    const monthName = getMonthName();

    const department = summaryFilters.department || "All Departments";

    const employee = summaryFilters.search || "All Employees";

    // =====================================================
    // DATA LAPORAN
    // =====================================================

    const worksheetData = [
      // Title
      ["EMPLOYEE ATTENDANCE SUMMARY"],

      // Report information
      [`Period: ${monthName} ${summaryFilters.year}`],

      [`Department: ${department}`],

      [`Employee: ${employee}`],

      [],

      // Header tabel
      [
        "No.",
        "Employee",
        "Department",
        "Present",
        "Late Arrivals",
        "Late Minutes",
        "Leave",
        "Permission",
        "Sick Leave",
        "Alpha",
        "Attendance",
      ],

      // Data
      ...exportData.map((item) => [
        item["No."],
        item["Employee"],
        item["Department"],
        item["Present"],
        item["Late Arrivals"],
        item["Late Minutes"],
        item["Leave"],
        item["Permission"],
        item["Sick Leave"],
        item["Alpha"],
        item["Attendance"],
      ]),

      [],

      // Footer
      [`Total Employees: ${exportData.length}`],
    ];

    // =====================================================
    // CREATE SHEET
    // =====================================================

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // =====================================================
    // MERGE JUDUL
    // =====================================================

    worksheet["!merges"] = [
      {
        s: {
          r: 0,
          c: 0,
        },
        e: {
          r: 0,
          c: 10,
        },
      },
    ];

    // =====================================================
    // COLUMN WIDTH
    // =====================================================

    worksheet["!cols"] = [
      { wch: 6 }, // No

      { wch: 25 }, // Employee

      { wch: 20 }, // Department

      { wch: 10 }, // Present

      { wch: 12 }, // Late arrivals

      { wch: 15 }, // Late minutes

      { wch: 10 }, // Leave

      { wch: 10 }, // Permission

      { wch: 10 }, // Sick leave

      { wch: 10 }, // Alpha

      { wch: 15 }, // Attendance
    ];

    // =====================================================
    // STYLE JUDUL
    // =====================================================

    if (worksheet["A1"]) {
      worksheet["A1"].s = {
        font: {
          bold: true,
          sz: 18,
        },

        alignment: {
          horizontal: "center",
          vertical: "center",
        },
      };
    }

    // =====================================================
    // STYLE INFORMASI
    // =====================================================

    ["A2", "A3", "A4"].forEach((cell) => {
      if (worksheet[cell]) {
        worksheet[cell].s = {
          font: {
            bold: true,
            sz: 11,
          },

          alignment: {
            horizontal: "left",
            vertical: "center",
          },
        };
      }
    });

    // =====================================================
    // STYLE HEADER TABEL
    // =====================================================

    const headerRow = 6;

    for (let col = 0; col <= 10; col++) {
      const cell = XLSX.utils.encode_cell({
        r: headerRow - 1,
        c: col,
      });

      if (worksheet[cell]) {
        worksheet[cell].s = {
          font: {
            bold: true,
            sz: 11,
          },

          alignment: {
            horizontal: "center",
            vertical: "center",
            wrapText: true,
          },

          border: {
            top: {
              style: "thin",
            },

            bottom: {
              style: "thin",
            },

            left: {
              style: "thin",
            },

            right: {
              style: "thin",
            },
          },
        };
      }
    }

    // =====================================================
    // STYLE DATA
    // =====================================================

    const firstDataRow = 6;

    const lastDataRow = firstDataRow + exportData.length - 1;

    for (let row = firstDataRow; row <= lastDataRow; row++) {
      for (let col = 0; col <= 10; col++) {
        const cell = XLSX.utils.encode_cell({
          r: row - 1,
          c: col,
        });

        if (!worksheet[cell]) {
          continue;
        }

        worksheet[cell].s = {
          alignment: {
            horizontal: col === 1 || col === 2 ? "left" : "center",

            vertical: "center",
          },

          border: {
            top: {
              style: "thin",
            },

            bottom: {
              style: "thin",
            },

            left: {
              style: "thin",
            },

            right: {
              style: "thin",
            },
          },
        };
      }
    }

    // =====================================================
    // STYLE TOTAL
    // =====================================================

    const totalRow = lastDataRow + 2;

    const totalCell = `A${totalRow}`;

    if (worksheet[totalCell]) {
      worksheet[totalCell].s = {
        font: {
          bold: true,
          sz: 11,
        },

        alignment: {
          horizontal: "left",
        },
      };
    }

    // =====================================================
    // ROW HEIGHT
    // =====================================================

    worksheet["!rows"] = [
      {
        hpt: 30,
      },

      {
        hpt: 20,
      },

      {
        hpt: 20,
      },

      {
        hpt: 20,
      },

      {
        hpt: 10,
      },

      {
        hpt: 30,
      },
    ];

    // =====================================================
    // FREEZE HEADER
    // =====================================================

    worksheet["!freeze"] = {
      xSplit: 0,
      ySplit: 5,
    };

    // =====================================================
    // AUTO FILTER
    // =====================================================

    worksheet["!autofilter"] = {
      ref: `A6:K${lastDataRow}`,
    };

    // =====================================================
    // WORKBOOK
    // =====================================================

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Summary");

    // =====================================================
    // FILE NAME
    // =====================================================

    const departmentName = summaryFilters.department
      ? `_${summaryFilters.department.trim().replace(/\s+/g, "_")}`
      : "";

    const employeeName = summaryFilters.search
      ? `_${summaryFilters.search.trim().replace(/\s+/g, "_")}`
      : "";

    const filename = `Attendance_Summary_${monthName}_${summaryFilters.year}${departmentName}${employeeName}.xlsx`;

    // =====================================================
    // DOWNLOAD
    // =====================================================

    XLSX.writeFile(workbook, filename);
  };

  // =====================================================
  // EXPORT PDF
  // =====================================================

  const handleExportPDF = () => {
    if (!summaryData || summaryData.length === 0) {
      alert("There is no attendance summary data to export.");
      return;
    }

    const exportData = getExportData();

    const monthName = getMonthName();

    const department = summaryFilters.department || "All Departments";

    const employee = summaryFilters.search || "All Employees";

    // =====================================================
    // CREATE PDF
    // =====================================================

    const doc = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    // =====================================================
    // TITLE
    // =====================================================

    doc.setFont("helvetica", "bold");

    doc.setFontSize(18);

    doc.text("EMPLOYEE ATTENDANCE SUMMARY", 148, 15, {
      align: "center",
    });

    // =====================================================
    // REPORT INFORMATION
    // =====================================================

    doc.setFont("helvetica", "normal");

    doc.setFontSize(10);

    doc.text(`Period: ${monthName} ${summaryFilters.year}`, 14, 25);

    doc.text(`Department: ${department}`, 14, 31);

    doc.text(`Employee: ${employee}`, 14, 37);

    // =====================================================
    // TABLE
    // =====================================================

    autoTable(doc, {
      startY: 44,

      head: [
        [
          "No.",
          "Employee",
          "Department",
          "Present",
          "Late Arrivals",
          "Late Minutes",
          "Leave",
          "Permission",
          "Sick Leave",
          "Alpha",
          "Attendance",
        ],
      ],

      body: exportData.map((item) => [
        item["No."],

        item["Employee"],

        item["Department"],

        item["Present"],

        item["Late Arrivals"],

        item["Late Minutes"],

        item["Leave"],

        item["Permission"],

        item["Sick Leave"],

        item["Alpha"],

        item["Attendance"],
      ]),

      // =================================================
      // TABLE STYLE
      // =================================================

      theme: "grid",

      styles: {
        font: "helvetica",

        fontSize: 8,

        cellPadding: 3,

        valign: "middle",

        lineWidth: 0.2,
      },

      // =================================================
      // HEADER STYLE
      // =================================================

      headStyles: {
        fontStyle: "bold",

        halign: "center",

        valign: "middle",

        fontSize: 8,

        cellPadding: 3,
      },

      // =================================================
      // BODY ALIGNMENT
      // =================================================

      columnStyles: {
        0: {
          halign: "center",
          cellWidth: 10,
        },

        1: {
          halign: "left",
          cellWidth: 42,
        },

        2: {
          halign: "left",
          cellWidth: 32,
        },

        3: {
          halign: "center",
          cellWidth: 16,
        },

        4: {
          halign: "center",
          cellWidth: 20,
        },

        5: {
          halign: "center",
          cellWidth: 22,
        },

        6: {
          halign: "center",
          cellWidth: 15,
        },

        7: {
          halign: "center",
          cellWidth: 15,
        },

        8: {
          halign: "center",
          cellWidth: 15,
        },

        9: {
          halign: "center",
          cellWidth: 15,
        },

        10: {
          halign: "center",
          cellWidth: 24,
        },
      },

      // =================================================
      // PAGE HEADER / FOOTER
      // =================================================

      didDrawPage: (data) => {
        const pageNumber = doc.internal.getNumberOfPages();

        const pageWidth = doc.internal.pageSize.getWidth();

        const pageHeight = doc.internal.pageSize.getHeight();

        doc.setFontSize(8);

        doc.setFont("helvetica", "normal");

        doc.text(`Page ${pageNumber}`, pageWidth - 14, pageHeight - 8, {
          align: "right",
        });
      },
    });

    // =====================================================
    // TOTAL EMPLOYEES
    // =====================================================

    const finalY = doc.lastAutoTable.finalY + 10;

    doc.setFont("helvetica", "bold");

    doc.setFontSize(10);

    doc.text(`Total Employees: ${exportData.length}`, 14, finalY);

    // =====================================================
    // FILE NAME
    // =====================================================

    const departmentName = summaryFilters.department
      ? `_${summaryFilters.department.trim().replace(/\s+/g, "_")}`
      : "";

    const employeeName = summaryFilters.search
      ? `_${summaryFilters.search.trim().replace(/\s+/g, "_")}`
      : "";

    const filename = `Attendance_Summary_${monthName}_${summaryFilters.year}${departmentName}${employeeName}.pdf`;

    // =====================================================
    // DOWNLOAD
    // =====================================================

    doc.save(filename);
  };

  return (
    <>
      {/* ================= HEADER ================= */}
      {tab === 1 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "flex-end",
            mb: 3,
          }}
        >
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={handleExportExcel}
            >
              Export Excel
            </Button>

            <Button
              variant="contained"
              startIcon={<PictureAsPdfIcon />}
              onClick={handleExportPDF}
            >
              Export PDF
            </Button>
          </Stack>
        </Box>
      )}

      {/* ================= FILTER ================= */}

      <Box sx={{ mb: 3 }}>
        <Tabs value={tab} onChange={(e, value) => setTab(value)}>
          <Tab label="Daily Attendance" />

          <Tab label="Attendance Summary" />
        </Tabs>
      </Box>

      {/* ================= DAILY ================= */}

      {tab === 0 && (
        <>
          <DailyFilter
            filters={filters}
            setFilters={setFilters}
            departments={departments}
            onSearch={(filter) => loadDailyAttendance(filter || filters)}
          />

          <DailySummaryCards data={dailySummary} />

          <DailyAttendanceTable data={dailyAttendance} loading={loadingDaily} />
        </>
      )}

      {/* ================= SUMMARY ================= */}

      {tab === 1 && (
        <>
          <SummaryFilter
            filters={summaryFilters}
            setFilters={setSummaryFilters}
            departments={departments}
            onSearch={(filter) => loadSummary(filter || summaryFilters)}
          />

          <AttendanceSummaryTable
            data={summaryData}
            loading={loadingSummary}
            month={summaryFilters.month}
            year={summaryFilters.year}
          />
        </>
      )}
    </>
  );
}
