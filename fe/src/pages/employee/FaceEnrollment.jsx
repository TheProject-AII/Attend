import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { CameraAltRounded, CheckCircleRounded } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

export default function FaceEnrollment() {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const navigate = useNavigate();

  const [cameraReady, setCameraReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });

        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }

        setCameraReady(true);
      } catch (err) {
        console.error("Camera error:", err);
        setError(
          "Camera access is unavailable. Allow camera access in your browser and try again.",
        );
      }
    }

    startCamera();

    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleEnrollment = async () => {
    setError("");
    setSuccess("");

    if (!videoRef.current || !cameraReady) {
      setError("The camera is not ready yet.");
      return;
    }

    const video = videoRef.current;

    if (!video.videoWidth || !video.videoHeight) {
      setError("The video is not ready. Wait a moment and try again.");
      return;
    }

    setLoading(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Failed to capture an image from the camera.");
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const photo = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Failed to create a selfie photo."));
          },
          "image/jpeg",
          0.92,
        );
      });

      const formData = new FormData();
      formData.append("photo", photo, "face-enrollment.jpg");

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      // Adjust this URL if the backend uses a different API prefix.
      const apiBase = import.meta.env.VITE_API_URL || "/api";
      const response = await fetch(
        `${apiBase.replace(/\/+$/, "")}/attendance/face-enrollment`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Face enrollment failed.");
      }

      setSuccess(
        "Face enrollment successful. Redirecting to attendance...",
      );

      // Store only non-sensitive status; do not store face embeddings.
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");

      localStorage.setItem(
        "user",
        JSON.stringify({
          ...storedUser,
          face_enrolled: true,
          face_enrolled_at: result.data?.face_enrolled_at || null,
        }),
      );

      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;

      setTimeout(() => {
        navigate("/employee/attendance", { replace: true });
      }, 800);
    } catch (err) {
      console.error("Enrollment error:", err);
      setError(err.message || "An error occurred during face enrollment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        p: 2,
        bgcolor: "#F5F7FB",
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: "100%",
          maxWidth: 480,
          p: { xs: 3, sm: 4 },
          borderRadius: 4,
          border: "1px solid #E2E8F0",
        }}
      >
        <Stack spacing={2.5} alignItems="center">
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: 3,
              display: "grid",
              placeItems: "center",
              bgcolor: "#E8F0FF",
              color: "#2455AA",
            }}
          >
            <CameraAltRounded fontSize="large" />
          </Box>

          <Typography variant="h5" fontWeight={800} textAlign="center">
            Face Enrollment
          </Typography>

          <Typography color="text.secondary" textAlign="center">
            Take a selfie to match your face with the reference photo registered
            with HR.
          </Typography>

          <Box
            sx={{
              width: "100%",
              overflow: "hidden",
              borderRadius: 3,
              bgcolor: "#0F172A",
              aspectRatio: "4 / 3",
            }}
          >
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />
          </Box>

          {!cameraReady && !error && <CircularProgress size={26} />}

          {error && (
            <Alert severity="error" sx={{ width: "100%" }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert
              icon={<CheckCircleRounded />}
              severity="success"
              sx={{ width: "100%" }}
            >
              {success}
            </Alert>
          )}

          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={!cameraReady || loading || !!success}
            onClick={handleEnrollment}
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <CameraAltRounded />
              )
            }
            sx={{
              py: 1.5,
              borderRadius: 2.5,
              textTransform: "none",
              fontWeight: 700,
            }}
          >
            {loading ? "Checking your face..." : "Enroll Face"}
          </Button>

          <Typography
            variant="caption"
            color="text.secondary"
            textAlign="center"
          >
            Make sure your face is clearly visible, lighting is adequate, and
            only one person is in the frame.
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
