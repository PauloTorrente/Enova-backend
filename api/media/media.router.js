import express from 'express';
import multer from 'multer';
import { uploadMedia } from './media.upload.controller.js';
import { authenticateClient } from '../../middlewares/auth.middleware.js';

const router = express.Router();

// Memory storage: files are small enough (25MB cap) to hold in RAM while
// sharp converts them, so we skip writing the original to disk at all.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }
});

// Only survey creators (clients) upload question media — respondents never do.
router.post('/upload', authenticateClient, upload.single('file'), uploadMedia);

export default router;
