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
  Box,
} from "@mui/material";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

export default function LeaveDetailDialog({ open, onClose, data }) {
  if (!data) return null;

  const isPermission = data.leave_type === "IZIN";

  const formatDate = (date) => {
    if (!date) return "-";

    // Hindari pergeseran tanggal akibat timezone
    const dateOnly = String(date).slice(0, 10);
    const [year, month, day] = dateOnly.split("-");

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
    ).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "-";
    return String(time).slice(0, 5);
  };

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
                PENDING_SUPERVISOR: "Pending Leader Approval",
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
                IZIN_PULANG_AWAL: "Early Leave Permission",
              }[data.leave_type] || data.leave_type
            }
          />

          {(data.master_leave_category || data.leave_category) && (
            <BoxItem
              title="Leave Category"
              value={`${data.master_leave_category || data.leave_category} - ${
                data.leave_type_name || data.leave_type
              }`}
            />
          )}

          <BoxItem
            title={isPermission ? "Permission Date" : "Date"}
            value={
              isPermission
                ? formatDate(data.start_date)
                : `${formatDate(data.start_date)} - ${formatDate(data.end_date)}`
            }
          />

          {isPermission ? (
            <>
              <BoxItem title="Start Time" value={formatTime(data.start_time)} />

              <BoxItem title="End Time" value={formatTime(data.end_time)} />
            </>
          ) : (
            <BoxItem title="Duration" value={`${totalDays} days`} />
          )}

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
    <Box>
      <Typography variant="caption" color="text.secondary">
        {title}
      </Typography>

      <Typography fontWeight={600}>{value}</Typography>
    </Box>
  );
}
