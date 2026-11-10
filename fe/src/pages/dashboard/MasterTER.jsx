import { useEffect, useState } from "react";
import axios from "axios";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
  TablePagination,
  TableSortLabel,
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

const initialForm = {
  category: "A",
  min_income: "",
  max_income: "",
  rate: "",
  effective_start: "",
  effective_end: "",
};

const formatRupiah = (value) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
};

const formatDate = (value) => {
  if (!value) return "-";

  // PostgreSQL DATE biasanya dikembalikan sebagai ISO timestamp.
  // Ambil bagian tanggalnya agar tidak bergeser karena timezone.
  return String(value).slice(0, 10);
};

export default function MasterTER() {
  const currentYear = new Date().getFullYear();

  const [rates, setRates] = useState([]);
  const [category, setCategory] = useState("ALL");
  const [year, setYear] = useState(String(currentYear));

  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [sortBy, setSortBy] = useState("category");
  const [sortDirection, setSortDirection] = useState("asc");
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showNotification = (message, severity = "success") => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  const loadRates = async () => {
    try {
      setLoading(true);

      const params = {};

      if (category !== "ALL") {
        params.category = category;
      }

      if (year !== "ALL") {
        params.year = year;
      }

      const response = await api.get("/master-ter", { params });

      setRates(response.data?.data || []);
    } catch (error) {
      console.error("LOAD MASTER TER:", error);

      showNotification(
        error.response?.data?.message || "Gagal mengambil data Master TER.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRates();
  }, [category, year]);

  const openAddDialog = () => {
    setEditingId(null);

    setForm({
      ...initialForm,
      effective_start: `${currentYear}-01-01`,
    });

    setDialogOpen(true);
  };

  const openEditDialog = (item) => {
    setEditingId(item.id);

    setForm({
      category: item.category,
      min_income: item.min_income ?? "",
      max_income: item.max_income ?? "",
      rate: item.rate ?? "",
      effective_start: formatDate(item.effective_start),
      effective_end: item.effective_end ? formatDate(item.effective_end) : "",
    });

    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (saving) return;

    setDialogOpen(false);
    setEditingId(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async () => {
    if (
      !form.category ||
      form.min_income === "" ||
      form.rate === "" ||
      !form.effective_start
    ) {
      showNotification("Lengkapi seluruh data wajib.", "warning");
      return;
    }

    if (form.effective_end && form.effective_end < form.effective_start) {
      showNotification(
        "Tanggal akhir tidak boleh lebih awal dari tanggal mulai.",
        "warning",
      );
      return;
    }

    const payload = {
      ...form,
      min_income: Number(form.min_income),
      max_income: form.max_income === "" ? null : Number(form.max_income),
      rate: Number(form.rate),
      effective_end: form.effective_end || null,
    };

    try {
      setSaving(true);

      if (editingId) {
        await api.put(`/master-ter/${editingId}`, payload);
        showNotification("Tarif TER berhasil diperbarui.");
      } else {
        await api.post("/master-ter", payload);
        showNotification("Tarif TER berhasil ditambahkan.");
      }

      setDialogOpen(false);
      setEditingId(null);
      setForm(initialForm);

      await loadRates();
    } catch (error) {
      console.error("SAVE MASTER TER:", error);

      showNotification(
        error.response?.data?.message || "Gagal menyimpan tarif TER.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Yakin ingin menghapus tarif TER kategori ${item.category} dengan batas penghasilan ${formatRupiah(item.min_income)}?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(`/master-ter/${item.id}`);

      showNotification("Tarif TER berhasil dihapus.");

      await loadRates();
    } catch (error) {
      console.error("DELETE MASTER TER:", error);

      showNotification(
        error.response?.data?.message || "Gagal menghapus tarif TER.",
        "error",
      );
    }
  };

  const years = Array.from({ length: 7 }, (_, index) =>
    String(currentYear - 3 + index),
  );
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDirection("asc");
    }

    setPage(0);
  };

  const sortedRates = [...rates].sort((a, b) => {
    let valueA = a[sortBy];
    let valueB = b[sortBy];

    if (sortBy === "effective_start" || sortBy === "effective_end") {
      valueA = valueA ? String(valueA).slice(0, 10) : "";
      valueB = valueB ? String(valueB).slice(0, 10) : "";
    }

    if (sortBy === "category") {
      valueA = String(valueA || "");
      valueB = String(valueB || "");
    } else if (sortBy !== "effective_start" && sortBy !== "effective_end") {
      valueA = valueA == null ? Infinity : Number(valueA);
      valueB = valueB == null ? Infinity : Number(valueB);
    }

    let result;

    if (valueA < valueB) result = -1;
    else if (valueA > valueB) result = 1;
    else result = 0;

    return sortDirection === "asc" ? result : -result;
  });

  const paginatedRates = sortedRates.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage,
  );
  return (
    <Box>
      {/* HEADER */}
      {/* MASTER TER TOOLBAR */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1.5}
        mb={2}
        sx={{
          width: "100%",
          flexWrap: "wrap",
          rowGap: 1.5,
        }}
      >
        {/* FILTER CATEGORY */}
        <FormControl
          sx={{
            width: 155,
            height: 56,
            flexShrink: 0,
          }}
        >
          <InputLabel>Category</InputLabel>
          <Select
            value={category}
            label="Category"
            onChange={(event) => {
              setCategory(event.target.value);
              setPage(0);
            }}
            sx={{ height: 56 }}
          >
            <MenuItem value="ALL">All Categories</MenuItem>
            <MenuItem value="A">Category A</MenuItem>
            <MenuItem value="B">Category B</MenuItem>
            <MenuItem value="C">Category C</MenuItem>
          </Select>
        </FormControl>

        {/* FILTER YEAR */}
        <FormControl
          sx={{
            width: 135,
            height: 56,
            flexShrink: 0,
          }}
        >
          <InputLabel>Effective Year</InputLabel>
          <Select
            value={year}
            label="Effective Year"
            onChange={(event) => {
              setYear(event.target.value);
              setPage(0);
            }}
            sx={{ height: 56 }}
          >
            <MenuItem value="ALL">All Years</MenuItem>
            {years.map((item) => (
              <MenuItem value={item} key={item}>
                {item}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* TER SUMMARY CARDS */}
        {["A", "B", "C"].map((item) => (
          <Card
            key={item}
            variant="outlined"
            sx={{
              width: 100,
              height: 56,
              flexShrink: 0,
              borderRadius: 1,
              boxShadow: "none",
            }}
          >
            <CardContent
              sx={{
                p: "6px 12px !important",
                height: "100%",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontWeight: 700 }}
                lineHeight={1.2}
              >
                TER {item}
              </Typography>

              <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                {rates.filter((rate) => rate.category === item).length}
              </Typography>
            </CardContent>
          </Card>
        ))}

        {/* ACTION BUTTONS */}
        <Box
          sx={{
            display: "flex",
            gap: 1,
            ml: "auto !important",
            flexShrink: 0,
          }}
        >
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={loadRates}
            disabled={loading}
            sx={{ height: 56, px: 2 }}
          >
            Refresh
          </Button>

          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openAddDialog}
            sx={{ height: 56, px: 2 }}
          >
            Add TER Rate
          </Button>
        </Box>
      </Stack>

      {/* TABLE */}
      <TableContainer component={Paper} variant="outlined" sx={{ mt: 3 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell width={60}>No.</TableCell>

              {[
                { id: "category", label: "Category", align: "left" },
                { id: "min_income", label: "Min Income", align: "right" },
                { id: "max_income", label: "Max Income", align: "right" },
                { id: "rate", label: "TER Rate", align: "right" },
                {
                  id: "effective_start",
                  label: "Effective Start",
                  align: "left",
                },
                { id: "effective_end", label: "Effective End", align: "left" },
              ].map((column) => (
                <TableCell
                  key={column.id}
                  align={column.align}
                  sortDirection={sortBy === column.id ? sortDirection : false}
                >
                  <TableSortLabel
                    active={sortBy === column.id}
                    direction={sortBy === column.id ? sortDirection : "asc"}
                    onClick={() => handleSort(column.id)}
                  >
                    {column.label}
                  </TableSortLabel>
                </TableCell>
              ))}

              <TableCell align="center">Action</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <CircularProgress size={28} />
                </TableCell>
              </TableRow>
            ) : rates.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 5 }}>
                  <Typography color="text.secondary">
                    Belum ada data tarif TER.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              paginatedRates.map((item, index) => (
                <TableRow key={item.id} hover>
                  <TableCell>{page * rowsPerPage + index + 1}</TableCell>

                  <TableCell>
                    <Chip
                      label={`Category ${item.category}`}
                      size="small"
                      color={
                        item.category === "A"
                          ? "primary"
                          : item.category === "B"
                            ? "success"
                            : "warning"
                      }
                    />
                  </TableCell>

                  <TableCell align="right">
                    {formatRupiah(item.min_income)}
                  </TableCell>

                  <TableCell align="right">
                    {item.max_income == null
                      ? "Tidak terbatas"
                      : formatRupiah(item.max_income)}
                  </TableCell>

                  <TableCell align="right">
                    <Typography fontWeight={700}>
                      {Number(item.rate).toLocaleString("id-ID")}%
                    </Typography>
                  </TableCell>

                  <TableCell>{formatDate(item.effective_start)}</TableCell>

                  <TableCell>
                    {item.effective_end
                      ? formatDate(item.effective_end)
                      : "Berlaku"}
                  </TableCell>

                  <TableCell align="center">
                    <Stack
                      direction="row"
                      justifyContent="center"
                      spacing={0.5}
                    >
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => openEditDialog(item)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDelete(item)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          mt: 1,
        }}
      >
        <Typography variant="caption" color="text.secondary">
          Total tarif ditemukan: {sortedRates.length}
        </Typography>

        <TablePagination
          component="div"
          count={sortedRates.length}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          labelRowsPerPage="Rows per page:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} of ${count}`
          }
          sx={{
            "& .MuiTablePagination-toolbar": {
              minHeight: 40,
              paddingLeft: 0,
              paddingRight: 0,
            },
          }}
        />
      </Box>

      {/* ADD / EDIT DIALOG */}
      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>
          {editingId ? "Edit TER Rate" : "Add TER Rate"}
        </DialogTitle>

        <DialogContent dividers sx={{ pt: 3 }}>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>

              <Select
                name="category"
                value={form.category}
                label="Category"
                onChange={handleChange}
              >
                <MenuItem value="A">Category A</MenuItem>
                <MenuItem value="B">Category B</MenuItem>
                <MenuItem value="C">Category C</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              size="small"
              label="Minimum Income"
              name="min_income"
              type="number"
              value={form.min_income}
              onChange={handleChange}
              inputProps={{ min: 0 }}
              required
            />

            <TextField
              fullWidth
              size="small"
              label="Maximum Income"
              name="max_income"
              type="number"
              value={form.max_income}
              onChange={handleChange}
              inputProps={{ min: 0 }}
              helperText="Kosongkan jika tidak ada batas maksimum."
            />

            <TextField
              fullWidth
              size="small"
              label="TER Rate (%)"
              name="rate"
              type="number"
              value={form.rate}
              onChange={handleChange}
              inputProps={{ min: 0, max: 100, step: "0.001" }}
              helperText="Masukkan angka persentase, misalnya 0.25 untuk 0,25%."
              required
            />

            <Box>
              <Typography variant="body2" fontWeight={600} mb={1}>
                Effective Start *
              </Typography>

              <TextField
                fullWidth
                size="small"
                name="effective_start"
                type="date"
                value={form.effective_start}
                onChange={handleChange}
                required
              />
            </Box>

            <Box>
              <Typography variant="body2" fontWeight={600} mb={1}>
                Effective End
              </Typography>

              <TextField
                fullWidth
                size="small"
                name="effective_end"
                type="date"
                value={form.effective_end}
                onChange={handleChange}
              />

              <Typography variant="caption" color="text.secondary">
                Kosongkan jika tarif masih berlaku.
              </Typography>
            </Box>
          </Stack>
        </DialogContent>

        <DialogActions sx={{ p: 2 }}>
          <Button onClick={closeDialog} disabled={saving}>
            Cancel
          </Button>

          <Button variant="contained" onClick={handleSubmit} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* NOTIFICATION */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      >
        <Alert
          severity={notification.severity}
          variant="filled"
          onClose={() => setNotification((prev) => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
