import {
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  TextField,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";

const SummaryFilter = ({ filters, setFilters, departments = [], onSearch }) => {
  const currentYear = dayjs().year();

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  // Awalnya kedua mode aktif sampai user memilih salah satunya.
  const mode = filters.mode || null;
  const isMonthMode = mode === "month";
  const isRangeMode = mode === "range";

  const handleMonthChange = (value) => {
    setFilters((prev) => ({
      ...prev,
      month: value,
      year: currentYear,
      fromDate: "",
      toDate: "",
      mode: "month",
    }));
  };

  const handleDateChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      month: "",
      fromDate: field === "fromDate" ? value : prev.fromDate,
      toDate: field === "toDate" ? value : prev.toDate,
      mode: "range",
    }));
  };

  const handleSearch = () => {
    const selectedMode = mode || "month";

    if (selectedMode === "range" && (!filters.fromDate || !filters.toDate)) {
      alert("Lengkapi From Date dan To Date.");
      return;
    }

    if (selectedMode === "range" && filters.fromDate > filters.toDate) {
      alert("From Date tidak boleh melebihi To Date.");
      return;
    }

    onSearch({
      ...filters,
      mode: selectedMode,
      month: selectedMode === "month" ? filters.month : undefined,
      year: dayjs().year(),
    });
  };

  const handleReset = () => {
    const resetFilters = {
      month: "",
      year: currentYear,
      fromDate: "",
      toDate: "",
      department: "",
      search: "",
      mode: null,
    };

    setFilters(resetFilters);
    onSearch(resetFilters);
  };

  const inputSx = {
    "& .MuiInputBase-root": {
      height: 40,
      fontSize: 13,
      borderRadius: 1,
    },
    "& .MuiInputLabel-root": {
      fontSize: 13,
    },
  };

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        border: "1px solid #e0e0e0",
        borderRadius: 1,
        mb: 2,
      }}
    >
      <CardContent sx={{ p: "14px 16px !important" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            flexWrap: "wrap",
            width: "100%",
          }}
        >
          <TextField
            select
            size="small"
            label="Month"
            value={filters.month || ""}
            disabled={filters.mode === "range"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                month: Number(e.target.value),
                year: dayjs().year(),
                fromDate: "",
                toDate: "",
                mode: "month",
              }));
            }}
            sx={{ width: 155 }}
          >
            {months.map((month, index) => (
              <MenuItem key={month} value={index + 1}>
                {month}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            type="date"
            size="small"
            label="From Date"
            value={filters.fromDate || ""}
            disabled={filters.mode === "month"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                month: "",
                fromDate: e.target.value,
                mode: "range",
              }));
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                style: {
                  fontSize: "12px",
                  padding: "10px 8px",
                },
              },
            }}
            sx={{
              width: 200,
              minWidth: 200,
              "& .MuiInputBase-root": {
                height: 40,
                overflow: "hidden",
              },
              "& input[type=date]": {
                minWidth: 0,
                width: "100%",
              },
            }}
          />

          <TextField
            type="date"
            size="small"
            label="To Date"
            value={filters.toDate || ""}
            disabled={filters.mode === "month"}
            onChange={(e) => {
              setFilters((prev) => ({
                ...prev,
                month: "",
                toDate: e.target.value,
                mode: "range",
              }));
            }}
            slotProps={{
              inputLabel: { shrink: true },
              htmlInput: {
                style: {
                  fontSize: "12px",
                  padding: "10px 8px",
                },
              },
            }}
            sx={{
              width: 200,
              minWidth: 200,
              "& .MuiInputBase-root": {
                height: 40,
                overflow: "hidden",
              },
              "& input[type=date]": {
                minWidth: 0,
                width: "100%",
              },
            }}
          />

          {/* DEPARTMENT */}
          <TextField
            select
            size="small"
            label="Department"
            value={filters.department || ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                department: e.target.value,
              }))
            }
            sx={{
              ...inputSx,
              width: { xs: "100%", sm: 165 },
            }}
          >
            <MenuItem value="">All Departments</MenuItem>

            {departments.map((item) => (
              <MenuItem key={item.id} value={item.name}>
                {item.name}
              </MenuItem>
            ))}
          </TextField>

          {/* EMPLOYEE SEARCH */}
          <TextField
            size="small"
            label="Search Employees"
            placeholder="Employee name..."
            value={filters.search || ""}
            onChange={(e) =>
              setFilters((prev) => ({
                ...prev,
                search: e.target.value,
              }))
            }
            sx={{
              ...inputSx,
              width: { xs: "100%", sm: 175 },
            }}
          />

          {/* SEARCH */}
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            sx={{
              height: 40,
              minWidth: 105,
              textTransform: "none",
              borderRadius: 1,
              fontSize: 13,
            }}
          >
            Search
          </Button>

          {/* RESET */}
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            sx={{
              height: 40,
              minWidth: 95,
              textTransform: "none",
              borderRadius: 1,
              fontSize: 13,
            }}
          >
            Reset
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default SummaryFilter;
