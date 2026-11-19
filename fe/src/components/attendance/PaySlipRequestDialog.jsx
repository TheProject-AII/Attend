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
  Alert,
} from "@mui/material";

export default function PaySlipRequestDialog({
  open,
  onClose,
  periods = [],
  selectedPeriod,
  setSelectedPeriod,
  reason,
  setReason,
  loading = false,
  error = "",
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      fullWidth
      maxWidth="sm"
    >
      <DialogTitle>Pay Slip Request</DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 1 }}>
          <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600 }}>
            Payroll Period
          </Typography>

          <FormControl fullWidth>
            <Select
              displayEmpty
              value={selectedPeriod || ""}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              disabled={loading}
            >
              <MenuItem value="" disabled>
                Select payroll period
              </MenuItem>

              {periods.map((period) => (
                <MenuItem key={period.id} value={String(period.id)}>
                  {period.period_name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ mt: 2 }}>
          <Typography sx={{ mb: 1, fontSize: 14, fontWeight: 600 }}>
            Reason (Optional)
          </Typography>

          <TextField
            fullWidth
            multiline
            rows={4}
            placeholder="Enter additional information..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>

        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={loading || !selectedPeriod}
        >
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
