import {
    Card,
    CardContent,
    Typography,
    Box, FormControl,
    Select,
    MenuItem,
    Skeleton
} from "@mui/material";

import {
    ResponsiveContainer,
    AreaChart,
    Area,
    CartesianGrid,
    Tooltip,
    XAxis,
    YAxis
} from "recharts";

export default function AttendanceChart({ data,
    period,
    onPeriodChange, loading }) {
    return (

        <Card
            elevation={0}
            sx={{
                borderRadius: 1,
                border: "1px solid #E5E7EB"
            }}
        >

            <CardContent>

                <Box
                    mb={3}
                    sx={{
                        width: "100%",
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                    }}
                >
                    {/* JUDUL */}
                    <Box>
                        <Typography
                            variant="h6"
                            fontWeight={700}
                        >
                            Kehadiran
                        </Typography>

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Jumlah karyawan yang melakukan absensi.
                        </Typography>
                    </Box>

                    {/* FILTER */}
                    <FormControl
                        size="small"
                        sx={{
                            minWidth: 130,
                            ml: "auto",
                        }}
                    >
                        <Select
                            value={period}
                            onChange={(e) =>
                                onPeriodChange(e.target.value)
                            }
                        >
                            <MenuItem value={7}>
                                7 Hari
                            </MenuItem>

                            <MenuItem value={14}>
                                14 Hari
                            </MenuItem>

                            <MenuItem value={30}>
                                30 Hari
                            </MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {loading ? (
                    <Box sx={{ height: 300 }}>
                        <Skeleton
                            variant="rectangular"
                            width="100%"
                            height="100%"
                            sx={{
                                borderRadius: 2
                            }}
                        />
                    </Box>
                ) : (

                    <ResponsiveContainer
                        width="100%"
                        height={300}
                    >

                        <AreaChart
                            data={data}
                            margin={{
                                top: 10,
                                right: 10,
                                left: -20,
                                bottom: 0
                            }}
                        >
                            <defs>
                                <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop
                                        offset="5%"
                                        stopColor="#16A34A"
                                        stopOpacity={0.35}
                                    />
                                    <stop
                                        offset="95%"
                                        stopColor="#16A34A"
                                        stopOpacity={0}
                                    />
                                </linearGradient>
                            </defs>
                            <CartesianGrid
                                strokeDasharray="3 3"
                                vertical={false}
                            />

                            <XAxis
                                dataKey="day"
                                tickLine={false}
                                axisLine={false}
                            />

                            <YAxis
                                tickLine={false}
                                axisLine={false}
                                allowDecimals={false}
                            />

                            <Tooltip
                                formatter={(value) => [`${value} Karyawan`, "Hadir"]}
                                labelFormatter={(label) => `Hari ${label}`}
                            />

                            <Area
                                type="monotone"
                                dataKey="total"
                                stroke="#16A34A"
                                strokeWidth={3}
                                fill="url(#attendanceGradient)"

                                dot={{
                                    r: 4,
                                    strokeWidth: 2,
                                    fill: "#16A34A",
                                    stroke: "#fff"
                                }}

                                activeDot={{
                                    r: 7
                                }}
                            />

                        </AreaChart>

                    </ResponsiveContainer>
                )}
            </CardContent>

        </Card>

    );

}