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

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

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

  const handleViewAttachment = () => {
    if (!data.attachment_url) return;

    window.open(data.attachment_url, "_blank", "noopener,noreferrer");
  };

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
            title="Type"
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

          {data.leave_category && (
            <BoxItem
              title="Leave Category"
              value={
                {
                  TAHUNAN: "Annual Leave",
                  MENIKAH: "Marriage",
                  MELAHIRKAN: "Maternity Leave",
                  KELUARGA_MENINGGAL: "Bereavement Leave",
                }[data.leave_category] || data.leave_category
              }
            />
          )}

          <BoxItem
            title="Date"
            value={`${formatDate(data.start_date)} - ${formatDate(data.end_date)}`}
          />

          <BoxItem title="Duration" value={`${totalDays} days`} />

          <BoxItem title="Details" value={data.reason || "-"} />

          <Divider />

          <Stack spacing={1}>
            <Typography variant="caption" color="text.secondary">
              Attachment
            </Typography>

            {data.attachment ? (
              data.attachment_url ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AttachFileRoundedIcon />}
                  onClick={handleViewAttachment}
                  sx={{ alignSelf: "flex-start" }}
                >
                  View Attachment
                </Button>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Attachment URL unavailable
                </Typography>
              )
            ) : (
              <Typography fontWeight={600}>-</Typography>
            )}
          </Stack>

          <BoxItem title="HR Notes" value={data.approval_note || "-"} />
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
