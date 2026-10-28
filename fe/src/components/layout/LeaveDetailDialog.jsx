import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Stack,
  Divider,
  Chip,
} from "@mui/material";

export default function LeaveDetailDialog({ open, onClose, data }) {
  if (!data) return null;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const totalDays = Math.max(
    1,
    Math.ceil(
      (new Date(data.end_date) - new Date(data.start_date)) / 86400000,
    ) + 1,
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Request Details</DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Chip
            label={
              {
                PENDING: "Pending",
                PENDING_SUPERVISOR: "Pending Supervisor Approval",
                PENDING_MANAGER: "Pending Manager Approval",
                APPROVED: "Approved",
                REJECTED: "Rejected",
                CANCELLED: "Cancelled",
              }[data.status] || data.status
            }
            color={
              data.status === "APPROVED"
                ? "success"
                : data.status === "REJECTED"
                  ? "error"
                  : "warning"
            }
            sx={{ width: "fit-content" }}
          />

          <Divider />

          <BoxItem
            title="🏥 Type"
            value={
              {
                SAKIT: "Sick Leave",
                IZIN: "Permission",
                CUTI: "Leave",
                LEMBUR: "Overtime",
                DINAS: "Business Travel",
                BUSINESS_TRIP: "Business Travel",
                CLIENT: "Client Visit",
              }[data.leave_type] || data.leave_type
            }
          />

          <BoxItem
            title="📅 Date"
            value={`${formatDate(data.start_date)} - ${formatDate(data.end_date)}`}
          />

          <BoxItem title="⏳ Duration" value={`${totalDays} days`} />

          <BoxItem title="📝 Details" value={data.reason || "-"} />

          <BoxItem
            title="📎 Attachment"
            value={data.attachment ? "Attached" : "-"}
          />

          <BoxItem title="💬 HR Notes" value={data.approval_note || "-"} />
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

function BoxItem({ title, value }) {
  return (
    <div>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>

      <Typography fontWeight={600}>{value}</Typography>
    </div>
  );
}
