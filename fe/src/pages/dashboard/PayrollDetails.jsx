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

// Kolom identitas yang tetap terlihat saat tabel digeser horizontal.
const frozenColumns = [
  { width: 48, left: 0 },
  { width: 190, left: 48 },
  { width: 140, left: 238 },
  { width: 110, left: 378 },
  { width: 150, left: 488 },
];

const frozenCellSx = (index, isHeader = false) => ({
  position: "sticky",
  left: frozenColumns[index].left,
  width: frozenColumns[index].width,
  minWidth: frozenColumns[index].width,
  maxWidth: frozenColumns[index].width,
  boxSizing: "border-box",
  // Warna solid supaya teks kolom di belakang tidak tembus.
  backgroundColor: isHeader ? "#e9edf2" : "#ffffff",
  backgroundImage: "none",
  backgroundClip: "padding-box",
  opacity: 1,
  zIndex: isHeader ? 30 : 10,
  overflow: "hidden",
  ...(isHeader ? { position: "sticky", top: 0 } : {}),
  ...(index === frozenColumns.length - 1
    ? { boxShadow: "3px 0 5px rgba(0,0,0,0.12)" }
    : {}),
});

export default function PayrollDetails() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [periods, setPeriods] = useState([]);
  const [directorTrendYear, setDirectorTrendYear] = useState(
    String(new Date().getFullYear()),
  );
  const [directorTrend, setDirectorTrend] = useState([]);
  const [directorTrendLoading, setDirectorTrendLoading] = useState(false);
  const [directorTrendError, setDirectorTrendError] = useState("");
  const [selectedPeriod, setSelectedPeriod] = useState(
    searchParams.get("periodId") || "",
  );
  const [rows, setRows] = useState([]);
  const [terRates, setTerRates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
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
  let currentUser = null;
  try {
    currentUser = JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    currentUser = null;
  }
  const currentRole = String(currentUser?.role || "")
    .trim()
    .toUpperCase();
  const roleId = Number(currentUser?.role_id);
  const isHr =
    [1, 2].includes(roleId) ||
    ["ADMIN", "ADMIN HR", "HR"].includes(currentRole);
  const isFinance = roleId === 6 || currentRole === "FINANCE";
  const isDirector = roleId === 7 || currentRole === "DIRECTOR";
  const authConfig = { headers: { Authorization: `Bearer ${token}` } };
  const period = periods.find((p) => String(p.id) === String(selectedPeriod));
  const editable = period?.status === "DRAFT";
  const editableFields = [
    ...moneyFields,
    ...dayFields,
    "ptkp_status",
    "intern_present_days",
  ];

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

    // const handlePointerDown = (event) => {
    //   const clickedRow = event.target?.closest?.("[data-payroll-row]");
    //   const clickedRowId = clickedRow?.getAttribute("data-payroll-row");
    //   resetDirtyRows(clickedRowId ?? null);
    // };

    window.addEventListener("keydown", handleKeyDown);
    // window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      // window.removeEventListener("pointerdown", handlePointerDown);
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
            employee_type: String(x.employee_type || "").toUpperCase(),
            intern_present_days: num(x.intern_present_days),
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

  const directorAvailableYears = useMemo(() => {
    const years = periods
      .filter((item) => item.start_date)
      .map((item) => String(new Date(item.start_date).getUTCFullYear()));
    const unique = [...new Set(years)].sort((a, b) => Number(b) - Number(a));
    return unique.length ? unique : [String(new Date().getFullYear())];
  }, [periods]);

  useEffect(() => {
    if (
      directorAvailableYears.length &&
      !directorAvailableYears.includes(directorTrendYear)
    ) {
      setDirectorTrendYear(directorAvailableYears[0]);
    }
  }, [directorAvailableYears, directorTrendYear]);

  useEffect(() => {
    if (!isDirector || periods.length === 0) return;

    let cancelled = false;
    const loadDirectorTrend = async () => {
      setDirectorTrendLoading(true);
      setDirectorTrendError("");
      try {
        const yearPeriods = periods.filter((item) => {
          if (!item.start_date) return false;
          const year = new Date(item.start_date).getUTCFullYear();
          // Hanya periode yang sudah masuk alur approval; DRAFT/REVIEW tidak dihitung.
          return (
            String(year) === String(directorTrendYear) &&
            [
              "PENDING_FINANCE",
              "PENDING_DIRECTOR",
              "APPROVED",
              "PAID",
              "CLOSED",
            ].includes(String(item.status || "").toUpperCase())
          );
        });

        const monthly = Array.from({ length: 12 }, (_, index) => ({
          month: index,
          label: new Date(Date.UTC(2020, index, 1)).toLocaleDateString(
            "id-ID",
            {
              month: "short",
              timeZone: "UTC",
            },
          ),
          gross: 0,
          deductions: 0,
          net: 0,
        }));

        const results = await Promise.all(
          yearPeriods.map(async (item) => {
            const response = await axios.get(
              `${API}/payroll/periods/${item.id}/details`,
              { headers: { Authorization: `Bearer ${token}` } },
            );
            return {
              period: item,
              rows: response.data.data || [],
              terRates: response.data.ter_rates || [],
            };
          }),
        );

        results.forEach(
          ({ period: payrollPeriod, rows: detailRows, terRates: rates }) => {
            const month = new Date(payrollPeriod.start_date).getUTCMonth();
            let grossTotal = 0;
            let deductionTotal = 0;

            detailRows.forEach((row) => {
              const baseGross = moneyFields.reduce(
                (sum, field) => sum + num(row[field]),
                0,
              );
              const employeeType = String(
                row.employee_type || "",
              ).toUpperCase();
              const divisor = num(
                row.payroll_divisor ||
                  (row.work_schedule === "6_DAYS" ? 26 : 22),
              );
              const gross =
                employeeType === "KONTRAK_INTERN"
                  ? divisor > 0
                    ? Math.round(
                        (baseGross * num(row.intern_present_days)) / divisor,
                      )
                    : 0
                  : baseGross;
              const category = terCategory(row.ptkp_status || "TK/0");
              const ter = rates.find(
                (rate) =>
                  rate.category === category &&
                  num(rate.min_income) <= gross &&
                  (rate.max_income == null || num(rate.max_income) >= gross),
              );
              const noBpjs = [
                "PROBATION",
                "KONTRAK_3_BULAN",
                "KONTRAK_INTERN",
              ].includes(employeeType);
              const jht = noBpjs ? 0 : Math.round(num(row.basic_salary) * 0.02);
              const jpBase = noBpjs
                ? 0
                : Math.min(
                    num(row.basic_salary),
                    num(row.bpjs_jp_base) > 0
                      ? num(row.bpjs_jp_base)
                      : 11086300,
                  );
              const jp = noBpjs ? 0 : Math.round(jpBase * 0.01);
              const health = noBpjs
                ? 0
                : Math.round(num(row.basic_salary) * 0.01);
              const pph = Math.round((gross * num(ter?.rate)) / 100);
              const basicDed = Math.round(
                ((num(row.sick_without_document_days) +
                  num(row.unpaid_leave_days)) *
                  num(row.basic_salary)) /
                  (divisor || 1),
              );

              const transportDed = Math.round(
                (num(row.sick_with_document_days) *
                  num(row.transport_allowance)) /
                  (divisor || 1),
              );

              const mealDed = Math.round(
                (num(row.sick_with_document_days) * num(row.meal_allowance)) /
                  (divisor || 1),
              );
              grossTotal += gross;
              deductionTotal +=
                jht + jp + health + pph + basicDed + transportDed + mealDed;
            });

            monthly[month].gross += grossTotal;
            monthly[month].deductions += deductionTotal;
            monthly[month].net += grossTotal - deductionTotal;
          },
        );

        if (!cancelled) setDirectorTrend(monthly);
      } catch (err) {
        if (!cancelled) {
          setDirectorTrend([]);
          setDirectorTrendError(
            err.response?.data?.message ||
              "Gagal memuat tren pengeluaran payroll.",
          );
        }
      } finally {
        if (!cancelled) setDirectorTrendLoading(false);
      }
    };

    loadDirectorTrend();
    return () => {
      cancelled = true;
    };
  }, [periods, isDirector, directorTrendYear, token]);

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

  const grossOf = (r) => {
    const baseGross = moneyFields.reduce((sum, f) => sum + num(r[f]), 0);
    if (String(r.employee_type || "").toUpperCase() !== "KONTRAK_INTERN") {
      return baseGross;
    }
    const divisor = num(
      r.payroll_divisor || (r.work_schedule === "6_DAYS" ? 26 : 22),
    );
    return divisor > 0
      ? Math.round((baseGross * num(r.intern_present_days)) / divisor)
      : 0;
  };
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
    const employeeType = String(r.employee_type || "").toUpperCase();
    const noBpjs = ["PROBATION", "KONTRAK_3_BULAN", "KONTRAK_INTERN"].includes(
      employeeType,
    );
    const jht = noBpjs ? 0 : Math.round(num(r.basic_salary) * 0.02);
    const jpBase = noBpjs
      ? 0
      : Math.min(
          num(r.basic_salary),
          num(r.bpjs_jp_base) > 0 ? num(r.bpjs_jp_base) : 11086300,
        );
    const jp = noBpjs ? 0 : Math.round(jpBase * 0.01);
    const health = noBpjs ? 0 : Math.round(num(r.basic_salary) * 0.01);
    const pph = Math.round((gross * rate) / 100);
    const divisor = num(
      r.payroll_divisor || (r.work_schedule === "6_DAYS" ? 26 : 22),
    );
    const isIntern = employeeType === "KONTRAK_INTERN";
    const basicDed = Math.round(
      ((num(r.sick_without_document_days) + num(r.unpaid_leave_days)) *
        num(r.basic_salary)) /
        (divisor || 1),
    );

    const transportDed = Math.round(
      (num(r.sick_with_document_days) * num(r.transport_allowance)) /
        (divisor || 1),
    );

    const mealDed = Math.round(
      (num(r.sick_with_document_days) * num(r.meal_allowance)) / (divisor || 1),
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

  const payrollSummary = useMemo(() => {
    return rows.reduce(
      (total, row) => {
        const calc = calculationOf(row);
        total.gross += calc.gross;
        total.tax += calc.pph;
        total.deductions += calc.total;
        total.net += calc.net;
        return total;
      },
      { gross: 0, tax: 0, deductions: 0, net: 0 },
    );
  }, [rows, terRates]);

  const updateLocal = (id, field, value) =>
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
    );
  const isDirty = (row) =>
    editableFields.some(
      (field) =>
        String(row[field] ?? "") !== String(row._original?.[field] ?? ""),
    );

  const handleSubmitApproval = async () => {
    if (!isHr || !selectedPeriod || period?.status !== "DRAFT") return;

    if (!period?.is_generated || rows.length === 0) {
      setError("Generate payroll terlebih dahulu sebelum mengirim approval.");
      return;
    }

    if (rows.some(isDirty)) {
      setError(
        "Masih ada perubahan yang belum di-Update. Simpan semua perubahan terlebih dahulu.",
      );
      return;
    }

    const confirmed = window.confirm(
      "Kirim payroll periode ini ke Finance untuk proses approval?",
    );
    if (!confirmed) return;

    setSubmitting(true);
    setError("");
    setNotice("");

    try {
      const response = await axios.post(
        `${API}/payroll/periods/${selectedPeriod}/submit`,
        {},
        authConfig,
      );

      setNotice(
        response.data?.message ||
          "Payroll berhasil dikirim untuk approval Finance.",
      );
      await loadPeriods();
      await loadDetails(selectedPeriod);
    } catch (e) {
      setError(
        e.response?.data?.message || "Gagal mengirim payroll untuk approval.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprovalAction = async (action) => {
    if (!selectedPeriod || approvalLoading) return;

    const expectedStatus = isFinance ? "PENDING_FINANCE" : "PENDING_DIRECTOR";
    if (period?.status !== expectedStatus) return;
    if (
      (action === "approve" && !(isFinance || isDirector)) ||
      (action === "reject" && !(isFinance || isDirector))
    )
      return;

    let notes = "";
    if (action === "reject") {
      notes = window.prompt("Masukkan alasan penolakan payroll:")?.trim() || "";
      if (!notes) {
        setError("Alasan penolakan wajib diisi.");
        return;
      }
    } else if (!window.confirm("Setujui payroll periode ini?")) {
      return;
    }

    setApprovalLoading(true);
    setError("");
    setNotice("");
    try {
      const endpoint = action === "approve" ? "approve" : "reject";
      const response = await axios.post(
        `${API}/payroll/periods/${selectedPeriod}/${endpoint}`,
        action === "reject" ? { notes } : {},
        authConfig,
      );
      setNotice(
        response.data?.message ||
          (action === "approve"
            ? "Payroll berhasil disetujui."
            : "Payroll ditolak dan dikembalikan ke HR."),
      );
      await loadPeriods();
      await loadDetails(selectedPeriod);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          `Gagal ${action === "approve" ? "menyetujui" : "menolak"} payroll.`,
      );
    } finally {
      setApprovalLoading(false);
    }
  };

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
          intern_present_days: num(row.intern_present_days),
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
      "NIP",
      "Work Schedule",
      "Jenis Karyawan",
      "Hari Dibayar (Hadir)",
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
        row.employee_type || "",
        num(row.intern_present_days),
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
        [6, 7, 8, 9, 10, 14, 15, 16, 17, 21, 22, 23].forEach((columnIndex) => {
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
      // Format kolom nominal khusus untuk PDF: Rupiah dengan pemisah ribuan titik.
      // Data Excel tetap numerik agar masih bisa dihitung dan difilter.
      const currencyColumns = new Set([
        6, 7, 8, 9, 10, 14, 15, 16, 17, 21, 22, 23,
      ]);
      const pdfData = data.map((row) =>
        row.map((value, columnIndex) =>
          currencyColumns.has(columnIndex)
            ? `Rp ${formatRupiah(value)}`
            : value,
        ),
      );
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
        body: pdfData,
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
    // Nama pemilik rekening mengikuti nama karyawan di data users.
    const bankAccountName = row.name || "-";
    const bankName = row.bank_name || "-";
    const bankAccountNumber = row.bank_account_number || "-";

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

    const formatDate = (value) => {
      if (!value) return "-";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "-";

      return new Intl.DateTimeFormat("id-ID", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        timeZone: "Asia/Jakarta",
      }).format(date);
    };
    const logos = [
      "data:image/png;base64,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hGjx7zbLY0BERET7M9BP50cVy4SEaJFl0J08CkRECYs8BESLiQkJ0SKbD/G0VFZOiYj2j4Q+3ypDJSImJESpmmrqwk32MkQFIIm8gZk9EREfMwyXiHiHES2hm8zsXGi0nUaUwKcCERERMSEhWjqEm9qJiIiIfkNCYgBIQmunhjvLiIiIiIiWTkJCRERERETEhISIiIiIiJiQEBERERERMSEhIiIiIiImJERERERERExIiIiIiIiICQkRERERERETEiIiIiIiYkJCREREtGQpAA5lJmJCQkREREso+lAeAyJaSPmVCQkRERHtR/3dECQZwlNGiYmm+++EMCEhIiIiIqIDlPMLExIiIiIiIjpwmJAQERERERETEiIiIiIiYkJCRERERETEhOTXUmWvQCIiIiIiJiQHJBsBrBOo5coOERERERETkv2aiyisAQr9MQrMQtkZnIiIiIgodS6hn9VjIMswXXwcr736xxgaydBolDyFRERERETpSqv0SQGo9oFzU4mIiIiImJAcECJxITUhIiIiIiImJERERERERExIiIiIiIiICQkRERERERETEiIiIiIiYkJCRCnRyGNARERETEiI6IBkI9L9NxHRYplDWr0y2deTiAkJEe1fTEeIaPGD/JTCDz4VKS0RqU3IUCYkRERERL8ZwyVK7XpNKJE2TEiIiIiIiJg+82cmIiIiIiImUURERESLTVLbKc72g0SLnJAIkxIiIiKiX5k8MRkhWvyERDDLBhJEREREvzZaIqJF5OBDHfMKAJaHg4iIiBZVbpSzPYjo53N+Z34XQQE22iYiIqLF1umk+AGUKRTRoiYkwoURIiIiWmTjo92Aw1beh6oDAN/jOUhEbjNMF99CXv1b1OsG6ydLnkiixUhIfLiw+2DQwMNBREREi0p0ZTJ7MgSAosT6y+d44ogWMyFxegucIMEefERERJRc5CGprTIIWNZOtMgJSTSDrIwkoi4FS6WJaHEfMyIJxvd8MFIyYoKXrAE0rQbbovxKQbRo9xfYb4+IFj+0TypWYthBtKiPhCgJdtYOwg1lREREtP8SKKKEmOQS6bQSEofZUmFlPS4YfQTOmvSo1zmqiFJ4m6XVMEJVVPlJkIgWJbgXGAifMER0VzqS0uxRgSAqkMkhCKhC+M2Ckrl4l6fzowo0Skd4fxHR4rzLFaqdZBISUcBEnjeiRZbe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",
      "data:image/png;base64,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",
      "data:image/png;base64,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",
      "data:image/png;base64,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",
    ];

    const popup = window.open("", "_blank", "width=900,height=700");

    if (!popup) {
      setError(
        "Popup diblokir browser. Izinkan pop-up untuk mengunduh slip gaji.",
      );
      return;
    }

    popup.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8" />
      <title>Slip Gaji - ${escapeHtml(row.name)}</title>

      
<style>
  * {
    box-sizing: border-box;
  }

  body {
    font-family: Arial, sans-serif;
    color: #222;
    padding: 32px;
    max-width: 850px;
    margin: auto;
    font-size: 13px;
  }

  .header {
    display: flex;
    align-items: center;
    gap: 18px;
    padding-bottom: 20px;
    border-bottom: 2px solid #333;
  }

  .logo {
    width: 75px;
    height: 75px;
    object-fit: contain;
  }

  .company-info {
    flex: 1;
  }

  .company-name {
    font-size: 17px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .slip-title {
    font-size: 22px;
    font-weight: bold;
    letter-spacing: 1px;
  }

  .period-name {
    color: #666;
    margin-top: 5px;
  }

  .meta {
    margin: 20px 0;
    padding: 15px;
    background: #f5f6f8;
    display: flex;
    justify-content: space-between;
    gap: 20px;
    line-height: 1.8;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 18px;
  }

  td, th {
    border: 1px solid #ddd;
    padding: 10px;
    text-align: left;
    font-size: 13px;
  }

  th {
    background: #f2f4f7;
  }

  .amount {
    text-align: right;
  }

  .total {
    font-weight: bold;
    background: #f7f7f7;
  }

  .actions {
    margin: 25px 0;
    text-align: right;
  }

  button {
    padding: 10px 18px;
    cursor: pointer;
  }

  .signature {
    margin-top: 40px;
    display: flex;
    justify-content: flex-end;
    text-align: center;
  }

  .signature div {
    width: 200px;
  }

  .official-note {
    margin-top: 25px;
    padding-top: 12px;
    border-top: 1px solid #ddd;
    text-align: center;
    color: #555;
    font-size: 11px;
    line-height: 1.6;
  }

  .official-note strong {
    color: #222;
    letter-spacing: 0.5px;
  }

  .brand-row {
    display: grid; grid-template-columns: repeat(4, 1fr);
    align-items: center; gap: 22px; padding: 8px 0 22px;
  }
  .brand { height: 82px; display:flex; align-items:center; justify-content:center; flex-direction:column; }
  .brand img { max-width: 100%; max-height: 72px; object-fit:contain; }
  .brand:first-child img { max-height: 58px; }
  .brand-caption { font-size:8px; font-weight:bold; margin-top:3px; letter-spacing:.2px; }
  .slip-title { text-align:right; color:#2675ad; font-size:22px; margin:0 0 16px; }
  .employee-grid { display:grid; grid-template-columns: 1fr 1fr; gap:24px; margin-bottom:22px; }
  .section-title { background:#5798c9; color:#fff; font-weight:bold; padding:5px 8px; font-size:11px; margin-bottom:8px; }
  .meta-grid { display:grid; grid-template-columns: 1fr 1fr 1fr; gap:8px; margin-bottom:12px; }
  .meta-box { background:#5798c9; color:#fff; padding:5px 8px; font-size:10px; font-weight:bold; }
  .pay-info { background:#8bcf4b; padding:8px; font-weight:bold; margin:12px 0; }
  .bank-info { display:grid; grid-template-columns:130px 1fr; gap:9px; font-size:11px; margin-top:8px; }
  .pay-table { margin-top:14px; }
  .pay-table th { background:#aaa; color:#111; }
  .pay-table td, .pay-table th { border:0; border-bottom:1px solid #555; padding:6px 8px; }
  .pay-table .total td { background:#aaa; font-weight:bold; border:0; }
  .net-box { width:65%; margin:14px 0 0 auto; }
  .net-box td { background:#aaa; font-weight:bold; border:0; }
  .footer { margin-top:38px; text-align:center; font-size:10px; line-height:1.6; }
  .amount { text-align:right; white-space:nowrap; }
  .earn-head { background:#aaa; color:#111; font-weight:bold; }


  /* FINAL PAYSLIP STYLE - mengikuti referensi PAY SLIP */
  body {
    font-family: Arial, Helvetica, sans-serif;
    color: #111;
    width: 190mm;
    max-width: 190mm;
    margin: 0 auto;
    padding: 7mm 5mm;
    font-size: 9px;
    line-height: 1.35;
    background: #fff;
  }

  .slip-title {
    text-align: right;
    color: #1680c5;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0;
    margin: 0 3mm 7mm 0;
    line-height: 1;
  }

  .brand-row {
    display: grid;
    grid-template-columns: 1.1fr 1fr 1fr 1.15fr;
    align-items: center;
    gap: 7mm;
    height: 22mm;
    padding: 0 4mm;
    margin-bottom: 2mm;
  }

  .brand {
    height: 20mm;
    min-width: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
  }

  .brand img {
    display: block;
    max-width: 100%;
    max-height: 17mm;
    object-fit: contain;
    background: transparent;
  }

  .brand:first-child img { max-height: 16mm; }
  .brand-caption {
    font-size: 6.5px;
    font-weight: 700;
    margin-top: 1mm;
    letter-spacing: 0;
    text-align: center;
  }

  .employee-grid {
    display: grid;
    grid-template-columns: 1.15fr 0.85fr;
    gap: 23mm;
    margin: 0 0 5mm;
    font-size: 8.5px;
    line-height: 1.4;
  }

  .section-title {
    background: #5798c9;
    color: #fff;
    font-weight: 700;
    padding: 1mm 1.2mm;
    font-size: 8px;
    margin-bottom: 1.5mm;
  }

  .meta-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1mm;
    margin-bottom: 2mm;
  }

  .meta-box {
    background: #5798c9;
    color: #fff;
    padding: 1mm 1.2mm;
    font-size: 7.5px;
    font-weight: 700;
  }

  .pay-info {
    background: #8bcf4b;
    color: #111;
    padding: 1.2mm;
    font-size: 8px;
    font-weight: 700;
    margin: 1.8mm 0;
  }

  .bank-info {
    display: grid;
    grid-template-columns: 18mm 1fr;
    gap: 1.2mm 2mm;
    font-size: 7.8px;
    margin-top: 1.8mm;
  }

  table.pay-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 3mm;
    table-layout: fixed;
  }

  .pay-table th {
    background: #aaa;
    color: #111;
    font-size: 8px;
    font-weight: 700;
    padding: 1.3mm 1.5mm;
    border: 0;
    border-bottom: 0.25mm solid #555;
  }

  .pay-table td {
    font-size: 8px;
    padding: 1.3mm 1.5mm;
    border: 0;
    border-bottom: 0.25mm solid #555;
    line-height: 1.15;
  }

  .pay-table th:first-child,
  .pay-table td:first-child { text-align: left; }

  .pay-table .amount {
    width: 25%;
    text-align: right;
    white-space: nowrap;
  }

  .pay-table .total td {
    background: #aaa;
    color: #111;
    font-weight: 700;
    border: 0;
    padding: 1mm 1.2mm;
  }

  .net-box {
    width: 65% !important;
    margin: 4mm 0 0 auto !important;
  }

  .net-box td {
    background: #aaa;
    color: #111;
    font-size: 8px;
    font-weight: 700;
    border: 0;
    padding: 1.5mm;
  }

  .footer {
    margin-top: 12mm;
    padding: 0;
    border: 0;
    color: #111;
    text-align: center;
    font-size: 7.5px;
    line-height: 1.5;
  }

  .footer b {
    font-weight: 700;
  }

  @media print {
    html, body {
      width: 190mm;
      max-width: 190mm;
      margin: 0 auto;
      padding: 0;
      font-size: 9px;
      print-color-adjust: exact !important;
      -webkit-print-color-adjust: exact !important;
    }
    body { zoom: 1; }
    .brand-row { break-inside: avoid; }
    .employee-grid { break-inside: avoid; }
    .pay-table { break-inside: avoid; }
    .footer { margin-top: 12mm; }
  }

    /* PRINT SETTINGS */
  @page {
    size: A4 portrait;
    margin: 8mm;
  }

  @media print {
    html, body {
      width: 100%;
      height: auto;
      margin: 0;
      padding: 0;
      font-size: 9px;
    }

    body {
      zoom: 1;
    }

    .actions {
      display: none !important;
    }

    .header {
      padding-bottom: 15px;
    }

    .logo {
      width: 68px;
      height: 68px;
    }

    .company-name {
      font-size: 18px;
    }

    .slip-title {
      font-size: 24px;
    }

    .meta {
      margin: 16px 0;
      padding: 12px;
      line-height: 1.9;
    }

    table {
      margin-top: 14px;
    }

    td, th {
      padding: 1.3mm 1.5mm;
      font-size: 8px;
    }

    .signature {
      margin-top: 35px;
    }

    .official-note {
      margin-top: 22px;
      padding-top: 12px;
      font-size: 10px;
      line-height: 1.6;
    }

    .official-note,
    .signature,
    tr {
      page-break-inside: avoid;
      break-inside: avoid;
    }
  }
</style>

    </head>

    <body>

      <h1 class="slip-title">PAY SLIP</h1>
      <div class="brand-row">
        <div class="brand"><img src="${logos[0]}" alt="Mitra Untuk Indonesia" /><div class="brand-caption">MITRA UNTUK INDONESIA</div></div>
        <div class="brand"><img src="${logos[1]}" alt="IAS" /></div>
        <div class="brand"><img src="${logos[2]}" alt="Mark" /></div>
        <div class="brand"><img src="${logos[3]}" alt="Ganbaru Training" /></div>
      </div>

      <div class="employee-grid">
        <div>
          <div class="section-title">EMPLOYEE INFORMATION</div>
          <b>${escapeHtml(row.name)}</b><br />
          Jabatan : ${escapeHtml(
            String(row.position || "-")
              .trim()
              .toLowerCase() === "employee"
              ? "Staff"
              : row.position || "-",
          )}<br />
          Email : ${escapeHtml(row.company_email || row.email || "-")}
        </div>
        <div>
          <div class="meta-grid">
            <div><div class="meta-box">PAY DATE</div><b>${escapeHtml(formatDate(period?.payment_date))}</b></div>
            <div><div class="meta-box">PAY TYPE</div><b>Salary</b></div>
            <div><div class="meta-box">PERIOD</div><b>${escapeHtml(period?.period_name || "-")}</b></div>
          </div>
          <div class="pay-info">Payment Method: Bank Transfer</div>
          <div class="bank-info">
            <b>Bank Name</b><span>${escapeHtml(bankName)}</span>
            <b>Bank Account Name</b><span>${escapeHtml(bankAccountName)}</span>
            <b>Bank Account #</b><span>${escapeHtml(bankAccountNumber)}</span>
          </div>
        </div>
      </div>

      <table class="pay-table">
        <thead><tr><th>EARNINGS</th><th class="amount">AMOUNT</th></tr></thead>
        <tbody>
          <tr><td>Basic Salary</td><td class="amount">${money(row.basic_salary)}</td></tr>
          <tr><td>Transport Allowance</td><td class="amount">${money(row.transport_allowance)}</td></tr>
          <tr><td>Meal Allowance</td><td class="amount">${money(row.meal_allowance)}</td></tr>
          <tr><td>Position Allowance</td><td class="amount">${money(row.position_allowance)}</td></tr>
          <tr><td>Adjustment</td><td class="amount">${money(row.adjustment || 0)}</td></tr>
          <tr><td>Bonus</td><td class="amount">${money(row.bonus || 0)}</td></tr>
          <tr class="total"><td>GROSS PAY</td><td class="amount">Rp ${money(c.gross)},-</td></tr>
        </tbody>
      </table>

      <table class="pay-table">
        <thead><tr><th>DEDUCTIONS</th><th class="amount">AMOUNT</th></tr></thead>
        <tbody>
          <tr><td>BPJS KES</td><td class="amount">${money(c.health)}</td></tr>
          <tr><td>BPJS TK (JHT + JP)</td><td class="amount">${money(c.jht + c.jp)}</td></tr>
          <tr><td>Tax (PPh 21)</td><td class="amount">${money(c.pph)}</td></tr>
          <tr><td>Attendance Deduction</td><td class="amount">${money(c.basicDed + c.transportDed + c.mealDed)}</td></tr>
          <tr class="total"><td>TOTAL DEDUCTIONS</td><td class="amount">Rp ${money(c.total)},-</td></tr>
        </tbody>
      </table>
      <table class="pay-table net-box">
        <tbody><tr><td>NETT PAY</td><td class="amount">Rp ${money(c.net)},-</td></tr></tbody>
      </table>
      <div class="footer">
        If you have any questions about this payslip, please contact:<br />
<strong>Niken – HR Department</strong><br />
Phone: +62 813-1053-9184<br />
Email: hrd.mitrauntukindonesia@gmail.com
      </div>
      <div class="actions">
        <button onclick="window.print()">
          Cetak / Simpan PDF
        </button>
      </div>

      <script>
        window.onload = () => {
          window.print();
        };
      </script>

    </body>
    </html>
  `);

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
        {!isDirector && (
          <>
            <Box
              sx={{
                px: 2,
                py: 1.5,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
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
                startIcon={
                  privacyMode ? <VisibilityOffIcon /> : <VisibilityIcon />
                }
                onClick={() => setPrivacyMode((v) => !v)}
                sx={{ textTransform: "none" }}
              >
                {privacyMode ? "Show Salary" : "Hide Salary"}
              </Button>
            </Box>
            <Box
              sx={{ mx: 2, borderTop: "1px solid", borderColor: "divider" }}
            />
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
                <Typography
                  sx={{ fontSize: 11, color: "text.secondary", mb: 0.4 }}
                >
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
                <Typography
                  sx={{ fontSize: 11, color: "text.secondary", mb: 0.4 }}
                >
                  Cut-off Period
                </Typography>
                <Typography sx={{ fontSize: 14, color: "text.primary" }}>
                  {period
                    ? `${new Date(period.start_date).toLocaleDateString("id-ID", { timeZone: "UTC" })} - ${new Date(period.end_date).toLocaleDateString("id-ID", { timeZone: "UTC" })}`
                    : "-"}
                </Typography>
              </Box>
              <Box sx={{ py: 1 }}>
                <Typography
                  sx={{ fontSize: 11, color: "text.secondary", mb: 0.4 }}
                >
                  Payment Date
                </Typography>
                <Typography sx={{ fontSize: 14, color: "text.primary" }}>
                  {period?.payment_date
                    ? new Date(period.payment_date).toLocaleDateString(
                        "id-ID",
                        {
                          timeZone: "UTC",
                        },
                      )
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
                {isHr && period?.status === "DRAFT" && (
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    onClick={handleSubmitApproval}
                    disabled={
                      submitting ||
                      loading ||
                      !period?.is_generated ||
                      rows.length === 0 ||
                      rows.some(isDirty)
                    }
                    sx={{
                      ml: 1,
                      textTransform: "none",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {submitting ? "Submitting..." : "Submit for Approval"}
                  </Button>
                )}
                {isFinance && period?.status === "PENDING_FINANCE" && (
                  <>
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      disabled={approvalLoading || loading}
                      onClick={() => handleApprovalAction("approve")}
                      sx={{ ml: 1, textTransform: "none" }}
                    >
                      {approvalLoading ? "Processing..." : "Approve"}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="error"
                      disabled={approvalLoading || loading}
                      onClick={() => handleApprovalAction("reject")}
                      sx={{ textTransform: "none" }}
                    >
                      Reject
                    </Button>
                  </>
                )}
                <Typography
                  sx={{ fontSize: 11, color: "text.secondary", ml: { sm: 1 } }}
                >
                  {editable
                    ? "Field dapat diedit langsung; klik Update untuk menyimpan. Tekan Escape untuk membatalkan perubahan."
                    : "Periode terkunci; hanya DRAFT yang dapat diedit."}
                </Typography>
              </Box>
            </Box>
          </>
        )}
        {isDirector && (
          <Box sx={{ px: 2, pb: 2, pt: 0.5 }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "stretch", sm: "center" }}
              spacing={2}
              sx={{ mb: 1.5, width: "100%", minWidth: 0 }}
            >
              <Box sx={{ flex: "1 1 auto", minWidth: 0, pr: { xs: 0, sm: 2 } }}>
                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1.4,
                    overflowWrap: "anywhere",
                  }}
                >
                  Tren Pengeluaran Perusahaan - Gaji Karyawan
                </Typography>
                <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                  Perbandingan biaya payroll setiap bulan
                </Typography>
              </Box>
              <FormControl
                size="small"
                sx={{
                  width: { xs: "100%", sm: 130 },
                  minWidth: { xs: "100%", sm: 130 },
                  flex: "0 0 auto",
                }}
              >
                <InputLabel id="director-trend-year-label">Tahun</InputLabel>
                <Select
                  labelId="director-trend-year-label"
                  value={directorTrendYear}
                  label="Tahun"
                  onChange={(event) => setDirectorTrendYear(event.target.value)}
                >
                  {directorAvailableYears.map((year) => (
                    <MenuItem key={year} value={year}>
                      {year}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            {directorTrendLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                <CircularProgress size={26} />
              </Box>
            ) : directorTrendError ? (
              <Alert severity="warning">{directorTrendError}</Alert>
            ) : (
              (() => {
                const maxValue = Math.max(
                  1,
                  ...directorTrend.flatMap((item) => [
                    item.gross,
                    item.deductions,
                    item.net,
                  ]),
                );
                const axisMax =
                  Math.ceil(maxValue / 4000000) * 4000000 || 4000000;
                const chartWidth = 1000;
                const chartHeight = 220;
                const left = 90;
                const right = 20;
                const top = 14;
                const bottom = 38;
                const plotWidth = chartWidth - left - right;
                const plotHeight = chartHeight - top - bottom;
                const xAt = (index) => left + (plotWidth / 11) * index;
                const yAt = (value) =>
                  top + plotHeight - (value / axisMax) * plotHeight;
                const series = [
                  { key: "gross", label: "Gaji Bruto", color: "#4472C4" },
                  {
                    key: "deductions",
                    label: "Total Potongan",
                    color: "#ED7D31",
                  },
                  { key: "net", label: "Take Home Pay", color: "#70AD47" },
                ];
                const formatAxis = (value) =>
                  value >= 1000000000
                    ? `Rp ${(value / 1000000000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} M`
                    : value >= 1000000
                      ? `Rp ${(value / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 0 })} jt`
                      : `Rp ${formatRupiah(value)}`;
                return (
                  <Box
                    sx={{
                      border: "1px solid #e5e7eb",
                      borderRadius: 2,
                      p: { xs: 1, sm: 1.25 },
                      bgcolor: "#fff",
                    }}
                  >
                    <Stack
                      direction="row"
                      spacing={2}
                      flexWrap="wrap"
                      sx={{ mb: 1.5 }}
                    >
                      {series.map((item) => (
                        <Stack
                          key={item.key}
                          direction="row"
                          spacing={0.7}
                          alignItems="center"
                        >
                          <Box
                            sx={{
                              width: 18,
                              height: 3,
                              bgcolor: item.color,
                              borderRadius: 2,
                            }}
                          />
                          <Typography
                            sx={{ fontSize: 10.5, color: "text.secondary" }}
                          >
                            {item.label}
                          </Typography>
                        </Stack>
                      ))}
                    </Stack>
                    {directorTrend.every(
                      (item) =>
                        item.gross === 0 &&
                        item.deductions === 0 &&
                        item.net === 0,
                    ) ? (
                      <Typography
                        sx={{
                          py: 2,
                          textAlign: "center",
                          fontSize: 12,
                          color: "text.secondary",
                        }}
                      >
                        Belum ada data payroll yang sudah masuk proses approval
                        pada tahun {directorTrendYear}.
                      </Typography>
                    ) : (
                      <Box sx={{ width: "100%", overflowX: "auto" }}>
                        <Box
                          component="svg"
                          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                          sx={{
                            display: "block",
                            width: "100%",
                            minWidth: 620,
                            height: "auto",
                          }}
                          role="img"
                          aria-label={`Grafik tren pengeluaran payroll tahun ${directorTrendYear}`}
                        >
                          {[0, 1, 2, 3, 4].map((step) => {
                            const value = (axisMax * (4 - step)) / 4;
                            const y = top + (plotHeight / 4) * step;
                            return (
                              <g key={step}>
                                <line
                                  x1={left}
                                  y1={y}
                                  x2={chartWidth - right}
                                  y2={y}
                                  stroke="#e5e7eb"
                                  strokeWidth="1"
                                />
                                <text
                                  x={left - 10}
                                  y={y + 4}
                                  textAnchor="end"
                                  fontSize="11"
                                  fill="#64748b"
                                >
                                  {formatAxis(value)}
                                </text>
                              </g>
                            );
                          })}
                          {directorTrend.map((item, index) => (
                            <text
                              key={item.month}
                              x={xAt(index)}
                              y={chartHeight - 15}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#64748b"
                            >
                              {item.label}
                            </text>
                          ))}
                          {series.map((item) => {
                            const points = directorTrend
                              .map(
                                (month, index) =>
                                  `${xAt(index)},${yAt(month[item.key])}`,
                              )
                              .join(" ");
                            return (
                              <g key={item.key}>
                                <polyline
                                  points={points}
                                  fill="none"
                                  stroke={item.color}
                                  strokeWidth="3"
                                  strokeLinejoin="round"
                                  strokeLinecap="round"
                                />
                                {directorTrend.map((month, index) => (
                                  <circle
                                    key={`${item.key}-${month.month}`}
                                    cx={xAt(index)}
                                    cy={yAt(month[item.key])}
                                    r="4"
                                    fill={item.color}
                                  >
                                    <title>{`${month.label}: ${item.label} Rp ${formatRupiah(month[item.key])}`}</title>
                                  </circle>
                                ))}
                              </g>
                            );
                          })}
                        </Box>
                      </Box>
                    )}
                    <Typography
                      sx={{ mt: 1, fontSize: 10, color: "text.secondary" }}
                    >
                      Data dihitung dari periode PENDING_FINANCE,
                      PENDING_DIRECTOR, APPROVED, PAID, dan CLOSED. DRAFT/REVIEW
                      tidak disertakan.
                    </Typography>
                  </Box>
                );
              })()
            )}
          </Box>
        )}
      </Card>
      {isFinance && (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(4, minmax(0, 1fr))",
            },
            gap: 1.5,
            mb: 1.5,
          }}
        >
          {[
            {
              label: "Total Gaji Bruto",
              value: payrollSummary.gross,
              color: "#2563EB",
            },
            {
              label: "Total Pajak PPh 21",
              value: payrollSummary.tax,
              color: "#D97706",
            },
            {
              label: "Total Potongan",
              value: payrollSummary.deductions,
              color: "#DC2626",
            },
            {
              label: "Total Gaji Dibayarkan",
              value: payrollSummary.net,
              color: "#059669",
            },
          ].map((item) => (
            <Card key={item.label} variant="outlined" sx={{ borderRadius: 1 }}>
              <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                <Typography
                  sx={{ fontSize: 12, color: "text.secondary", mb: 1 }}
                >
                  {item.label}
                </Typography>
                <Typography
                  sx={{
                    fontSize: { xs: 19, sm: 21 },
                    fontWeight: 700,
                    color: item.color,
                    overflowWrap: "anywhere",
                  }}
                >
                  Rp {formatRupiah(item.value)}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {isDirector && (
        <Card variant="outlined" sx={{ mb: 1.5, overflow: "hidden" }}>
          <Box sx={{ p: 2, borderBottom: "1px solid", borderColor: "divider" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ xs: "flex-start", sm: "center" }}
              spacing={1}
            >
              <Box>
                <Typography sx={{ fontSize: 17, fontWeight: 700 }}>
                  Payroll Approval
                </Typography>
                <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                  {period?.period_name || "Periode payroll"} · {rows.length}{" "}
                  karyawan
                </Typography>
              </Box>
              <Chip
                size="small"
                label={period?.status || "-"}
                color={period?.status === "APPROVED" ? "success" : "warning"}
              />
            </Stack>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.5,
                mt: 2,
              }}
            >
              {[
                { label: "Jumlah Karyawan", value: `${rows.length} orang` },
                {
                  label: "Total Bruto",
                  value: `Rp ${formatRupiah(payrollSummary.gross)}`,
                },
                {
                  label: "Total Take Home Pay",
                  value: `Rp ${formatRupiah(payrollSummary.net)}`,
                },
              ].map((item) => (
                <Box
                  key={item.label}
                  sx={{
                    p: 1.5,
                    bgcolor: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    borderRadius: 1.5,
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: "text.secondary" }}>
                    {item.label}
                  </Typography>
                  <Typography sx={{ fontSize: 17, fontWeight: 800, mt: 0.4 }}>
                    {item.value}
                  </Typography>
                </Box>
              ))}
            </Box>
            {period?.status === "PENDING_DIRECTOR" && (
              <Stack
                direction="row"
                alignItems="stretch"
                spacing={1.25}
                sx={{ mt: 1.5, width: "100%" }}
              >
                <Button
                  fullWidth
                  variant="contained"
                  color="success"
                  disabled={approvalLoading || loading}
                  onClick={() => handleApprovalAction("approve")}
                  sx={{
                    flex: 1,
                    minHeight: 42,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 14,
                    animation:
                      approvalLoading || loading
                        ? "none"
                        : "payrollApprovePulse 2s ease-in-out infinite",
                    "@keyframes payrollApprovePulse": {
                      "0%, 100%": {
                        boxShadow: "0 0 0 0 rgba(46, 125, 50, 0.28)",
                      },
                      "50%": { boxShadow: "0 0 0 6px rgba(46, 125, 50, 0)" },
                    },
                  }}
                >
                  {approvalLoading ? "Processing..." : "Approve"}
                </Button>
                <Button
                  fullWidth
                  variant="outlined"
                  color="error"
                  disabled={approvalLoading || loading}
                  onClick={() => handleApprovalAction("reject")}
                  sx={{
                    flex: 1,
                    minHeight: 42,
                    textTransform: "none",
                    fontWeight: 700,
                    fontSize: 14,
                  }}
                >
                  Reject
                </Button>
              </Stack>
            )}
          </Box>

          <Box sx={{ p: 1.5 }}>
            <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>
              Rincian Nilai Payroll
            </Typography>
            {loading ? (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress size={26} />
              </Box>
            ) : rows.length === 0 ? (
              <Typography
                align="center"
                sx={{ py: 4, color: "text.secondary", fontSize: 13 }}
              >
                Belum ada data payroll untuk periode ini.
              </Typography>
            ) : (
              <Box
                sx={{
                  width: "100%",
                  overflowX: "auto",
                  scrollbarWidth: "thin",
                }}
              >
                <Table
                  size="small"
                  sx={{
                    minWidth: 1750,
                    "& th": {
                      bgcolor: "#e9edf2",
                      fontSize: 11,
                      fontWeight: 700,
                      whiteSpace: "nowrap",
                      px: 1,
                      py: 1,
                    },
                    "& td": {
                      fontSize: 11,
                      whiteSpace: "nowrap",
                      px: 1,
                      py: 1,
                    },
                    "& tbody tr:nth-of-type(even)": { bgcolor: "#fafafa" },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      <TableCell>No</TableCell>
                      <TableCell>Nama Karyawan</TableCell>
                      <TableCell>NIP / NIK</TableCell>
                      <TableCell>Jabatan</TableCell>
                      <TableCell>Gaji Pokok</TableCell>
                      <TableCell>Tunj. Jabatan</TableCell>
                      <TableCell>Tunj. Transport</TableCell>
                      <TableCell>Tunj. Makan</TableCell>
                      <TableCell>Bruto</TableCell>
                      <TableCell>Pot. Absensi</TableCell>
                      <TableCell>BPJS JHT</TableCell>
                      <TableCell>BPJS JP</TableCell>
                      <TableCell>BPJS Kes.</TableCell>
                      <TableCell>PPh 21</TableCell>
                      <TableCell>Total Potongan</TableCell>
                      <TableCell sx={{ color: "#0f766e" }}>
                        Take Home Pay
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rows.map((row, index) => {
                      const c = calculationOf(row);
                      const attendance =
                        c.basicDed + c.transportDed + c.mealDed;
                      return (
                        <TableRow key={row.id || row.user_id || index} hover>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 600 }}>
                            {row.name || "-"}
                          </TableCell>
                          <TableCell>{row.nip || row.nik || "-"}</TableCell>
                          <TableCell>
                            {row.position || row.department || "-"}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(row.basic_salary)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(row.position_allowance)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(row.transport_allowance)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(row.meal_allowance)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Rp {formatRupiah(c.gross)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(attendance)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(c.jht)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(c.jp)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(c.health)}
                          </TableCell>
                          <TableCell align="right">
                            Rp {formatRupiah(c.pph)}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            Rp {formatRupiah(c.total)}
                          </TableCell>
                          <TableCell
                            align="right"
                            sx={{ fontWeight: 800, color: "#0f766e" }}
                          >
                            Rp {formatRupiah(c.net)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Box>
        </Card>
      )}

      {!isDirector && (
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
                  minWidth: 2500,
                  tableLayout: "fixed",
                  "& th": {
                    fontSize: 12,
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                    px: 0.8,
                    py: 0.8,
                    backgroundColor: "#e9edf2",
                    backgroundImage: "none",
                    backgroundClip: "padding-box",
                  },
                  "& td": cellSx,
                }}
              >
                <colgroup>
                  {[
                    48, 190, 140, 110, 150, 115, 125, 125, 115, 115, 110, 115,
                    115, 90, 115, 85, 85, 115, 155, 110, 125, 135,
                  ].map((width, index) => (
                    <col key={index} style={{ width }} />
                  ))}
                </colgroup>
                <TableHead>
                  <TableRow>
                    <TableCell sx={frozenCellSx(0, true)}>No</TableCell>
                    <TableCell sx={frozenCellSx(1, true)}>
                      {header("Employee", "name")}
                    </TableCell>
                    <TableCell sx={frozenCellSx(2, true)}>
                      {header("NIP", "nik")}
                    </TableCell>
                    <TableCell sx={frozenCellSx(3, true)}>Schedule</TableCell>
                    <TableCell sx={frozenCellSx(4, true)}>Status</TableCell>
                    <TableCell>Hari Dibayar</TableCell>
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
                    {!isFinance && <TableCell align="center">Action</TableCell>}
                  </TableRow>
                </TableHead>
                <TableBody
                  sx={{ "& tr:hover": { backgroundColor: "action.hover" } }}
                >
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={isFinance ? 21 : 22} align="center">
                        <CircularProgress size={24} />
                      </TableCell>
                    </TableRow>
                  ) : (
                    visible.map((row, i) => {
                      const c = calculationOf(row);
                      const attendance =
                        c.basicDed + c.transportDed + c.mealDed;
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
                          <TableCell sx={frozenCellSx(0)}>
                            {(page - 1) * rowsPerPage + i + 1}
                          </TableCell>
                          <TableCell sx={{ ...frozenCellSx(1), minWidth: 190 }}>
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
                          <TableCell sx={frozenCellSx(2)}>
                            {row.nip || row.nik || "-"}
                          </TableCell>
                          <TableCell sx={frozenCellSx(3)}>
                            {row.work_schedule || "-"}
                          </TableCell>
                          <TableCell sx={frozenCellSx(4)}>
                            {row.employee_type || "-"}
                          </TableCell>
                          <TableCell>
                            {row.employee_type === "KONTRAK_INTERN" ? (
                              <TextField
                                aria-label="Hari Dibayar"
                                type="number"
                                size="small"
                                disabled={!editable || !!saving[row.id]}
                                value={row.intern_present_days ?? 0}
                                onChange={(e) =>
                                  updateLocal(
                                    row.id,
                                    "intern_present_days",
                                    e.target.value,
                                  )
                                }
                                inputProps={{
                                  min: 0,
                                  step: 1,
                                }}
                                sx={{ ...inputSx, width: 75 }}
                              />
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          {moneyFields.map((f) => (
                            <TableCell key={f}>
                              {moneyInput(row, f, f)}
                            </TableCell>
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
                                "& .MuiSelect-select": {
                                  fontSize: 12,
                                  py: 0.5,
                                },
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
                          {!isFinance && (
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
                                      {saving[row.id]
                                        ? "Updating..."
                                        : "Update"}
                                    </Button>
                                  </>
                                ) : (
                                  !isFinance && (
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
                                  )
                                )}
                              </Stack>
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })
                  )}
                  {!loading && visible.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={isFinance ? 21 : 22} align="center">
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
      )}
    </Box>
  );
}
