import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Refresh,
  FileDownload,
  PictureAsPdf,
  FlightTakeoff,
  PendingActions,
  Visibility,
  EventAvailable,
  PeopleAlt,
  Payments,
  Close,
  AccountBalance,
  History,
  ReceiptLong,
} from "@mui/icons-material";

import api from "../../services/api";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const STATUS_OPTIONS = [
  "PENDING_MANAGER",
  "PENDING_HR",
  "PENDING_DIRECTOR",
  "PENDING_FINANCE",
  "ON_TRIP",
  "PENDING_SETTLEMENT",
  "COMPLETED",
  "REJECTED",
  "CANCELLED",
];

const getStatusLabel = (status) => {
  const labels = {
    PENDING_MANAGER: "Menunggu Manager",
    PENDING_HR: "Menunggu HR",
    PENDING_DIRECTOR: "Menunggu Director",
    PENDING_FINANCE: "Menunggu Finance",
    ON_TRIP: "Sedang Perjalanan",
    PENDING_SETTLEMENT: "Menunggu Settlement",
    COMPLETED: "Selesai",
    REJECTED: "Ditolak",
    CANCELLED: "Dibatalkan",
  };

  return labels[status] || status || "-";
};

const getStatusColor = (status) => {
  const colors = {
    PENDING_MANAGER: "warning",
    PENDING_HR: "warning",
    PENDING_DIRECTOR: "warning",
    PENDING_FINANCE: "warning",
    ON_TRIP: "info",
    PENDING_SETTLEMENT: "secondary",
    COMPLETED: "success",
    REJECTED: "error",
    CANCELLED: "default",
    APPROVED: "success",
    PENDING: "warning",
  };

  return colors[status] || "default";
};

function SummaryCard({ title, value, subtitle, icon, color }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        minWidth: 0,
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          spacing={1.5}
          sx={{ minWidth: 0 }}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography color="text.secondary" fontSize={13}>
              {title}
            </Typography>

            <Typography variant="h4" fontWeight={700} mt={1}>
              {value}
            </Typography>

            <Typography
              color="text.secondary"
              fontSize={12}
              mt={1}
              sx={{ lineHeight: 1.4, overflowWrap: "anywhere" }}
            >
              {subtitle}
            </Typography>
          </Box>

          <Box
            sx={{
              width: 46,
              height: 46,
              borderRadius: 2.5,
              bgcolor: `${color}.light`,
              color: `${color}.main`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function DetailItem({ label, value, bold = false }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography color="text.secondary" fontSize={12} mb={0.5}>
        {label}
      </Typography>

      <Typography
        fontSize={14}
        fontWeight={bold ? 700 : 500}
        sx={{ overflowWrap: "anywhere" }}
      >
        {value ?? "-"}
      </Typography>
    </Box>
  );
}

function DetailSection({ title, icon, children }) {
  return (
    <Box mb={3}>
      <Stack direction="row" alignItems="center" spacing={1} mb={2}>
        {icon}
        <Typography fontWeight={700}>{title}</Typography>
      </Stack>

      {children}
    </Box>
  );
}

function BusinessTripDetailDialog({
  open,
  trip,
  onClose,
  onApprove,
  onReject,
}) {
  if (!trip) return null;

  const approvalHistory = Array.isArray(trip.approval_history)
    ? trip.approval_history
    : [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      scroll="paper"
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Detail Business Trip
            </Typography>

            <Typography color="text.secondary" fontSize={13}>
              {trip.trip_number || "-"}
            </Typography>
          </Box>

          <IconButton onClick={onClose}>
            <Close />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />

      <DialogContent sx={{ p: { xs: 2, md: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
          mb={3}
        >
          <Typography fontWeight={700}>Status Perjalanan</Typography>

          <Chip
            label={getStatusLabel(trip.status)}
            color={getStatusColor(trip.status)}
          />
        </Stack>

        <DetailSection
          title="Informasi Karyawan"
          icon={<PeopleAlt color="primary" />}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <DetailItem
                label="Nama Karyawan"
                value={trip.employee_name}
                bold
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem label="NIK" value={trip.employee_nik} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem label="Departemen" value={trip.employee_department} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem label="Jabatan" value={trip.employee_position} />
            </Grid>
          </Grid>
        </DetailSection>

        <Divider sx={{ mb: 3 }} />

        <DetailSection
          title="Informasi Perjalanan"
          icon={<FlightTakeoff color="primary" />}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <DetailItem
                label="Nomor Perjalanan"
                value={trip.trip_number}
                bold
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem label="Nomor SPD" value={trip.letter_number} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem label="Tujuan" value={trip.destination} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem label="Keperluan" value={trip.purpose} />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem
                label="Tanggal Keberangkatan"
                value={formatDate(trip.departure_date)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem
                label="Tanggal Kepulangan"
                value={formatDate(trip.return_date)}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem
                label="Durasi"
                value={`${trip.duration_days || 0} Hari`}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <DetailItem
                label="Malam Menginap"
                value={`${trip.hotel_nights || 0} Malam`}
              />
            </Grid>

            <Grid item xs={12}>
              <DetailItem label="Catatan Pengajuan" value={trip.notes || "-"} />
            </Grid>
          </Grid>
        </DetailSection>

        <Divider sx={{ mb: 3 }} />

        <DetailSection
          title="Rincian Estimasi Biaya"
          icon={<ReceiptLong color="primary" />}
        >
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <DetailItem
                label="Transportasi"
                value={formatRupiah(trip.transport_estimate)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DetailItem
                label="Hotel"
                value={formatRupiah(trip.hotel_estimate)}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <DetailItem
                label="Food & Beverage"
                value={formatRupiah(trip.fnb_estimate)}
              />
            </Grid>

            <Grid item xs={12}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "action.hover",
                }}
              >
                <Typography color="text.secondary" fontSize={12}>
                  Total Estimasi
                </Typography>

                <Typography variant="h5" fontWeight={800} mt={0.5}>
                  {formatRupiah(trip.total_estimate)}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </DetailSection>

        <Divider sx={{ mb: 3 }} />

        <DetailSection
          title="Informasi Pencairan Finance"
          icon={<Payments color="primary" />}
        >
          {trip.disbursement_id ? (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", sm: "center" }}
                spacing={1}
                mb={2}
              >
                <Typography fontWeight={700}>Pencairan Tercatat</Typography>

                <Chip
                  label={trip.disbursement_status || "PAID"}
                  color="success"
                  size="small"
                />
              </Stack>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Nominal Pencairan"
                    value={formatRupiah(trip.disbursement_amount)}
                    bold
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Metode Pembayaran"
                    value={
                      trip.payment_method === "BANK_TRANSFER"
                        ? "Bank Transfer"
                        : trip.payment_method === "CASH"
                          ? "Cash"
                          : trip.payment_method
                    }
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Nomor Referensi Transfer"
                    value={trip.payment_reference || "-"}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Tanggal Pembayaran"
                    value={formatDate(trip.payment_date)}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Diproses Oleh"
                    value={trip.processed_by_name || "-"}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <DetailItem
                    label="Waktu Proses"
                    value={formatDateTime(trip.processed_at)}
                  />
                </Grid>

                <Grid item xs={12}>
                  <DetailItem
                    label="Catatan Finance"
                    value={trip.payment_notes || "-"}
                  />
                </Grid>
              </Grid>
            </Paper>
          ) : (
            <Alert severity="info">
              Belum ada pencairan dana yang tercatat oleh Finance.
            </Alert>
          )}
        </DetailSection>

        <Divider sx={{ mb: 3 }} />

        <DetailSection
          title="Riwayat Approval"
          icon={<History color="primary" />}
        >
          {approvalHistory.length > 0 ? (
            <Stack spacing={2}>
              {approvalHistory.map((approval) => (
                <Paper
                  key={approval.id}
                  variant="outlined"
                  sx={{ p: 2, borderRadius: 2 }}
                >
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    justifyContent="space-between"
                    alignItems={{ xs: "flex-start", sm: "center" }}
                    spacing={1}
                  >
                    <Box>
                      <Typography fontWeight={700}>
                        {approval.approval_stage}
                      </Typography>

                      <Typography fontSize={13} color="text.secondary">
                        {approval.approver_name || "-"}
                        {approval.approver_role
                          ? ` • ${approval.approver_role}`
                          : ""}
                      </Typography>
                    </Box>

                    <Chip
                      size="small"
                      label={approval.status}
                      color={getStatusColor(approval.status)}
                    />
                  </Stack>

                  <Typography fontSize={12} color="text.secondary" mt={1}>
                    {formatDateTime(approval.action_at)}
                  </Typography>

                  {approval.comments && (
                    <Typography fontSize={13} mt={1}>
                      Catatan: {approval.comments}
                    </Typography>
                  )}
                </Paper>
              ))}
            </Stack>
          ) : (
            <Typography color="text.secondary" fontSize={13}>
              Belum ada riwayat approval.
            </Typography>
          )}
        </DetailSection>

        {trip.rejection_reason && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Alasan penolakan: {trip.rejection_reason}
          </Alert>
        )}
      </DialogContent>

      <Divider />

      <DialogActions sx={{ p: 2, justifyContent: "space-between" }}>
        <Box>
          {trip.status === "PENDING_HR" && (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" color="error" onClick={onReject}>
                Reject
              </Button>
              <Button variant="contained" color="success" onClick={onApprove}>
                Approve
              </Button>
            </Stack>
          )}
        </Box>
        <Button variant="outlined" onClick={onClose}>
          Tutup
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function BusinessTripHR() {
  const [summary, setSummary] = useState({});
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState("");
  const [approvalComments, setApprovalComments] = useState("");
  const [approvalLoading, setApprovalLoading] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [summaryResult, tripsResult] = await Promise.allSettled([
        api.get("/business-trips/dashboard/summary"),
        api.get("/business-trips/hr/all"),
      ]);

      if (summaryResult.status === "fulfilled") {
        setSummary(summaryResult.value.data?.data || {});
      } else {
        console.error(
          "HR BUSINESS TRIP SUMMARY ERROR:",
          summaryResult.reason?.response?.data || summaryResult.reason,
        );
      }

      if (tripsResult.status === "fulfilled") {
        setTrips(tripsResult.value.data?.data || []);
      } else {
        console.error(
          "HR BUSINESS TRIP HISTORY ERROR:",
          tripsResult.reason?.response?.data || tripsResult.reason,
        );

        setTrips([]);
        setError(
          tripsResult.reason?.response?.data?.message ||
            "Gagal mengambil seluruh data Business Trip HR.",
        );
      }
    } catch (error) {
      console.error("HR BUSINESS TRIP ERROR:", error);
      setError("Gagal mengambil data Business Trip HR.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredTrips = useMemo(() => {
    if (statusFilter === "ALL") return trips;

    return trips.filter((trip) => trip.status === statusFilter);
  }, [trips, statusFilter]);

  const pendingCount = trips.filter((trip) =>
    [
      "PENDING_MANAGER",
      "PENDING_HR",
      "PENDING_DIRECTOR",
      "PENDING_FINANCE",
    ].includes(trip.status),
  ).length;

  const paidCount = trips.filter((trip) => trip.disbursement_id).length;

  const summaryCards = [
    {
      title: "Total Business Trip",
      value: trips.length,
      subtitle: "Seluruh pengajuan perjalanan dinas",
      icon: <FlightTakeoff />,
      color: "primary",
    },
    {
      title: "Menunggu Approval",
      value: pendingCount,
      subtitle: "Menunggu proses persetujuan",
      icon: <PendingActions />,
      color: "warning",
    },
    {
      title: "Sudah Dicairkan",
      value: paidCount,
      subtitle: "Memiliki catatan pencairan Finance",
      icon: <Payments />,
      color: "success",
    },
    {
      title: "Sedang Berjalan",
      value: trips.filter((trip) => trip.status === "ON_TRIP").length,
      subtitle: "Perjalanan sedang berlangsung",
      icon: <PeopleAlt />,
      color: "info",
    },
  ];

  const handleOpenDetail = (trip) => {
    console.log("BUSINESS TRIP DETAIL:", trip);
    setSelectedTrip(trip);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedTrip(null);
  };

  const openApprovalDialog = (action) => {
    setApprovalAction(action);
    setApprovalComments("");
    setApprovalDialogOpen(true);
  };

  const handleSubmitHRApproval = async () => {
    if (!selectedTrip?.id || !approvalAction) return;

    if (approvalAction === "REJECT" && !approvalComments.trim()) {
      window.alert("Alasan penolakan wajib diisi.");
      return;
    }

    setApprovalLoading(true);

    try {
      await api.post(`/business-trips/approvals/${selectedTrip.id}/hr-action`, {
        action: approvalAction,
        comments: approvalComments.trim(),
      });

      window.alert(
        approvalAction === "APPROVE"
          ? "Business Trip berhasil disetujui."
          : "Business Trip berhasil ditolak.",
      );

      setApprovalDialogOpen(false);
      setDetailOpen(false);
      setSelectedTrip(null);
      setApprovalAction("");
      setApprovalComments("");
      await fetchData();
    } catch (err) {
      console.error(
        "HR BUSINESS TRIP APPROVAL ERROR:",
        err?.response?.data || err,
      );
      window.alert(
        err?.response?.data?.message ||
          "Gagal memproses approval Business Trip.",
      );
    } finally {
      setApprovalLoading(false);
    }
  };

  const exportRows = filteredTrips.map((trip) => ({
    "No. Perjalanan": trip.trip_number || "-",
    "Nama Karyawan": trip.employee_name || "-",
    Jabatan: trip.employee_position || "-",
    Departemen: trip.employee_department || "-",
    Tujuan: trip.destination || "-",
    Keberangkatan: formatDate(trip.departure_date),
    Kepulangan: formatDate(trip.return_date),
    Estimasi: Number(trip.total_estimate || 0),
    Pencairan: trip.disbursement_id ? Number(trip.disbursement_amount || 0) : 0,
    Status: getStatusLabel(trip.status),
    Pembayaran: trip.disbursement_id
      ? trip.payment_method === "BANK_TRANSFER"
        ? "Transfer"
        : trip.payment_method === "CASH"
          ? "Cash"
          : trip.disbursement_status || "Tercatat"
      : "Belum Dicairkan",
    "Tanggal Pembayaran": formatDate(trip.payment_date),
    "Referensi Pembayaran": trip.payment_reference || "-",
  }));

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  const getExportFileName = (extension) => {
    const date = new Date().toISOString().slice(0, 10);
    const status =
      statusFilter === "ALL" ? "semua-status" : statusFilter.toLowerCase();
    return `business-trip-${status}-${date}.${extension}`;
  };

  const handleExportExcel = () => {
    if (!exportRows.length) {
      window.alert("Tidak ada data Business Trip untuk diexport.");
      return;
    }

    const headers = Object.keys(exportRows[0]);
    const tableRows = exportRows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => {
              const value = row[header];
              const displayValue =
                typeof value === "number" &&
                ["Estimasi", "Pencairan"].includes(header)
                  ? escapeHtml(formatRupiah(value))
                  : escapeHtml(value);
              return `<td>${displayValue}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("");

    const excelHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office"
            xmlns:x="urn:schemas-microsoft-com:office:excel"
            xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="UTF-8" />
          <style>
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #999; padding: 6px; }
            th { background: #e8f0ee; font-weight: bold; }
            td { mso-number-format: "\\@"; }
          </style>
        </head>
        <body>
          <h2>Laporan Business Trip</h2>
          <p>Filter status: ${escapeHtml(
            statusFilter === "ALL"
              ? "Semua Status"
              : getStatusLabel(statusFilter),
          )}</p>
          <p>Total data: ${exportRows.length}</p>
          <table>
            <thead><tr>${headers
              .map((header) => `<th>${escapeHtml(header)}</th>`)
              .join("")}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
        </body>
      </html>`;

    const blob = new Blob(["\ufeff", excelHtml], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = getExportFileName("xls");
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!exportRows.length) {
      window.alert("Tidak ada data Business Trip untuk diexport.");
      return;
    }

    const headers = Object.keys(exportRows[0]);
    const tableRows = exportRows
      .map(
        (row) =>
          `<tr>${headers
            .map((header) => {
              const value = row[header];
              const displayValue =
                typeof value === "number" &&
                ["Estimasi", "Pencairan"].includes(header)
                  ? escapeHtml(formatRupiah(value))
                  : escapeHtml(value);
              return `<td>${displayValue}</td>`;
            })
            .join("")}</tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert(
        "Popup diblokir browser. Izinkan popup untuk halaman HRIS, lalu coba export PDF lagi.",
      );
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <title>Laporan Business Trip</title>
          <style>
            @page { size: landscape; margin: 12mm; }
            body { font-family: Arial, sans-serif; color: #222; }
            h2 { margin: 0 0 6px; }
            p { margin: 4px 0; font-size: 11px; }
            table { border-collapse: collapse; width: 100%; margin-top: 16px; }
            th, td { border: 1px solid #bbb; padding: 6px; font-size: 8px; text-align: left; }
            th { background: #e8f0ee; }
            tr { page-break-inside: avoid; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <h2>Laporan Business Trip</h2>
          <p>Filter status: ${escapeHtml(
            statusFilter === "ALL"
              ? "Semua Status"
              : getStatusLabel(statusFilter),
          )}</p>
          <p>Total data: ${exportRows.length}</p>
          <p>Dicetak: ${escapeHtml(new Date().toLocaleString("id-ID"))}</p>
          <table>
            <thead><tr>${headers
              .map((header) => `<th>${escapeHtml(header)}</th>`)
              .join("")}</tr></thead>
            <tbody>${tableRows}</tbody>
          </table>
          <script>
            window.onload = function () {
              window.focus();
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      ></Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
          gap: 2,
          mb: 3,
          width: "100%",
          alignItems: "stretch",
        }}
      >
        {summaryCards.map((item) => (
          <Box key={item.title} sx={{ minWidth: 0 }}>
            <SummaryCard {...item} />
          </Box>
        ))}
      </Box>

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          minWidth: 0,
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
          <Stack
            direction={{ xs: "column", lg: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "stretch", lg: "center" }}
            spacing={2}
            mb={2.5}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h6" fontWeight={700}>
                Seluruh Data Business Trip
              </Typography>

              <Typography color="text.secondary" fontSize={13}>
                Menampilkan seluruh status pengajuan perjalanan dinas.
              </Typography>
            </Box>

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent={{ xs: "flex-start", lg: "flex-end" }}
              flexWrap="wrap"
              useFlexGap
              sx={{
                flex: "1 1 auto",
                minWidth: 0,
                "& .MuiButton-root": {
                  height: 40,
                  minWidth: 124,
                  px: 1.5,
                  whiteSpace: "nowrap",
                },
                "& .MuiFormControl-root": {
                  width: { xs: "100%", sm: 190 },
                  minWidth: { xs: "100%", sm: 190 },
                },
                "& .MuiInputBase-root": {
                  height: 40,
                },
                "& .MuiChip-root": {
                  height: 32,
                  flexShrink: 0,
                },
              }}
            >
              <Button
                variant="outlined"
                color="success"
                size="small"
                startIcon={<FileDownload />}
                onClick={handleExportExcel}
                disabled={loading || filteredTrips.length === 0}
              >
                Export Excel
              </Button>

              <Button
                variant="outlined"
                color="error"
                size="small"
                startIcon={<PictureAsPdf />}
                onClick={handleExportPDF}
                disabled={loading || filteredTrips.length === 0}
              >
                Export PDF
              </Button>

              <FormControl size="small">
                <InputLabel>Filter Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Filter Status"
                  onChange={(event) => setStatusFilter(event.target.value)}
                >
                  <MenuItem value="ALL">Semua Status</MenuItem>
                  {STATUS_OPTIONS.map((status) => (
                    <MenuItem key={status} value={status}>
                      {getStatusLabel(status)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <Chip
                label={`${filteredTrips.length} Data`}
                color="primary"
                variant="outlined"
              />

              <Button
                variant="outlined"
                color="primary"
                startIcon={<Refresh />}
                onClick={fetchData}
                disabled={loading}
              >
                Refresh
              </Button>
            </Stack>
          </Stack>

          <TableContainer component={Paper} elevation={0}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>No. Perjalanan</TableCell>
                  <TableCell>Nama Karyawan</TableCell>
                  <TableCell>Departemen</TableCell>
                  <TableCell>Tujuan</TableCell>
                  <TableCell>Keberangkatan</TableCell>
                  <TableCell>Kepulangan</TableCell>
                  <TableCell align="right">Estimasi</TableCell>
                  <TableCell align="right">Pencairan</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Pembayaran</TableCell>
                  <TableCell align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} align="center" sx={{ py: 5 }}>
                      <CircularProgress size={28} />
                      <Typography color="text.secondary" mt={1} fontSize={13}>
                        Memuat seluruh data Business Trip...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : filteredTrips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11}>
                      <Box textAlign="center" py={5}>
                        <EventAvailable
                          sx={{
                            fontSize: 42,
                            color: "text.disabled",
                            mb: 1,
                          }}
                        />

                        <Typography fontWeight={600}>
                          Tidak ada data Business Trip
                        </Typography>

                        <Typography
                          color="text.secondary"
                          fontSize={13}
                          mt={0.5}
                        >
                          Data dengan filter status ini belum tersedia.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTrips.map((trip) => (
                    <TableRow hover key={trip.id}>
                      <TableCell>
                        <Typography fontWeight={600} fontSize={13}>
                          {trip.trip_number || "-"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontWeight={600} fontSize={13}>
                          {trip.employee_name || "-"}
                        </Typography>

                        <Typography color="text.secondary" fontSize={12}>
                          {trip.employee_position || "-"}
                        </Typography>
                      </TableCell>

                      <TableCell>{trip.employee_department || "-"}</TableCell>

                      <TableCell>{trip.destination || "-"}</TableCell>

                      <TableCell>{formatDate(trip.departure_date)}</TableCell>

                      <TableCell>{formatDate(trip.return_date)}</TableCell>

                      <TableCell align="right">
                        {formatRupiah(trip.total_estimate)}
                      </TableCell>

                      <TableCell align="right">
                        {trip.disbursement_id
                          ? formatRupiah(trip.disbursement_amount)
                          : "-"}
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={getStatusLabel(trip.status)}
                          color={getStatusColor(trip.status)}
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        {trip.disbursement_id ? (
                          <Tooltip
                            title={
                              trip.payment_reference
                                ? `Referensi: ${trip.payment_reference}`
                                : "Tidak ada nomor referensi"
                            }
                          >
                            <Chip
                              label={
                                trip.payment_method === "BANK_TRANSFER"
                                  ? "Transfer"
                                  : trip.payment_method === "CASH"
                                    ? "Cash"
                                    : trip.disbursement_status || "Tercatat"
                              }
                              color="success"
                              size="small"
                              variant="outlined"
                            />
                          </Tooltip>
                        ) : (
                          <Chip
                            label="Belum Dicairkan"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="Lihat Detail">
                          <IconButton
                            size="small"
                            color="primary"
                            onClick={() => handleOpenDetail(trip)}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      <BusinessTripDetailDialog
        open={detailOpen}
        trip={selectedTrip}
        onClose={handleCloseDetail}
        onApprove={() => openApprovalDialog("APPROVE")}
        onReject={() => openApprovalDialog("REJECT")}
      />

      <Dialog
        open={approvalDialogOpen}
        onClose={() => {
          if (!approvalLoading) setApprovalDialogOpen(false);
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>
          {approvalAction === "APPROVE"
            ? "Konfirmasi Approval HR"
            : "Konfirmasi Penolakan HR"}
        </DialogTitle>
        <DialogContent>
          <Typography color="text.secondary" fontSize={14} mb={2}>
            {approvalAction === "APPROVE"
              ? `Setujui pengajuan ${selectedTrip?.trip_number || "Business Trip"}?`
              : `Tolak pengajuan ${selectedTrip?.trip_number || "Business Trip"}?`}
          </Typography>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label={
              approvalAction === "REJECT"
                ? "Alasan penolakan (wajib)"
                : "Catatan (opsional)"
            }
            value={approvalComments}
            onChange={(event) => setApprovalComments(event.target.value)}
            required={approvalAction === "REJECT"}
            placeholder={
              approvalAction === "REJECT"
                ? "Masukkan alasan penolakan..."
                : "Tambahkan catatan jika diperlukan..."
            }
            disabled={approvalLoading}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button
            onClick={() => setApprovalDialogOpen(false)}
            disabled={approvalLoading}
          >
            Batal
          </Button>
          <Button
            variant="contained"
            color={approvalAction === "REJECT" ? "error" : "success"}
            onClick={handleSubmitHRApproval}
            disabled={
              approvalLoading ||
              (approvalAction === "REJECT" && !approvalComments.trim())
            }
            startIcon={
              approvalLoading ? (
                <CircularProgress size={16} color="inherit" />
              ) : null
            }
          >
            {approvalLoading
              ? "Memproses..."
              : approvalAction === "APPROVE"
                ? "Ya, Approve"
                : "Ya, Reject"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
