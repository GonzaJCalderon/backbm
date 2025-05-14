const { sequelize } = require('./src/models');
const { v4: uuidv4 } = require('uuid');
const { crearBien } = require('./src/controllers/bienesController'); // ⚠️ ajustá el path si es necesario
const { registrarVenta } = require('./src/controllers/transaccionesController');

(async () => {
  console.log("📡 Conectando a la base de datos: Local");

  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a la base de datos exitosa");

    const vendedorUUID = '0403b035-7cee-4961-8eb5-4425639a9c29';
    const compradorUUID = '1fb7ae08-7bb2-4257-8df1-f41afa35d7a5';

    // ⚙️ SIMULAR REQ/RES PARA crearBien
    const bienesParaVenta = [
      {
        tipo: 'telefono',
        marca: 'Samsung',
        modelo: 'Galaxy S22',
        descripcion: 'Smartphone Samsung',
        precio: 800,
        stock: 2,
        imei: [
          { imei: '357634099234125', foto: 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/imei1.jpg' },
          { imei: '357634099234126', foto: 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/imei2.jpg' }
        ],
        fotos: [
          'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/s22-front.jpg',
          'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/s22-back.jpg'
        ]
      },
      {
        tipo: 'telefono',
        marca: 'Apple',
        modelo: 'iPhone 13',
        descripcion: 'iPhone 13',
        precio: 1200,
        stock: 1,
        imei: [
          { imei: '358765432109876', foto: 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/imei3.jpg' }
        ],
        fotos: [
          'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/iphone13-front.jpg',
          'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/iphone13-back.jpg'
        ]
      }
    ];

    const bienesRegistrados = [];

    for (const bien of bienesParaVenta) {
      const reqMock = {
        user: { uuid: vendedorUUID, tipo: 'fisica' },
        body: {
          tipo: bien.tipo,
          marca: bien.marca,
          modelo: bien.modelo,
          descripcion: bien.descripcion,
          precio: bien.precio,
          stock: bien.stock,
          propietario_uuid: vendedorUUID,
          registrado_por_uuid: vendedorUUID,
          imei: bien.imei,
          overridePermiso: 'true'
        },
        uploadedPhotos: [
          {
            fotos: bien.fotos,
            imeiFotos: bien.imei.map(i => i.foto)
          }
        ]
      };

      const resMock = {
        status: (code) => ({
          json: (data) => {
            if (code !== 201) throw new Error(data.message);
            bienesRegistrados.push({
              ...bien,
              uuid: data.bien.uuid,
              imeis: data.bien.imeis
            });
          }
        })
      };

      await crearBien(reqMock, resMock);
    }

    // 🧾 ARMAR DATOS PARA registrarVenta
    const ventaBienes = bienesRegistrados.map(bien => ({
      uuid: bien.uuid,
      tipo: bien.tipo,
      marca: bien.marca,
      modelo: bien.modelo,
      descripcion: bien.descripcion,
      precio: bien.precio,
      cantidad: bien.stock,
      fotos: bien.fotos,
      imeis: bien.imeis.map(i => ({
        imei: i.imei,
        foto: i.foto || null
      }))
    }));

    const ventaReq = {
      body: {
        compradorId: compradorUUID,
        ventaData: JSON.stringify(ventaBienes)
      },
      user: { uuid: vendedorUUID },
      uploadedPhotosVenta: {}
    };

    const ventaRes = {
      status: (code) => ({
        json: (data) => {
          console.log(`✅ Respuesta HTTP ${code}:\n`, JSON.stringify(data, null, 2));
        }
      })
    };

    await registrarVenta(ventaReq, ventaRes);

  } catch (error) {
    console.error("❌ Error en testVenta:", error);
  }
})();
