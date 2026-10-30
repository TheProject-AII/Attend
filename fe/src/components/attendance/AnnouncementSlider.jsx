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
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
const API_URL = (import.meta.env.VITE_API_URL || "/api").replace(
  /\/api\/?$/,
  "",
);

const getAnnouncementImageUrl = (imageUrl) => {
  if (!imageUrl) return "";

  // Jika sudah berupa URL lengkap
  if (/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  const baseUrl = API_URL.replace(/\/$/, "");
  const path = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;

  return `${baseUrl}${path}`;
};

export default function AnnouncementSlider({ announcements = [] }) {
  const [active, setActive] = useState(0);
  const [openDetail, setOpenDetail] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  const handleOpenDetail = (e) => {
    e.stopPropagation();

    if (!item) return;

    setSelectedAnnouncement(item);
    setOpenDetail(true);
  };
  const handleCloseDetail = () => {
    setOpenDetail(false);
  };

  const formatDate = (date) => {
    if (!date) return "-";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) return "-";

    return parsed.toLocaleDateString("en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };
  // Auto slide announcement
  useEffect(() => {
    if (announcements.length < 2) return;

    const timer = setInterval(() => {
      setActive((prev) => (prev + 1) % announcements.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [announcements.length]);

  // Debug announcement data
  useEffect(() => {
    console.log("TOTAL ANNOUNCEMENTS:", announcements.length);
    console.log("ANNOUNCEMENT DATA:", announcements);
  }, [announcements]);

  // Conditional return harus setelah semua Hooks
  if (announcements.length === 0) {
    return (
      <Card sx={{ mt: 2, mx: 1.5, borderRadius: 2 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            📢 No active announcements
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // if (!announcements?.length) {
  //   return (
  //     <Card sx={{ mt: 2, mx: 1.5, borderRadius: 2 }}>
  //       <CardContent>
  //         <Typography variant="body2" color="text.secondary" textAlign="center">
  //           📢 No active announcements
  //         </Typography>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  const item = announcements[active] || announcements[0];

  const handleOpenAnnouncement = () => {
    if (!item?.url) return;

    window.open(item.url, "_blank", "noopener,noreferrer");
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
                boxShadow: "0 8px 25px rgba(0,0,0,.12)",
              }
            : {},
        }}
      >
        {/* MAIN CONTENT */}
        <Box
          sx={{
            display: "flex",
            alignItems: "stretch",
            p: 1.5,
            gap: 1.5,
          }}
        >
          {/* LEFT IMAGE */}
          {item.image_url && (
            <Box
              sx={{
                width: {
                  xs: 115,
                  sm: 150,
                },
                minHeight: 130,
                flexShrink: 0,
                borderRadius: 3,
                overflow: "hidden",
                bgcolor: "#F3F4F6",

                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Box
                component="img"
                src={getAnnouncementImageUrl(item.image_url)}
                onError={(e) => {
                  console.error(
                    "Announcement image failed:",
                    e.currentTarget.src,
                  );
                }}
                alt={item.title}
                sx={{
                  width: "100%",
                  height: "100%",
                  maxHeight: 130,
                  objectFit: "contain",
                  objectPosition: "center",
                  display: "block",
                }}
              />
            </Box>
          )}

          {/* RIGHT CONTENT */}
          <Box
            sx={{
              flex: 1,
              minWidth: 0,
              py: 0.5,
            }}
          >
            <Chip
              label="📢 Announcement"
              size="small"
              sx={{
                mb: 1,
                bgcolor: "#E8F5F1",
                color: "#0d439a",
                fontWeight: 600,
                fontSize: "11px",
              }}
            />

            <Typography
              sx={{
                fontWeight: 700,
                fontSize: {
                  xs: "15px",
                  sm: "17px",
                },
                color: "#111827",
                lineHeight: 1.3,
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
                  overflow: "hidden",
                }}
              >
                {item.description}
              </Typography>
            )}

            <Button
              size="small"
              onClick={handleOpenDetail}
              sx={{
                mt: 0.5,
                px: 0,
                minWidth: 0,
                color: "#0d439a",
                fontWeight: 700,
                fontSize: "12px",
                textTransform: "none",
              }}
            >
              Read More →
            </Button>
          </Box>
        </Box>

        {/* BOTTOM INDICATOR */}
        {announcements.length > 1 && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 0.7,
              py: 1.2,
              borderTop: "1px solid #F3F4F6",
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
                  bgcolor: active === index ? "#0d439a" : "#D1D5DB",
                }}
              />
            ))}
          </Box>
        )}
      </Card>
      <Dialog
        open={openDetail}
        onClose={() => setOpenDetail(false)}
        maxWidth="sm"
        fullWidth
      >
        {selectedAnnouncement && (
          <>
            <DialogTitle>
              {selectedAnnouncement.title || "-"}
              <IconButton
                onClick={handleCloseDetail}
                size="small"
                sx={{
                  position: "absolute",
                  right: 12,
                  top: 12,
                  color: "text.secondary",
                }}
              >
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <Divider />

            <DialogContent>
              <Typography variant="h6" fontWeight={700}>
                {selectedAnnouncement.title || "-"}
              </Typography>

              <Typography variant="body2">
                {selectedAnnouncement.created_by_name || "-"}
              </Typography>

              <Typography variant="body2">
                {formatDate(selectedAnnouncement.created_at)}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography
                variant="body2"
                sx={{ whiteSpace: "pre-line", lineHeight: 1.8 }}
              >
                {selectedAnnouncement.description || "-"}
              </Typography>
            </DialogContent>

            <DialogActions>
              <Button onClick={() => setOpenDetail(false)}>Tutup</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </>
  );
}
