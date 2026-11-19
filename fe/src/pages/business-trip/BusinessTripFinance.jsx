import { useEffect, useState, useCallback } from "react";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Divider,
  TextField,
  MenuItem,
  IconButton,
} from "@mui/material";

import {
  AccountBalanceWallet,
  Payments,
  ReceiptLong,
  Refresh,
  Visibility,
  PictureAsPdf,
  Close,
  AccountBalance,
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

function DetailItem({ label, value }) {
  return (
    <Box>
      <Typography fontSize={11} color="text.secondary" mb={0.4}>
        {label}
      </Typography>

      <Typography fontSize={13} fontWeight={600}>
        {value || "-"}
      </Typography>
    </Box>
  );
}

export default function BusinessTripFinance() {
  const [summary, setSummary] = useState({});
  const [trips, setTrips] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // DETAIL DIALOG
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState(null);

  // DISBURSEMENT
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // SPD
  const [previewingId, setPreviewingId] = useState(null);

  const loadData = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);

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
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // BUKA DETAIL DIALOG
  // ==========================================

  const handleOpenDetail = async (tripId) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setSelectedTrip(null);

    setPaymentMethod("BANK_TRANSFER");
    setPaymentReference("");
    setNotes("");

    try {
      const response = await api.get(`/business-trips/finance/${tripId}`);

      const data = unwrap(response);

      setSelectedTrip(data);
    } catch (err) {
      console.error("FINANCE DETAIL ERROR:", err);

      setDetailOpen(false);

      setError(
        err.response?.data?.message || "Gagal mengambil detail Business Trip.",
      );
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCloseDetail = () => {
    if (submitting) return;

    setDetailOpen(false);
    setSelectedTrip(null);
  };

  // ==========================================
  // PROSES PENCAIRAN
  // ==========================================

  const handleDisbursement = async () => {
    if (!selectedTrip?.id) return;

    if (paymentMethod === "BANK_TRANSFER" && !paymentReference.trim()) {
      setError("Nomor referensi transfer wajib diisi.");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      await api.post(`/business-trips/finance/${selectedTrip.id}/disburse`, {
        payment_method: paymentMethod,
        payment_reference: paymentReference.trim(),
        notes: notes.trim(),
      });

      setDetailOpen(false);
      setSelectedTrip(null);

      setPaymentReference("");
      setNotes("");

      await loadData(false);
    } catch (err) {
      console.error("FINANCE DISBURSEMENT ERROR:", err);

      setError(
        err.response?.data?.message || "Gagal memproses pencairan dana.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ==========================================
  // PREVIEW SPD
  // ==========================================

  const handlePreviewSPD = async (tripId) => {
    if (previewingId !== null) return;

    const previewWindow = window.open("about:blank", "_blank");

    if (!previewWindow) {
      setError(
        "Browser memblokir tab baru. Izinkan pop-up untuk membuka PDF SPD.",
      );
      return;
    }

    previewWindow.document.write(
      "<p style='font-family:Arial;padding:24px'>Sedang memuat PDF SPD...</p>",
    );

    setPreviewingId(tripId);
    setError("");

    try {
      const response = await api.get(`/business-trips/${tripId}/letter/pdf`, {
        responseType: "blob",
      });

      const contentType =
        response.headers?.["content-type"] || "application/pdf";

      if (!contentType.includes("application/pdf")) {
        const message = await response.data.text();
        throw new Error(message || "Server tidak mengembalikan PDF.");
      }

      const pdfBlob = new Blob([response.data], {
        type: "application/pdf",
      });

      const pdfUrl = URL.createObjectURL(pdfBlob);

      previewWindow.location.href = pdfUrl;

      setTimeout(
        () => {
          URL.revokeObjectURL(pdfUrl);
        },
        10 * 60 * 1000,
      );
    } catch (err) {
      console.error("FINANCE PREVIEW SPD ERROR:", err);

      previewWindow.close();

      let message =
        err.response?.data?.message || err.message || "Gagal membuka PDF SPD.";

      if (err.response?.data instanceof Blob) {
        try {
          const data = JSON.parse(await err.response.data.text());

          message = data.message || message;
        } catch {
          // Gunakan pesan error awal.
        }
      }

      setError(message);
    } finally {
      setPreviewingId(null);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" py={8}>
        <CircularProgress size={30} />
      </Box>
    );
  }

  const recipient = selectedTrip?.recipient || {};

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      {/* HEADER */}

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
          onClick={() => loadData()}
        >
          Refresh
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* SUMMARY */}

      <Grid container spacing={1.5} mb={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Menunggu Approval Finance"
            value={summary.pending_approvals}
            icon={<ReceiptLong />}
            color="warning"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Menunggu Pencairan"
            value={summary.pending_disbursements}
            icon={<Payments />}
            color="primary"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Menunggu Settlement"
            value={summary.pending_settlements}
            icon={<ReceiptLong />}
            color="info"
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <SummaryCard
            title="Outstanding Karyawan"
            value={formatCurrency(summary.total_employee_outstanding)}
            icon={<AccountBalanceWallet />}
            color="success"
          />
        </Grid>
      </Grid>

      {/* FINANCE QUEUE */}

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
                          {trip.employee_name || "-"}
                        </Typography>

                        <Typography fontSize={11} color="text.secondary">
                          {trip.employee_department || "-"}
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
                          {formatCurrency(trip.total_estimate)}
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
                        <Stack
                          direction={{ xs: "column", sm: "row" }}
                          spacing={0.5}
                          justifyContent="center"
                          alignItems="center"
                        >
                          <Button
                            size="small"
                            startIcon={<Visibility />}
                            onClick={() => handleOpenDetail(trip.id)}
                          >
                            Detail
                          </Button>

                          <Button
                            size="small"
                            color="error"
                            startIcon={
                              previewingId === trip.id ? (
                                <CircularProgress size={15} color="inherit" />
                              ) : (
                                <PictureAsPdf />
                              )
                            }
                            onClick={() => handlePreviewSPD(trip.id)}
                            disabled={previewingId !== null}
                          >
                            {previewingId === trip.id
                              ? "Memuat..."
                              : "Preview SPD"}
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* =====================================
          FINANCE DETAIL DIALOG
      ===================================== */}

      <Dialog
        open={detailOpen}
        onClose={handleCloseDetail}
        fullWidth
        maxWidth="md"
        PaperProps={{
          sx: {
            borderRadius: 2.5,
          },
        }}
      >
        <DialogTitle sx={{ pb: 1 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
          >
            <Box>
              <Typography fontSize={18} fontWeight={700}>
                Detail Pencairan Business Trip
              </Typography>

              <Typography fontSize={12} color="text.secondary">
                Informasi pengajuan dan proses pembayaran
              </Typography>
            </Box>

            <IconButton
              size="small"
              onClick={handleCloseDetail}
              disabled={submitting}
            >
              <Close />
            </IconButton>
          </Stack>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ py: 2.5 }}>
          {detailLoading ? (
            <Box display="flex" justifyContent="center" py={8}>
              <CircularProgress />
            </Box>
          ) : selectedTrip ? (
            <Stack spacing={2.5}>
              {/* IDENTITAS PERJALANAN */}

              <Box>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1.5}
                >
                  <Typography fontWeight={700} fontSize={14}>
                    Informasi Perjalanan
                  </Typography>

                  <Chip
                    label={selectedTrip.status || "PENDING_FINANCE"}
                    color="warning"
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Nomor Perjalanan"
                      value={selectedTrip.trip_number}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Tujuan"
                      value={selectedTrip.destination}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Tanggal Berangkat"
                      value={formatDate(selectedTrip.departure_date)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Tanggal Pulang"
                      value={formatDate(selectedTrip.return_date)}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Durasi"
                      value={`${selectedTrip.duration_days || 0} Hari`}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Keperluan"
                      value={selectedTrip.purpose}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* KARYAWAN */}

              <Box>
                <Typography fontWeight={700} fontSize={14} mb={1.5}>
                  Informasi Karyawan
                </Typography>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Nama Karyawan"
                      value={selectedTrip.employee_name}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem label="NIK" value={selectedTrip.employee_nik} />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Departemen"
                      value={selectedTrip.employee_department}
                    />
                  </Grid>

                  <Grid size={{ xs: 12, sm: 6 }}>
                    <DetailItem
                      label="Jabatan"
                      value={selectedTrip.employee_position}
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* RINCIAN ESTIMASI */}

              <Box>
                <Typography fontWeight={700} fontSize={14} mb={1.5}>
                  Rincian Estimasi Biaya
                </Typography>

                <Stack spacing={1.2}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontSize={13}>Transportasi</Typography>

                    <Typography fontSize={13} fontWeight={600}>
                      {formatCurrency(selectedTrip.transport_estimate)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontSize={13}>
                      Hotel ({selectedTrip.hotel_nights || 0} malam)
                    </Typography>

                    <Typography fontSize={13} fontWeight={600}>
                      {formatCurrency(selectedTrip.hotel_estimate)}
                    </Typography>
                  </Stack>

                  <Stack direction="row" justifyContent="space-between">
                    <Typography fontSize={13}>Food & Beverage</Typography>

                    <Typography fontSize={13} fontWeight={600}>
                      {formatCurrency(selectedTrip.fnb_estimate)}
                    </Typography>
                  </Stack>

                  <Divider />

                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    <Typography fontWeight={700}>Total Pencairan</Typography>

                    <Typography
                      fontSize={19}
                      fontWeight={800}
                      color="primary.main"
                    >
                      {formatCurrency(
                        selectedTrip.disbursement_amount ??
                          selectedTrip.total_estimate,
                      )}
                    </Typography>
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              {/* REKENING PENERIMA */}

              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                  <AccountBalance color="primary" />

                  <Typography fontWeight={700} fontSize={14}>
                    Rekening Penerima
                  </Typography>
                </Stack>

                <Box
                  sx={{
                    p: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                    bgcolor: "action.hover",
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailItem
                        label="Nama Penerima"
                        value={recipient.name || selectedTrip.employee_name}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailItem
                        label="Nama Bank"
                        value={recipient.bank_name || selectedTrip.bank_name}
                      />
                    </Grid>

                    <Grid size={{ xs: 12, sm: 6 }}>
                      <DetailItem
                        label="Nomor Rekening"
                        value={
                          recipient.bank_account_number ||
                          selectedTrip.bank_account_number
                        }
                      />
                    </Grid>
                  </Grid>
                </Box>
              </Box>

              <Divider />

              {/* FORM PENCAIRAN */}

              <Box>
                <Typography fontWeight={700} fontSize={14} mb={1.5}>
                  Proses Pencairan Dana
                </Typography>

                <Stack spacing={2}>
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label="Metode Pembayaran"
                    value={paymentMethod}
                    onChange={(e) => {
                      setPaymentMethod(e.target.value);
                      setPaymentReference("");
                    }}
                    disabled={submitting}
                  >
                    <MenuItem value="BANK_TRANSFER">Bank Transfer</MenuItem>

                    <MenuItem value="CASH">Cash</MenuItem>
                  </TextField>

                  {paymentMethod === "BANK_TRANSFER" && (
                    <TextField
                      fullWidth
                      size="small"
                      label="Nomor Referensi Transfer"
                      placeholder="Masukkan nomor referensi transfer"
                      value={paymentReference}
                      onChange={(e) => setPaymentReference(e.target.value)}
                      required
                      disabled={submitting}
                    />
                  )}

                  <TextField
                    fullWidth
                    size="small"
                    multiline
                    minRows={2}
                    label="Catatan Finance"
                    placeholder="Tambahkan catatan pencairan jika diperlukan..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    disabled={submitting}
                  />

                  <Alert severity="info">
                    Pencairan akan dilakukan sebesar{" "}
                    <strong>
                      {formatCurrency(
                        selectedTrip.disbursement_amount ??
                          selectedTrip.total_estimate,
                      )}
                    </strong>
                    . Setelah berhasil, status perjalanan berubah menjadi
                    ON_TRIP.
                  </Alert>
                </Stack>
              </Box>
            </Stack>
          ) : (
            <Alert severity="error">Data detail tidak tersedia.</Alert>
          )}
        </DialogContent>

        <Divider />

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            color="inherit"
            onClick={handleCloseDetail}
            disabled={submitting}
          >
            Tutup
          </Button>

          <Button
            variant="contained"
            color="primary"
            startIcon={
              submitting ? (
                <CircularProgress size={17} color="inherit" />
              ) : (
                <Payments />
              )
            }
            onClick={handleDisbursement}
            disabled={
              detailLoading ||
              !selectedTrip ||
              submitting ||
              (paymentMethod === "BANK_TRANSFER" && !paymentReference.trim())
            }
          >
            {submitting ? "Memproses..." : "Proses Pencairan"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
