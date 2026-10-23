import {
    Card,
    CardContent,
    Grid,
    TextField,
    MenuItem,
    Button,
    Stack
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";

import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";

export default function DailyFilter({

    filters,

    setFilters,

    onSearch,

    departments

}) {
    return (

        <Card
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                mb: 3
            }}
        >

            <CardContent sx={{
                py: 2,
                "&:last-child": {
                    pb: 2
                }
            }}>

                <Grid container spacing={2} alignItems="center">

                    <Grid size={{ xs: 12, md: 2.5 }}>

                        <LocalizationProvider
                            dateAdapter={AdapterDayjs}
                        >
                            <DatePicker
                                label="Tanggal"
                                value={filters.date}
                                onChange={(value) =>
                                    setFilters((prev) => ({
                                        ...prev,
                                        date: value
                                    }))
                                }
                                format="DD/MM/YYYY"
                                slotProps={{
                                    textField: {
                                        fullWidth: true,
                                        size: "small"
                                    }
                                }}
                            />
                        </LocalizationProvider>
                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>

                        <TextField
                            fullWidth
                            size="small"
                            select
                            label="Divisi"
                            value={filters.department}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    department: e.target.value
                                }))
                            }
                        >

                            <MenuItem value="">
                                Semua Divisi
                            </MenuItem>

                            {departments.map((item) => (

                                <MenuItem
                                    key={item.department}
                                    value={item.department}
                                >
                                    {item.department}
                                </MenuItem>

                            ))}

                        </TextField>

                    </Grid>

                    <Grid size={{ xs: 12, md: 2 }}>

                        <TextField
                            fullWidth
                            size="small"
                            select
                            label="Status"
                            value={filters.status}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    status: e.target.value
                                }))
                            }
                        >

                            <MenuItem value="">
                                Semua Status
                            </MenuItem>

                            <MenuItem value="Hadir">
                                Hadir
                            </MenuItem>

                            <MenuItem value="Terlambat">
                                Terlambat
                            </MenuItem>

                            <MenuItem value="Belum Pulang">
                                Belum Pulang
                            </MenuItem>

                            <MenuItem value="Belum Check In">
                                Belum Check In
                            </MenuItem>

                        </TextField>

                    </Grid>

                    <Grid size={{ xs: 12, md: 3 }}>

                        <TextField
                            fullWidth
                            size="small"
                            label="Cari Karyawan"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters((prev) => ({
                                    ...prev,
                                    search: e.target.value
                                }))
                            }
                        />

                    </Grid>
                    <Grid
                        size={{ xs: 12, md: 2.5 }}
                        sx={{
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 1
                        }}
                    >


                        <Button
                            variant="outlined"
                            startIcon={<RefreshIcon />}
                            onClick={() => {

                                const reset = {

                                    date: dayjs(),

                                    department: "",

                                    status: "",

                                    search: ""

                                };

                                setFilters(reset);

                                onSearch(reset);

                            }}
                        >

                            Reset

                        </Button>
                        <Button
                            variant="contained"
                            startIcon={<SearchIcon />}
                            onClick={() => onSearch(filters)}
                        >
                            Cari
                        </Button>


                    </Grid>

                </Grid>


            </CardContent>

        </Card>

    );

}