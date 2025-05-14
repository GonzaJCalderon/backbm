const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

// 📂 Ruta al archivo Excel
const excelPath = 'C:\\Users\\Gonza\\Desktop\\plantilla_inventario.xlsx';

// 📎 Token JWT y UUID del propietario
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMzhlZDVlNzktNzY2Yi00NTEwLTg4NzAtZmUxYWE4NDg2ZjgwIiwiZW1haWwiOiJpbmZvY29tcHVAbWFpbC5jb20iLCJ0aXBvIjoianVyaWRpY2EiLCJyb2xEZWZpbml0aXZvIjoidXN1YXJpbyIsImVtcHJlc2FVdWlkIjoiZGVlNzcwYzMtYjdiYy00M2ZiLWFkOTEtMWYyNWY4NzAxYmJlIiwicm9sRW1wcmVzYSI6InJlc3BvbnNhYmxlIiwiaWF0IjoxNzQ3MjM1MzAyLCJleHAiOjE3NDcyMzcxMDJ9.9tEE1Mo5Qxom6RXurCYlOcuVT0ef1YGomGJfn5DOmKY';
const propietarioUUID = 'dee770c3-b7bc-43fb-ad91-1f25f8701bbe';

(async () => {
  try {
    console.log("📂 Buscando archivo en:", excelPath);

    if (!fs.existsSync(excelPath)) {
      console.error("❌ Archivo Excel no encontrado.");
      return;
    }

    console.log("🧪 Existe?", true);

    const formData = new FormData();
    formData.append('archivoExcel', fs.createReadStream(excelPath));

    const response = await axios.post(
     'http://localhost:5005/excel/upload-stock',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${token}`,
          'X-Propietario-UUID': propietarioUUID
        }
      }
    );

    console.log("✅ Subida exitosa:");
    console.log(response.data);

  } catch (error) {
    if (error.response) {
      console.error("❌ Error HTTP:", error.response.status);
      console.log(error.response.data);
    } else {
      console.error("❌ Error general:", error.message);
    }
  }
})();
