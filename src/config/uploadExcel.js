// uploadExcel.js
const multer = require('multer');
const path = require('path');

// Configuración de almacenamiento para archivo Excel
const storageExcel = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/excel/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const uploadExcel = multer({
  storage: storageExcel,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const filetypes = /xlsx|xls/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      return cb(new Error('Error: Solo archivos Excel (XLSX, XLS)!'));
    }
  },
}).single('archivoExcel'); // Solo un archivo con el campo 'archivoExcel'

module.exports = uploadExcel;
