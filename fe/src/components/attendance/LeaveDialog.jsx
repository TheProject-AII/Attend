import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Typography,
  Box,
} from "@mui/material";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

export default function LeaveDialog({
  open,
  onClose,
  cutiType,
  setCutiType,
  leaveType,
  setLeaveType,

  startDate,
  setStartDate,

  endDate,
  setEndDate,

  startTime,
  setStartTime,

  endTime,
  setEndTime,

  reason,
  setReason,

  attachment,
  setAttachment,

  loading,
  onSubmit,
}) {
  const isOvertime = leaveType === "LEMBUR";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Request</DialogTitle>

      <DialogContent>
        {/* ========================= */}
        {/* REQUEST TYPE */}
        {/* ========================= */}

        <FormControl
          fullWidth
          sx={{
            mt: 1,
          }}
        >
          <InputLabel>Request Type</InputLabel>

          <Select
            value={leaveType}
            label="Request Type"
            onChange={(e) => {
              const value = e.target.value;

              setLeaveType(value);

              // Reset fields when the request type changes.
              setStartDate("");
              setEndDate("");
              setReason("");
              setAttachment(null);

              if (setStartTime) {
                setStartTime("");
              }

              if (setEndTime) {
                setEndTime("");
              }

              if (setCutiType) {
                setCutiType("TAHUNAN");
              }
            }}
          >
            <MenuItem value="SAKIT">Sick Leave</MenuItem>

            <MenuItem value="IZIN">Permission</MenuItem>

            <MenuItem value="CUTI">Leave</MenuItem>

            <MenuItem value="LEMBUR">Overtime</MenuItem>
          </Select>
          {leaveType === "CUTI" && (
            <Box sx={{ mt: 2 }}>
              <FormControl fullWidth>
                <InputLabel>Leave Type</InputLabel>

                <Select
                  value={cutiType}
                  label="Leave Type"
                  onChange={(e) => setCutiType(e.target.value)}
                >
                  <MenuItem value="TAHUNAN">Annual Leave</MenuItem>

                  <MenuItem value="MENIKAH">Marriage</MenuItem>

                  <MenuItem value="MELAHIRKAN">Maternity Leave</MenuItem>

                  <MenuItem value="KELUARGA_MENINGGAL">
                    Bereavement Leave
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </FormControl>

        {/* ================================= */}
        {/* OVERTIME FORM */}
        {/* ================================= */}

        {isOvertime ? (
          <>
            {/* DATE */}

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                type="date"
                label="Overtime Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>

            {/* TIME */}

            <Box
              sx={{
                mt: 2,
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "1fr 1fr",
                },
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                type="time"
                label="Start Time"
                value={startTime || ""}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />

              <TextField
                fullWidth
                type="time"
                label="End Time"
                value={endTime || ""}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>

            {/* REASON */}

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Work / Overtime Reason"
                placeholder="Example: Server maintenance..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Box>
          </>
        ) : (
          /* ================================= */
          /* LEAVE / PERMISSION / SICK LEAVE FORM */
          /* ================================= */

          <>
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);

                  if (!endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Details"
                placeholder="Enter a reason for your request..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Box>

            <Box sx={{ mt: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                component="label"
                startIcon={<AttachFileRoundedIcon />}
                sx={{
                  height: 50,
                  borderStyle: "dashed",
                }}
              >
                Attach File
                <input
                  hidden
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => {
                    if (e.target.files.length > 0) {
                      setAttachment(e.target.files[0]);
                    }
                  }}
                />
              </Button>

              {attachment && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{
                    mt: 1,
                  }}
                >
                  {attachment.name}
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      {/* ========================= */}
      {/* ACTIONS */}
      {/* ========================= */}

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={
            loading ||
            !startDate ||
            !reason.trim() ||
            (isOvertime && (!startTime || !endTime)) ||
            (!isOvertime && !endDate)
          }
        >
          {loading
            ? "Submitting..."
            : isOvertime
              ? "Submit Overtime Request"
              : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
