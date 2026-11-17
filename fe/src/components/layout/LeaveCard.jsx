import { Card, CardContent, Typography, Chip, Stack, Box } from "@mui/material";

const leaveTypeLabel = {
  SAKIT: "Sick Leave",
  IZIN: "Permission",
  CUTI: "Leave",
  DINAS: "Business Travel",
  BUSINESS_TRIP: "Business Travel",
  CLIENT: "Client",
  MEETING: "Meeting",
  WFH: "WFH",
  LEMBUR: "Overtime",
};

const statusLabels = {
  DRAFT: "Draft",
  PENDING: "Pending",
  PENDING_SUPERVISOR: "Pending Supervisor",
  PENDING_MANAGER: "Pending Manager",
  PENDING_HR: "Pending HR",
  PENDING_DIRECTOR: "Pending Director",
  PENDING_FINANCE: "Pending Finance",
  APPROVED: "Approved",
  ON_TRIP: "On Trip",
  SETTLEMENT: "Settlement",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const getStatusColor = (status) => {
  if (["APPROVED", "COMPLETED"].includes(status)) return "success";
  if (["REJECTED", "CANCELLED"].includes(status)) return "error";
  if (status === "ON_TRIP") return "info";
  if (status === "SETTLEMENT") return "secondary";
  if (status === "DRAFT") return "default";

  return "warning";
};

const formatDate = (date) => {
  if (!date) return "-";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return "-";

  return parsedDate.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (time) => (time ? String(time).substring(0, 5) : "-");

const formatDuration = (minutes) => {
  if (minutes == null) return "-";

  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;

  if (!hours) return `${remaining} min`;
  if (!remaining) return `${hours} hr`;

  return `${hours} hr ${remaining} min`;
};

const formatCurrency = (value) =>
  `Rp ${Number(value || 0).toLocaleString("id-ID")}`;

export default function LeaveCard({ item = {}, onClick }) {
  const type = String(item.leave_type || item.request_type || "").toUpperCase();

  const isOvertime = type === "LEMBUR";
  const isBusinessTrip = ["BUSINESS_TRIP", "DINAS"].includes(type);

  const displayLeaveType =
    type === "CUTI"
      ? `Leave - ${item.leave_type_name || "Cuti"}`
      : leaveTypeLabel[type] || type || "Request";

  const status = String(item.status || "").toUpperCase();

  const departureDate = item.departure_date || item.start_date;
  const returnDate = item.return_date || item.end_date;

  const estimatedCost =
    item.total_estimate ??
    item.total_estimated ??
    item.total_amount ??
    item.total_cost ??
    0;

  return (
    <Card
      onClick={onClick}
      sx={{
        mb: 2,
        borderRadius: 1,
        cursor: "pointer",
        transition: ".2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: 3,
        },
      }}
    >
      <CardContent>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Typography
            sx={{
              flex: 1,
              fontWeight: 700,
              color: "primary.main",
              lineHeight: 1.4,
            }}
          >
            {displayLeaveType}
          </Typography>

          <Chip
            label={statusLabels[status] || status || "-"}
            size="small"
            color={getStatusColor(status)}
          />
        </Stack>

        {isOvertime ? (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2">
              <strong>Date:</strong>{" "}
              {formatDate(item.overtime_date || item.start_date)}
            </Typography>

            <Typography variant="body2">
              <strong>Time:</strong> {formatTime(item.start_time)} -{" "}
              {formatTime(item.end_time)}
            </Typography>

            <Typography variant="body2">
              <strong>Duration:</strong> {formatDuration(item.duration_minutes)}
            </Typography>

            <Typography variant="body2">
              <strong>Work:</strong> {item.reason || "-"}
            </Typography>
          </Box>
        ) : isBusinessTrip ? (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2">
              <strong>Trip Number:</strong> {item.trip_number || "-"}
            </Typography>

            <Typography variant="body2">
              <strong>Destination:</strong> {item.destination || "-"}
            </Typography>

            <Typography variant="body2">
              <strong>Period:</strong> {formatDate(departureDate)} -{" "}
              {formatDate(returnDate)}
            </Typography>

            <Typography variant="body2">
              <strong>Estimated Cost:</strong> {formatCurrency(estimatedCost)}
            </Typography>

            <Typography variant="body2">
              <strong>Purpose:</strong> {item.purpose || item.reason || "-"}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="body2">
              <strong>Date:</strong> {formatDate(item.start_date)} -{" "}
              {formatDate(item.end_date)}
            </Typography>

            <Typography variant="body2">
              <strong>Duration:</strong> {item.leave_days ?? "-"} days
            </Typography>

            <Typography variant="body2">
              <strong>Details:</strong> {item.reason || "-"}
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
