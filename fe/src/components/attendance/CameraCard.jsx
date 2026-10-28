import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";

import Webcam from "react-webcam";
import * as faceapi from "@vladmandic/face-api";

import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

import CameraAltRoundedIcon from "@mui/icons-material/CameraAltRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";

const CameraCard = forwardRef(({ photo, setPhoto, loading }, ref) => {
  const webcamRef = useRef(null);

  const [modelReady, setModelReady] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");
  const [brightness, setBrightness] = useState(null);
  const [lightingWarning, setLightingWarning] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadModel = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri("/models");

        if (mounted) {
          setModelReady(true);
        }
      } catch (err) {
        console.error("Face model error:", err);

        if (mounted) {
          setError("Failed to load the face detection model.");
        }
      }
    };

    loadModel();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const value = checkLighting();

      if (value === null) return;

      setBrightness(value);

      if (value < 75) {
        setLightingWarning(
          "Lighting is too low. Please move to a brighter area.",
        );
      } else {
        setLightingWarning("");
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const capture = async () => {
    setError("");

    if (!modelReady) {
      setError("The face model is not ready yet.");
      return null;
    }

    const video = webcamRef.current?.video;

    if (!video || video.readyState < 2) {
      setError("The camera is not ready yet.");
      return null;
    }

    setDetecting(true);

    try {
      const faces = await faceapi.detectAllFaces(
        video,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5,
        }),
      );

      if (faces.length === 0) {
        setError("No face detected. Look toward the camera.");
        return null;
      }

      if (faces.length > 1) {
        setError(
          "Multiple faces detected. Make sure you are alone in front of the camera.",
        );
        return null;
      }

      const light = checkLighting();

      if (light !== null && light < 75) {
        setError(
          "Lighting is too low. Find a brighter area before checking in.",
        );
        setPhoto(null);
        return null;
      }

      const image = await webcamRef.current?.getScreenshot();

      if (!image) {
        setError("Failed to take a photo.");
        return null;
      }

      setPhoto(image);

      return image;
    } catch (err) {
      console.error("Face detection error:", err);
      setError("An error occurred while detecting your face.");
      return null;
    } finally {
      setDetecting(false);
    }
  };

  const checkLighting = () => {
    const video = webcamRef.current?.video;

    if (!video || video.readyState < 2) {
      return null;
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!ctx) return null;

    canvas.width = 160;
    canvas.height = 120;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);

    let total = 0;
    let count = 0;

    // Sample every four pixels to reduce processing.
    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      total += 0.2126 * r + 0.7152 * g + 0.0722 * b;
      count++;
    }

    return Math.round(total / count);
  };

  useImperativeHandle(ref, () => ({
    capture,

    showError: (message) => {
      setError(message);
      setPhoto(null);
    },

    clearError: () => {
      setError("");
    },
  }));

  const retake = () => {
    setPhoto(null);
    setError("");
  };

  return (
    <Card elevation={2} sx={{ borderRadius: 2 }}>
      <CardContent>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            textAlign: "center",
            mb: 2,
          }}
        >
          Make sure your face is clearly visible before continuing.
        </Typography>

        {!modelReady && !error && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 1,
              mb: 2,
            }}
          >
            <CircularProgress size={18} />
            <Typography variant="body2">
              Loading face detection model...
            </Typography>
          </Box>
        )}

        {error && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            aspectRatio: "4 / 3",
            overflow: "hidden",
            borderRadius: 1,
            bgcolor: "#ECECEC",
          }}
        >
          {photo ? (
            <img
              src={photo}
              alt="Preview selfie"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <Webcam
              ref={webcamRef}
              screenshotFormat="image/jpeg"
              screenshotQuality={0.95}
              audio={false}
              videoConstraints={{
                width: 1280,
                height: 720,
                facingMode: "user",
              }}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          )}
        </Box>

        {/* Lighting warning */}
        {!photo && lightingWarning && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {lightingWarning}
          </Alert>
        )}

        {!photo && brightness !== null && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 1 }}
          >
            Lighting level: {brightness}/255
          </Typography>
        )}

        {detecting && (
          <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
            Checking your face...
          </Typography>
        )}
        {detecting && (
          <Typography variant="body2" sx={{ mt: 1, textAlign: "center" }}>
            Checking your face...
          </Typography>
        )}

        {/*
                      Optional buttons.
                      Attendance.jsx can still call
                      cameraRef.current.capture()
                    */}

        {false &&
          (photo ? (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<ReplayRoundedIcon />}
              disabled={loading}
              onClick={retake}
              sx={{ mt: 2 }}
            >
              Retake Photo
            </Button>
          ) : (
            <Button
              fullWidth
              variant="contained"
              startIcon={<CameraAltRoundedIcon />}
              disabled={loading || detecting || !modelReady}
              onClick={capture}
              sx={{ mt: 2 }}
            >
              Take Photo
            </Button>
          ))}
      </CardContent>
    </Card>
  );
});

export default CameraCard;
