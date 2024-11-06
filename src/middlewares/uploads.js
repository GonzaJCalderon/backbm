const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const usuarioId = req.body.usuarioId;

    if (!usuarioId) {
      return cb(new Error("El ID de usuario es requerido."), null);
    }

    const raiz = path.join(__dirname, "../public");
    const uploadPath = path.join(raiz, "uploads", usuarioId);

    // Crear la carpeta si no existe
    fs.mkdirSync(uploadPath, { recursive: true });
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const formattedFileName = file.originalname.replace(/\s+/g, "-");
    const fileNameWithoutExtension = crypto
      .createHash("md5")
      .update(path.parse(formattedFileName).name)
      .digest("hex");
    const fileExtension = path.extname(formattedFileName).slice(1);
    const newNameFile = fileNameWithoutExtension + "." + fileExtension;

    cb(null, newNameFile);
  },
});

// Restricciones de tipo de archivo y tamaño
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Solo se permiten archivos JPG, JPEG o PNG."), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
});

// Exportar el middleware
module.exports = {
  upload,
};
