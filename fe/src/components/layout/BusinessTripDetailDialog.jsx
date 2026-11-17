import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Divider,
  Button,
  Stack,
  Grid,
} from "@mui/material";
import FlightTakeoffRoundedIcon from "@mui/icons-material/FlightTakeoffRounded";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";

const formatDate = (value) => {
  if (!value) return "-";

  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);

  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatCurrency = (value) => {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "-";

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const statusConfig = (status) => {
  const value = String(status || "").toUpperCase();

  if (["APPROVED", "COMPLETED"].includes(value)) {
    return {
      label: value === "COMPLETED" ? "Completed" : "Approved",
      color: "success",
    };
  }

  if (["REJECTED", "REJECT"].includes(value)) {
    return { label: "Rejected", color: "error" };
  }

  if (["CANCELLED"].includes(value)) {
    return { label: "Cancelled", color: "default" };
  }

  if (value === "ON_TRIP") {
    return { label: "On Trip", color: "info" };
  }

  if (value === "SETTLEMENT") {
    return { label: "Settlement", color: "warning" };
  }

  if (value === "DRAFT") {
    return { label: "Draft", color: "default" };
  }

  return { label: "Pending Approval", color: "warning" };
};

const DetailItem = ({ label, value }) => (
  <Box sx={{ minWidth: 0 }}>
    <Typography variant="caption" color="text.secondary">
      {label}
    </Typography>
    <Typography
      variant="body1"
      fontWeight={600}
      sx={{ overflowWrap: "anywhere" }}
    >
      {value || "-"}
    </Typography>
  </Box>
);

export default function BusinessTripDetailDialog({ open, onClose, data }) {
  if (!data) return null;

  const status = statusConfig(data.status);

  const departureDate = data.departure_date || data.start_date;

  const returnDate = data.return_date || data.end_date;

  const purpose = data.purpose || data.reason;

  const transportEstimate =
    data.transport_estimate ?? data.estimated_transport_cost;

  const hotelEstimate = data.hotel_estimate ?? data.estimated_hotel_cost;

  const fnbEstimate = data.fnb_estimate ?? data.estimated_fnb_cost;

  const totalEstimate =
    data.total_estimate ??
    data.total_estimated ??
    Number(transportEstimate || 0) +
      Number(hotelEstimate || 0) +
      Number(fnbEstimate || 0);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          borderRadius: 3,
          mx: 1.5,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <FlightTakeoffRoundedIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              Business Trip Detail
            </Typography>
          </Stack>

          <Chip label={status.label} color={status.color} size="small" />
        </Stack>

        {data.trip_number && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 0.5 }}
          >
            Request No. {data.trip_number}
          </Typography>
        )}
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={1}>
              <LocationOnOutlinedIcon color="primary" fontSize="small" />
              <Typography fontWeight={700}>Destination</Typography>
            </Stack>

            <Typography variant="h6" fontWeight={700}>
              {data.destination || "-"}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <CalendarMonthRoundedIcon color="primary" fontSize="small" />
              <Typography fontWeight={700}>Trip Schedule</Typography>
            </Stack>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <DetailItem
                  label="Departure Date"
                  value={formatDate(departureDate)}
                />
              </Grid>

              <Grid item xs={6}>
                <DetailItem
                  label="Return Date"
                  value={formatDate(returnDate)}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          <Box>
            <Typography fontWeight={700} mb={1}>
              Purpose of Travel
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {purpose || "-"}
            </Typography>
          </Box>

          <Divider />

          <Box>
            <Stack direction="row" spacing={1} alignItems="center" mb={1.5}>
              <PaymentsOutlinedIcon color="primary" fontSize="small" />
              <Typography fontWeight={700}>Estimated Budget</Typography>
            </Stack>

            <Stack spacing={1.5}>
              <DetailItem
                label="Transportation"
                value={formatCurrency(transportEstimate)}
              />

              <DetailItem label="Hotel" value={formatCurrency(hotelEstimate)} />

              <DetailItem
                label="Food & Beverage"
                value={formatCurrency(fnbEstimate)}
              />

              <Divider />

              <Box
                sx={{
                  p: 2,
                  bgcolor: "action.hover",
                  borderRadius: 2,
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  Total Estimated Budget
                </Typography>
                <Typography variant="h6" fontWeight={800} color="primary">
                  {formatCurrency(totalEstimate)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          {(data.rejection_reason || data.notes) && (
            <>
              <Divider />
              <Box>
                <Typography fontWeight={700} mb={0.5}>
                  Notes
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {data.rejection_reason || data.notes}
                </Typography>
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button
          variant="contained"
          onClick={onClose}
          fullWidth
          sx={{ borderRadius: 2 }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
