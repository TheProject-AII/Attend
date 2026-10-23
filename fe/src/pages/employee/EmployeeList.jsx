import { useEffect, useState } from "react";

import {
    Avatar,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Tooltip,
    IconButton,
    InputAdornment,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableHead, TableSortLabel,
    TableRow, Skeleton,
    TextField,
    Typography,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    InputLabel,
    MenuItem,
    Select, Pagination,
} from "@mui/material";
import * as XLSX from "xlsx";
import DownloadIcon from "@mui/icons-material/Download";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import EditIcon from "@mui/icons-material/Edit";
import VisibilityIcon from "@mui/icons-material/Visibility";
import EmployeeCreate from "./EmployeeCreate";
import attendanceService from "../../services/attService";
import EmployeeDetail from "./EmployeeDetail";
import BlockIcon from "@mui/icons-material/Block";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function EmployeeList() {

    const [search, setSearch] = useState("");
    // filter
    const [departmentFilter, setDepartmentFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [typeFilter, setTypeFilter] = useState("ALL");
    // 
    const [openCreate, setOpenCreate] = useState(false);
    const [order, setOrder] = useState("asc");
    const [orderBy, setOrderBy] = useState("name");
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [openDetail, setOpenDetail] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [openDeactivate, setOpenDeactivate] = useState(false);
    const [deactivateEmployee, setDeactivateEmployee] = useState(null);
    const [deactivating, setDeactivating] = useState(false);
    const [page, setPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(10);

    useEffect(() => {
        loadEmployees();
    }, []);

    useEffect(() => {
        setPage(1);
    }, [
        search,
        departmentFilter,
        statusFilter,
        typeFilter,
        rowsPerPage
    ]);

    const handleToggleStatus = async () => {
        if (!deactivateEmployee) {
            return;
        }

        const isActive = deactivateEmployee.status;

        try {
            setDeactivating(true);

            const result = isActive
                ? await attendanceService.deactivateEmployee(
                    deactivateEmployee.id
                )
                : await attendanceService.activateEmployee(
                    deactivateEmployee.id
                );

            if (!result.success) {
                throw new Error(
                    result.message ||
                    "Gagal mengubah status karyawan"
                );
            }

            setOpenDeactivate(false);
            setDeactivateEmployee(null);

            await loadEmployees();

        } catch (err) {

            console.error(
                "TOGGLE EMPLOYEE STATUS ERROR:",
                err
            );

            alert(
                err.response?.data?.message ||
                err.message ||
                "Gagal mengubah status karyawan"
            );

        } finally {
            setDeactivating(false);
        }
    };
    const loadEmployees = async () => {

        try {

            setLoading(true);

            const result =
                await attendanceService.getEmployees();


            setEmployees(result.data);

        } catch (err) {

            console.error("GET EMPLOYEES ERROR:", err);

        } finally {

            setLoading(false);

        }

    };

    const handleSort = (property) => {

        const isAsc =
            orderBy === property && order === "asc";

        setOrder(isAsc ? "desc" : "asc");
        setOrderBy(property);

    };

    const departments = [
        ...new Set(
            employees
                .map((item) => item.department)
                .filter(Boolean)
        )
    ].sort();

    const filteredEmployees = employees.filter((item) => {

        const keyword = search.toLowerCase();

        const matchSearch =
            item.name
                ?.toLowerCase()
                .includes(keyword) ||
            item.nik
                ?.toString()
                .toLowerCase()
                .includes(keyword) ||
            item.email
                ?.toLowerCase()
                .includes(keyword);

        const matchDepartment =
            departmentFilter === "ALL" ||
            item.department === departmentFilter;

        const matchStatus =
            statusFilter === "ALL" ||
            (statusFilter === "ACTIVE"
                ? item.status === true
                : item.status === false);

        const matchType =
            typeFilter === "ALL" ||
            item.employee_type === typeFilter;

        return (
            matchSearch &&
            matchDepartment &&
            matchStatus &&
            matchType
        );
    });

    const sortedEmployees = [...filteredEmployees].sort((a, b) => {

        const valueA = a[orderBy] ?? "";
        const valueB = b[orderBy] ?? "";

        return (
            valueA
                .toString()
                .localeCompare(
                    valueB.toString(),
                    "id",
                    {
                        numeric: true,
                        sensitivity: "base"
                    }
                )
            *
            (order === "asc" ? 1 : -1)
        );

    });

    const totalPages =
        Math.ceil(
            sortedEmployees.length /
            rowsPerPage
        );

    const startIndex =
        (page - 1) *
        rowsPerPage;

    const paginatedEmployees =
        sortedEmployees.slice(
            startIndex,
            startIndex + rowsPerPage
        );
    const handleExportExcel = () => {

        if (sortedEmployees.length === 0) {
            alert("Tidak ada data untuk diexport.");
            return;
        }

        const exportData = sortedEmployees.map(
            (item, index) => ({
                "No": index + 1,
                "Nama Karyawan": item.name || "-",
                "NIK": item.nik || "-",
                "Email": item.email || "-",
                "Departemen": item.department || "-",
                "Jabatan": item.position || "-",
                "Status": item.status
                    ? "Aktif"
                    : "Nonaktif",
                "Tipe Karyawan":
                    item.employee_type === "KONTRAK"
                        ? "Kontrak"
                        : "Tetap"
            })
        );

        const worksheet =
            XLSX.utils.json_to_sheet(exportData);

        const workbook =
            XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "Data Karyawan"
        );

        XLSX.writeFile(
            workbook,
            `Data_Karyawan_${new Date()
                .toISOString()
                .slice(0, 10)}.xlsx`
        );
    };

    return (
        <Box>

            {/* TABLE */}

            <Card
                elevation={0}
                sx={{
                    mt: 3,
                    border: "1px solid #E5E7EB",
                    borderRadius: 1,
                }}
            >

                <CardContent>

                    {/* SEARCH */}

                    <Stack
                        direction={{
                            xs: "column",
                            md: "row"
                        }}
                        spacing={1.5}
                        sx={{
                            mb: 2
                        }}
                    >

                        {/* SEARCH */}

                        <TextField
                            size="small"
                            placeholder="Cari nama, NIK, atau email..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                            sx={{
                                width: {
                                    xs: "100%",
                                    md: 320
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon fontSize="small" />
                                    </InputAdornment>
                                )
                            }}
                        />


                        {/* DEPARTEMEN */}

                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 180
                            }}
                        >
                            <InputLabel>
                                Departemen
                            </InputLabel>

                            <Select
                                value={departmentFilter}
                                label="Departemen"
                                onChange={(e) =>
                                    setDepartmentFilter(
                                        e.target.value
                                    )
                                }
                            >

                                <MenuItem value="ALL">
                                    Semua Departemen
                                </MenuItem>

                                {departments.map(
                                    (department) => (

                                        <MenuItem
                                            key={department}
                                            value={department}
                                        >
                                            {department}
                                        </MenuItem>

                                    )
                                )}

                            </Select>
                        </FormControl>


                        {/* STATUS */}

                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 140
                            }}
                        >
                            <InputLabel>
                                Status
                            </InputLabel>

                            <Select
                                value={statusFilter}
                                label="Status"
                                onChange={(e) =>
                                    setStatusFilter(
                                        e.target.value
                                    )
                                }
                            >

                                <MenuItem value="ALL">
                                    Semua Status
                                </MenuItem>

                                <MenuItem value="ACTIVE">
                                    Aktif
                                </MenuItem>

                                <MenuItem value="INACTIVE">
                                    Nonaktif
                                </MenuItem>

                            </Select>
                        </FormControl>


                        {/* TIPE KARYAWAN */}

                        <FormControl
                            size="small"
                            sx={{
                                minWidth: 140
                            }}
                        >
                            <InputLabel>
                                Tipe
                            </InputLabel>

                            <Select
                                value={typeFilter}
                                label="Tipe"
                                onChange={(e) =>
                                    setTypeFilter(
                                        e.target.value
                                    )
                                }
                            >

                                <MenuItem value="ALL">
                                    Semua Tipe
                                </MenuItem>

                                <MenuItem value="TETAP">
                                    Tetap
                                </MenuItem>

                                <MenuItem value="KONTRAK">
                                    Kontrak
                                </MenuItem>

                            </Select>
                        </FormControl>
                        <Button
                            variant="outlined"
                            startIcon={<DownloadIcon />}
                            onClick={handleExportExcel}
                            disabled={
                                loading ||
                                sortedEmployees.length === 0
                            }
                            sx={{
                                minWidth: 140,
                                textTransform: "none",
                                whiteSpace: "nowrap"
                            }}
                        >
                            Export Excel
                        </Button>
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => setOpenCreate(true)}
                            sx={{
                                minWidth: 140,
                                textTransform: "none",
                                fontWeight: 600,
                            }}
                        >
                            Tambah Karyawan
                        </Button>
                    </Stack>

                    <Box
                        sx={{
                            width: "100%",
                            overflowX: "auto"
                        }}
                    >

                        <Table>
                            <TableHead>

                                <TableRow>
                                    <TableCell
                                        align="center"
                                        sx={{ width: 60 }}
                                    >
                                        No.
                                    </TableCell>
                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === "name"}
                                            direction={orderBy === "name" ? order : "asc"}
                                            onClick={() => handleSort("name")}
                                            sx={{
                                                "& .MuiTableSortLabel-icon": {
                                                    opacity: 0.5,
                                                },
                                                "&.Mui-active .MuiTableSortLabel-icon": {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            Karyawan
                                        </TableSortLabel>
                                    </TableCell>


                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === "nik"}
                                            direction={orderBy === "nik" ? order : "asc"}
                                            onClick={() => handleSort("nik")}
                                            sx={{
                                                "& .MuiTableSortLabel-icon": {
                                                    opacity: 0.5,
                                                },
                                                "&.Mui-active .MuiTableSortLabel-icon": {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            NIK
                                        </TableSortLabel>
                                    </TableCell>


                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === "department"}
                                            direction={orderBy === "department" ? order : "asc"}
                                            onClick={() => handleSort("department")}
                                            sx={{
                                                "& .MuiTableSortLabel-icon": {
                                                    opacity: 0.5,
                                                },
                                                "&.Mui-active .MuiTableSortLabel-icon": {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            Departemen
                                        </TableSortLabel>
                                    </TableCell>


                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === "position"}
                                            direction={orderBy === "position" ? order : "asc"}
                                            onClick={() => handleSort("position")}
                                            sx={{
                                                "& .MuiTableSortLabel-icon": {
                                                    opacity: 0.5,
                                                },
                                                "&.Mui-active .MuiTableSortLabel-icon": {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            Jabatan
                                        </TableSortLabel>
                                    </TableCell>


                                    <TableCell>
                                        Status
                                    </TableCell>


                                    <TableCell>
                                        <TableSortLabel
                                            active={orderBy === "employee_type"}
                                            direction={
                                                orderBy === "employee_type"
                                                    ? order
                                                    : "asc"
                                            }
                                            onClick={() =>
                                                handleSort("employee_type")
                                            }
                                            sx={{
                                                "& .MuiTableSortLabel-icon": {
                                                    opacity: 0.5,
                                                },
                                                "&.Mui-active .MuiTableSortLabel-icon": {
                                                    opacity: 1,
                                                },
                                            }}
                                        >
                                            Tipe
                                        </TableSortLabel>
                                    </TableCell>


                                    <TableCell align="center">
                                        Aksi
                                    </TableCell>

                                </TableRow>

                            </TableHead>


                            <TableBody>

                                {/* ================= SKELETON ================= */}

                                {loading ? (

                                    Array.from({ length: 5 }).map((_, index) => (

                                        <TableRow key={`skeleton-${index}`}>

                                            {/* NO */}
                                            <TableCell align="center">
                                                <Skeleton
                                                    variant="text"
                                                    width={20}
                                                    sx={{ mx: "auto" }}
                                                />
                                            </TableCell>


                                            {/* KARYAWAN */}
                                            <TableCell>

                                                <Stack
                                                    direction="row"
                                                    spacing={1.5}
                                                    alignItems="center"
                                                >

                                                    <Skeleton
                                                        variant="circular"
                                                        width={38}
                                                        height={38}
                                                    />

                                                    <Box>

                                                        <Skeleton
                                                            variant="text"
                                                            width={120}
                                                            height={22}
                                                        />

                                                        <Skeleton
                                                            variant="text"
                                                            width={150}
                                                            height={18}
                                                        />

                                                    </Box>

                                                </Stack>

                                            </TableCell>


                                            {/* NIK */}
                                            <TableCell>

                                                <Skeleton
                                                    variant="text"
                                                    width={120}
                                                />

                                            </TableCell>


                                            {/* DEPARTMENT */}
                                            <TableCell>

                                                <Skeleton
                                                    variant="rounded"
                                                    width={90}
                                                    height={24}
                                                />

                                            </TableCell>


                                            {/* POSITION */}
                                            <TableCell>

                                                <Skeleton
                                                    variant="text"
                                                    width={90}
                                                />

                                            </TableCell>


                                            {/* STATUS */}
                                            <TableCell>

                                                <Skeleton
                                                    variant="rounded"
                                                    width={65}
                                                    height={24}
                                                />

                                            </TableCell>


                                            {/* TYPE */}
                                            <TableCell>

                                                <Skeleton
                                                    variant="rounded"
                                                    width={70}
                                                    height={24}
                                                />

                                            </TableCell>


                                            {/* ACTION */}
                                            <TableCell align="center">

                                                <Stack
                                                    direction="row"
                                                    spacing={0.5}
                                                    justifyContent="center"
                                                >

                                                    <Skeleton
                                                        variant="circular"
                                                        width={32}
                                                        height={32}
                                                    />

                                                    <Skeleton
                                                        variant="circular"
                                                        width={32}
                                                        height={32}
                                                    />

                                                </Stack>

                                            </TableCell>

                                        </TableRow>

                                    ))

                                ) : (

                                    /* ================= DATA ================= */

                                    paginatedEmployees.map((item, index) => (

                                        <TableRow
                                            key={item.id}
                                            hover
                                        >

                                            {/* NO */}
                                            <TableCell align="center">
                                                {startIndex + index + 1}
                                            </TableCell>


                                            {/* KARYAWAN */}
                                            <TableCell>

                                                <Stack
                                                    direction="row"
                                                    spacing={1.5}
                                                    alignItems="center"
                                                >

                                                    <Avatar
                                                        sx={{
                                                            width: 38,
                                                            height: 38,
                                                        }}
                                                    >
                                                        {item.name
                                                            .charAt(0)
                                                            .toUpperCase()}
                                                    </Avatar>


                                                    <Box>

                                                        <Typography
                                                            fontWeight={600}
                                                            fontSize={14}
                                                        >
                                                            {item.name}
                                                        </Typography>


                                                        <Typography
                                                            variant="caption"
                                                            color="text.secondary"
                                                        >
                                                            {item.email || "—"}
                                                        </Typography>

                                                    </Box>

                                                </Stack>

                                            </TableCell>


                                            {/* NIK */}
                                            <TableCell>
                                                {item.nik}
                                            </TableCell>


                                            {/* DEPARTMENT */}
                                            <TableCell>
                                                <Tooltip title={item.company_name || "-"} arrow>
                                                    <Chip
                                                        label={item.company_name || "-"}
                                                        size="small"
                                                        sx={{
                                                            maxWidth: 160,
                                                            "& .MuiChip-label": {
                                                                overflow: "hidden",
                                                                textOverflow: "ellipsis",
                                                                whiteSpace: "nowrap",
                                                                display: "block",
                                                            },
                                                        }}
                                                    />
                                                </Tooltip>
                                            </TableCell>


                                            {/* POSITION */}
                                            <TableCell>
                                                {item.position || "—"}
                                            </TableCell>


                                            {/* STATUS */}
                                            <TableCell>

                                                <Chip
                                                    label={
                                                        item.status
                                                            ? "Aktif"
                                                            : "Nonaktif"
                                                    }
                                                    color={
                                                        item.status
                                                            ? "success"
                                                            : "default"
                                                    }
                                                    size="small"
                                                />

                                            </TableCell>


                                            {/* TYPE */}
                                            <TableCell>

                                                <Chip
                                                    label={
                                                        item.employee_type ===
                                                            "KONTRAK"
                                                            ? "Kontrak"
                                                            : "Tetap"
                                                    }
                                                    size="small"
                                                    variant="outlined"
                                                />

                                            </TableCell>


                                            {/* ACTION */}
                                            <TableCell align="center">

                                                <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => {
                                                        setSelectedEmployee(item);
                                                        setOpenDetail(true);
                                                    }}
                                                >
                                                    <VisibilityIcon />
                                                </IconButton>


                                                <IconButton
                                                    size="small"
                                                    onClick={() => {
                                                        setSelectedEmployee(item);
                                                        setOpenEdit(true);
                                                    }}
                                                >
                                                    <EditIcon />
                                                </IconButton>
                                                <IconButton
                                                    size="small"
                                                    color={item.status ? "error" : "success"}
                                                    onClick={() => {
                                                        setDeactivateEmployee(item);
                                                        setOpenDeactivate(true);
                                                    }}
                                                >
                                                    {item.status ? (
                                                        <BlockIcon />
                                                    ) : (
                                                        <CheckCircleIcon />
                                                    )}
                                                </IconButton>

                                            </TableCell>

                                        </TableRow>

                                    ))

                                )}


                                {/* ================= EMPTY ================= */}

                                {!loading &&
                                    filteredEmployees.length === 0 && (

                                        <TableRow>

                                            <TableCell
                                                colSpan={8}
                                                align="center"
                                            >

                                                <Typography
                                                    color="text.secondary"
                                                    py={4}
                                                >
                                                    Data karyawan tidak ditemukan
                                                </Typography>

                                            </TableCell>

                                        </TableRow>

                                    )}

                            </TableBody>
                        </Table>

                    </Box>
                    <Box
                        sx={{
                            mt: 2,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            flexWrap: "wrap",
                            gap: 2
                        }}
                    >

                        <Typography
                            variant="body2"
                            color="text.secondary"
                        >
                            Total data: {sortedEmployees.length}
                        </Typography>


                        <Stack
                            direction="row"
                            spacing={2}
                            alignItems="center"
                        >

                            <TextField
                                select
                                size="small"
                                label="Per halaman"
                                value={rowsPerPage}
                                onChange={(e) => {
                                    setRowsPerPage(
                                        Number(e.target.value)
                                    );

                                    setPage(1);
                                }}
                                sx={{
                                    width: 130
                                }}
                            >

                                <MenuItem value={10}>
                                    10
                                </MenuItem>

                                <MenuItem value={25}>
                                    25
                                </MenuItem>

                                <MenuItem value={50}>
                                    50
                                </MenuItem>

                                <MenuItem value={100}>
                                    100
                                </MenuItem>

                            </TextField>


                            <Pagination
                                count={
                                    Math.max(
                                        totalPages,
                                        1
                                    )
                                }
                                page={
                                    Math.min(
                                        page,
                                        Math.max(
                                            totalPages,
                                            1
                                        )
                                    )
                                }
                                onChange={(
                                    _event,
                                    value
                                ) => {
                                    setPage(value);
                                }}
                                color="primary"
                                shape="rounded"
                                showFirstButton
                                showLastButton
                            />

                        </Stack>

                    </Box>
                </CardContent>

            </Card>
            <EmployeeCreate
                open={openCreate}
                onClose={() => setOpenCreate(false)}
                onSuccess={loadEmployees}
            />
            <EmployeeCreate
                open={openEdit}
                employee={selectedEmployee}
                mode="edit"
                onClose={() => {
                    setOpenEdit(false);
                    setSelectedEmployee(null);
                }}
                onSuccess={loadEmployees}
            />
            <EmployeeDetail
                open={openDetail}
                employee={selectedEmployee}
                onClose={() => {
                    setOpenDetail(false);
                    setSelectedEmployee(null);
                }}
            />
            <Dialog
                open={openDeactivate}
                onClose={() => {
                    if (!deactivating) {
                        setOpenDeactivate(false);
                        setDeactivateEmployee(null);
                    }
                }}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>
                    {deactivateEmployee?.status
                        ? "Nonaktifkan Karyawan"
                        : "Aktifkan Karyawan"}
                </DialogTitle>

                <DialogContent>

                    <Typography>
                        Apakah kamu yakin ingin{" "}
                        {deactivateEmployee?.status
                            ? "menonaktifkan"
                            : "mengaktifkan"}{" "}
                        karyawan{" "}
                        <strong>
                            {deactivateEmployee?.name}
                        </strong>
                        ?
                    </Typography>

                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mt: 1 }}
                    >
                        {deactivateEmployee?.status
                            ? "Karyawan tidak akan dapat digunakan sebagai karyawan aktif, tetapi seluruh data dan riwayat absensinya tetap tersimpan."
                            : "Karyawan akan kembali menjadi karyawan aktif dan dapat menggunakan akun login."}
                    </Typography>

                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>

                    <Button
                        onClick={() => {
                            setOpenDeactivate(false);
                            setDeactivateEmployee(null);
                        }}
                        disabled={deactivating}
                    >
                        Batal
                    </Button>

                    <Button
                        variant="contained"
                        color={
                            deactivateEmployee?.status
                                ? "error"
                                : "success"
                        }
                        onClick={handleToggleStatus}
                        disabled={deactivating}
                    >
                        {deactivating
                            ? "Memproses..."
                            : deactivateEmployee?.status
                                ? "Nonaktifkan"
                                : "Aktifkan"}
                    </Button>

                </DialogActions>

            </Dialog>
        </Box>
    );
}