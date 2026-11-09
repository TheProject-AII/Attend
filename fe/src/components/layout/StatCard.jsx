import { Card, CardContent, Typography, Box, Avatar } from "@mui/material";

export default function StatCard({
  title,
  value,
  icon,
  subtitle,
  color = "#1976d2",
  onClick,
  blink = false,
}) {
  const isBlinking = blink && Number(value) > 0;

  return (
    <Card
      onClick={onClick}
      elevation={0}
      sx={{
        cursor: onClick ? "pointer" : "default",
        borderRadius: 1,
        border: isBlinking ? "1px solid #ED6C02" : "1px solid #E5E7EB",
        backgroundColor: isBlinking ? "#FFF3E0" : "#FFFFFF",
        transition: ".25s",

        ...(isBlinking && {
          animation: "pendingBlink 1.2s ease-in-out infinite",

          "@keyframes pendingBlink": {
            "0%, 100%": {
              backgroundColor: "#FFF3E0",
              borderColor: "#ED6C02",
              boxShadow: "0 0 0 rgba(237,108,2,0)",
            },
            "50%": {
              backgroundColor: "#FFE0B2",
              borderColor: "#f41414",
              boxShadow: "0 0 14px rgba(237,108,2,0.35)",
            },
          },
        }),

        "&:hover": onClick
          ? {
              transform: "translateY(-3px)",
              boxShadow: "0 10px 25px rgba(0,0,0,.08)",
            }
          : {},
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="body2"
              color={isBlinking ? "#ee1b1b" : "text.secondary"}
              fontWeight={isBlinking ? 700 : 400}
            >
              {title}
            </Typography>

            <Typography
              sx={{
                fontSize: 42,
                fontWeight: 700,
                lineHeight: 1.2,
                mt: 0.5,
                color: isBlinking ? "#E65100" : "inherit",
              }}
            >
              {value}
            </Typography>

            <Typography variant="caption" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>

          <Avatar
            sx={{
              width: 54,
              height: 54,
              bgcolor: isBlinking ? "#FFCC80" : `${color}20`,
              color: isBlinking ? "#E65100" : color,
              ml: 2,
            }}
          >
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}
