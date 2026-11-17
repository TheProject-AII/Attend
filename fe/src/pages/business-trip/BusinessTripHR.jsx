import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from "@mui/material";

import {
  Refresh,
  FlightTakeoff,
  PendingActions,
  Visibility,
  EventAvailable,
  PeopleAlt,
} from "@mui/icons-material";

import { useNavigate } from "react-router-dom";
import api from "../../services/api";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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

export default function BusinessTripHR() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({});
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    const [summaryResult, approvalResult] = await Promise.allSettled([
      api.get("/business-trips/dashboard/summary"),
      api.get("/business-trips/approvals/hr"),
    ]);

    if (summaryResult.status === "fulfilled") {
      setSummary(summaryResult.value.data?.data || {});
    } else {
      console.error(
        "HR BUSINESS TRIP SUMMARY ERROR:",
        summaryResult.reason?.response?.data || summaryResult.reason,
      );
    }

    if (approvalResult.status === "fulfilled") {
      const rows = approvalResult.value.data?.data || [];
      setTrips(rows);
    } else {
      console.error(
        "HR BUSINESS TRIP APPROVAL ERROR:",
        approvalResult.reason?.response?.data || approvalResult.reason,
      );

      setTrips([]);
      setError(
        approvalResult.reason?.response?.data?.message ||
          "Gagal mengambil daftar pengajuan Business Trip HR.",
      );
    }

    if (
      summaryResult.status === "rejected" &&
      approvalResult.status === "rejected"
    ) {
      setError("Gagal mengambil data dashboard Business Trip HR.");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const summaryCards = [
    {
      title: "Menunggu Approval HR",
      value: summary.pending_trip_approvals ?? trips.length,
      subtitle: "Pengajuan menunggu pemeriksaan HR",
      icon: <PendingActions />,
      color: "warning",
    },
    {
      title: "Total Pending HR",
      value: summary.total_pending_hr ?? 0,
      subtitle: "Perjalanan berstatus pending HR",
      icon: <FlightTakeoff />,
      color: "primary",
    },
    {
      title: "Pending Pembatalan",
      value: summary.pending_cancellations ?? 0,
      subtitle: "Permintaan pembatalan perjalanan",
      icon: <EventAvailable />,
      color: "info",
    },
    {
      title: "Pengajuan Masuk",
      value: trips.length,
      subtitle: "Data approval HR yang tampil",
      icon: <PeopleAlt />,
      color: "success",
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
            Monitoring dan persetujuan perjalanan dinas oleh HR.
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={fetchData}
          disabled={loading}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert
          severity="error"
          sx={{ mb: 3, borderRadius: 2 }}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={fetchData}
              disabled={loading}
            >
              Coba Lagi
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      <Grid container spacing={2} mb={3}>
        {summaryCards.map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.title}>
            <SummaryCard {...item} />
          </Grid>
        ))}
      </Grid>

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
            spacing={1}
            mb={2.5}
          >
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Pengajuan Menunggu Approval HR
              </Typography>

              <Typography color="text.secondary" fontSize={13}>
                Daftar perjalanan dinas yang sudah disetujui Manager.
              </Typography>
            </Box>

            <Chip
              label={`${trips.length} Pengajuan`}
              color="warning"
              variant="outlined"
            />
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
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} align="center" sx={{ py: 5 }}>
                      <CircularProgress size={28} />
                      <Typography color="text.secondary" mt={1} fontSize={13}>
                        Memuat data Business Trip...
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <Box textAlign="center" py={5}>
                        <EventAvailable
                          sx={{
                            fontSize: 42,
                            color: "text.disabled",
                            mb: 1,
                          }}
                        />

                        <Typography fontWeight={600}>
                          Belum ada pengajuan Business Trip
                        </Typography>

                        <Typography
                          color="text.secondary"
                          fontSize={13}
                          mt={0.5}
                        >
                          Pengajuan yang menunggu approval HR akan muncul di
                          sini.
                        </Typography>
                      </Box>
                    </TableCell>
                  </TableRow>
                ) : (
                  trips.map((trip) => (
                    <TableRow
                      hover
                      key={`${trip.id}-${trip.approval_id || ""}`}
                    >
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

                      <TableCell>
                        <Chip
                          label="Menunggu HR"
                          color="warning"
                          size="small"
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Tooltip title="Lihat Detail">
                          <IconButton
                            size="small"
                            onClick={() =>
                              navigate(`/business-trip/hr/${trip.id}`)
                            }
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
    </Box>
  );
}
