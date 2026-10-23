const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");

const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { randomUUID } = require("crypto");
const path = require("path");

const { s3, bucket } = require("../config/s3Client");

const allowedFolders = new Set([
  "photos",
  "ktp",
  "npwp",
  "bpjs_kesehatan",
  "bpjs_tk",
  "kk",
  "announcements",
  "attendance",
]);

async function uploadToStorage(file, folder) {
  if (!allowedFolders.has(folder)) {
    throw new Error("Folder upload tidak dikenal");
  }

  if (!file?.buffer) {
    throw new Error("File buffer tidak ditemukan");
  }

  const ext = path.extname(file.originalname).toLowerCase();
  const key = `${folder}/${randomUUID()}${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })
  );

  return key;
}

async function getPrivateFileUrl(key) {
  return getSignedUrl(
    s3,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
    { expiresIn: 300 }
  );
}

async function deleteFromStorage(key) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
  );
}

module.exports = {
  uploadToStorage,
  getPrivateFileUrl,
  deleteFromStorage,
};