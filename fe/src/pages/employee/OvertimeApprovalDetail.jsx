import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";

import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import overtimeService from "../../services/overtimeService";
import Swal from "sweetalert2";

export default function OvertimeApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [rejectNote, setRejectNote] = useState("");

  useEffect(() => {
    const loadDetail = async () => {
      try {
        setLoading(true);

        const response = await overtimeService.managerDetail(id);

        setData(response.data?.data || response.data);
      } catch (err) {
        console.error("OVERTIME DETAIL ERROR:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id]);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time) => {
    if (!time) return "-";

    return time.substring(0, 5);
  };

  const formatDuration = (minutes) => {
    if (minutes === undefined || minutes === null) {
      return "-";
    }

    const hours = Math.floor(minutes / 60);

    const remaining = minutes % 60;

    if (remaining === 0) {
      return `${hours} hr`;
    }

    return `${hours} hr ${remaining} min`;
  };

  if (loading) {
    return (
      <Box p={3}>
        <Typography>Loading details...</Typography>
      </Box>
    );
  }

  if (!data) {
    return (
      <Box p={3}>
        <Typography>Overtime request not found.</Typography>

        <Button sx={{ mt: 2 }} onClick={() => navigate("/employee/approval")}>
          Back
        </Button>
      </Box>
    );
  }

  const handleApprove = async () => {
    try {
      setProcessing(true);

      await overtimeService.approveByManager(id);

      // =====================================
      // SUCCESS ALERT
      // =====================================

      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Overtime request approved successfully.",
        confirmButtonText: "OK",
      });

      // =====================================
      // Return to the list after confirmation.
      // =====================================

      navigate("/employee/approval");
    } catch (err) {
      console.error("APPROVE OVERTIME ERROR:", err);

      Swal.fire({
        icon: "error",
        title: "Failed",
        text:
          err.response?.data?.message || "Failed to approve overtime request.",
        confirmButtonText: "OK",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!rejectNote.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Reason Required",
        text: "Enter a reason for rejection.",
        confirmButtonText: "OK",
      });

      return;
    }

    try {
      setProcessing(true);

      await overtimeService.rejectByManager(id, rejectNote.trim());

      // Close the dialog first.
      setRejectDialog(false);
      setRejectNote("");

      // Then show the confirmation alert.
      await Swal.fire({
        icon: "success",
        title: "Success",
        text: "Overtime request rejected successfully.",
        confirmButtonText: "OK",
        customClass: {
          container: "swal2-over-mui",
        },
      });

      // Return to the list.
      navigate("/employee/approval");
    } catch (err) {
      console.error("REJECT OVERTIME ERROR:", err);

      Swal.fire({
        icon: "error",
        title: "Failed",
        text:
          err.response?.data?.message || "Failed to reject overtime request.",
        confirmButtonText: "OK",
      });
    } finally {
      setProcessing(false);
    }
  };
  return (
    <Box
      sx={{
        p: 2,
        pb: 10,
      }}
    >
      <Typography variant="h5" fontWeight={700}>
        Overtime Request Details
      </Typography>

      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Employee overtime request details
      </Typography>

      <Card>
        <CardContent>
          <Stack spacing={2}>
            <Box>
              <Typography color="text.secondary" variant="body2">
                Employee Name
              </Typography>

              <Typography fontWeight={600}>{data.name || "-"}</Typography>
            </Box>

            <Box>
              <Typography color="text.secondary" variant="body2">
                Email
              </Typography>

              <Typography fontWeight={600}>{data.email || "-"}</Typography>
            </Box>

            <Box>
              <Typography color="text.secondary" variant="body2">
                Overtime Date
              </Typography>

              <Typography fontWeight={600}>
                {formatDate(data.overtime_date)}
              </Typography>
            </Box>

            <Box>
              <Typography color="text.secondary" variant="body2">
                Overtime Hours
              </Typography>

              <Typography fontWeight={600}>
                {formatTime(data.start_time)}
                {" - "}
                {formatTime(data.end_time)}
              </Typography>
            </Box>

            <Box>
              <Typography color="text.secondary" variant="body2">
                Duration
              </Typography>

              <Typography fontWeight={600}>
                {formatDuration(data.duration_minutes)}
              </Typography>
            </Box>

            <Box>
              <Typography color="text.secondary" variant="body2">
                Work / Reason
              </Typography>

              <Typography>{data.reason || "-"}</Typography>
            </Box>

            <Box>
              <Typography color="text.secondary" variant="body2">
                Status
              </Typography>

              <Chip
                label={
                  data.status === "PENDING_MANAGER" ? "Pending" : data.status
                }
                color="warning"
                size="small"
              />
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Dialog
        open={rejectDialog}
        onClose={() => {
          if (!processing) {
            setRejectDialog(false);
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Reject Overtime Request</DialogTitle>

        <DialogContent>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Enter a reason for rejecting this overtime request.
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            label="Rejection Reason"
            placeholder="Example: Overtime is not required..."
            value={rejectNote}
            onChange={(e) => setRejectNote(e.target.value)}
            disabled={processing}
          />
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setRejectDialog(false)} disabled={processing}>
            Cancel
          </Button>

          <Button
            variant="contained"
            color="error"
            onClick={handleReject}
            disabled={processing || !rejectNote.trim()}
          >
            {processing ? "Processing..." : "Reject Request"}
          </Button>
        </DialogActions>
      </Dialog>

      <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={() => navigate("/employee/approval")}
          disabled={processing}
        >
          Back
        </Button>

        {data.status === "PENDING_MANAGER" && (
          <>
            <Button
              fullWidth
              variant="outlined"
              color="error"
              onClick={() => {
                setRejectNote("");
                setRejectDialog(true);
              }}
              disabled={processing}
            >
              Reject
            </Button>

            <Button
              fullWidth
              variant="contained"
              color="success"
              onClick={handleApprove}
              disabled={processing}
            >
              {processing ? "Processing..." : "Approve"}
            </Button>
          </>
        )}
      </Stack>
    </Box>
  );
}
