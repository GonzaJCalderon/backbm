const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".svg"];
  const extname = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(extname)) {
    return cb(
      new Error(
        "Solo se permiten archivos con extensiones jpg, jpeg, png y svg."
      )
    );
  }

  if (file.size > 2 * 1024 * 1024) {
    return cb(new Error("El tamaño del archivo no puede superar los 2 MB."));
  }

  cb(null, true);
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024, files: 3 },
});

const validateFile = {
  upload,
};
module.exports = validateFile;
