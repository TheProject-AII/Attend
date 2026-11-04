import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Grid,
  MenuItem,
  Avatar,
  CircularProgress,
  Divider,
} from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import authService from "../../services/authService";

export default function EditProfile() {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

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
        date_of_birth: user.date_of_birth
          ? String(user.date_of_birth).slice(0, 10)
          : "",
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    try {
      const result = await authService.updateProfile(form);

      if (result?.user) {
        setUser((prev) => ({
          ...prev,
          ...result.user,
        }));
      }

      setMessage("Profil berhasil diperbarui.");

      setTimeout(() => {
        navigate("/profile");
      }, 1000);
    } catch (error) {
      console.error("UPDATE PROFILE ERROR:", error);
      setMessage(
        error.response?.data?.message ||
          "Gagal memperbarui profil. Silakan coba lagi.",
      );
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
    <Box sx={{ p: 2, pb: 4 }}>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <Button
          onClick={() => navigate(-1)}
          startIcon={<ArrowBackRoundedIcon />}
          sx={{ minWidth: 0 }}
        >
          Kembali
        </Button>
      </Box>

      <Typography variant="h6" fontWeight={700} mb={0.5}>
        Edit Profile
      </Typography>

      <Typography variant="body2" color="text.secondary" mb={2}>
        Update employee personal information.
      </Typography>

      <Card sx={{ borderRadius: 2 }}>
        <CardContent sx={{ p: 2 }}>
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
                mx: "auto",
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
                fontWeight: "700 !important",
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
                size="medium"
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
                value={form.date_of_birth || ""}
                onChange={handleChange}
                InputLabelProps={{
                  shrink: true,
                }}
                sx={{
                  "& .MuiInputLabel-root": {
                    backgroundColor: "background.paper",
                    px: 0.5,
                  },
                  "& .MuiInputLabel-shrink": {
                    transform: "translate(14px, -9px) scale(0.75)",
                  },
                }}
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

            <Typography fontWeight={700} fontSize={15} sx={{ mb: 2.5 }}>
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

            {message && (
              <Typography
                color={message.includes("berhasil") ? "success.main" : "error"}
                variant="body2"
                mt={2}
              >
                {message}
              </Typography>
            )}

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
              sx={{ mt: 3, py: 1.2, borderRadius: 2 }}
            >
              {saving ? "Menyimpan..." : "Simpan Perubahan"}
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}
