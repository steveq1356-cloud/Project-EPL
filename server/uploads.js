import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import sharp from 'sharp';
import { ORIGINALS_DIR, THUMBS_DIR } from './config.js';
import { ValidationError } from './errors.js';

const IMAGE_TYPES = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/tiff': 'tif',
};

const THUMB_SIZE = 480;

// Stores uploads straight into data/uploads/originals under a random, collision-free name.
const storage = multer.diskStorage({
  destination: ORIGINALS_DIR,
  filename: (req, file, cb) => {
    const ext = IMAGE_TYPES[file.mimetype] || path.extname(file.originalname).slice(1).toLowerCase() || 'bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext}`);
  },
});

export const imageUpload = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024, files: 30 },
  fileFilter: (req, file, cb) => {
    if (IMAGE_TYPES[file.mimetype]) return cb(null, true);
    cb(new ValidationError(`${file.originalname}: only JPEG, PNG, WebP, GIF, AVIF or TIFF images can be uploaded`));
  },
});

export const thumbName = (storedName) => `${storedName}.webp`;

// Writes a thumbnail (EXIF-rotated, max 480px) and returns the upright image size.
export async function makeThumbnail(storedName) {
  const source = path.join(ORIGINALS_DIR, storedName);
  await sharp(source, { animated: false })
    .rotate()
    .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(THUMBS_DIR, thumbName(storedName)));
  const meta = await sharp(source).metadata();
  const sideways = meta.orientation >= 5; // EXIF 5–8 swap width and height
  return {
    width: sideways ? meta.height : meta.width,
    height: sideways ? meta.width : meta.height,
  };
}

export function removeUploadFiles(storedName) {
  for (const file of [path.join(ORIGINALS_DIR, storedName), path.join(THUMBS_DIR, thumbName(storedName))]) {
    fs.rm(file, { force: true }, () => {});
  }
}
