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
  InputLabel,
  Alert, // TAMBAHKAN
} from "@mui/material";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

export default function LeaveDialog({
  open,
  onClose,
  cutiType,
  setCutiType,
  leaveType,
  leaveTypes = [],
  leaveTypeId,
  setLeaveTypeId,
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
  selectedLeaveDays = 0,
  maxLeaveDays = 0,
  isSpecialLeave = false,
  isLeaveExceeded = false,
  submitError = "",
  setSubmitError,
}) {
  const isOvertime = leaveType === "LEMBUR";
  const isPermission = leaveType === "IZIN";
  const isCuti = leaveType === "CUTI";
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
                if (setSubmitError) setSubmitError("");
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
            </Select>
          </FormControl>
        </Box>

        {/* LEAVE TYPE */}
        {leaveType === "CUTI" && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Leave Type</InputLabel>

            <Select
              value={leaveTypeId || ""}
              label="Jenis Cuti"
              onChange={(e) => setLeaveTypeId(e.target.value)}
            >
              {leaveTypes.map((item) => (
                <MenuItem key={item.id} value={String(item.id)}>
                  {item.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {/* SUBMIT ERROR */}
        {submitError && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            onClose={() => setSubmitError?.("")}
          >
            {submitError}
          </Alert>
        )}
        {/* SPECIAL LEAVE VALIDATION */}
        {isCuti && isSpecialLeave && (
          <Alert severity={isLeaveExceeded ? "error" : "info"} sx={{ mt: 2 }}>
            <Typography variant="body2" fontWeight={700}>
              {
                leaveTypes.find(
                  (item) => String(item.id) === String(leaveTypeId),
                )?.name
              }
            </Typography>

            <Typography variant="body2">
              Maximum: {maxLeaveDays} working days
            </Typography>

            <Typography variant="body2">
              Selected: {selectedLeaveDays} working days
            </Typography>

            {isLeaveExceeded && (
              <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                Exceeds the maximum by {selectedLeaveDays - maxLeaveDays}{" "}
                working days. Please adjust your selected dates.
              </Typography>
            )}
          </Alert>
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
            {/* PERMISSION: SINGLE DATE */}
            {isPermission ? (
              <>
                <Box sx={{ mt: 2 }}>
                  <Typography sx={labelStyle}>Permission Date</Typography>

                  <TextField
                    fullWidth
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setEndDate(e.target.value);
                    }}
                    sx={inputStyle}
                  />
                </Box>

                {/* PERMISSION TIME */}
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
              </>
            ) : (
              <>
                {/* START DATE */}
                <Box sx={{ mt: 2 }}>
                  <Typography sx={labelStyle}>Start Date</Typography>

                  <TextField
                    fullWidth
                    type="date"
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
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    sx={inputStyle}
                  />
                </Box>
              </>
            )}

            {/* DETAILS */}
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Reason"
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
            (isCuti && isLeaveExceeded) ||
            !startDate ||
            !reason.trim() ||
            (isOvertime && (!startTime || !endTime)) ||
            (isPermission &&
              (!startTime || !endTime || endTime <= startTime)) ||
            (!isOvertime && !isPermission && !endDate)
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
