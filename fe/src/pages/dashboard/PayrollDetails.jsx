import React, { useEffect, useMemo, useState, useCallback } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import axios from "axios";
import { useNavigate, useSearchParams } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "/api";
const PTKP_OPTIONS = [
  "TK/0",
  "TK/1",
  "TK/2",
  "TK/3",
  "K/0",
  "K/1",
  "K/2",
  "K/3",
];
const moneyFields = [
  "basic_salary",
  "position_allowance",
  "transport_allowance",
  "meal_allowance",
];
const dayFields = [
  "sick_without_document_days",
  "sick_with_document_days",
  "unpaid_leave_days",
];
const formatRupiah = (v) =>
  new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 }).format(
    Number(v || 0),
  );
const formatRate = (v) =>
  `${Number(v || 0).toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;
const num = (v) => Number(v || 0);
const terCategory = (s) =>
  ["TK/0", "TK/1", "K/0"].includes(s)
    ? "A"
    : ["TK/2", "TK/3", "K/1", "K/2"].includes(s)
      ? "B"
      : s === "K/3"
        ? "C"
        : null;
const inputSx = {
  width: 112,
  "& .MuiInputBase-input, & .MuiOutlinedInput-input": {
    fontSize: "12px !important",
    lineHeight: 1.2,
    py: 0.65,
    px: 0.8,
  },
  "& .MuiSelect-select": { fontSize: "12px !important", py: 0.65, px: 0.8 },
};
const cellSx = { fontSize: "12px", whiteSpace: "nowrap", px: 0.8, py: 0.7 };

export default function PayrollDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(
    searchParams.get("periodId") || "",
  );
  const [rows, setRows] = useState([]);
  const [terRates, setTerRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [privacyMode, setPrivacyMode] = useState(false);
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState("");
  const [scheduleFilter, setScheduleFilter] = useState("ALL");
  const [orderBy, setOrderBy] = useState("name");
  const [order, setOrder] = useState("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [focusedMoneyInput, setFocusedMoneyInput] = useState(null);
  const token = localStorage.getItem("token");
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };
  const period = periods.find((p) => String(p.id) === String(selectedPeriod));
  const editable = period?.status === "DRAFT";
  const editableFields = [...moneyFields, ...dayFields, "ptkp_status"];

  // Batalkan perubahan yang belum disimpan saat menekan Escape atau
  // saat pengguna mengklik area di luar baris karyawan yang sedang diedit.
  useEffect(() => {
    const resetDirtyRows = (exceptRowId = null) => {
      setRows((prev) =>
        prev.map((row) => {
          if (
            String(row.id) === String(exceptRowId) ||
            !row._original ||
            !editableFields.some(
              (field) =>
                String(row[field] ?? "") !==
                String(row._original?.[field] ?? ""),
            )
          ) {
            return row;
          }

          return { ...row._original, _original: { ...row._original } };
        }),
      );
    };

    const handleKeyDown = (event) => {
      // Space untuk mengaktifkan/nonaktifkan mode privasi.
      // Jangan aktifkan saat pengguna sedang mengetik atau fokus pada tombol.
      if (
        event.code === "Space" &&
        !["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(
          event.target?.tagName,
        ) &&
        !event.target?.isContentEditable
      ) {
        event.preventDefault();
        setPrivacyMode((current) => !current);
        return;
      }

      // Escape membatalkan perubahan yang belum disimpan.
      if (event.key === "Escape") {
        resetDirtyRows();
      }
    };

    const handlePointerDown = (event) => {
      const clickedRow = event.target?.closest?.("[data-payroll-row]");
      const clickedRowId = clickedRow?.getAttribute("data-payroll-row");
      resetDirtyRows(clickedRowId ?? null);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [editableFields]);

  const loadPeriods = useCallback(async () => {
    try {
      const r = await axios.get(`${API}/payroll/periods`, authConfig);
      const list = r.data.data || [];
      setPeriods(list);
      const requested = searchParams.get("periodId");
      if (requested && list.some((x) => String(x.id) === requested))
        setSelectedPeriod(requested);
      else if (list.length) setSelectedPeriod(String(list[0].id));
    } catch (e) {
      setError(e.response?.data?.message || "Gagal mengambil periode payroll.");
    }
  }, []);

  const loadDetails = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const r = await axios.get(
        `${API}/payroll/periods/${id}/details`,
        authConfig,
      );
      setRows(
        (r.data.data || []).map((x) => {
          const normalized = {
            ...x,
            position_allowance: num(x.position_allowance),
            ptkp_status: x.ptkp_status || "TK/0",
            sick_without_document_days: num(x.sick_without_document_days),
            sick_with_document_days: num(x.sick_with_document_days),
            unpaid_leave_days: num(x.unpaid_leave_days),
          };
          return { ...normalized, _original: { ...normalized } };
        }),
      );
      setTerRates(r.data.ter_rates || []);
    } catch (e) {
      setError(e.response?.data?.message || "Gagal mengambil detail payroll.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);
  useEffect(() => {
    if (!selectedPeriod) {
      setRows([]);
      return;
    }
    setSearchParams({ periodId: selectedPeriod });
    loadDetails(selectedPeriod);
  }, [selectedPeriod, loadDetails, setSearchParams]);

  const grossOf = (r) => moneyFields.reduce((sum, f) => sum + num(r[f]), 0);
  const calculationOf = (r) => {
    const gross = grossOf(r);
    const category = terCategory(r.ptkp_status);
    const found = terRates.find(
      (x) =>
        x.category === category &&
        num(x.min_income) <= gross &&
        (x.max_income == null || num(x.max_income) >= gross),
    );
    const rate = found ? num(found.rate) : 0;
    const jht = Math.round(num(r.basic_salary) * 0.02);
    const jpBase = Math.min(
      num(r.basic_salary),
      num(r.bpjs_jp_base || 11086300),
    );
    const jp = Math.round(jpBase * 0.01);
    const health = Math.round(num(r.basic_salary) * 0.01);
    const pph = Math.round((gross * rate) / 100);
    const divisor = num(
      r.payroll_divisor || (r.work_schedule === "6_DAYS" ? 26 : 22),
    );
    const basicDed = Math.round(
      ((num(r.sick_without_document_days) + num(r.unpaid_leave_days)) *
        num(r.basic_salary)) /
        divisor,
    );
    const transportDed = Math.round(
      (num(r.sick_with_document_days) * num(r.transport_allowance)) / divisor,
    );
    const mealDed = Math.round(
      (num(r.sick_with_document_days) * num(r.meal_allowance)) / divisor,
    );
    const total = jht + jp + health + pph + basicDed + transportDed + mealDed;
    return {
      gross,
      category,
      rate,
      jht,
      jp,
      health,
      pph,
      basicDed,
      transportDed,
      mealDed,
      total,
      net: gross - total,
    };
  };

  const updateLocal = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  const isDirty = (row) =>
    editableFields.some(
      (field) =>
        String(row[field] ?? "") !== String(row._original?.[field] ?? ""),
    );
  const saveRow = async (row) => {
    if (!editable || !row.id) return;
    setSaving((p) => ({ ...p, [row.id]: true }));
    setError("");
    setNotice("");
    try {
      await axios.put(
        `${API}/payroll/periods/${selectedPeriod}/details/${row.id}`,
        {
          basic_salary: num(row.basic_salary),
          position_allowance: num(row.position_allowance),
          transport_allowance: num(row.transport_allowance),
          meal_allowance: num(row.meal_allowance),
          sick_without_document_days: num(row.sick_without_document_days),
          sick_with_document_days: num(row.sick_with_document_days),
          unpaid_leave_days: num(row.unpaid_leave_days),
          ptkp_status: row.ptkp_status,
        },
        authConfig,
      );
      setNotice(`Perubahan ${row.name} berhasil diperbarui.`);
      await loadDetails(selectedPeriod);
    } catch (e) {
      setError(
        e.response?.data?.message || "Gagal menyimpan perubahan payroll.",
      );
    } finally {
      setSaving((p) => ({ ...p, [row.id]: false }));
    }
  };

  const handleSort = (key) => {
    const asc = orderBy === key && order === "asc";
    setOrder(asc ? "desc" : "asc");
    setOrderBy(key);
  };
  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        const q = search.toLowerCase();
        return (
          `${r.name || ""} ${r.nik || ""} ${r.nip || ""}`
            .toLowerCase()
            .includes(q) &&
          (scheduleFilter === "ALL" || r.work_schedule === scheduleFilter)
        );
      }),
    [rows, search, scheduleFilter],
  );
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        const av = orderBy === "gross_salary" ? grossOf(a) : (a[orderBy] ?? "");
        const bv = orderBy === "gross_salary" ? grossOf(b) : (b[orderBy] ?? "");
        return (
          (typeof av === "number" || typeof bv === "number"
            ? num(av) - num(bv)
            : String(av).localeCompare(String(bv), "id", {
                numeric: true,
                sensitivity: "base",
              })) * (order === "asc" ? 1 : -1)
        );
      }),
    [filtered, orderBy, order],
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / rowsPerPage));
  const visible = sorted.slice((page - 1) * rowsPerPage, page * rowsPerPage);
  const moneyInput = (row, field, label) => {
    const inputKey = `${row.id}:${field}`;
    const isFocused = focusedMoneyInput === inputKey;

    return (
      <TextField
        aria-label={label}
        type={privacyMode ? "password" : "text"}
        size="small"
        disabled={!editable || !!saving[row.id]}
        value={
          row[field] === "" || row[field] == null
            ? ""
            : isFocused
              ? String(row[field])
              : formatRupiah(row[field])
        }
        onFocus={() => setFocusedMoneyInput(inputKey)}
        onBlur={() => setFocusedMoneyInput(null)}
        onChange={(e) => {
          // Saat diketik, simpan angka saja tanpa separator agar tidak NaN
          // dan kursor tidak meloncat karena format ulang setiap karakter.
          const rawValue = e.target.value.replace(/\D/g, "");
          updateLocal(row.id, field, rawValue);
        }}
        inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
        sx={inputSx}
      />
    );
  };
  const dayInput = (row, field, label) => (
    <TextField
      aria-label={label}
      type="number"
      size="small"
      disabled={!editable || !!saving[row.id]}
      value={row[field] ?? 0}
      onChange={(e) => updateLocal(row.id, field, e.target.value)}
      inputProps={{ min: 0, step: 1 }}
      sx={{ ...inputSx, width: 58 }}
    />
  );
  const header = (label, key) => (
    <TableSortLabel
      active
      direction={orderBy === key ? order : "asc"}
      onClick={() => handleSort(key)}
    >
      {label}
    </TableSortLabel>
  );
  const privateMoney = (v) => (privacyMode ? "••••••" : formatRupiah(v));

  const getPayrollExportData = () => {
    const headers = [
      "No",
      "Nama Karyawan",
      "NIK",
      "Work Schedule",
      "Gaji Pokok",
      "Tunjangan Jabatan",
      "Tunjangan Transport",
      "Tunjangan Makan",
      "Bruto",
      "Sakit Tanpa Dokumen (Hari)",
      "Sakit Dengan Dokumen (Hari)",
      "Izin (Hari)",
      "Potongan Absensi",
      "BPJS JHT",
      "BPJS JP",
      "BPJS Kesehatan",
      "Status PTKP",
      "Kategori TER",
      "Tarif PPh 21",
      "PPh 21",
      "Total Potongan",
      "Take Home Pay",
    ];

    const data = sorted.map((row, index) => {
      const c = calculationOf(row);
      return [
        index + 1,
        row.name || "",
        row.nik || row.nip || "",
        row.work_schedule || "",
        num(row.basic_salary),
        num(row.position_allowance),
        num(row.transport_allowance),
        num(row.meal_allowance),
        c.gross,
        num(row.sick_without_document_days),
        num(row.sick_with_document_days),
        num(row.unpaid_leave_days),
        c.basicDed + c.transportDed + c.mealDed,
        c.jht,
        c.jp,
        c.health,
        row.ptkp_status || "TK/0",
        c.category || "",
        `${formatRate(c.rate)}`,
        c.pph,
        c.total,
        c.net,
      ];
    });

    return { headers, data };
  };

  const getPayrollFileName = (extension) => {
    const periodName = (period?.period_name || "payroll")
      .replace(/[^a-z0-9_-]/gi, "_")
      .replace(/_+/g, "_");
    return `Payroll_${periodName}.${extension}`;
  };

  const exportPayrollExcel = () => {
    if (!sorted.length) {
      setError("Tidak ada data payroll untuk diekspor.");
      return;
    }

    try {
      const { headers, data } = getPayrollExportData();
      const worksheet = XLSX.utils.aoa_to_sheet([
        ["PAYROLL DETAILS"],
        [`Periode: ${period?.period_name || "-"}`],
        [`Tanggal pembayaran: ${period?.payment_date || "-"}`],
        [],
        headers,
        ...data,
      ]);

      worksheet["!cols"] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 18 },
        { wch: 16 },
        { wch: 16 },
        { wch: 19 },
        { wch: 19 },
        { wch: 17 },
        { wch: 16 },
        { wch: 19 },
        { wch: 21 },
        { wch: 14 },
        { wch: 18 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 13 },
        { wch: 12 },
        { wch: 14 },
        { wch: 15 },
        { wch: 17 },
        { wch: 18 },
      ];

      // Format angka sebagai numerik agar bisa dihitung/filter di Excel.
      const firstDataRow = 6;
      data.forEach((row, rowIndex) => {
        [4, 5, 6, 7, 8, 12, 13, 14, 15, 19, 20, 21].forEach((columnIndex) => {
          const address = XLSX.utils.encode_cell({
            r: firstDataRow - 1 + rowIndex,
            c: columnIndex,
          });
          if (worksheet[address]) worksheet[address].z = "#,##0";
        });
      });

      worksheet["!autofilter"] = {
        ref: XLSX.utils.encode_range({
          s: { r: 4, c: 0 },
          e: { r: 4 + data.length, c: headers.length - 1 },
        }),
      };

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Payroll");
      XLSX.writeFile(workbook, getPayrollFileName("xlsx"));
      setError("");
    } catch (e) {
      console.error("Export Excel gagal:", e);
      setError("Gagal membuat file Excel payroll.");
    }
  };

  const exportPayrollPdf = () => {
    if (!sorted.length) {
      setError("Tidak ada data payroll untuk diekspor.");
      return;
    }

    try {
      const { headers, data } = getPayrollExportData();
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a3",
      });

      doc.setFontSize(15);
      doc.text("PAYROLL DETAILS", 12, 13);
      doc.setFontSize(9);
      doc.text(`Periode: ${period?.period_name || "-"}`, 12, 20);
      doc.text(`Tanggal pembayaran: ${period?.payment_date || "-"}`, 12, 25);
      doc.text(`Total karyawan: ${data.length}`, 12, 30);

      autoTable(doc, {
        head: [headers],
        body: data,
        startY: 35,
        theme: "grid",
        styles: {
          font: "helvetica",
          fontSize: 6,
          cellPadding: 1.5,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [43, 59, 80],
          textColor: 255,
          fontStyle: "bold",
          fontSize: 6,
        },
        columnStyles: {
          0: { cellWidth: 9 },
          1: { cellWidth: 32 },
          2: { cellWidth: 22 },
        },
        margin: { left: 10, right: 10 },
        didDrawPage: () => {
          const pageNumber = doc.internal.getNumberOfPages();
          doc.setFontSize(7);
          doc.text(
            `Halaman ${pageNumber}`,
            doc.internal.pageSize.getWidth() - 22,
            doc.internal.pageSize.getHeight() - 7,
          );
        },
      });

      doc.save(getPayrollFileName("pdf"));
      setError("");
    } catch (e) {
      console.error("Export PDF gagal:", e);
      setError("Gagal membuat file PDF payroll.");
    }
  };

  const downloadSlip = (row) => {
    const c = calculationOf(row);
    const escapeHtml = (value) =>
      String(value ?? "-").replace(
        /[&<>"']/g,
        (ch) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[ch],
      );
    const money = (value) => formatRupiah(value);
    const popup = window.open("", "_blank", "width=900,height=700");
    if (!popup) {
      setError(
        "Popup diblokir browser. Izinkan pop-up untuk mengunduh slip gaji.",
      );
      return;
    }
    popup.document
      .write(`<!doctype html><html><head><title>Slip Gaji - ${escapeHtml(row.name)}</title><style>
      body{font-family:Arial,sans-serif;color:#222;padding:32px;max-width:850px;margin:auto}h2{margin:0 0 6px}small{color:#666}.meta{margin:18px 0;padding:12px;background:#f5f6f8;display:flex;justify-content:space-between}table{width:100%;border-collapse:collapse;margin-top:18px}td,th{border:1px solid #ddd;padding:9px;text-align:left;font-size:13px}th{background:#f2f4f7}.amount{text-align:right}.total{font-weight:bold;background:#f7f7f7}.actions{margin:20px 0}@media print{.actions{display:none}body{padding:0}}
      </style></head><body><h2>SLIP GAJI</h2><small>${escapeHtml(period?.period_name || "Payroll")}</small><div class="meta"><span>Nama: <b>${escapeHtml(row.name)}</b><br>NIK: ${escapeHtml(row.nik || row.nip || "-")}</span><span>Periode: ${escapeHtml(period?.start_date || "-")} - ${escapeHtml(period?.end_date || "-")}<br>Tanggal pembayaran: ${escapeHtml(period?.payment_date || "-")}</span></div>
      <table><thead><tr><th>Komponen</th><th class="amount">Jumlah</th></tr></thead><tbody>
      <tr><td>Gaji Pokok</td><td class="amount">${money(row.basic_salary)}</td></tr><tr><td>Tunjangan Jabatan</td><td class="amount">${money(row.position_allowance)}</td></tr><tr><td>Tunjangan Transport</td><td class="amount">${money(row.transport_allowance)}</td></tr><tr><td>Tunjangan Makan</td><td class="amount">${money(row.meal_allowance)}</td></tr><tr class="total"><td>Bruto</td><td class="amount">${money(c.gross)}</td></tr>
      <tr><td>Potongan Absensi</td><td class="amount">${money(c.basicDed + c.transportDed + c.mealDed)}</td></tr><tr><td>BPJS JHT (${formatRate(row.bpjs_jht_rate ?? 2)})</td><td class="amount">${money(c.jht)}</td></tr><tr><td>BPJS JP (${formatRate(row.bpjs_jp_rate ?? 1)})</td><td class="amount">${money(c.jp)}</td></tr><tr><td>BPJS Kesehatan (${formatRate(row.bpjs_health_rate ?? 1)})</td><td class="amount">${money(c.health)}</td></tr><tr><td>PPh 21 (${escapeHtml(row.ptkp_status)} / TER ${escapeHtml(c.category || "-")} ${formatRate(c.rate)})</td><td class="amount">${money(c.pph)}</td></tr><tr class="total"><td>Total Potongan</td><td class="amount">${money(c.total)}</td></tr><tr class="total"><td>Take Home Pay</td><td class="amount">${money(c.net)}</td></tr></tbody></table>
      <div class="actions"><button onclick="window.print()">Cetak / Simpan PDF</button></div><script>window.onload=()=>window.print()</script></body></html>`);
    popup.document.close();
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 1, fontSize: 12 }}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert
          severity="success"
          sx={{ mb: 1, fontSize: 12 }}
          onClose={() => setNotice("")}
        >
          {notice}
        </Alert>
      )}
      <Card
        variant="outlined"
        sx={{ mb: 1.5, borderRadius: 2, overflow: "hidden" }}
      >
        <Box
          sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 }}
        >
          <Button
            size="small"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate(-1)}
            sx={{ textTransform: "none", minWidth: 0 }}
          >
            Back
          </Button>
          <Typography
            sx={{
              fontSize: 16,
              fontWeight: 600,
              color: "text.primary",
              flex: 1,
            }}
          >
            Payroll Details
          </Typography>
          <Button
            size="small"
            variant="outlined"
            startIcon={privacyMode ? <VisibilityOffIcon /> : <VisibilityIcon />}
            onClick={() => setPrivacyMode((v) => !v)}
            sx={{ textTransform: "none" }}
          >
            {privacyMode ? "Show Salary" : "Hide Salary"}
          </Button>
        </Box>
        <Box sx={{ mx: 2, borderTop: "1px solid", borderColor: "divider" }} />
        <Box
          sx={{
            px: 2,
            py: 1.5,
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              md: "repeat(3, minmax(0, 1fr))",
            },
            columnGap: 2.5,
          }}
        >
          <Box
            sx={{
              py: 1,
              borderBottom: { xs: "1px solid", md: "none" },
              borderColor: "divider",
            }}
          >
            <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.4 }}>
              Payroll Period
            </Typography>
            <FormControl size="small" fullWidth>
              <Select
                displayEmpty
                value={selectedPeriod}
                onChange={(e) => {
                  setSelectedPeriod(e.target.value);
                  setPage(1);
                }}
                sx={{ fontSize: 13, "& .MuiSelect-select": { py: 0.8 } }}
              >
                {!selectedPeriod && (
                  <MenuItem value="" disabled>
                    Pilih periode payroll
                  </MenuItem>
                )}
                {periods.map((p) => (
                  <MenuItem key={p.id} value={String(p.id)}>
                    {p.period_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
          <Box
            sx={{
              py: 1,
              borderBottom: { xs: "1px solid", md: "none" },
              borderColor: "divider",
            }}
          >
            <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.4 }}>
              Cut-off Period
            </Typography>
            <Typography sx={{ fontSize: 14, color: "text.primary" }}>
              {period
                ? `${new Date(period.start_date).toLocaleDateString("id-ID", { timeZone: "UTC" })} - ${new Date(period.end_date).toLocaleDateString("id-ID", { timeZone: "UTC" })}`
                : "-"}
            </Typography>
          </Box>
          <Box sx={{ py: 1 }}>
            <Typography sx={{ fontSize: 11, color: "text.secondary", mb: 0.4 }}>
              Payment Date
            </Typography>
            <Typography sx={{ fontSize: 14, color: "text.primary" }}>
              {period?.payment_date
                ? new Date(period.payment_date).toLocaleDateString("id-ID", {
                    timeZone: "UTC",
                  })
                : "-"}
            </Typography>
          </Box>
          <Box
            sx={{
              gridColumn: { xs: "auto", md: "1 / -1" },
              borderTop: "1px solid",
              borderColor: "divider",
              pt: 1.2,
              mt: 0.3,
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
              Status
            </Typography>
            {period ? (
              <Chip
                size="small"
                label={period.status}
                color={
                  period.status === "DRAFT"
                    ? "warning"
                    : period.status === "PAID" || period.status === "CLOSED"
                      ? "success"
                      : "default"
                }
              />
            ) : (
              <Typography sx={{ fontSize: 13 }}>-</Typography>
            )}
            <Typography
              sx={{ fontSize: 11, color: "text.secondary", ml: { sm: 1 } }}
            >
              {editable
                ? "Field dapat diedit langsung; perubahan tersimpan saat keluar dari field."
                : "Periode terkunci; hanya DRAFT yang dapat diedit."}
            </Typography>
          </Box>
        </Box>
      </Card>
      <Card variant="outlined">
        <CardContent sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={1}
            sx={{ mb: 1 }}
          >
            <TextField
              size="small"
              placeholder="Cari nama / NIK..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              sx={{ width: { xs: "100%", sm: 280 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Work Schedule</InputLabel>
              <Select
                value={scheduleFilter}
                label="Work Schedule"
                onChange={(e) => {
                  setScheduleFilter(e.target.value);
                  setPage(1);
                }}
              >
                <MenuItem value="ALL">All Schedules</MenuItem>
                <MenuItem value="5_DAYS">5 Working Days</MenuItem>
                <MenuItem value="6_DAYS">6 Working Days</MenuItem>
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={exportPayrollExcel}
              disabled={loading || sorted.length === 0}
              sx={{
                textTransform: "none",
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              Export Excel
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="error"
              startIcon={<PictureAsPdfIcon />}
              onClick={exportPayrollPdf}
              disabled={loading || sorted.length === 0}
              sx={{
                textTransform: "none",
                whiteSpace: "nowrap",
                minHeight: 40,
              }}
            >
              Export PDF
            </Button>
          </Stack>
          <Box
            sx={{
              width: "100%",
              overflowX: "auto",
              scrollbarWidth: "thin",
              "&::-webkit-scrollbar": {
                height: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#bdbdbd",
                borderRadius: "10px",
              },
            }}
          >
            <Table
              size="small"
              sx={{
                minWidth: 1900,
                "& th": {
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                  px: 0.8,
                  py: 0.8,
                  backgroundColor: "action.hover",
                },
                "& td": cellSx,
              }}
            >
              <TableHead>
                <TableRow>
                  <TableCell>No</TableCell>
                  <TableCell>{header("Employee", "name")}</TableCell>
                  <TableCell>{header("NIK", "nik")}</TableCell>
                  <TableCell>Schedule</TableCell>
                  <TableCell>{header("Basic", "basic_salary")}</TableCell>
                  <TableCell>
                    {header("Position", "position_allowance")}
                  </TableCell>
                  <TableCell>
                    {header("Transport", "transport_allowance")}
                  </TableCell>
                  <TableCell>{header("Meal", "meal_allowance")}</TableCell>
                  <TableCell>{header("Bruto", "gross_salary")}</TableCell>
                  <TableCell>Sakit (No Doc)</TableCell>
                  <TableCell>Sakit (Doc)</TableCell>
                  <TableCell>Izin</TableCell>
                  <TableCell>Pot. Absensi</TableCell>
                  <TableCell>JHT</TableCell>
                  <TableCell>JP</TableCell>
                  <TableCell>BPJS Kes.</TableCell>
                  <TableCell>PPh 21 / PTKP</TableCell>
                  <TableCell>Total Pot.</TableCell>
                  <TableCell>Take Home Pay</TableCell>
                  <TableCell align="center">Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody
                sx={{ "& tr:hover": { backgroundColor: "action.hover" } }}
              >
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={20} align="center">
                      <CircularProgress size={24} />
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((row, i) => {
                    const c = calculationOf(row);
                    const attendance = c.basicDed + c.transportDed + c.mealDed;
                    const rateCell = (rate, amount) => (
                      <Box>
                        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                          {formatRate(rate)} |{" "}
                          {privacyMode ? "••••" : formatRupiah(amount)}
                        </Typography>
                      </Box>
                    );
                    return (
                      <TableRow
                        key={row.id || row.user_id}
                        hover
                        data-payroll-row={row.id}
                      >
                        <TableCell>
                          {(page - 1) * rowsPerPage + i + 1}
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }}>
                          <Stack
                            direction="row"
                            spacing={0.7}
                            alignItems="center"
                          >
                            <Avatar
                              sx={{ width: 24, height: 24, fontSize: 11 }}
                            >
                              {row.name?.[0]?.toUpperCase()}
                            </Avatar>
                            <Typography
                              title={row.name || ""}
                              sx={{
                                fontSize: 12,
                                maxWidth: 150,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {row.name}
                            </Typography>
                          </Stack>
                        </TableCell>
                        <TableCell>{row.nip || row.nik || "-"}</TableCell>
                        <TableCell>{row.work_schedule || "-"}</TableCell>
                        {moneyFields.map((f) => (
                          <TableCell key={f}>{moneyInput(row, f, f)}</TableCell>
                        ))}
                        <TableCell>
                          <b>{privateMoney(c.gross)}</b>
                        </TableCell>
                        {dayFields.map((f) => (
                          <TableCell key={f}>{dayInput(row, f, f)}</TableCell>
                        ))}
                        <TableCell>{privateMoney(attendance)}</TableCell>
                        <TableCell>
                          {rateCell(row.bpjs_jht_rate ?? 2, c.jht)}
                        </TableCell>
                        <TableCell>
                          {rateCell(row.bpjs_jp_rate ?? 1, c.jp)}
                        </TableCell>
                        <TableCell>
                          {rateCell(row.bpjs_health_rate ?? 1, c.health)}
                        </TableCell>
                        <TableCell sx={{ minWidth: 120 }}>
                          <FormControl
                            size="small"
                            fullWidth
                            disabled={!editable}
                            sx={{
                              mb: 0.3,
                              "& .MuiSelect-select": { fontSize: 12, py: 0.5 },
                            }}
                          >
                            <Select
                              value={row.ptkp_status || "TK/0"}
                              onChange={(e) =>
                                updateLocal(
                                  row.id,
                                  "ptkp_status",
                                  e.target.value,
                                )
                              }
                            >
                              {PTKP_OPTIONS.map((x) => (
                                <MenuItem
                                  key={x}
                                  value={x}
                                  sx={{ fontSize: 12 }}
                                >
                                  {x}
                                </MenuItem>
                              ))}
                            </Select>
                          </FormControl>
                          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
                            {c.category || "TER -"} · {formatRate(c.rate)} |{" "}
                            {privacyMode ? "••••" : formatRupiah(c.pph)}
                          </Typography>
                        </TableCell>
                        <TableCell>{privateMoney(c.total)}</TableCell>
                        <TableCell>
                          <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                            {privateMoney(c.net)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack
                            direction="row"
                            spacing={0.5}
                            justifyContent="center"
                          >
                            {isDirty(row) && editable ? (
                              <>
                                <Button
                                  size="small"
                                  variant="contained"
                                  disabled={!!saving[row.id]}
                                  onClick={() => saveRow(row)}
                                  sx={{
                                    fontSize: 12,
                                    textTransform: "none",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {saving[row.id] ? "Updating..." : "Update"}
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="small"
                                variant="outlined"
                                disabled={!!saving[row.id]}
                                onClick={() => downloadSlip(row)}
                                sx={{
                                  fontSize: 12,
                                  textTransform: "none",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                Download Slip
                              </Button>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
                {!loading && visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={20} align="center">
                      {period?.is_generated
                        ? "Tidak ada data karyawan."
                        : "Payroll belum di-generate untuk periode ini."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
              mt: 1.5,
              width: "100%",
              minHeight: 38,
              gap: 1,
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                color: "text.secondary",
                whiteSpace: "nowrap",
              }}
            >
              Total karyawan: {sorted.length}
            </Typography>

            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ ml: "auto" }}
            >
              <TextField
                select
                size="small"
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                sx={{
                  width: 65,
                  "& .MuiInputBase-root": {
                    height: 32,
                    fontSize: 10,
                  },
                }}
              >
                {[10, 25, 50, 100].map((x) => (
                  <MenuItem key={x} value={x}>
                    {x}
                  </MenuItem>
                ))}
              </TextField>

              <Pagination
                size="small"
                count={totalPages}
                page={Math.min(page, totalPages)}
                onChange={(_, v) => setPage(v)}
                siblingCount={0}
                boundaryCount={1}
              />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
