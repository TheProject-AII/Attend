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
  Alert,
} from "@mui/material";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

const formatRupiah = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

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
  businessTrip = {
    destination: "",
    departureDate: "",
    returnDate: "",
    transportEstimate: "",
  },
  setBusinessTrip,
  businessTripContext,
}) {
  const isOvertime = leaveType === "LEMBUR";
  const isPermission = leaveType === "IZIN";
  const isCuti = leaveType === "CUTI";
  const isBusinessTrip = leaveType === "BUSINESS_TRIP";

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

  const updateBusinessTrip = (field, value) => {
    setBusinessTrip?.((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = (value) => {
    setLeaveType(value);

    setSubmitError?.("");
    setStartDate("");
    setEndDate("");
    setReason("");
    setAttachment(null);

    setStartTime?.("");
    setEndTime?.("");
    setCutiType?.("TAHUNAN");

    setBusinessTrip?.({
      destination: "",
      departureDate: "",
      returnDate: "",
      transportEstimate: "",
    });
  };

  const tripDeparture = businessTrip?.departureDate || "";
  const tripReturn = businessTrip?.returnDate || "";

  const tripDays =
    tripDeparture && tripReturn && tripReturn >= tripDeparture
      ? Math.round(
          (new Date(`${tripReturn}T00:00:00`) -
            new Date(`${tripDeparture}T00:00:00`)) /
            86400000,
        ) + 1
      : 0;

  const hotelNights = Math.max(0, tripDays - 1);

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Request</DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography sx={labelStyle}>Request Type</Typography>

          <FormControl fullWidth>
            <Select
              value={leaveType}
              onChange={(e) => resetForm(e.target.value)}
            >
              <MenuItem value="SAKIT">Sick Leave</MenuItem>
              <MenuItem value="IZIN">Permission</MenuItem>
              <MenuItem value="CUTI">Leave</MenuItem>
              <MenuItem value="LEMBUR">Overtime</MenuItem>
              <MenuItem value="BUSINESS_TRIP">Business Trip</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {submitError && (
          <Alert
            severity="error"
            sx={{ mt: 2 }}
            onClose={() => setSubmitError?.("")}
          >
            {submitError}
          </Alert>
        )}

        {isCuti && (
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Leave Type</InputLabel>

            <Select
              value={leaveTypeId || ""}
              label="Leave Type"
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
                working days.
              </Typography>
            )}
          </Alert>
        )}

        {isBusinessTrip ? (
          <>
            <Alert severity="info" sx={{ mt: 2 }}>
              Business Trip akan melalui approval atasan, HR, Director, dan
              Finance. Dana perjalanan dicairkan setelah seluruh approval
              selesai.
            </Alert>

            <Box sx={{ mt: 2 }}>
              <Typography sx={labelStyle}>Destination</Typography>
              <TextField
                fullWidth
                placeholder="Contoh: Bandung, Jawa Barat"
                value={businessTrip?.destination || ""}
                onChange={(e) =>
                  updateBusinessTrip("destination", e.target.value)
                }
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
                <Typography sx={labelStyle}>Departure Date</Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={tripDeparture}
                  onChange={(e) =>
                    updateBusinessTrip("departureDate", e.target.value)
                  }
                  sx={inputStyle}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>

              <Box>
                <Typography sx={labelStyle}>Return Date</Typography>
                <TextField
                  fullWidth
                  type="date"
                  value={tripReturn}
                  inputProps={{ min: tripDeparture || undefined }}
                  onChange={(e) =>
                    updateBusinessTrip("returnDate", e.target.value)
                  }
                  sx={inputStyle}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>

            <Box sx={{ mt: 2 }}>
              <Typography sx={labelStyle}>
                Estimated Transportation Cost (Rp)
              </Typography>
              <TextField
                fullWidth
                type="number"
                inputProps={{ min: 0 }}
                placeholder="Contoh: 500000"
                value={businessTrip?.transportEstimate ?? ""}
                onChange={(e) =>
                  updateBusinessTrip("transportEstimate", e.target.value)
                }
                sx={inputStyle}
              />
            </Box>

            {tripDays > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Duration: <b>{tripDays} days</b>
                </Typography>
                <Typography variant="body2">
                  Hotel nights: <b>{hotelNights} nights</b>
                </Typography>
                <Typography variant="body2">
                  Hotel rate limit:{" "}
                  <b>
                    {formatRupiah(businessTripContext?.hotel_rate)}
                    /night
                  </b>
                </Typography>
                <Typography variant="body2">
                  F&B allowance:{" "}
                  <b>
                    {formatRupiah(businessTripContext?.fnb_rate)}
                    /day
                  </b>
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Hotel and F&B estimates are calculated according to your
                  employee level and the approved trip duration.
                </Typography>
              </Alert>
            )}

            <Box sx={{ mt: 2 }}>
              <Typography sx={labelStyle}>Purpose of Business Trip</Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                placeholder="Explain the purpose and activities of this trip..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Box>
          </>
        ) : isOvertime ? (
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
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </Box>
          </>
        ) : (
          <>
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
                <Box sx={{ mt: 2 }}>
                  <Typography sx={labelStyle}>Start Date</Typography>
                  <TextField
                    fullWidth
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      if (!endDate) setEndDate(e.target.value);
                    }}
                    sx={inputStyle}
                  />
                </Box>

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
                    if (e.target.files?.length > 0) {
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
            (isBusinessTrip &&
              (!businessTrip?.destination?.trim() ||
                !tripDeparture ||
                !tripReturn ||
                tripReturn < tripDeparture ||
                businessTrip?.transportEstimate === "" ||
                !reason.trim())) ||
            (!isBusinessTrip &&
              (!startDate ||
                !reason.trim() ||
                (isOvertime && (!startTime || !endTime)) ||
                (isPermission &&
                  (!startTime || !endTime || endTime <= startTime)) ||
                (!isOvertime && !isPermission && !endDate)))
          }
        >
          {loading
            ? "Submitting..."
            : isBusinessTrip
              ? "Submit Business Trip"
              : isOvertime
                ? "Submit Overtime Request"
                : "Submit"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
