import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  Stack,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
} from "@mui/material";

import {
  Add,
  Refresh,
  FlightTakeoff,
  PendingActions,
  CheckCircle,
  AccountBalanceWallet,
  DirectionsCar,
  Visibility,
  EventAvailable,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const STATUS_OPTIONS = [
  { value: "", label: "Semua Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_MANAGER", label: "Menunggu Manager" },
  { value: "PENDING_HR", label: "Menunggu HR" },
  { value: "PENDING_DIRECTOR", label: "Menunggu Director" },
  { value: "PENDING_FINANCE", label: "Menunggu Finance" },
  { value: "APPROVED", label: "Disetujui" },
  { value: "ON_TRIP", label: "Sedang Perjalanan" },
  { value: "SETTLEMENT", label: "Settlement" },
  { value: "COMPLETED", label: "Selesai" },
  { value: "REJECTED", label: "Ditolak" },
  { value: "CANCELLED", label: "Dibatalkan" },
];

const STATUS_CONFIG = {
  DRAFT: { label: "Draft", color: "default" },
  PENDING_MANAGER: { label: "Menunggu Manager", color: "warning" },
  PENDING_HR: { label: "Menunggu HR", color: "warning" },
  PENDING_DIRECTOR: { label: "Menunggu Director", color: "warning" },
  PENDING_FINANCE: { label: "Menunggu Finance", color: "warning" },
  APPROVED: { label: "Disetujui", color: "success" },
  ON_TRIP: { label: "Sedang Perjalanan", color: "info" },
  SETTLEMENT: { label: "Menunggu Settlement", color: "secondary" },
  COMPLETED: { label: "Selesai", color: "success" },
  REJECTED: { label: "Ditolak", color: "error" },
  CANCELLED: { label: "Dibatalkan", color: "default" },
};

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(`${String(date).slice(0, 10)}T00:00:00`).toLocaleDateString(
    "id-ID",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

function SummaryCard({ title, value, subtitle, icon, color }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
      }}
    >
      <CardContent sx={{ p: 2.5 }}>
        <Stack direction="row" justifyContent="space-between" spacing={2}>
          <Box>
            <Typography color="text.secondary" fontSize={13}>
              {title}
            </Typography>

            <Typography variant="h4" fontWeight={700} mt={1}>
              {value}
            </Typography>

            <Typography color="text.secondary" fontSize={12} mt={1}>
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
            }}
          >
            {icon}
          </Box>
        </Stack>
      </CardContent>
    </Card>
  );
}

function getStatus(status) {
  return (
    STATUS_CONFIG[status] || {
      label: status || "-",
      color: "default",
    }
  );
}

export default function BusinessTripEmployee() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState(null);
  const [trips, setTrips] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    total_pages: 0,
  });

  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const dashboardResponse = await api.get(
        "/business-trips/dashboard/summary",
      );

      setSummary(dashboardResponse.data?.data || {});

      try {
        const historyResponse = await api.get("/business-trips/history/me", {
          params: {
            page: pagination.page,
            limit: pagination.limit,
            ...(statusFilter ? { status: statusFilter } : {}),
          },
        });

        setTrips(historyResponse.data?.data || []);

        setPagination((prev) => ({
          ...prev,
          ...(historyResponse.data?.pagination || {}),
        }));
      } catch (historyError) {
        console.error("BUSINESS TRIP HISTORY ERROR:", historyError);
        setTrips([]);
        setError(
          historyError.response?.data?.message ||
            "Gagal mengambil riwayat perjalanan.",
        );
      }
    } catch (err) {
      console.error("BUSINESS TRIP DASHBOARD ERROR:", err);
      setError(
        err.response?.data?.message ||
          "Gagal mengambil dashboard Business Trip.",
      );
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const tripSummary = summary?.trips || {};

  const summaryCards = [
    {
      title: "Total Perjalanan",
      value: tripSummary.total || 0,
      subtitle: "Seluruh pengajuan",
      icon: <FlightTakeoff />,
      color: "primary",
    },
    {
      title: "Menunggu Approval",
      value: tripSummary.pending || 0,
      subtitle: "Dalam proses persetujuan",
      icon: <PendingActions />,
      color: "warning",
    },
    {
      title: "Sedang Perjalanan",
      value: tripSummary.on_trip || 0,
      subtitle: "Perjalanan berlangsung",
      icon: <DirectionsCar />,
      color: "info",
    },
    {
      title: "Selesai",
      value: tripSummary.completed || 0,
      subtitle: "Perjalanan selesai",
      icon: <CheckCircle />,
      color: "success",
    },
  ];

  if (loading && !summary) {
    return (
      <Box
        minHeight="60vh"
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* HEADER */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={2}
        mb={3}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Business Trip
          </Typography>

          <Typography color="text.secondary" fontSize={14} mt={0.5}>
            Kelola pengajuan dan perjalanan dinas Anda.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={fetchDashboard}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate("/business-trip/create")}
          >
            Buat Pengajuan
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button color="inherit" size="small" onClick={fetchDashboard}>
              Coba Lagi
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {/* SUMMARY */}
      <Grid container spacing={2} mb={3}>
        {summaryCards.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.title}>
            <SummaryCard {...item} />
          </Grid>
        ))}
      </Grid>

      {/* OUTSTANDING BALANCE */}
      <Card
        elevation={0}
        sx={{
          mb: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "flex-start", sm: "center" }}
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  bgcolor: "success.light",
                  color: "success.main",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <AccountBalanceWallet />
              </Box>

              <Box>
                <Typography color="text.secondary" fontSize={13}>
                  Outstanding Balance
                </Typography>

                <Typography variant="h5" fontWeight={700}>
                  {formatRupiah(summary?.outstanding_balance)}
                </Typography>

                <Typography color="text.secondary" fontSize={12}>
                  Sisa dana perjalanan yang menjadi kewajiban Anda
                </Typography>
              </Box>
            </Stack>

            <Button
              variant="outlined"
              onClick={() => navigate("/business-trip/balance")}
            >
              Lihat Riwayat Saldo
            </Button>
          </Stack>
        </CardContent>
      </Card>

      {/* TRIP HISTORY */}
      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            justifyContent="space-between"
            alignItems={{ xs: "flex-start", sm: "center" }}
            spacing={2}
            mb={2.5}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Riwayat Perjalanan
              </Typography>

              <Typography color="text.secondary" fontSize={13}>
                Daftar pengajuan perjalanan dinas Anda.
              </Typography>
            </Box>

            <FormControl size="small" sx={{ minWidth: 210 }}>
              <Select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                {STATUS_OPTIONS.map((item) => (
                  <MenuItem key={item.value} value={item.value}>
                    {item.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          <TableContainer component={Paper} elevation={0}>
            <Table size="medium">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>No. Perjalanan</TableCell>
                  <TableCell>Tujuan</TableCell>
                  <TableCell>Keberangkatan</TableCell>
                  <TableCell>Kepulangan</TableCell>
                  <TableCell align="right">Estimasi</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7}>
                      <Box textAlign="center" py={5}>
                        <EventAvailable
                          sx={{
                            fontSize: 42,
                            color: "text.disabled",
                            mb: 1,
                          }}
                        />

                        <Typography fontWeight={600}>
                          Belum ada perjalanan dinas
                        </Typography>

                        <Typography
                          color="text.secondary"
                          fontSize={13}
                          mt={0.5}
                        >
                          Pengajuan perjalanan Anda akan muncul di sini.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  trips.map((trip) => {
                    const status = getStatus(trip.status);

                    return (
                      <TableRow hover key={trip.id}>
                        <TableCell>
                          <Typography fontWeight={600} fontSize={13}>
                            {trip.trip_number}
                          </Typography>
                        </TableCell>

                        <TableCell>
                          <Typography fontWeight={600} fontSize={13}>
                            {trip.destination}
                          </Typography>

                          <Typography color="text.secondary" fontSize={12}>
                            {trip.purpose}
                          </Typography>
                        </TableCell>

                        <TableCell>{formatDate(trip.departure_date)}</TableCell>

                        <TableCell>{formatDate(trip.return_date)}</TableCell>

                        <TableCell align="right">
                          {formatRupiah(trip.total_estimate)}
                        </TableCell>

                        <TableCell>
                          <Chip
                            label={status.label}
                            color={status.color}
                            size="small"
                          />
                        </TableCell>

                        <TableCell align="center">
                          <Tooltip title="Lihat Detail">
                            <IconButton
                              size="small"
                              onClick={() =>
                                navigate(`/business-trip/${trip.id}`)
                              }
                            >
                              <Visibility fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* PAGINATION */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            mt={2}
          >
            <Typography fontSize={12} color="text.secondary">
              Total {pagination.total} perjalanan
            </Typography>

            <Stack direction="row" spacing={1}>
              <Button
                size="small"
                variant="outlined"
                disabled={pagination.page <= 1 || loading}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page - 1,
                  }))
                }
              >
                Sebelumnya
              </Button>

              <Button
                size="small"
                variant="outlined"
                disabled={pagination.page >= pagination.total_pages || loading}
                onClick={() =>
                  setPagination((prev) => ({
                    ...prev,
                    page: prev.page + 1,
                  }))
                }
              >
                Berikutnya
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
}
