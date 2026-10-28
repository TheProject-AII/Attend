import {
  Card,
  CardContent,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Chip,
  Avatar,
  Box,
  LinearProgress,
  IconButton,
  Skeleton,
} from "@mui/material";
import { useState } from "react";
import VisibilityIcon from "@mui/icons-material/Visibility";
import AttendanceDetailDialog from "./AttendanceDetailDialog";

export default function AttendanceSummaryTable({
  data = [],
  loading = false,
  month,
  year,
}) {
  const [selected, setSelected] = useState(null);

  const [open, setOpen] = useState(false);

  const handleDetail = (item) => {
    setOpen(false);

    setTimeout(() => {
      setSelected(item);

      setOpen(true);
    }, 100);
  };
  return (
    <Card
      elevation={0}
      sx={{
        mt: 2,
        borderRadius: 1,
        border: "1px solid #E5E7EB",
      }}
    >
      <CardContent>
        <Typography variant="h6" fontWeight={700} mb={2}>
          Attendance Summary
        </Typography>

        <Table>
          <TableHead>
            <TableRow>
              <TableCell>No.</TableCell>
              <TableCell>Employee</TableCell>

              <TableCell align="center">Present</TableCell>

              <TableCell align="center">Late</TableCell>
              <TableCell align="center">Late (min)</TableCell>

              <TableCell align="center">Leave</TableCell>

              <TableCell align="center">Permission</TableCell>
              <TableCell align="center">Sick Leave</TableCell>

              <TableCell align="center">Alpha</TableCell>

              <TableCell>Attendance</TableCell>

              <TableCell align="center">Detail</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              [...Array(6)].map((_, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Skeleton variant="circular" width={38} height={38} />

                      <Box>
                        <Skeleton width={100} />

                        <Skeleton width={60} />
                      </Box>
                    </Box>
                  </TableCell>

                  {[...Array(8)].map((_, i) => (
                    <TableCell key={i} align="center">
                      <Skeleton
                        width={40}
                        sx={{
                          mx: "auto",
                        }}
                      />
                    </TableCell>
                  ))}

                  <TableCell>
                    <Skeleton height={10} />

                    <Skeleton width={45} />
                  </TableCell>

                  <TableCell align="center">
                    <Skeleton
                      variant="circular"
                      width={35}
                      height={35}
                      sx={{
                        mx: "auto",
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} align="center">
                  No data available.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={item.id} hover>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                      }}
                    >
                      <Avatar
                        sx={{
                          width: 38,
                          height: 38,
                          fontSize: 16,
                          bgcolor: "#D1D5DB",
                          color: "#374151",
                        }}
                      >
                        {item.name.charAt(0)}
                      </Avatar>

                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                        }}
                      >
                        <Typography fontWeight={600} fontSize={14}>
                          {item.name}
                        </Typography>

                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{
                            bgcolor: "#F3F4F6",
                            px: 1,
                            py: 0.2,
                            borderRadius: 10,
                          }}
                        >
                          {item.department}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <Chip label={item.present} color="success" size="small" />
                  </TableCell>

                  <TableCell align="center">
                    <Chip label={item.late} color="warning" size="small" />
                  </TableCell>

                  <TableCell align="center">
                    <Chip
                      label={`${item.late_minutes} mnt`}
                      size="small"
                      variant="outlined"
                      color="warning"
                    />
                  </TableCell>
                  <TableCell align="center">{item.leave}</TableCell>

                  <TableCell align="center">{item.sick}</TableCell>

                  <TableCell align="center">{item.permission}</TableCell>

                  <TableCell align="center">
                    <Chip
                      label={`${item.alpha} days`}
                      color={item.alpha > 0 ? "error" : "success"}
                      size="small"
                    />
                  </TableCell>

                  <TableCell>
                    <LinearProgress
                      variant="determinate"
                      value={item.percent}
                      sx={{
                        height: 8,
                        borderRadius: 5,
                        mb: 0.5,
                      }}
                    />

                    <Typography variant="caption">{item.percent}%</Typography>
                  </TableCell>

                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => handleDetail(item)}
                    >
                      <VisibilityIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
      <AttendanceDetailDialog
        open={open}
        onClose={() => setOpen(false)}
        data={selected}
        month={month}
        year={year}
      />
    </Card>
  );
}
