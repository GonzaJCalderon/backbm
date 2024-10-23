const multer = require('multer');
const path = require('path');

// Configuración de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const usuarioId = req.body.usuarioId;
    cb(null, path.join(__dirname, '../../uploads')); // Guardar en la carpeta uploads del directorio raíz
  },
  filename: function (req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  }
});


// Restricciones de tipo de archivo y tamaño
const fileFilter = (req, file, cb) => {
  // Verificar el tipo de archivo permitido
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif"];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(
      null,
      false,
      new Error("Solo se permiten archivos JPG, JPEG , PNG o GIF.")
    );
  }
  if (file.size > 5 * 1024 * 1024) {
    return cb(new Error("El tamaño del archivo no puede superar los 5 MB."));
  }

  cb(null, true);
};


// Configuración del middleware de Multer
const upload = multer({
  storage,
  fileFilter,
});

module.exports = upload;
