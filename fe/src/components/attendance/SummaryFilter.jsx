import {
    Card,
    CardContent,
    Grid,
    TextField,
    MenuItem,
    Button
} from "@mui/material";

import SearchIcon from "@mui/icons-material/Search";
import RefreshIcon from "@mui/icons-material/Refresh";
import dayjs from "dayjs";

export default function SummaryFilter({

    filters,

    setFilters,

    departments = [],

    onSearch

}) {

    const currentYear = new Date().getFullYear();

    return (

        <Card
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid #E5E7EB",
                mb: 3
            }}
        >

            <CardContent>

                <Grid
                    container
                    spacing={2}
                    alignItems="center"
                >

                    {/* Bulan */}

                    <Grid size={{ xs: 12, md: 2 }}>

                        <TextField
                            fullWidth
                            select
                            size="small"
                            label="Bulan"
                            value={filters.month}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    month: e.target.value
                                }))
                            }
                        >

                            {[
                                "Januari",
                                "Februari",
                                "Maret",
                                "April",
                                "Mei",
                                "Juni",
                                "Juli",
                                "Agustus",
                                "September",
                                "Oktober",
                                "November",
                                "Desember"
                            ].map((item, index) => (

                                <MenuItem
                                    key={index}
                                    value={index + 1}
                                >
                                    {item}
                                </MenuItem>

                            ))}

                        </TextField>

                    </Grid>

                    {/* Tahun */}

                    <Grid size={{ xs: 12, md: 2 }}>

                        <TextField
                            fullWidth
                            select
                            size="small"
                            label="Tahun"
                            value={filters.year}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    year: e.target.value
                                }))
                            }
                        >

                            {[0, 1, 2, 3, 4].map((i) => (

                                <MenuItem
                                    key={i}
                                    value={currentYear - i}
                                >
                                    {currentYear - i}
                                </MenuItem>

                            ))}

                        </TextField>

                    </Grid>

                    {/* Divisi */}

                    <Grid size={{ xs: 12, md: 2 }}>

                        <TextField
                            fullWidth
                            select
                            size="small"
                            label="Divisi"
                            value={filters.department}
                            onChange={(e) =>
                                setFilters(prev => ({
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

                    {/* Nama */}

                    <Grid size={{ xs: 12, md: 3 }}>

                        <TextField
                            fullWidth
                            size="small"
                            label="Cari Karyawan"
                            value={filters.search}
                            onChange={(e) =>
                                setFilters(prev => ({
                                    ...prev,
                                    search: e.target.value
                                }))
                            }
                        />

                    </Grid>

                    {/* Button */}

                    <Grid
                        size={{ xs: 12, md: 3 }}
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

                                    month: dayjs().month() + 1,

                                    year: dayjs().year(),

                                    department: "",

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