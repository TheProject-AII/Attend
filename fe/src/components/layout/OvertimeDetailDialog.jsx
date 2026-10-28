import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  Divider,
  Stack,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

const getStatusLabel = (status) => {
  switch (status) {
    case "PENDING":
    case "PENDING_SUPERVISOR":
    case "PENDING_MANAGER":
      return "Pending";

    case "APPROVED":
      return "Approved";

    case "REJECTED":
      return "Rejected";

    case "CANCELLED":
      return "Cancelled";

    default:
      return status || "-";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "APPROVED":
      return "success";

    case "REJECTED":
      return "error";

    case "CANCELLED":
      return "default";

    default:
      return "warning";
  }
};

export default function OvertimeDetailDialog({ open, onClose, data }) {
  if (!data) {
    return null;
  }

  const formatDate = (date) => {
    if (!date) {
      return "-";
    }

    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) {
      return "-";
    }

    return time.substring(0, 5);
  };

  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null) {
      return "-";
    }

    const hours = Math.floor(minutes / 60);

    const remainingMinutes = minutes % 60;

    if (hours === 0) {
      return `${remainingMinutes} min`;
    }

    if (remainingMinutes === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remainingMinutes} min`;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <AccessTimeRoundedIcon color="primary" />

          <Typography fontWeight={700}>Overtime Request Details</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2.5}>
          {/* STATUS */}

          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              Status
            </Typography>

            <Chip
              label={getStatusLabel(data.status)}
              color={getStatusColor(data.status)}
              size="small"
            />
          </Box>

          <Divider />

          {/* DATE */}

          <Box>
            <Typography variant="body2" color="text.secondary">
              Overtime Date
            </Typography>

            <Typography fontWeight={600}>
              {formatDate(data.overtime_date)}
            </Typography>
          </Box>

          {/* TIME */}

          <Box>
            <Typography variant="body2" color="text.secondary">
              Overtime Hours
            </Typography>

            <Typography fontWeight={600}>
              {formatTime(data.start_time)}
              {" - "}
              {formatTime(data.end_time)}
            </Typography>
          </Box>

          {/* DURATION */}

          <Box>
            <Typography variant="body2" color="text.secondary">
              Duration
            </Typography>

            <Typography fontWeight={600}>
              {formatDuration(data.duration_minutes)}
            </Typography>
          </Box>

          {/* REASON */}

          <Box>
            <Typography variant="body2" color="text.secondary">
              Work / Reason
            </Typography>

            <Typography
              fontWeight={500}
              sx={{
                whiteSpace: "pre-wrap",
              }}
            >
              {data.reason || "-"}
            </Typography>
          </Box>

          {/* CATATAN SUPERVISOR */}

          {data.supervisor_note && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Catatan Supervisor
              </Typography>

              <Typography>{data.supervisor_note}</Typography>
            </Box>
          )}

          {/* CATATAN MANAGER */}

          {data.manager_note && (
            <Box>
              <Typography variant="body2" color="text.secondary">
                Catatan Manager
              </Typography>

              <Typography>{data.manager_note}</Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Tutup</Button>
      </DialogActions>
    </Dialog>
  );
}
