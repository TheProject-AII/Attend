
from fastapi import FastAPI, UploadFile, File, HTTPException
from deepface import DeepFace
from pathlib import Path
import tempfile
import logging

app = FastAPI(title="HRIS Face Recognition API")

logger = logging.getLogger(__name__)

ALLOWED_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp"
}

MAX_SIZE = 5 * 1024 * 1024


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
        "message": "DeepFace berhasil dimuat",
        "model": "ArcFace"
    }


@app.post("/verify-face")
async def verify_face(
    reference_photo: UploadFile = File(...),
    selfie_photo: UploadFile = File(...)
):
    # 1. Validasi format
    for photo in (reference_photo, selfie_photo):
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Format foto harus JPG, PNG, atau WebP."
            )

    # 2. Validasi ukuran
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
          CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
reference_ext = CONTENT_TYPE_EXTENSIONS[reference_photo.content_type]
selfie_ext = CONTENT_TYPE_EXTENSIONS[selfie_photo.content_type]

reference_path = Path(temp_dir) / f"reference{reference_ext}"
selfie_path = Path(temp_dir) / f"selfie{selfie_ext}"

            # 3. Anti-spoofing pada selfie
            faces = DeepFace.extract_faces(
                img_path=str(selfie_path),
                detector_backend="opencv",
                enforce_detection=True,
                anti_spoofing=True
            )

            for index, face in enumerate(faces):
                print(f"Face {index + 1}")
                print("Is Real:", face.get("is_real"))
                print("Anti Spoof Score:", face.get("antispoof_score"))
                print("Face Confidence:", face.get("confidence"))


            # Wajib tepat satu wajah
            if len(faces) != 1:
                raise ValueError(
                    "Pastikan hanya satu wajah di depan kamera."
                )

            # Periksa indikasi wajah asli
            for face in faces:
                print("===== LIVENESS DEBUG =====", flush=True)
                print("Is Real:", repr(face.get("is_real")), flush=True)
                print("Score:", face.get("antispoof_score"), flush=True)
                print("Confidence:", face.get("confidence"), flush=True)
                print("==========================", flush=True)
            if faces[0].get("is_real") is not True:
                raise ValueError(
                    "Wajah tidak valid. Gunakan wajah asli, bukan foto atau layar HP."
                )

            # 4. Face Recognition ArcFace
            result = DeepFace.verify(
                img1_path=str(reference_path),
                img2_path=str(selfie_path),
                model_name="ArcFace",
                detector_backend="opencv",
                distance_metric="cosine",
                enforce_detection=True
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
