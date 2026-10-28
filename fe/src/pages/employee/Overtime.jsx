import { useState } from "react";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";

import dayjs from "dayjs";

import overtimeService from "../../services/overtimeService";

export default function Overtime() {
  const [form, setForm] = useState({
    overtime_date: dayjs().format("YYYY-MM-DD"),
    start_time: "17:00",
    end_time: "20:00",
    reason: "",
  });

  const [loading, setLoading] = useState(false);

  const [success, setSuccess] = useState("");

  const [error, setError] = useState("");

  const handleChange = (field) => (event) => {
    setForm((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setSuccess("");
    setError("");

    if (!form.overtime_date) {
      setError("Overtime date is required.");
      return;
    }

    if (!form.start_time) {
      setError("Start time is required.");
      return;
    }

    if (!form.end_time) {
      setError("End time is required.");
      return;
    }

    if (!form.reason.trim()) {
      setError("Overtime reason is required.");
      return;
    }

    if (form.end_time <= form.start_time) {
      setError("End time must be later than start time.");
      return;
    }

    try {
      setLoading(true);

      await overtimeService.create(form);

      setSuccess("Overtime request submitted successfully.");

      setForm((prev) => ({
        ...prev,
        reason: "",
      }));
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || "Failed to submit overtime request.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Card
        sx={{
          borderRadius: 3,
          maxWidth: 650,
          mx: "auto",
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              mb: 3,
            }}
          >
            <AccessTimeRoundedIcon
              sx={{
                color: "#16A34A",
                fontSize: 32,
              }}
            />

            <Box>
              <Typography variant="h6" fontWeight={700}>
                Overtime Request
              </Typography>

              <Typography variant="body2" color="text.secondary">
                Submit an overtime request
              </Typography>
            </Box>
          </Box>

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
          )}

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <TextField
                label="Overtime Date"
                type="date"
                fullWidth
                value={form.overtime_date}
                onChange={handleChange("overtime_date")}
                InputLabelProps={{
                  shrink: true,
                }}
                disabled={loading}
              />

              <Stack
                direction={{
                  xs: "column",
                  sm: "row",
                }}
                spacing={2}
              >
                <TextField
                  label="Start Time"
                  type="time"
                  fullWidth
                  value={form.start_time}
                  onChange={handleChange("start_time")}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  disabled={loading}
                />

                <TextField
                  label="End Time"
                  type="time"
                  fullWidth
                  value={form.end_time}
                  onChange={handleChange("end_time")}
                  InputLabelProps={{
                    shrink: true,
                  }}
                  disabled={loading}
                />
              </Stack>

              <TextField
                label="Work / Overtime Reason"
                placeholder="Example: Server maintenance"
                multiline
                minRows={4}
                fullWidth
                value={form.reason}
                onChange={handleChange("reason")}
                disabled={loading}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  height: 50,
                  borderRadius: 2.5,
                  bgcolor: "#16A34A",
                  fontWeight: 600,
                  textTransform: "none",
                  "&:hover": {
                    bgcolor: "#15803D",
                  },
                }}
              >
                {loading ? "Submitting..." : "Submit Overtime Request"}
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
