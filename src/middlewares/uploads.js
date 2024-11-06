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

// Actualización del filtro de archivos para aceptar imágenes y archivos de Excel
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    "application/vnd.ms-excel" // .xls
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error("Solo se permiten archivos JPG, JPEG, PNG, XLSX o XLS."), false);
  }
  cb(null, true);
};

// Configuración de multer con el almacenamiento y filtro actualizados
const upload = multer({
  storage,
  fileFilter,
});

// Exportar el middleware
module.exports = {
  upload,
};
