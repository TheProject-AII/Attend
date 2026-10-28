import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Stack,
  Button,
  Divider,
  TextField,
  CircularProgress,
  Alert,
} from "@mui/material";
import { useNavigate, useParams } from "react-router-dom";

import leaderService from "../../services/leaderService";

export default function AttendanceApprovalDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [note, setNote] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const result = await leaderService.getAttendanceEditDetail(id);

      setData(result.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const formatDate = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "-";

    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleApprove = async () => {
    try {
      setProcessing(true);

      await leaderService.approveAttendanceEdit(id, note);

      navigate("/employee/approval");
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!note.trim()) {
      alert("A rejection reason is required.");
      return;
    }

    try {
      setProcessing(true);

      await leaderService.rejectAttendanceEdit(id, note);

      navigate("/employee/approval");
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: "50vh",
          display: "grid",
          placeItems: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!data) {
    return <Alert severity="error">Request not found.</Alert>;
  }

  return (
    <Box
      sx={{
        p: 2,
        pb: 10,
      }}
    >
      <Typography variant="h5" fontWeight={700} mb={1}>
        Attendance Change Request
      </Typography>

      <Typography color="text.secondary" mb={3}>
        Review the employee's request to change attendance times.
      </Typography>

      {/* EMPLOYEE */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Employee Information
          </Typography>

          <Stack spacing={1}>
            <Typography>
              <strong>Name:</strong> {data.name}
            </Typography>

            <Typography>
              <strong>Email:</strong> {data.email}
            </Typography>

            <Typography>
              <strong>Department:</strong> {data.department || "-"}
            </Typography>

            <Typography>
              <strong>Date:</strong> {formatDate(data.attendance_date)}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* TIME CHANGES */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent>
          <Typography fontWeight={700} mb={2}>
            Attendance Time Changes
          </Typography>

          <Stack spacing={2}>
            <Box>
              <Typography color="text.secondary" fontSize={14}>
                Check-in Time
              </Typography>

              <Typography fontSize={20} fontWeight={700}>
                {formatTime(data.old_check_in)}
                {" → "}
                {formatTime(data.new_check_in)}
              </Typography>
            </Box>

            <Divider />

            <Box>
              <Typography color="text.secondary" fontSize={14}>
                Check-out Time
              </Typography>

              <Typography fontSize={20} fontWeight={700}>
                {formatTime(data.old_check_out)}
                {" → "}
                {formatTime(data.new_check_out)}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* REASON */}

      <Card
        elevation={0}
        sx={{
          border: "1px solid #E5E7EB",
          borderRadius: 2,
          mb: 2,
        }}
      >
        <CardContent>
          <Typography fontWeight={700} mb={1}>
            Reason for Change
          </Typography>

          <Typography color="text.secondary">{data.reason}</Typography>
        </CardContent>
      </Card>

      {/* SUPERVISOR NOTE */}

      {data.status === "PENDING" && (
        <Card
          elevation={0}
          sx={{
            border: "1px solid #E5E7EB",
            borderRadius: 2,
            mb: 2,
          }}
        >
          <CardContent>
            <Typography fontWeight={700} mb={1}>
              Supervisor Note
            </Typography>

            <TextField
              fullWidth
              multiline
              minRows={3}
              placeholder="Add a note..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </CardContent>
        </Card>
      )}

      {/* ACTIONS */}

      {data.status === "PENDING" && (
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            color="error"
            disabled={processing}
            onClick={handleReject}
          >
            {processing ? <CircularProgress size={20} /> : "Reject"}
          </Button>

          <Button
            variant="contained"
            color="success"
            disabled={processing}
            onClick={handleApprove}
          >
            {processing ? <CircularProgress size={20} /> : "Approve"}
          </Button>
        </Stack>
      )}
    </Box>
  );
}
