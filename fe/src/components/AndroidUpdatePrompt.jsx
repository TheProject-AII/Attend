import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  IconButton,
  Snackbar,
  Typography,
} from "@mui/material";

import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import SystemUpdateAltRoundedIcon from "@mui/icons-material/SystemUpdateAltRounded";

import { Capacitor } from "@capacitor/core";

import api from "../services/api";

const APP_DROPPER_URL = "https://appdropper.io/pride";

export default function AndroidUpdatePrompt() {
  const [update, setUpdate] = useState(null);
  const [checking, setChecking] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    let mounted = true;

    const checkUpdate = async () => {
      // Jangan jalankan pengecekan versi di browser/desktop.
      if (!Capacitor.isNativePlatform()) {
        return;
      }

      try {
        if (mounted) setChecking(true);

        // Import hanya saat aplikasi native berjalan.
        const { App } = await import("@capacitor/app");

        const [installed, response] = await Promise.all([
          App.getInfo(),
          api.get("/app-version/android"),
        ]);

        if (!mounted) return;

        const latest = response.data;

        if (!latest?.success) {
          setUpdate(null);
          return;
        }

        const installedCode = Number(installed.build || 0);
        const latestCode = Number(latest.versionCode || 0);
        console.log("=== ANDROID UPDATE DEBUG ===");
        console.log("Installed Version:", installed.version);
        console.log("Installed Build:", installed.build);
        console.log("Latest Version:", latest.version);
        console.log("Latest Build:", latest.versionCode);
        console.log("Force Update:", latest.forceUpdate);
        console.log("ANDROID VERSION CHECK:", {
          installedVersion: installed.version,
          installedCode,
          latestVersion: latest.version,
          latestCode,
        });

        if (latestCode > installedCode) {
          setUpdate({
            version: latest.version,
            versionCode: latestCode,
            forceUpdate: Boolean(latest.forceUpdate),
            releaseNotes: latest.releaseNotes || "",
          });
        } else {
          setUpdate(null);
        }
      } catch (error) {
        console.error("Android update check failed:", error);

        if (mounted) {
          setUpdate(null);
        }
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkUpdate();

    return () => {
      mounted = false;
    };
  }, []);

  const handleUpdate = async () => {
    try {
      setOpening(true);

      const { Browser } = await import("@capacitor/browser");

      await Browser.open({
        url: APP_DROPPER_URL,
        presentationStyle: "popover",
      });
    } catch (error) {
      console.error("Failed to open App Dropper:", error);

      window.open(APP_DROPPER_URL, "_blank");
    } finally {
      setOpening(false);
    }
  };

  const handleDismiss = () => {
    if (!update?.forceUpdate) {
      setUpdate(null);
    }
  };

  // Komponen hanya berlaku untuk aplikasi native.
  if (!Capacitor.isNativePlatform() || !update) {
    return null;
  }

  return (
    <Snackbar
      open={Boolean(update)}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: "center",
      }}
      sx={{
        bottom: { xs: 16, sm: 24 },
        left: { xs: 12, sm: "auto" },
        right: { xs: 12, sm: "auto" },
        width: { xs: "calc(100% - 24px)", sm: 440 },
      }}
    >
      <Alert
        severity="info"
        icon={<SystemUpdateAltRoundedIcon sx={{ fontSize: 28 }} />}
        variant="filled"
        action={
          !update.forceUpdate && (
            <IconButton size="small" color="inherit" onClick={handleDismiss}>
              <CloseRoundedIcon fontSize="small" />
            </IconButton>
          )
        }
        sx={{
          width: "100%",
          borderRadius: 3,
          alignItems: "flex-start",
          boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
          "& .MuiAlert-message": {
            width: "100%",
          },
        }}
      >
        <Box>
          <Typography fontWeight={800}>
            {update.forceUpdate
              ? "Pembaruan wajib tersedia!"
              : "Pembaruan tersedia!"}
          </Typography>

          <Typography variant="body2" sx={{ mt: 0.5, mb: 1.5 }}>
            HRIS versi {update.version} sudah tersedia.
            {update.releaseNotes ? ` ${update.releaseNotes}` : ""}
          </Typography>

          <Button
            size="small"
            variant="contained"
            color="inherit"
            disabled={opening || checking}
            onClick={handleUpdate}
            sx={{
              bgcolor: "#FFFFFF",
              color: "#1565C0",
              fontWeight: 800,
              "&:hover": {
                bgcolor: "#EAF2FF",
              },
            }}
          >
            {opening ? <CircularProgress size={17} /> : "UPDATE SEKARANG"}
          </Button>
        </Box>
      </Alert>
    </Snackbar>
  );
}
