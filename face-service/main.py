from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Header
from deepface import DeepFace
from pathlib import Path
from contextlib import asynccontextmanager
import tempfile
import logging
import os
import secrets
import time
import threading
import json
import math

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
CONTENT_TYPE_EXTENSIONS = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_SIZE = 5 * 1024 * 1024
FACE_API_KEY = os.environ.get("FACE_API_KEY")

if not FACE_API_KEY:
    raise RuntimeError("FACE_API_KEY belum dikonfigurasi")

# Satu proses verifikasi dalam satu waktu untuk menghindari
# beban model yang berlebihan pada server lokal.
face_lock = threading.Lock()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Warm-up model saat service mulai, bukan saat pengguna check-in.
    start = time.perf_counter()
    DeepFace.build_model("ArcFace")
    logger.info("ArcFace model loaded: %.2fs", time.perf_counter() - start)
    yield


app = FastAPI(
    title="HRIS Face Recognition API",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    return {"success": True, "message": "Face Recognition Service berjalan"}


@app.get("/model-status")
def model_status():
    return {"success": True, "message": "ArcFace siap", "model": "ArcFace"}


@app.post("/verify-face")
async def verify_face(
    reference_photo: UploadFile = File(...),
    selfie_photo: UploadFile = File(...),
    x_face_api_key: str | None = Header(default=None),
):
    if not secrets.compare_digest(x_face_api_key or "", FACE_API_KEY):
        raise HTTPException(status_code=401, detail="Unauthorized")

    for photo in (reference_photo, selfie_photo):
        if photo.content_type not in ALLOWED_TYPES:
            raise HTTPException(
                status_code=400,
                detail="Format foto harus JPG, PNG, atau WebP.",
            )

    reference_bytes = await reference_photo.read(MAX_SIZE + 1)
    selfie_bytes = await selfie_photo.read(MAX_SIZE + 1)

    if len(reference_bytes) > MAX_SIZE or len(selfie_bytes) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ukuran setiap foto maksimal 5 MB.",
        )

    if not reference_bytes or not selfie_bytes:
        raise HTTPException(status_code=400, detail="Foto tidak boleh kosong.")

    try:
        total_start = time.perf_counter()

        with tempfile.TemporaryDirectory() as temp_dir:
            reference_path = Path(temp_dir) / (
                "reference" + CONTENT_TYPE_EXTENSIONS[reference_photo.content_type]
            )
            selfie_path = Path(temp_dir) / (
                "selfie" + CONTENT_TYPE_EXTENSIONS[selfie_photo.content_type]
            )

            reference_path.write_bytes(reference_bytes)
            selfie_path.write_bytes(selfie_bytes)

            with face_lock:
                # Deteksi selfie + anti-spoofing.
                start = time.perf_counter()
                selfie_faces = DeepFace.extract_faces(
                    img_path=str(selfie_path),
                    detector_backend="retinaface",
                    enforce_detection=True,
                    anti_spoofing=True,
                    align=True,
                )
                logger.info(
                    "Selfie detection + anti-spoof: %.2fs",
                    time.perf_counter() - start,
                )

                if len(selfie_faces) != 1:
                    raise ValueError(
                        "Pastikan hanya satu wajah di depan kamera."
                    )

                if selfie_faces[0].get("is_real") is not True:
                    raise ValueError(
                        "Wajah tidak valid. Gunakan wajah asli, bukan foto atau layar HP."
                    )

                # Deteksi foto referensi.
                start = time.perf_counter()
                reference_faces = DeepFace.extract_faces(
                    img_path=str(reference_path),
                    detector_backend="retinaface",
                    enforce_detection=True,
                    anti_spoofing=False,
                    align=True,
                )
                logger.info(
                    "Reference detection: %.2fs",
                    time.perf_counter() - start,
                )

                if len(reference_faces) != 1:
                    raise ValueError(
                        "Pastikan foto referensi hanya memiliki satu wajah."
                    )

                # Bandingkan wajah yang sudah di-crop.
                # Periksa hasil akurasi karena preprocessing crop bisa berbeda
                # dari jalur DeepFace.verify standar.
                start = time.perf_counter()

                reference_embedding = DeepFace.represent(
                    img_path=reference_faces[0]["face"],
                    model_name="ArcFace",
                    detector_backend="skip",
                    enforce_detection=False,
                    normalization="ArcFace",
                )

                selfie_embedding = DeepFace.represent(
                    img_path=selfie_faces[0]["face"],
                    model_name="ArcFace",
                    detector_backend="skip",
                    enforce_detection=False,
                    normalization="ArcFace",
                )

                from deepface.modules.verification import find_distance, find_threshold

                reference_vector = reference_embedding[0]["embedding"]
                selfie_vector = selfie_embedding[0]["embedding"]

                distance = find_distance(
                    reference_vector,
                    selfie_vector,
                    distance_metric="cosine",
                )

                threshold = find_threshold(
                    "ArcFace",
                    "cosine",
                )

                matched = distance <= threshold

                logger.info(
                    "ArcFace embedding + comparison: %.2fs",
                    time.perf_counter() - start,
                )

                return {
                    "success": True,
                    "matched": bool(matched),
                    "distance": float(distance),
                    "threshold": float(threshold),
                    "model": "ArcFace",
                }
    except ValueError as e:
        logger.warning("Face validation failed: %s", e)
        raise HTTPException(status_code=422, detail=str(e))

    except Exception:
        logger.exception("Face verification failed")
        raise HTTPException(
            status_code=500,
            detail="Terjadi kesalahan saat memproses verifikasi wajah.",
        )


def validate_face_api_key(x_face_api_key: str | None):
    if not secrets.compare_digest(x_face_api_key or "", FACE_API_KEY):
        raise HTTPException(status_code=401, detail="Unauthorized")


async def read_valid_image(photo: UploadFile):
    if photo.content_type not in ALLOWED_TYPES:
        raise HTTPException(
            status_code=400,
            detail="Format foto harus JPG, PNG, atau WebP.",
        )

    data = await photo.read(MAX_SIZE + 1)

    if len(data) > MAX_SIZE:
        raise HTTPException(
            status_code=413,
            detail="Ukuran setiap foto maksimal 5 MB.",
        )

    if not data:
        raise HTTPException(
            status_code=400,
            detail="Foto tidak boleh kosong.",
        )

    return data


def extract_face_embedding(image_path: str, anti_spoofing: bool):
    faces = DeepFace.extract_faces(
        img_path=image_path,
        detector_backend="retinaface",
        enforce_detection=True,
        anti_spoofing=anti_spoofing,
        align=True,
    )

    if len(faces) != 1:
        raise ValueError("Pastikan hanya ada satu wajah di dalam foto.")

    if anti_spoofing and not bool(faces[0].get("is_real", False)):
        raise ValueError(
            "Wajah tidak valid. Gunakan wajah asli, bukan foto atau layar HP."
        )

    representations = DeepFace.represent(
        img_path=faces[0]["face"],
        model_name="ArcFace",
        detector_backend="skip",
        enforce_detection=False,
        normalization="ArcFace",
    )

    if not representations:
        raise ValueError("Embedding wajah gagal dibuat.")

    vector = representations[0].get("embedding")

    if not isinstance(vector, list) or len(vector) != 512:
        raise ValueError("Format embedding ArcFace tidak valid.")

    if not all(
        isinstance(value, (int, float)) and math.isfinite(value)
        for value in vector
    ):
        raise ValueError("Nilai embedding wajah tidak valid.")

    return [float(value) for value in vector]


@app.post("/enroll-face")
async def enroll_face(
    reference_photo: UploadFile = File(...),
    selfie_photo: UploadFile = File(...),
    x_face_api_key: str | None = Header(default=None),
):
    validate_face_api_key(x_face_api_key)

    reference_bytes = await read_valid_image(reference_photo)
    selfie_bytes = await read_valid_image(selfie_photo)

    try:
        start_total = time.perf_counter()

        with tempfile.TemporaryDirectory() as temp_dir:
            reference_path = Path(temp_dir) / (
                "reference"
                + CONTENT_TYPE_EXTENSIONS[reference_photo.content_type]
            )
            selfie_path = Path(temp_dir) / (
                "selfie"
                + CONTENT_TYPE_EXTENSIONS[selfie_photo.content_type]
            )

            reference_path.write_bytes(reference_bytes)
            selfie_path.write_bytes(selfie_bytes)

            with face_lock:
                start = time.perf_counter()

                # Foto HR adalah sumber identitas yang disetujui.
                reference_embedding = extract_face_embedding(
                    str(reference_path),
                    anti_spoofing=False,
                )

                logger.info(
                    "Enrollment reference embedding: %.2fs",
                    time.perf_counter() - start,
                )

                start = time.perf_counter()

                # Selfie harus lolos pemeriksaan wajah asli.
                selfie_embedding = extract_face_embedding(
                    str(selfie_path),
                    anti_spoofing=True,
                )

                logger.info(
                    "Enrollment selfie embedding + anti-spoof: %.2fs",
                    time.perf_counter() - start,
                )

                from deepface.modules.verification import (
                    find_distance,
                    find_threshold,
                )

                distance = find_distance(
                    reference_embedding,
                    selfie_embedding,
                    distance_metric="cosine",
                )

                threshold = find_threshold("ArcFace", "cosine")
                matched = bool(distance <= threshold)

                logger.info(
                    "Face enrollment comparison completed in %.2fs; matched=%s",
                    time.perf_counter() - start_total,
                    matched,
                )

                response = {
                    "success": True,
                    "matched": matched,
                    "distance": float(distance),
                    "threshold": float(threshold),
                    "model": "ArcFace",
                }

                # Hanya kirim embedding ke backend jika kedua wajah cocok.
                # Backend bertanggung jawab menyimpannya ke database.
                if matched:
                    response["embedding"] = reference_embedding

                return response

    except ValueError as e:
        logger.warning("Face enrollment validation failed: %s", e)
        raise HTTPException(status_code=422, detail=str(e))

    except Exception:
        logger.exception("Face enrollment failed")
        raise HTTPException(
            status_code=500,
            detail="Terjadi kesalahan saat registrasi wajah.",
        )


@app.post("/verify-enrolled-face")
async def verify_enrolled_face(
    selfie_photo: UploadFile = File(...),
    reference_embedding: str = Form(...),
    x_face_api_key: str | None = Header(default=None),
):
    validate_face_api_key(x_face_api_key)

    selfie_bytes = await read_valid_image(selfie_photo)

    try:
        stored_embedding = json.loads(reference_embedding)

        if (
            not isinstance(stored_embedding, list)
            or len(stored_embedding) != 512
            or not all(
                isinstance(value, (int, float))
                and math.isfinite(value)
                for value in stored_embedding
            )
        ):
            raise ValueError("Embedding referensi tidak valid.")

        stored_embedding = [float(value) for value in stored_embedding]

    except (json.JSONDecodeError, TypeError, ValueError) as e:
        raise HTTPException(
            status_code=422,
            detail="Embedding referensi tidak valid.",
        ) from e

    try:
        with tempfile.TemporaryDirectory() as temp_dir:
            selfie_path = Path(temp_dir) / (
                "selfie" + CONTENT_TYPE_EXTENSIONS[selfie_photo.content_type]
            )
            selfie_path.write_bytes(selfie_bytes)

            with face_lock:
                start = time.perf_counter()

                # Anti-spoofing tetap dilakukan pada setiap absensi.
                selfie_embedding = extract_face_embedding(
                    str(selfie_path),
                    anti_spoofing=True,
                )

                from deepface.modules.verification import (
                    find_distance,
                    find_threshold,
                )

                distance = find_distance(
                    stored_embedding,
                    selfie_embedding,
                    distance_metric="cosine",
                )

                threshold = find_threshold("ArcFace", "cosine")
                matched = bool(distance <= threshold)

                logger.info(
                    "Enrolled-face verification completed in %.2fs; matched=%s",
                    time.perf_counter() - start,
                    matched,
                )

                return {
                    "success": True,
                    "matched": matched,
                    "distance": float(distance),
                    "threshold": float(threshold),
                    "model": "ArcFace",
                }

    except ValueError as e:
        logger.warning("Face verification validation failed: %s", e)
        raise HTTPException(status_code=422, detail=str(e))

    except Exception:
        logger.exception("Enrolled-face verification failed")
        raise HTTPException(
            status_code=500,
            detail="Terjadi kesalahan saat verifikasi wajah.",
        )