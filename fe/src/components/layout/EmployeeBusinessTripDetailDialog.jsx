import React from "react";
import {
  Alert,
  Box,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "long",
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

const statusConfig = {
  PENDING: { label: "Menunggu Persetujuan", color: "warning" },
  PENDING_MANAGER: { label: "Menunggu Manager", color: "warning" },
  PENDING_HR: { label: "Menunggu HR", color: "warning" },
  PENDING_DIRECTOR: { label: "Menunggu Director", color: "warning" },
  PENDING_FINANCE: { label: "Menunggu Finance", color: "warning" },
  ON_TRIP: { label: "Sedang Perjalanan", color: "info" },
  PENDING_SETTLEMENT: { label: "Menunggu Settlement", color: "secondary" },
  COMPLETED: { label: "Selesai", color: "success" },
  APPROVED: { label: "Disetujui", color: "success" },
  REJECTED: { label: "Ditolak", color: "error" },
  CANCELLED: { label: "Dibatalkan", color: "default" },
};

function DetailItem({ label, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography color="text.secondary" fontSize={12} mb={0.5}>
        {label}
      </Typography>
      <Typography
        fontSize={14}
        fontWeight={600}
        sx={{ overflowWrap: "anywhere" }}
      >
        {value === null || value === undefined || value === "" ? "-" : value}
      </Typography>
    </Box>
  );
}

export default function EmployeeBusinessTripDetailDialog({
  open,
  onClose,
  data,
}) {
  if (!data) return null;

  const status = String(data.status || "").toUpperCase();
  const statusInfo = statusConfig[status] || {
    label: status || "Status belum tersedia",
    color: "default",
  };

  const approvalHistory = Array.isArray(data.approval_history)
    ? data.approval_history
    : [];

  const duration =
    data.duration_days ??
    data.duration ??
    (data.start_date && data.end_date
      ? Math.max(
          1,
          Math.ceil(
            (new Date(data.end_date) - new Date(data.start_date)) /
              (1000 * 60 * 60 * 24),
          ) + 1,
        )
      : null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      scroll="paper"
      PaperProps={{ sx: { borderRadius: 3, mx: 1 } }}
    >
      <DialogTitle sx={{ pr: 6 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <FlightTakeoffRoundedIcon color="primary" />
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography fontWeight={800} variant="h6">
              Detail Business Trip
            </Typography>
            <Typography color="text.secondary" fontSize={12}>
              {data.trip_number ||
                data.request_number ||
                `Pengajuan #${data.id || "-"}`}
            </Typography>
          </Box>
          <IconButton
            aria-label="Tutup detail"
            onClick={onClose}
            sx={{ position: "absolute", right: 12, top: 12 }}
          >
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>

      <Divider />
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          flexWrap="wrap"
          gap={1}
          mb={3}
        >
          <Typography fontWeight={700}>Status Pengajuan</Typography>
          <Chip
            label={statusInfo.label}
            color={statusInfo.color}
            size="small"
          />
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <FlightTakeoffRoundedIcon color="primary" fontSize="small" />
          <Typography fontWeight={700}>Informasi Perjalanan</Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <DetailItem label="Tujuan" value={data.destination} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem label="Keperluan" value={data.purpose || data.reason} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Tanggal Berangkat"
              value={formatDate(data.departure_date || data.start_date)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Tanggal Kembali"
              value={formatDate(data.return_date || data.end_date)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Durasi"
              value={duration == null ? "-" : `${duration} hari`}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Diajukan Pada"
              value={formatDateTime(data.created_at || data.submitted_at)}
            />
          </Grid>
          {data.notes ? (
            <Grid item xs={12}>
              <DetailItem label="Catatan" value={data.notes} />
            </Grid>
          ) : null}
        </Grid>

        <Divider sx={{ my: 3 }} />
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <ReceiptLongRoundedIcon color="primary" fontSize="small" />
          <Typography fontWeight={700}>Estimasi Biaya</Typography>
        </Stack>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Transportasi"
              value={formatRupiah(data.transport_estimate)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Hotel"
              value={formatRupiah(data.hotel_estimate)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <DetailItem
              label="Food & Beverage"
              value={formatRupiah(data.fnb_estimate)}
            />
          </Grid>
          <Grid item xs={12}>
            <Box
              sx={{
                p: 2,
                borderRadius: 2,
                bgcolor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <Typography color="text.secondary" fontSize={12}>
                Total Estimasi
              </Typography>
              <Typography variant="h5" fontWeight={800} mt={0.5}>
                {formatRupiah(
                  data.total_estimate ??
                    Number(data.transport_estimate || 0) +
                      Number(data.hotel_estimate || 0) +
                      Number(data.fnb_estimate || 0),
                )}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {data.rejection_reason ? (
          <Alert severity="error" sx={{ mt: 3 }}>
            Alasan penolakan: {data.rejection_reason}
          </Alert>
        ) : null}

        <Divider sx={{ my: 3 }} />
        <Stack direction="row" spacing={1} alignItems="center" mb={2}>
          <HistoryRoundedIcon color="primary" fontSize="small" />
          <Typography fontWeight={700}>Riwayat Persetujuan</Typography>
        </Stack>
        {approvalHistory.length > 0 ? (
          <Stack spacing={1.5}>
            {approvalHistory.map((item, index) => {
              const itemStatus = String(item.status || "").toUpperCase();
              const itemInfo = statusConfig[itemStatus] || {
                label: item.status || "-",
                color: "default",
              };
              return (
                <Box
                  key={
                    item.id || `${item.approval_stage || "approval"}-${index}`
                  }
                  sx={{
                    p: 1.5,
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 2,
                  }}
                >
                  <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    flexWrap="wrap"
                    gap={1}
                  >
                    <Box>
                      <Typography fontWeight={700} fontSize={13}>
                        {item.approval_stage || item.stage || "Persetujuan"}
                      </Typography>
                      <Typography color="text.secondary" fontSize={12}>
                        {item.approver_name || item.approver_role || "-"}
                      </Typography>
                    </Box>
                    <Chip
                      size="small"
                      color={itemInfo.color}
                      label={itemInfo.label}
                    />
                  </Stack>
                  <Typography color="text.secondary" fontSize={11} mt={1}>
                    {formatDateTime(item.action_at || item.created_at)}
                  </Typography>
                  {item.comments ? (
                    <Typography fontSize={13} mt={1}>
                      Catatan: {item.comments}
                    </Typography>
                  ) : null}
                </Box>
              );
            })}
          </Stack>
        ) : (
          <Typography color="text.secondary" fontSize={13}>
            Riwayat persetujuan belum tersedia.
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}
