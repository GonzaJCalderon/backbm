const { sequelize } = require('./src/models');
const { v4: uuidv4 } = require('uuid');
const { crearBien } = require('./src/controllers/bienesController');
const { registrarVenta } = require('./src/controllers/transaccionesController');
const { Stock } = require('./src/models');

(async () => {
  console.log("📡 Conectando a la base de datos: Local");

  try {
    await sequelize.authenticate();
    console.log("✅ Conexión a la base de datos exitosa");

    const vendedorUUID = '0403b035-7cee-4961-8eb5-4425639a9c29';
    const compradorUUID = '1fb7ae08-7bb2-4257-8df1-f41afa35d7a5';

    const bienesParaVenta = [
      {
        tipo: 'telefono',
        marca: 'Samsung',
        modelo: 'Galaxy S22 Ultra',
        descripcion: 'Smartphone Samsung',
        precio: 800,
        stock: 2,
        imei: [
          { imei: '457634099234135', foto: 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/imei1.jpg' },
          { imei: '457634099234176', foto: 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/imei2.jpg' }
        ],
        fotos: [
          'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/s22-front.jpg',
          'https://res.cloudinary.com/dtx5ziooo/image/upload/v1681337331/s22-back.jpg'
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

    // 🧮 Obtener stock antes de la venta
    const stockAntes = await Stock.findOne({
      where: {
        bien_uuid: bienesRegistrados[0].uuid,
        propietario_uuid: vendedorUUID
      }
    });

    console.log(`📦 Stock antes de la venta: ${stockAntes.cantidad}`);

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
        json: async (data) => {
          console.log(`✅ Respuesta HTTP ${code}:\n`, JSON.stringify(data, null, 2));

          // Verificar el stock luego de la venta
          const stockDespues = await Stock.findOne({
            where: {
              bien_uuid: bienesRegistrados[0].uuid,
              propietario_uuid: vendedorUUID
            }
          });

          console.log(`📉 Stock después de la venta: ${stockDespues.cantidad}`);

          const diferencia = stockAntes.cantidad - stockDespues.cantidad;
          if (diferencia !== bienesRegistrados[0].stock) {
            throw new Error(`❌ ERROR: No se descontó correctamente el stock. Diferencia: ${diferencia}`);
          } else {
            console.log("✅ El stock fue descontado correctamente.");
          }
        }
      })
    };

    await registrarVenta(ventaReq, ventaRes);

  } catch (error) {
    console.error("❌ Error en testVenta:", error);
  } finally {
    await sequelize.close();
  }
})();
