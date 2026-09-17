import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const IMAGES_DIR = path.join(UPLOADS_ROOT, 'images');
const VIDEOS_DIR = path.join(UPLOADS_ROOT, 'videos');

for (const dir of [IMAGES_DIR, VIDEOS_DIR]) {
  fs.mkdirSync(dir, { recursive: true });
}

// Any browser/phone-camera image format in — jfif, jpg, jpeg, png, gif,
// bmp, heic, avif — one format out. WebP replaces the old "paste an imgur
// link" flow: smaller files, transparency support, and no third-party
// dependency for something as basic as a question's image.
const ALLOWED_VIDEO_MIME = new Set(['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska']);
const VIDEO_EXTENSION_BY_MIME = {
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
  'video/x-matroska': '.mkv'
};

const buildPublicUrl = (req, relativePath) => {
  const base = process.env.PUBLIC_BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base}/uploads/${relativePath}`;
};

// POST /api/media/upload (multipart, field name "file"). Converts every
// image to .webp server-side; videos are stored as-is (re-encoding video
// needs ffmpeg, which isn't part of this stack yet — see the Thunder
// Client notes for the caveat).
export const uploadMedia = async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded (expected multipart field "file").' });
    }

    const id = crypto.randomUUID();

    if (file.mimetype.startsWith('image/')) {
      const filename = `${id}.webp`;
      const outputPath = path.join(IMAGES_DIR, filename);
      await sharp(file.buffer).webp({ quality: 82 }).toFile(outputPath);

      return res.status(201).json({
        success: true,
        mediaType: 'image',
        url: buildPublicUrl(req, `images/${filename}`)
      });
    }

    if (ALLOWED_VIDEO_MIME.has(file.mimetype)) {
      const extension = VIDEO_EXTENSION_BY_MIME[file.mimetype];
      const filename = `${id}${extension}`;
      const outputPath = path.join(VIDEOS_DIR, filename);
      await fs.promises.writeFile(outputPath, file.buffer);

      return res.status(201).json({
        success: true,
        mediaType: 'video',
        url: buildPublicUrl(req, `videos/${filename}`)
      });
    }

    return res.status(415).json({
      success: false,
      message: `Unsupported file type: ${file.mimetype}. Allowed: any image format, or video/mp4, video/webm, video/quicktime, video/x-matroska.`
    });
  } catch (error) {
    console.error('[media.upload] Upload failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process upload', error: error.message });
  }
};
