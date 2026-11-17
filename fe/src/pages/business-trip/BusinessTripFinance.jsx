import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Stack,
} from "@mui/material";
import {
  AccountBalanceWallet,
  Payments,
  ReceiptLong,
  Refresh,
  Visibility,
} from "@mui/icons-material";
import api from "../../services/api";

const formatCurrency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const formatDate = (value) => {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const unwrap = (response) => {
  let data = response?.data;
  if (data?.data) data = data.data;
  return data || {};
};

function SummaryCard({ title, value, icon, color }) {
  return (
    <Card
      elevation={0}
      sx={{
        height: "100%",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography color="text.secondary" fontSize={12}>
              {title}
            </Typography>
            <Typography fontSize={25} fontWeight={700} mt={0.5}>
              {value ?? 0}
            </Typography>
          </Box>
          <Box
            sx={{
              width: 42,
              height: 42,
              borderRadius: 2,
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

export default function BusinessTripFinance() {
  const navigate = useNavigate();

  const [summary, setSummary] = useState({});
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [summaryResponse, queueResponse] = await Promise.all([
        api.get("/business-trips/dashboard/summary"),
        api.get("/business-trips/approvals/finance/queue"),
      ]);

      const summaryData = unwrap(summaryResponse);
      const queueData = unwrap(queueResponse);

      setSummary(summaryData);

      const queue = Array.isArray(queueData)
        ? queueData
        : Array.isArray(queueData.trips)
          ? queueData.trips
          : Array.isArray(queueData.data)
            ? queueData.data
            : Array.isArray(queueData.rows)
              ? queueData.rows
              : [];

      setTrips(queue);
    } catch (err) {
      console.error("Finance dashboard error:", err);
      setError(
        err.response?.data?.message ||
          "Gagal mengambil data dashboard Finance.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
        mb={2.5}
      >
        <Box>
          <Typography fontSize={22} fontWeight={700}>
            Business Trip Finance
          </Typography>
          <Typography color="text.secondary" fontSize={13}>
            Pengelolaan pencairan dana perjalanan dinas
          </Typography>
        </Box>

        <Button
          size="small"
          variant="outlined"
          startIcon={<Refresh />}
          onClick={loadData}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={1.5} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Menunggu Approval Finance"
            value={summary.pending_approvals}
            icon={<ReceiptLong />}
            color="warning"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Menunggu Pencairan"
            value={summary.pending_disbursements}
            icon={<Payments />}
            color="primary"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Menunggu Settlement"
            value={summary.pending_settlements}
            icon={<ReceiptLong />}
            color="info"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <SummaryCard
            title="Outstanding Karyawan"
            value={formatCurrency(summary.total_employee_outstanding)}
            icon={<AccountBalanceWallet />}
            color="success"
          />
        </Grid>
      </Grid>

      <Card
        elevation={0}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
        }}
      >
        <CardContent sx={{ p: 2 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Box>
              <Typography fontWeight={700} fontSize={16}>
                Antrean Pencairan Dana
              </Typography>
              <Typography color="text.secondary" fontSize={12}>
                Perjalanan dinas yang sudah masuk tahap Finance
              </Typography>
            </Box>
            <Chip
              label={`${trips.length} Data`}
              size="small"
              color="primary"
              variant="outlined"
            />
          </Stack>

          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: "action.hover" }}>
                  <TableCell>No. Perjalanan</TableCell>
                  <TableCell>Karyawan</TableCell>
                  <TableCell>Tujuan</TableCell>
                  <TableCell>Periode</TableCell>
                  <TableCell align="right">Estimasi Biaya</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Aksi</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {trips.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5 }}>
                      <Typography color="text.secondary" fontSize={13}>
                        Belum ada perjalanan dinas dalam antrean Finance.
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  trips.map((trip) => (
                    <TableRow key={trip.id} hover>
                      <TableCell>
                        <Typography fontWeight={600} fontSize={12}>
                          {trip.trip_number || `#${trip.id}`}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontSize={12} fontWeight={600}>
                          {trip.employee_name || trip.full_name || "-"}
                        </Typography>
                        <Typography fontSize={11} color="text.secondary">
                          {trip.employee_department || trip.department || "-"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontSize={12}>
                          {trip.destination || "-"}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Typography fontSize={11}>
                          {formatDate(trip.departure_date)}
                        </Typography>
                        <Typography fontSize={11} color="text.secondary">
                          s/d {formatDate(trip.return_date)}
                        </Typography>
                      </TableCell>

                      <TableCell align="right">
                        <Typography fontSize={12} fontWeight={600}>
                          {formatCurrency(
                            trip.total_estimate ??
                              trip.total_estimated_cost ??
                              trip.estimated_cost,
                          )}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={trip.status || "PENDING_FINANCE"}
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ fontSize: 10 }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <Button
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() =>
                            navigate(`/business-trip/finance/${trip.id}`)
                          }
                        >
                          Detail
                        </Button>
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
