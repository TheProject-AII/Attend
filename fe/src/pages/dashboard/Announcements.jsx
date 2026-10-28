import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Stack,
    Typography,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    FormControlLabel,
    Switch,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import { useEffect, useState } from "react";

import announcementService
    from "../../services/announcementService";

export default function Announcements() {

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(false);

    const [open, setOpen] = useState(false);
    const [saving, setSaving] = useState(false);

    const [form, setForm] = useState({
        title: "",
        description: "",
        url: "",
        is_active: true,
        start_date: "",
        end_date: "",
    });

    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState("");

    const handleChange = (e) => {
        const {
            name,
            value,
            checked,
            type,
        } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    };

    const resetForm = () => {
        setForm({
            title: "",
            description: "",
            url: "",
            is_active: true,
            start_date: "",
            end_date: "",
        });

        setImageFile(null);
        setPreview("");
    };

    const handleOpen = () => {
        resetForm();
        setOpen(true);
    };

    const handleClose = () => {
        if (saving) return;

        setOpen(false);
        resetForm();
    };

    const handleImageChange = (e) => {
        const file = e.target.files?.[0];

        if (!file) return;

        setImageFile(file);

        if (preview) {
            URL.revokeObjectURL(preview);
        }

        setPreview(
            URL.createObjectURL(file)
        );
    };

    const handleSubmit = async () => {

        if (!form.title.trim()) {
            alert(
                "Announcement title is required."
            );
            return;
        }

        try {

            setSaving(true);

            const formData =
                new FormData();

            formData.append(
                "title",
                form.title.trim()
            );

            formData.append(
                "description",
                form.description || ""
            );

            formData.append(
                "url",
                form.url || ""
            );

            formData.append(
                "is_active",
                form.is_active
            );

            formData.append(
                "start_date",
                form.start_date || ""
            );

            formData.append(
                "end_date",
                form.end_date || ""
            );

            if (imageFile) {
                formData.append(
                    "image",
                    imageFile
                );
            }

            await announcementService.create(
                formData
            );

            setOpen(false);
            resetForm();

            await loadData();

        } catch (err) {

            console.error(
                "CREATE ANNOUNCEMENT ERROR:",
                err
            );

            alert(
                err.response?.data?.message ||
                "Failed to create announcement."
            );

        } finally {

            setSaving(false);
        }
    };

    const handleToggleStatus = async (item) => {
        try {
            await announcementService.updateStatus(
                item.id,
                !item.is_active
            );

            await loadData();

        } catch (err) {
            console.error(
                "UPDATE STATUS ERROR:",
                err.response?.data || err
            );
        }
    };

    const loadData = async () => {

        try {

            setLoading(true);

            const result =
                await announcementService
                    .getAll();

            setData(
                result.data || []
            );

        } catch (err) {

            console.error(
                "GET ANNOUNCEMENTS ERROR:",
                err
            );

        } finally {

            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const formatDate = (date) => {
        if (!date) return "-";

        // Use the YYYY-MM-DD portion only.
        const cleanDate = date.substring(0, 10);

        const [year, month, day] = cleanDate.split("-");

        return `${day}/${month}/${year}`;
    };

    return (

        <Box>

            {/* HEADER */}

            <Stack
                direction={{
                    xs: "column",
                    sm: "row",
                }}
                justifyContent="space-between"
                alignItems={{
                    xs: "stretch",
                    sm: "center",
                }}
                spacing={2}
                sx={{ mb: 3 }}
            >


                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={handleOpen}
                >
                    Add Announcement
                </Button>

            </Stack>


            {/* CONTENT */}

            {loading ? (

                <Card>

                    <CardContent>
                        <Typography
                            color="text.secondary"
                        >
                            Loading announcements...
                        </Typography>
                    </CardContent>

                </Card>

            ) : data.length === 0 ? (

                <Card>

                    <CardContent>

                        <Box
                            sx={{
                                py: 6,
                                textAlign: "center",
                            }}
                        >
                            <Typography
                                fontWeight={600}
                            >
                                No announcements yet
                            </Typography>

                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                            >
                                Add an announcement to display it
                                in the employee app.
                            </Typography>
                        </Box>

                    </CardContent>

                </Card>

            ) : (

                <Stack spacing={2}>

                    {data.map((item) => (

                        <Card
                            key={item.id}
                            sx={{
                                mb: 2,
                                borderRadius: 3,
                                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                            }}
                        >
                            <CardContent
                                sx={{
                                    display: "flex",
                                    gap: 2,
                                    alignItems: "center",
                                    p: 2,
                                    "&:last-child": {
                                        pb: 2,
                                    },
                                }}
                            >
                                {/* THUMBNAIL */}
                                {item.image_url && (
                                    <Box
                                        component="img"
                                        src={/^https?:\/\//i.test(item.image_url) ? item.image_url : `${window.location.origin}${item.image_url.startsWith("/") ? "" : "/"}${item.image_url}`}
                                        alt={item.title}
                                        sx={{
                                            width: 120,
                                            height: 100,
                                            objectFit: "cover",
                                            borderRadius: 2,
                                            flexShrink: 0,
                                        }}
                                    />
                                )}

                                {/* CONTENT */}
                                <Box sx={{ flex: 1, minWidth: 0 }}>

                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        alignItems="center"
                                        justifyContent="space-between"
                                        sx={{ mb: 0.5 }}
                                    >
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                        >
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 600,
                                                    fontSize: "16px"
                                                }}
                                            >
                                                {item.title}
                                            </Typography>

                                            <Chip
                                                label={
                                                    item.is_active
                                                        ? "Active"
                                                        : "Inactive"
                                                }
                                                size="small"
                                                color={
                                                    item.is_active
                                                        ? "success"
                                                        : "default"
                                                }
                                            />
                                        </Stack>

                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color={
                                                item.is_active
                                                    ? "error"
                                                    : "success"
                                            }
                                            onClick={() =>
                                                handleToggleStatus(item)
                                            }
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 600
                                            }}
                                        >
                                            {item.is_active
                                                ? "Deactivate"
                                                : "Activate"}
                                        </Button>
                                    </Stack>

                                    {item.description && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                mb: 0.5,
                                                color: "text.secondary",
                                            }}
                                        >
                                            {item.description}
                                        </Typography>
                                    )}

                                    <Typography
                                        variant="body2"
                                        sx={{
                                            fontSize: "13px",
                                            mb: 0.5,
                                        }}
                                    >
                                        Period: {formatDate(item.start_date)} -{" "}
                                        {formatDate(item.end_date)}
                                    </Typography>

                                    {item.url && (
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                fontSize: "13px",
                                            }}
                                        >
                                            URL:{" "}
                                            <Box
                                                component="a"
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    color: "primary.main",
                                                    textDecoration: "none",
                                                    "&:hover": {
                                                        textDecoration: "underline",
                                                    },
                                                }}
                                            >
                                                {item.url}
                                            </Box>
                                        </Typography>
                                    )}

                                </Box>
                            </CardContent>
                        </Card>
                    ))}

                </Stack>

            )}


            {/* ADD ANNOUNCEMENT DIALOG */}

            <Dialog
                open={open}
                onClose={handleClose}
                fullWidth
                maxWidth="md"
            >

                <DialogTitle>
                    Add Announcement
                </DialogTitle>

                <DialogContent dividers>

                    <Grid
                        container
                        spacing={2}
                    >


                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                required
                                label="Announcement Title"
                                name="title"
                                value={form.title}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                multiline
                                minRows={3}
                                label="Description"
                                name="description"
                                value={form.description}
                                onChange={handleChange}
                            />
                        </Grid>

                        <Grid size={{ xs: 12 }}>

                            <Typography
                                variant="subtitle2"
                                sx={{ mb: 1 }}
                            >
                                Announcement Banner
                            </Typography>

                            <Button
                                variant="outlined"
                                component="label"
                            >
                                Choose Image

                                <input
                                    hidden
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={
                                        handleImageChange
                                    }
                                />

                            </Button>

                            {imageFile && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{ mt: 1 }}
                                >
                                    {imageFile.name}
                                </Typography>
                            )}

                            {preview && (
                                <Box
                                    component="img"
                                    src={preview}
                                    alt="Preview banner"
                                    sx={{
                                        mt: 2,
                                        width: "100%",
                                        maxHeight: 260,
                                        objectFit: "cover",
                                        borderRadius: 2,
                                    }}
                                />
                            )}

                        </Grid>

                        <Grid size={{ xs: 12 }}>
                            <TextField
                                fullWidth
                                label="News URL / Destination Link"
                                name="url"
                                value={form.url}
                                onChange={handleChange}
                                placeholder="https://..."
                                helperText="Optional. For example, a news article, company website, Google Drive, or another information page."
                            />
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                md: 6,
                            }}
                        >
                            <TextField
                                fullWidth
                                type="date"
                                label="Start Date"
                                name="start_date"
                                value={
                                    form.start_date
                                }
                                onChange={
                                    handleChange
                                }
                                slotProps={{
                                    inputLabel: {
                                        shrink: true,
                                    },
                                }}
                            />
                        </Grid>

                        <Grid
                            size={{
                                xs: 12,
                                md: 6,
                            }}
                        >
                            <TextField
                                fullWidth
                                type="date"
                                label="End Date"
                                name="end_date"
                                value={
                                    form.end_date
                                }
                                onChange={
                                    handleChange
                                }
                                slotProps={{
                                    inputLabel: {
                                        shrink: true,
                                    },
                                }}
                            />
                        </Grid>

                        <Grid
                            size={{ xs: 12 }}
                            sx={{
                                display: "flex",
                                alignItems: "center",
                            }}
                        >
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={
                                            form.is_active
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        name="is_active"
                                    />
                                }
                                label={
                                    form.is_active
                                        ? "Announcement Active"
                                        : "Announcement Inactive"
                                }
                            />
                        </Grid>

                    </Grid>

                </DialogContent>

                <DialogActions>

                    <Button
                        onClick={handleClose}
                        disabled={saving}
                    >
                        Cancel
                    </Button>

                    <Button
                        variant="contained"
                        onClick={handleSubmit}
                        disabled={saving}
                    >
                        {saving
                            ? "Saving..."
                            : "Save Announcement"}
                    </Button>

                </DialogActions>

            </Dialog>

        </Box>
    );
}