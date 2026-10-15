const multer = require("multer");
const path = require("path");

// Use memoryStorage instead of diskStorage
const storage = multer.memoryStorage();

// File filter to allow only JSON files
const fileFilter = (req, file, cb) => {
  const allowedTypes = /json/;
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase()
  );

  if (extname) {
    cb(null, true);
  } else {
    cb(new Error("Only JSON files are allowed"));
  }
};

// Optional file size limit (5 MB here)
const limits = { fileSize: 5 * 1024 * 1024 };

// Set up multer with memoryStorage
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: limits,
}).single("questionfile");

// Middleware wrapper
exports.uploadQuestionFileMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    } else if (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    next();
  });
};
