import { useEffect, useState } from "react";
import {
    Card,
    Button,
    CardContent,
    Typography,
    Box,
    Chip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Divider,
    IconButton
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
const API_URL = (
    import.meta.env.VITE_API_URL || "/api"
).replace(/\/api\/?$/, "");
export default function AnnouncementSlider({ announcements }) {

    const [active, setActive] = useState(0);
    const [openDetail, setOpenDetail] = useState(false);

    const handleOpenDetail = (e) => {
        e.stopPropagation();
        setOpenDetail(true);
    };

    const handleCloseDetail = () => {
        setOpenDetail(false);
    };

    const formatDate = (date) => {
        if (!date) return "-";

        const parsed = new Date(date);

        if (Number.isNaN(parsed.getTime())) return "-";

        return parsed.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };
    useEffect(() => {

        if (!announcements.length) return;

        const timer = setInterval(() => {

            setActive((prev) =>
                prev === announcements.length - 1
                    ? 0
                    : prev + 1
            );

        }, 5000);

        return () => clearInterval(timer);

    }, [announcements]);

    if (!announcements?.length) {
        return (
            <Card sx={{ mt: 2, mx: 1.5, borderRadius: 2 }}>
                <CardContent>
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                    >
                        📢 Belum ada pengumuman aktif
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const item = announcements[active] || announcements[0];

    const handleOpenAnnouncement = () => {
        if (!item?.url) return;

        window.open(
            item.url,
            "_blank",
            "noopener,noreferrer"
        );
    };
    return (
        <>
            <Card
                onClick={(e) => {
                    e.stopPropagation();
                    handleOpenAnnouncement();
                }}
                role={item?.url ? "link" : undefined}
                tabIndex={item?.url ? 0 : undefined}
                onKeyDown={(e) => {
                    if (item?.url && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        handleOpenAnnouncement();
                    }
                }}
                sx={{
                    mt: 2,
                    mx: 1.5,
                    borderRadius: 1,
                    overflow: "hidden",
                    bgcolor: "#fff",
                    boxShadow: "0 6px 20px rgba(0,0,0,.08)",
                    cursor: item?.url ? "pointer" : "default",
                    transition: "all 0.2s ease",
                    "&:hover": item?.url
                        ? {
                            transform: "translateY(-2px)",
                            boxShadow: "0 8px 25px rgba(0,0,0,.12)"
                        }
                        : {}
                }}
            >
                {/* AREA UTAMA */}
                <Box
                    sx={{
                        display: "flex",
                        alignItems: "stretch",
                        p: 1.5,
                        gap: 1.5
                    }}
                >
                    {/* GAMBAR KIRI */}
                    {item.image_url && (
                        <Box
                            sx={{
                                width: {
                                    xs: 115,
                                    sm: 150
                                },
                                minHeight: 130,
                                flexShrink: 0,
                                borderRadius: 3,
                                overflow: "hidden",
                                bgcolor: "#F3F4F6",

                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center"
                            }}
                        >
                            <Box
                                component="img"
                                src={`${API_URL}${item.image_url}`}
                                alt={item.title}
                                sx={{
                                    width: "100%",
                                    height: "100%",
                                    maxHeight: 130,
                                    objectFit: "contain",
                                    objectPosition: "center",
                                    display: "block"
                                }}
                            />
                        </Box>
                    )}

                    {/* KONTEN KANAN */}
                    <Box
                        sx={{
                            flex: 1,
                            minWidth: 0,
                            py: 0.5
                        }}
                    >
                        <Chip
                            label="📢 Pengumuman"
                            size="small"
                            sx={{
                                mb: 1,
                                bgcolor: "#E8F5F1",
                                color: "#0E7D63",
                                fontWeight: 600,
                                fontSize: "11px"
                            }}
                        />

                        <Typography
                            sx={{
                                fontWeight: 700,
                                fontSize: {
                                    xs: "15px",
                                    sm: "17px"
                                },
                                color: "#111827",
                                lineHeight: 1.3
                            }}
                        >
                            {item.title}
                        </Typography>

                        {item.description && (
                            <Typography
                                variant="body2"
                                sx={{
                                    mt: 0.6,
                                    color: "#6B7280",
                                    fontSize: "13px",
                                    lineHeight: 1.4,

                                    display: "-webkit-box",
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: "vertical",
                                    overflow: "hidden"
                                }}
                            >
                                {item.description}
                            </Typography>
                        )}

                        <Button
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                setOpenDetail(true);
                            }}
                            sx={{
                                mt: 0.5,
                                px: 0,
                                minWidth: 0,
                                color: "#0E7D63",
                                fontWeight: 700,
                                fontSize: "12px",
                                textTransform: "none"
                            }}
                        >
                            Baca Selengkapnya →
                        </Button>
                    </Box>
                </Box>

                {/* INDICATOR BAWAH */}
                {announcements.length > 1 && (
                    <Box
                        sx={{
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            gap: 0.7,
                            py: 1.2,
                            borderTop: "1px solid #F3F4F6"
                        }}
                    >
                        {announcements.map((_, index) => (
                            <Box
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setActive(index);
                                }}
                                sx={{
                                    width: active === index ? 18 : 6,
                                    height: 6,
                                    borderRadius: 10,
                                    cursor: "pointer",
                                    transition: ".3s",
                                    bgcolor:
                                        active === index
                                            ? "#0E7D63"
                                            : "#D1D5DB"
                                }}
                            />
                        ))}
                    </Box>
                )}
            </Card>
            <Dialog
                open={openDetail}
                onClose={handleCloseDetail}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3
                    }
                }}
            >
                <DialogTitle
                    sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: 700
                    }}
                >
                    Detail Pengumuman

                    <IconButton onClick={handleCloseDetail}>
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>

                <Divider />

                <DialogContent>
                    <Box sx={{ mb: 2 }}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            Judul
                        </Typography>

                        <Typography
                            variant="h6"
                            fontWeight={700}
                        >
                            {item.title || "-"}
                        </Typography>
                    </Box>

                    <Box
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 2,
                            mb: 2
                        }}
                    >
                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Pembuat
                            </Typography>

                            <Typography fontWeight={600}>
                                {item.created_by_name || "-"}
                            </Typography>
                        </Box>

                        <Box>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                            >
                                Tanggal
                            </Typography>

                            <Typography fontWeight={600}>
                                {formatDate(item.created_at)}
                            </Typography>
                        </Box>
                    </Box>

                    <Divider sx={{ mb: 2 }} />

                    <Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                        >
                            Isi Pengumuman
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                mt: 1,
                                whiteSpace: "pre-line",
                                lineHeight: 1.8,
                                color: "#374151"
                            }}
                        >
                            {item.description || "-"}
                        </Typography>
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button
                        variant="contained"
                        onClick={handleCloseDetail}
                        sx={{
                            bgcolor: "#0E7D63",
                            textTransform: "none",
                            borderRadius: 2
                        }}
                    >
                        Tutup
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
