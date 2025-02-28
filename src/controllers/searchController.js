const { Op } = require("sequelize");
const { Usuario,  Bien } = require("../models"); // ✅ Asegura que está importado correctamente


const searchAll = async (req, res) => {
    console.log("🟡 Parámetros recibidos en la búsqueda:", req.query); // 🔥 Verifica qué llega

    const { query, tipo, marca, modelo, nombre, apellido, email, dni, cuit, direccion, page = 1, limit = 10 } = req.query;

    try {
        if (!query && !tipo && !marca && !modelo && !nombre && !apellido && !email && !dni && !cuit && !direccion) {
            return res.status(400).json({ message: 'Debe proporcionar al menos un criterio de búsqueda.' });
        }

        const userFilters = {};
        if (nombre) userFilters.nombre = { [Op.iLike]: `%${nombre}%` };
        if (apellido) userFilters.apellido = { [Op.iLike]: `%${apellido}%` };
        if (email) userFilters.email = { [Op.iLike]: `%${email}%` };
        if (dni) userFilters.dni = { [Op.iLike]: `%${dni}%` };
        if (cuit) userFilters.cuit = { [Op.iLike]: `%${cuit}%` };
        if (direccion) userFilters.direccion = { [Op.iLike]: `%${direccion}%` };

        console.log("🟡 Filtros para usuarios:", userFilters); // 🔥 Verifica qué filtros se están aplicando

        const usuarios = await Usuario.findAndCountAll({
            where: userFilters,
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });

        const bienesFilters = {
            [Op.or]: [
                { tipo: { [Op.iLike]: `%${tipo || query || ''}%` } },
                { marca: { [Op.iLike]: `%${marca || query || ''}%` } },
                { modelo: { [Op.iLike]: `%${modelo || query || ''}%` } },
                { descripcion: { [Op.iLike]: `%${query || ''}%` } },
            ],
        };

        console.log("🟡 Filtros para bienes:", bienesFilters); // 🔥 Verifica los filtros para bienes

        const bienes = await Bien.findAndCountAll({
            where: bienesFilters,
            limit: parseInt(limit),
            offset: (page - 1) * limit,
        });

        console.log("✅ Usuarios encontrados:", usuarios.count);
        console.log("✅ Bienes encontrados:", bienes.count);

        res.status(200).json({
            usuarios: {
                total: usuarios.count,
                results: usuarios.rows,
            },
            bienes: {
                total: bienes.count,
                results: bienes.rows,
            },
        });

    } catch (error) {
        console.error('❌ Error en la búsqueda:', error.message);
        res.status(500).json({ message: 'Error en la búsqueda', error: error.message });
    }
};

searchUsers = async (req, res) => {
    try {
      const { query } = req.query;
      if (!query) return res.status(400).json({ message: "Debes ingresar un nombre o apellido." });
  
      const users = await Usuario.findAll({
        where: {
          [Op.or]: [
            { nombre: { [Op.iLike]: `%${query}%` } },
            { apellido: { [Op.iLike]: `%${query}%` } }
          ]
        },
        attributes: ["uuid", "nombre", "apellido"]
      });
  
      res.json(users);
    } catch (error) {
      console.error("❌ Error buscando usuarios:", error);
      res.status(500).json({ message: "Error en la búsqueda de usuarios." });
    }
  };

module.exports = { searchAll, searchUsers };
