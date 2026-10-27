from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException, Header
from deepface import DeepFace
from pathlib import Path
import tempfile
import logging
import os
import secrets
import time

load_dotenv()
app = FastAPI(title="HRIS Face Recognition API")

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp"
}

MAX_SIZE = 5 * 1024 * 1024

FACE_API_KEY = os.environ.get("FACE_API_KEY")

if not FACE_API_KEY:
    raise RuntimeError("FACE_API_KEY belum dikonfigurasi")

@app.get("/health")
def health():
    return {
        "success": True,
        "message": "Face Recognition Service berjalan"
    }


@app.get("/model-status")
def model_status():
    return {
        "success": True,
        "message": "DeepFace berhasil diimport",
        "model": "ArcFace"
    }


@app.post("/verify-face")
async def verify_face(
    reference_photo: UploadFile = File(...),
    selfie_photo: UploadFile = File(...),
    x_face_api_key: str | None = Header(default=None)
):
    # 1. Autentikasi API Key
    if not secrets.compare_digest(
        x_face_api_key or "",
        FACE_API_KEY
    ):
        raise HTTPException(
            status_code=401,
            detail="Unauthorized"
        )

    # 2. Validasi format
    for photo in (reference_photo, selfie_photo):
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Format foto harus JPG, PNG, atau WebP."
            )

    # 3. Validasi ukuran
    reference_bytes = await reference_photo.read(MAX_SIZE + 1)
    selfie_bytes = await selfie_photo.read(MAX_SIZE + 1)

    if (
        len(reference_bytes) > MAX_SIZE
        or len(selfie_bytes) > MAX_SIZE
    ):
        raise HTTPException(
            status_code=413,
            detail="Ukuran setiap foto maksimal 5 MB."
        )

    if not reference_bytes or not selfie_bytes:
        raise HTTPException(
            status_code=400,
            detail="Foto tidak boleh kosong."
        )

    try:
        with tempfile.TemporaryDirectory() as temp_dir:

            # 4. Simpan foto sementara
            reference_ext = CONTENT_TYPE_EXTENSIONS[
                reference_photo.content_type
            ]
            selfie_ext = CONTENT_TYPE_EXTENSIONS[
                selfie_photo.content_type
            ]

            reference_path = Path(temp_dir) / f"reference{reference_ext}"
            selfie_path = Path(temp_dir) / f"selfie{selfie_ext}"

            reference_path.write_bytes(reference_bytes)
            selfie_path.write_bytes(selfie_bytes)

            # 5. Deteksi wajah dan anti-spoofing
            start_detection = time.perf_counter()

            print("[FACE AI] Mulai deteksi wajah...", flush=True)

            faces = DeepFace.extract_faces(
                img_path=str(selfie_path),
                detector_backend="retinaface",
                enforce_detection=True,
                anti_spoofing=True
            )

            print(
                f"[FACE AI] Detection + Anti-Spoofing: "
                f"{time.perf_counter() - start_detection:.2f} detik",
                flush=True
            )

            if len(faces) != 1:
                raise ValueError(
                    "Pastikan hanya satu wajah di depan kamera."
                )

            if faces[0].get("is_real") is not True:
                raise ValueError(
                    "Wajah tidak valid. Gunakan wajah asli, "
                    "bukan foto atau layar HP."
                )

            # 6. Verifikasi ArcFace
            start_verification = time.perf_counter()

            result = DeepFace.verify(
                img1_path=str(reference_path),
                img2_path=str(selfie_path),
                model_name="ArcFace",
                detector_backend="retinaface",
                distance_metric="cosine",
                enforce_detection=True
            )

            print(
                f"[FACE AI] ArcFace Verify: "
                f"{time.perf_counter() - start_verification:.2f} detik",
                flush=True
            )

            return {
                "success": True,
                "matched": bool(result["verified"]),
                "distance": float(result["distance"]),
                "threshold": float(result["threshold"]),
                "model": "ArcFace"
            }


    except ValueError as e:
        logger.warning("Face validation failed: %s", e)
        raise HTTPException(
            status_code=422,
            detail=str(e)
        )

    except Exception:
        logger.exception("Face verification failed")
        raise HTTPException(
            status_code=500,
            detail="Terjadi kesalahan saat memproses verifikasi wajah."
        )
