import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  MenuItem,
  Avatar,
  CircularProgress,
  Divider,
  Snackbar,
  Alert,
  IconButton,
} from "@mui/material";

import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";

import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";

const formatDateForInput = (value) => {
  if (!value) return "";

  // Hindari pergeseran tanggal akibat timezone.
  const datePart = String(value).split("T")[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
    return datePart;
  }

  const date = new Date(value);

  if (isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [saving, setSaving] = useState(false);

  const [alert, setAlert] = useState({
    open: false,
    severity: "success",
    message: "",
  });

  const [form, setForm] = useState({
    name: "",
    personal_email: "",
    phone: "",
    address: "",
    place_of_birth: "",
    date_of_birth: "",
    gender: "",
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        personal_email: user.personal_email || "",
        phone: user.phone || "",
        address: user.address || "",
        place_of_birth: user.place_of_birth || "",
        date_of_birth: formatDateForInput(user.date_of_birth),
        gender: user.gender || "",
      });
    }
  }, [user]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCloseAlert = (_, reason) => {
    if (reason === "clickaway") return;

    setAlert((prev) => ({
      ...prev,
      open: false,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (saving) return;

    setSaving(true);

    try {
      const result = await authService.updateProfile(form);

      if (result?.user) {
        setUser((prev) => ({
          ...prev,
          ...result.user,
        }));
      }

      setAlert({
        open: true,
        severity: "success",
        message: "Profil berhasil diperbarui!",
      });

      setTimeout(() => {
        navigate("/profile");
      }, 1500);
    } catch (error) {
      console.error("UPDATE PROFILE ERROR:", error);

      setAlert({
        open: true,
        severity: "error",
        message:
          error.response?.data?.message ||
          "Gagal memperbarui profil. Silakan coba lagi.",
      });
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <Box p={3} textAlign="center">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box
      sx={{
        p: 2,
        pb: 4,
        minHeight: "100%",
        bgcolor: "background.default",
      }}
    >
      {/* NOTIFICATION */}
      <Snackbar
        open={alert.open}
        autoHideDuration={3000}
        onClose={handleCloseAlert}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "center",
        }}
        sx={{ mb: 2 }}
      >
        <Alert
          onClose={handleCloseAlert}
          severity={alert.severity}
          variant="filled"
          elevation={6}
          sx={{
            width: "100%",
            minWidth: { xs: "auto", sm: 350 },
            borderRadius: 2,
            fontWeight: 600,
            alignItems: "center",
          }}
        >
          {alert.message}
        </Alert>
      </Snackbar>

      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          px: 1.5,
          py: 1.5,
          mb: 2,
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 1,
        }}
      >
        <IconButton
          onClick={() => navigate(-1)}
          aria-label="Kembali"
          size="small"
          sx={{
            width: 38,
            height: 38,
            flexShrink: 0,
            bgcolor: "action.hover",
            color: "text.primary",
            "&:hover": {
              bgcolor: "action.selected",
            },
          }}
        >
          <ArrowBackRoundedIcon />
        </IconButton>

        <Box sx={{ minWidth: 0 }}>
          <Typography
            fontSize={16}
            fontWeight={700}
            color="text.primary"
            lineHeight={1.4}
          >
            Edit Profile
          </Typography>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              lineHeight: 1.4,
            }}
          >
            Update employee personal information.
          </Typography>
        </Box>
      </Box>

      {/* PROFILE CARD */}
      <Card
        sx={{
          borderRadius: 1,
          boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
        }}
      >
        <CardContent sx={{ p: 2 }}>
          {/* PROFILE INFORMATION */}
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              mb: 2,
            }}
          >
            <Avatar
              src={user.photo_url || ""}
              alt={user.name}
              sx={{
                width: 80,
                height: 80,
                fontSize: 28,
                mb: 1,
              }}
            >
              {user.name?.charAt(0)}
            </Avatar>

            <Typography
              component="div"
              sx={{
                width: "100%",
                textAlign: "center",
                fontSize: 16,
                fontWeight: 700,
              }}
            >
              {user.name}
            </Typography>

            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              Personal Information
            </Typography>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* EDIT FORM */}
          <Box component="form" onSubmit={handleSubmit}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                width: "100%",
              }}
            >
              <TextField
                fullWidth
                label="Nama Lengkap"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />

              <TextField
                fullWidth
                label="Email Pribadi"
                name="personal_email"
                type="email"
                value={form.personal_email}
                onChange={handleChange}
              />

              <TextField
                fullWidth
                label="Nomor HP"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
              />

              <TextField
                fullWidth
                label="Alamat"
                name="address"
                value={form.address}
                onChange={handleChange}
                multiline
                minRows={3}
              />

              <TextField
                fullWidth
                label="Tempat Lahir"
                name="place_of_birth"
                value={form.place_of_birth}
                onChange={handleChange}
              />

              <TextField
                fullWidth
                label="Tanggal Lahir"
                name="date_of_birth"
                type="date"
                value={form.date_of_birth}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
              />

              <TextField
                select
                fullWidth
                label="Jenis Kelamin"
                name="gender"
                value={form.gender}
                onChange={handleChange}
              >
                <MenuItem value="">Pilih Jenis Kelamin</MenuItem>
                <MenuItem value="Laki-laki">Laki-laki</MenuItem>
                <MenuItem value="Perempuan">Perempuan</MenuItem>
              </TextField>
            </Box>

            <Divider sx={{ mt: 3, mb: 3 }} />

            {/* EMPLOYEE INFORMATION */}
            <Typography fontWeight={700} fontSize={15} sx={{ mb: 2 }}>
              Informasi Kepegawaian
            </Typography>

            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <TextField
                fullWidth
                label="NIK"
                value={user.nik || ""}
                disabled
              />

              <TextField
                fullWidth
                label="NIP"
                value={user.nip || ""}
                disabled
              />

              <TextField
                fullWidth
                label="Department"
                value={user.department || ""}
                disabled
              />

              <TextField
                fullWidth
                label="Position / Job Level"
                value={user.position || ""}
                disabled
              />
            </Box>

            {/* SAVE BUTTON */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              startIcon={
                saving ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveRoundedIcon />
                )
              }
              disabled={saving}
              sx={{
                mt: 3,
                py: 1.3,
                borderRadius: 2,
                fontWeight: 700,
                textTransform: "none",
              }}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
