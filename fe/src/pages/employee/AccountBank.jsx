import { useEffect, useState } from "react";
import { Alert, Box, Card, CardContent, CircularProgress, Divider, Stack, Typography } from "@mui/material";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import authService from "../../services/authService";

export default function AccountBank() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const result = await authService.getMe(localStorage.getItem("token"));
        setUser(result.user || null);
      } catch (err) {
        setError(err.response?.data?.message || "Gagal mengambil informasi rekening.");
      } finally { setLoading(false); }
    };
    load();
  }, []);

  return <Box sx={{ p: 2, maxWidth: 720, mx: "auto" }}>
    <Typography variant="h5" fontWeight={800} mb={0.5}>Account Bank</Typography>
    <Typography variant="body2" color="text.secondary" mb={2}>Informasi rekening bank yang terdaftar untuk pembayaran gaji.</Typography>
    {loading ? <Box display="flex" justifyContent="center" py={5}><CircularProgress /></Box> : error ? <Alert severity="error">{error}</Alert> : <Card sx={{ borderRadius: 3 }}>
      <CardContent>
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
          <AccountBalanceRoundedIcon color="primary" fontSize="large" />
          <Box><Typography fontWeight={700}>{user?.bank_name || "Bank belum diisi"}</Typography><Typography variant="body2" color="text.secondary">Rekening penerima gaji</Typography></Box>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="caption" color="text.secondary">Nama Bank</Typography>
        <Typography fontWeight={600} mb={2}>{user?.bank_name || "-"}</Typography>
        <Typography variant="caption" color="text.secondary">Nomor Rekening</Typography>
        <Typography fontWeight={600} sx={{ overflowWrap: "anywhere" }}>{user?.bank_account_number || "Belum terdaftar"}</Typography>
        <Alert severity="info" sx={{ mt: 2 }}>Untuk mengubah informasi rekening, silakan hubungi HR.</Alert>
      </CardContent>
    </Card>}
  </Box>;
}
