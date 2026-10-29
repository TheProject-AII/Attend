import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Stack,
  Chip,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import { X, Save } from "lucide-react";

const initialForm = {
  task_number: "",
  title: "",
  description: "",
  frequency: "daily",
  minutes: "",
  hours: "",
};

const frequencyOptions = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "adhoc", label: "Ad-hoc" },
];

export default function JobDescriptionForm({
  open,
  onClose,
  onSubmit,
  employeeId,
  loading = false,
}) {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    setErrors((prev) => ({
      ...prev,
      [name]: "",
    }));

    setSubmitError("");
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.task_number.trim()) {
      nextErrors.task_number = "Nomor tugas wajib diisi";
    }

    if (!form.title.trim()) {
      nextErrors.title = "Nama tugas wajib diisi";
    }

    if (!form.description.trim()) {
      nextErrors.description = "Detail pekerjaan wajib diisi";
    }

    if (
      form.minutes !== "" &&
      (!Number.isInteger(Number(form.minutes)) || Number(form.minutes) < 0)
    ) {
      nextErrors.minutes = "Durasi harus berupa menit yang valid";
    }

    if (
      form.hours !== "" &&
      (!Number.isFinite(Number(form.hours)) || Number(form.hours) < 0)
    ) {
      nextErrors.hours = "Durasi jam tidak valid";
    }

    if (form.minutes === "" && form.hours === "") {
      nextErrors.minutes = "Isi estimasi menit atau jam";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (loading || !validate()) return;

    const payload = {
      task_number: form.task_number.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      frequency: form.frequency,
      minutes: form.minutes === "" ? null : Number(form.minutes),
      hours: form.hours === "" ? null : Number(form.hours),
    };

    try {
      setSubmitError("");
      await onSubmit(payload);
      setForm(initialForm);
      setErrors({});
    } catch (error) {
      setSubmitError(error.message || "Gagal menyimpan Job Description.");
    }
  };

  const handleClose = () => {
    if (loading) return;

    setForm(initialForm);
    setErrors({});
    setSubmitError("");
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
        >
          <Box>
            <Typography variant="h6" fontWeight={700}>
              Tambah Job Description
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Atur tanggung jawab dan frekuensi pekerjaan karyawan.
            </Typography>
          </Box>

          <Chip
            label={
              frequencyOptions.find((item) => item.value === form.frequency)
                ?.label
            }
            color="primary"
            variant="outlined"
          />
        </Stack>
      </DialogTitle>

      <Box component="form" onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                required
                name="task_number"
                label="Task Number"
                placeholder="Contoh: 1.a"
                value={form.task_number}
                onChange={handleChange}
                error={!!errors.task_number}
                helperText={errors.task_number}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <TextField
                fullWidth
                required
                name="title"
                label="Nama Tugas"
                placeholder="Contoh: Report Petty Cash Pool"
                value={form.title}
                onChange={handleChange}
                error={!!errors.title}
                helperText={errors.title}
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel id="job-frequency-label">Frekuensi</InputLabel>
                <Select
                  labelId="job-frequency-label"
                  name="frequency"
                  label="Frekuensi"
                  value={form.frequency}
                  onChange={handleChange}
                >
                  {frequencyOptions.map((item) => (
                    <MenuItem key={item.value} value={item.value}>
                      {item.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                minRows={3}
                name="description"
                label="Detail Pekerjaan"
                placeholder="Jelaskan proses dan hasil pekerjaan..."
                value={form.description}
                onChange={handleChange}
                error={!!errors.description}
                helperText={errors.description}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                name="minutes"
                label="Durasi (menit)"
                placeholder="Contoh: 15"
                value={form.minutes}
                onChange={handleChange}
                inputProps={{ min: 0, step: 1 }}
                error={!!errors.minutes}
                helperText={errors.minutes || "Opsional jika durasi jam diisi"}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                name="hours"
                label="Durasi (jam)"
                placeholder="Contoh: 0.25"
                value={form.hours}
                onChange={handleChange}
                inputProps={{ min: 0, step: 0.01 }}
                error={!!errors.hours}
                helperText={errors.hours || "Opsional jika durasi menit diisi"}
              />
            </Grid>

            {submitError && (
              <Grid item xs={12}>
                <Typography color="error" variant="body2">
                  {submitError}
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            color="inherit"
            startIcon={<X size={18} />}
          >
            Batal
          </Button>

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={<Save size={18} />}
          >
            {loading ? "Menyimpan..." : "Simpan Tugas"}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}
