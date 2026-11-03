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
  Card,
  CardContent,
  Typography,
  Alert,
  CircularProgress,
} from "@mui/material";

const CameraCard = forwardRef(({ photo, setPhoto }, ref) => {
  const webcamRef = useRef(null);

  const [modelReady, setModelReady] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [error, setError] = useState("");

  // Load face detection model
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
          setError("Gagal memuat model deteksi wajah.");
        }
      }
    };

    loadModel();

    return () => {
      mounted = false;
    };
  }, []);

  // Capture photo after validating face count
  const capture = async () => {
    setError("");

    if (!modelReady) {
      setError("Model deteksi wajah belum siap.");
      return null;
    }

    const video = webcamRef.current?.video;

    if (!video || video.readyState < 2) {
      setError("Kamera belum siap.");
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
        setError("Wajah tidak terdeteksi. Silakan arahkan wajah ke kamera.");
        return null;
      }

      if (faces.length > 1) {
        setError(
          "Terdeteksi lebih dari satu wajah. Pastikan hanya ada satu orang di depan kamera.",
        );
        return null;
      }

      const image = webcamRef.current?.getScreenshot();

      if (!image) {
        setError("Gagal mengambil foto. Silakan coba kembali.");
        return null;
      }

      setPhoto(image);

      return image;
    } catch (err) {
      console.error("Face detection error:", err);
      setError("Terjadi kesalahan saat mendeteksi wajah.");
      return null;
    } finally {
      setDetecting(false);
    }
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
          Pastikan wajah terlihat jelas di depan kamera sebelum melanjutkan.
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
              Memuat model deteksi wajah...
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
            width: "100%",
            aspectRatio: "3 / 4",
            minHeight: 400,
            maxHeight: "70dvh",
            overflow: "hidden",
            borderRadius: 2,
            bgcolor: "#ECECEC",
          }}
        >
          {photo ? (
            <Box
              component="img"
              src={photo}
              alt="Preview selfie"
              sx={{
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

        {detecting && (
          <Typography variant="body2" sx={{ mt: 2, textAlign: "center" }}>
            Memeriksa wajah...
          </Typography>
        )}
      </CardContent>
    </Card>
  );
});

export default CameraCard;
