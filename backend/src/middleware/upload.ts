import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import type { Request } from "express";
import type { FileFilterCallback } from "multer";

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || "uploads");
const MAX_MB = parseInt(process.env.MAX_FILE_SIZE_MB || "50");

// Crear directorio si no existe
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60);
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowed = [".jpg", ".jpeg", ".png", ".tiff", ".tif", ".webp"];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato no permitido: ${ext}. Usa JPG, PNG o TIFF.`));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_MB * 1024 * 1024 }
});

export { upload, UPLOAD_DIR };
