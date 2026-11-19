import {
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  Button,
} from "@mui/material";

import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "Hadir", label: "Present" },
  { value: "Terlambat", label: "Late" },
  { value: "Belum Pulang", label: "Not Checked Out" },
  { value: "Belum Check In", label: "Not Checked In" },
];

export default function DailyFilter({ filters, setFilters, departments = [] }) {
  const handleReset = () => {
    setFilters({
      date: dayjs(),
      department: "",
      status: "",
      search: "",
    });
  };

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 3,
        border: "1px solid #E5E7EB",
        mb: 3,
      }}
    >
      <CardContent
        sx={{
          py: 2,
          "&:last-child": { pb: 2 },
        }}
      >
        <Grid container spacing={2} alignItems="center">
          {/* DATE */}
          <Grid size={{ xs: 12, md: 2.5 }}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date"
                value={filters.date}
                onChange={(value) =>
                  setFilters((prev) => ({ ...prev, date: value }))
                }
                format="DD/MM/YYYY"
                slotProps={{
                  textField: { fullWidth: true, size: "small" },
                }}
              />
            </LocalizationProvider>
          </Grid>

          {/* DEPARTMENT */}
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              select
              label="Department"
              value={filters.department ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  department: e.target.value,
                }))
              }
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) =>
                  selected === "" ? "All Departments" : selected,
              }}
              InputLabelProps={{ shrink: true }}
            >
              <MenuItem value="">All Departments</MenuItem>
              {departments.map((item) => (
                <MenuItem key={item.id} value={item.name}>
                  {item.name}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* STATUS */}
          {/* STATUS */}
          <Grid size={{ xs: 12, md: 2 }}>
            <TextField
              fullWidth
              size="small"
              select
              label="Status"
              value={filters.status || "ALL"}
              onChange={(e) => {
                const value = e.target.value;

                setFilters((prev) => ({
                  ...prev,
                  status: value === "ALL" ? "" : value,
                }));
              }}
              SelectProps={{
                displayEmpty: true,
                renderValue: (selected) => {
                  if (selected === "ALL" || selected === "") {
                    return "All Status";
                  }

                  const labels = {
                    Hadir: "Present",
                    Terlambat: "Late",
                    "Belum Pulang": "Not Checked Out",
                    "Belum Check In": "Not Checked In",
                  };

                  return labels[selected] || selected;
                },
              }}
              InputLabelProps={{
                shrink: true,
              }}
            >
              <MenuItem value="ALL">All Status</MenuItem>
              <MenuItem value="Hadir">Present</MenuItem>
              <MenuItem value="Terlambat">Late</MenuItem>
              <MenuItem value="Belum Pulang">Not Checked Out</MenuItem>
              <MenuItem value="Belum Check In">Not Checked In</MenuItem>
            </TextField>
          </Grid>

          {/* SEARCH - auto filter with debounce in parent */}
          <Grid size={{ xs: 12, md: 3 }}>
            <TextField
              fullWidth
              size="small"
              label="Search Employees"
              value={filters.search ?? ""}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </Grid>

          {/* RESET */}
          <Grid
            size={{ xs: 12, md: 2.5 }}
            sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}
          >
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={handleReset}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}
