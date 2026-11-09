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
  Alert,
} from "@mui/material";

import AttachFileRoundedIcon from "@mui/icons-material/AttachFileRounded";

const LeaveDialog = ({
  open,
  onClose,
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

  // Dynamic leave types
  leaveTypes = [],
  leaveTypeId,
  setLeaveTypeId,

  // Entitlement validation
  selectedLeaveDays = 0,
  maxLeaveDays = 0,
  isSpecialLeave = false,
  isLeaveExceeded = false,
}) => {
  const isOvertime = leaveType === "LEMBUR";
  const isPermission = leaveType === "IZIN";
  const isCuti = leaveType === "CUTI";

  const selectedType = leaveTypes.find(
    (item) => String(item.id) === String(leaveTypeId),
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        Pengajuan {isOvertime ? "Lembur" : "Cuti / Izin"}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          {/* Jenis Pengajuan */}
          <FormControl fullWidth>
            <InputLabel>Jenis Pengajuan</InputLabel>
            <Select
              value={leaveType}
              label="Jenis Pengajuan"
              onChange={(e) => setLeaveType(e.target.value)}
            >
              <MenuItem value="SAKIT">Sakit</MenuItem>
              <MenuItem value="IZIN">Izin</MenuItem>
              <MenuItem value="CUTI">Cuti</MenuItem>
              <MenuItem value="LEMBUR">Lembur</MenuItem>
            </Select>
          </FormControl>

          {/* Jenis Cuti dari Database */}
          {isCuti && (
            <FormControl fullWidth>
              <InputLabel>Jenis Cuti</InputLabel>
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

          {/* Informasi Jatah Cuti Khusus */}
          {isCuti && isSpecialLeave && selectedType && (
            <Alert severity={isLeaveExceeded ? "error" : "info"}>
              <Typography variant="body2">
                <strong>{selectedType.name}</strong>
              </Typography>

              <Typography variant="body2">
                Maksimal: {maxLeaveDays} hari kerja
              </Typography>

              <Typography variant="body2">
                Hari yang dipilih: {selectedLeaveDays} hari kerja
              </Typography>

              {isLeaveExceeded && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Jumlah hari yang dipilih melebihi batas maksimal sebanyak{" "}
                  {selectedLeaveDays - maxLeaveDays} hari kerja. Silakan ubah
                  rentang tanggal.
                </Typography>
              )}
            </Alert>
          )}

          {/* Tanggal */}
          <TextField
            fullWidth
            type="date"
            label="Tanggal Mulai"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />

          {!isPermission && (
            <TextField
              fullWidth
              type="date"
              label="Tanggal Selesai"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: startDate || undefined }}
            />
          )}

          {/* Jam untuk Izin */}
          {isPermission && (
            <>
              <TextField
                fullWidth
                type="time"
                label="Jam Mulai"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                fullWidth
                type="time"
                label="Jam Selesai"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </>
          )}

          {/* Alasan */}
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="Alasan / Keterangan"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />

          {/* Lampiran */}
          <Button
            component="label"
            variant="outlined"
            startIcon={<AttachFileRoundedIcon />}
          >
            {attachment ? attachment.name : "Upload Lampiran"}

            <input
              type="file"
              hidden
              onChange={(e) => setAttachment(e.target.files?.[0] || null)}
            />
          </Button>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Batal
        </Button>

        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={loading || (isCuti && isLeaveExceeded)}
        >
          {loading ? "Mengirim..." : "Ajukan"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LeaveDialog;
