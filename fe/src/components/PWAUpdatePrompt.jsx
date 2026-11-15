import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";

import { Alert, Button, Snackbar } from "@mui/material";

import SystemUpdateAltIcon from "@mui/icons-material/SystemUpdateAlt";

export default function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("PWA Service Worker registered:", swUrl);
    },
    onRegisterError(error) {
      console.error("PWA registration error:", error);
    },
  });

  const handleUpdate = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      sx={{
        bottom: { xs: 20, sm: 30 },
        left: { xs: 12, sm: "auto" },
        right: { xs: 12, sm: "auto" },
      }}
    >
      <Alert
        severity="info"
        icon={<SystemUpdateAltIcon />}
        onClose={handleClose}
        sx={{
          width: "100%",
          minWidth: { sm: 380 },
          borderRadius: 3,
          alignItems: "center",
          boxShadow: "0 8px 30px rgba(0,0,0,0.20)",
          "& .MuiAlert-message": {
            flex: 1,
          },
        }}
        action={
          <Button
            color="primary"
            size="small"
            variant="contained"
            onClick={handleUpdate}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            Update
          </Button>
        }
      >
        <strong>Versi terbaru tersedia!</strong>
        <br />
        Aplikasi sudah siap diperbarui.
      </Alert>
    </Snackbar>
  );
}
