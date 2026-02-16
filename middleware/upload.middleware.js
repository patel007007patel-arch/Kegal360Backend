import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure upload directories exist
const uploadDir = path.join(__dirname, '../uploads');
const assetsDir = path.join(uploadDir, 'assets');
const videoDir = path.join(assetsDir, 'videos');
const imageDir = path.join(uploadDir, 'images');
const thumbnailDir = path.join(assetsDir, 'thumbnails');
const customLogsDir = path.join(uploadDir, 'custom-logs');

[uploadDir, assetsDir, videoDir, imageDir, thumbnailDir, customLogsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Video storage
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videoDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'video-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Image storage
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, imageDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'image-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Thumbnail storage
const thumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, thumbnailDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'thumbnail-' + uniqueSuffix + path.extname(file.originalname));
  }
});

// Custom log images (same as video: stored locally under uploads/custom-logs)
const customLogImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, customLogsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'logimage-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const imageOnlyFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files are allowed!'));
};

export const uploadCustomLogImages = multer({
  storage: customLogImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per image
  fileFilter: imageOnlyFilter
}).array('logimage', 20);

export const uploadCustomLogSingleImage = multer({
  storage: customLogImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageOnlyFilter
}).single('logimage');

// Create: flat form-data logimage1, logimage2, ... (no JSON)
const MAX_LOG_ENTRIES = 20;
const createLogImageFields = Array.from({ length: MAX_LOG_ENTRIES }, (_, i) => ({
  name: `logimage${i + 1}`,
  maxCount: 1
}));
export const uploadCustomLogCreate = multer({
  storage: customLogImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageOnlyFilter
}).fields(createLogImageFields);

// Batch update entries: entryId1, logTitle1, logimage1, entryId2, logTitle2, logimage2, ... (no JSON)
const batchUpdateFields = [];
for (let i = 1; i <= MAX_LOG_ENTRIES; i++) {
  batchUpdateFields.push({ name: `logimage${i}`, maxCount: 1 });
}
export const uploadCustomLogBatchUpdate = multer({
  storage: customLogImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: imageOnlyFilter
}).fields(batchUpdateFields);

// File filter
const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'video') {
    const allowedTypes = /mp4|avi|mov|wmv|flv|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'));
    }
  } else {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
};

export const uploadVideo = multer({
  storage: videoStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB default
  },
  fileFilter
});

export const uploadImage = multer({
  storage: imageStorage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter
});

export const uploadThumbnail = multer({
  storage: thumbnailStorage,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB
  },
  fileFilter
});

// Combined storage for video + thumbnail in one request (avoids consuming body twice)
const videoAndThumbnailStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = file.fieldname === 'video' ? videoDir : thumbnailDir;
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const prefix = file.fieldname === 'video' ? 'video-' : 'thumbnail-';
    cb(null, prefix + uniqueSuffix + path.extname(file.originalname));
  }
});

export const uploadVideoAndThumbnail = multer({
  storage: videoAndThumbnailStorage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 // 100MB (thumbnail is still validated by fileFilter)
  },
  fileFilter
}).fields([
  { name: 'video', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 }
]);

// Require multipart for upload routes to avoid "Unexpected end of form" from busboy
export const requireMultipart = (req, res, next) => {
  const contentType = String(req.headers['content-type'] || '').toLowerCase();

  if (!contentType.includes('multipart/form-data')) {
    return res.status(400).json({
      success: false,
      message: 'Upload requires multipart/form-data. Please select a file and try again.'
    });
  }

  next();
};

// Normalize multer .fields() result to req.file + req.files for controllers expecting req.file
export const normalizeVideoUpload = (req, res, next) => {
  if (req.files?.video?.[0]) {
    req.file = req.files.video[0];
  }

  // Ensure thumbnail key exists for controllers that expect it
  if (!req.files?.thumbnail) {
    req.files = req.files || {};
    req.files.thumbnail = [];
  }

  next();
};

export default { uploadVideo, uploadImage, uploadThumbnail, uploadVideoAndThumbnail, uploadCustomLogImages, uploadCustomLogCreate, uploadCustomLogSingleImage, uploadCustomLogBatchUpdate };
