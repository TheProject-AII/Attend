import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
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

  const labelStyle = {
    mb: 1,
    fontSize: 14,
    fontWeight: 600,
  };

  const inputStyle = {
    "& .MuiInputBase-root": {
      minHeight: 48,
    },
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Request</DialogTitle>

      <DialogContent>
        {/* REQUEST TYPE */}
        <Box sx={{ mt: 1 }}>
          <Typography sx={labelStyle}>Request Type</Typography>

          <FormControl fullWidth>
            <Select
              value={leaveType}
              onChange={(e) => {
                const value = e.target.value;

                setLeaveType(value);
                setStartDate("");
                setEndDate("");
                setReason("");
                setAttachment(null);

                if (setStartTime) setStartTime("");
                if (setEndTime) setEndTime("");
                if (setCutiType) setCutiType("TAHUNAN");
              }}
            >
              <MenuItem value="SAKIT">Sick Leave</MenuItem>
              <MenuItem value="IZIN">Permission</MenuItem>
              <MenuItem value="CUTI">Leave</MenuItem>
              <MenuItem value="LEMBUR">Overtime</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* LEAVE TYPE - ONLY WHEN CUTI */}
        {leaveType === "CUTI" && (
          <Box sx={{ mt: 2 }}>
            <Typography sx={labelStyle}>Leave Type</Typography>

            <FormControl fullWidth>
              <Select
                value={cutiType}
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

        {/* OVERTIME FORM */}
        {isOvertime ? (
          <>
            <Box sx={{ mt: 2 }}>
              <Typography sx={labelStyle}>Overtime Date</Typography>

              <TextField
                fullWidth
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                sx={inputStyle}
              />
            </Box>

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
              <Box>
                <Typography sx={labelStyle}>Start Time</Typography>

                <TextField
                  fullWidth
                  type="time"
                  value={startTime || ""}
                  onChange={(e) => setStartTime(e.target.value)}
                  sx={inputStyle}
                />
              </Box>

              <Box>
                <Typography sx={labelStyle}>End Time</Typography>

                <TextField
                  fullWidth
                  type="time"
                  value={endTime || ""}
                  onChange={(e) => setEndTime(e.target.value)}
                  sx={inputStyle}
                />
              </Box>
            </Box>

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
          <>
            {/* START DATE */}
            <Box sx={{ mt: 2 }}>
              <Typography sx={labelStyle}>Start Date</Typography>

              <TextField
                fullWidth
                type="date"
                variant="outlined"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);

                  if (!endDate) {
                    setEndDate(e.target.value);
                  }
                }}
                sx={inputStyle}
              />
            </Box>

            {/* END DATE */}
            <Box sx={{ mt: 2 }}>
              <Typography sx={labelStyle}>End Date</Typography>

              <TextField
                fullWidth
                type="date"
                variant="outlined"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                sx={inputStyle}
              />
            </Box>

            {/* DETAILS */}
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

            {/* ATTACHMENT */}
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
                  sx={{ mt: 1 }}
                >
                  {attachment.name}
                </Typography>
              )}
            </Box>
          </>
        )}
      </DialogContent>

      {/* ACTIONS */}
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
