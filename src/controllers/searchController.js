const { Op } = require("sequelize");
const { Usuario, Bien, DetallesBien } = require("../models");

// 🧠 Helper para construir filtros dinámicos (usuarios)
const buildUserFilters = (query) => {
  const filters = [];
  const campos = ['nombre', 'apellido', 'email', 'dni', 'cuit'];

  campos.forEach((campo) => {
    if (query[campo]) {
      filters.push({ [campo]: { [Op.iLike]: `%${query[campo].trim()}%` } });
    }
  });

  return filters.length > 0 ? { [Op.and]: filters } : {};
};

// 🔍 Búsqueda general por categoría
const searchAll = async (req, res) => {
  const { term, category, page = 1, limit = 10 } = req.query;

  if (!term || !category) {
    return res.status(400).json({ message: 'Debes proporcionar término y categoría.' });
  }

  const offset = (parseInt(page) - 1) * parseInt(limit);

  try {
    if (category === 'usuarios') {
      const usuarios = await Usuario.findAndCountAll({
        where: {
          [Op.or]: [
            { nombre: { [Op.iLike]: `%${term}%` } },
            { apellido: { [Op.iLike]: `%${term}%` } },
            { email: { [Op.iLike]: `%${term}%` } },
            { dni: { [Op.iLike]: `%${term}%` } },
          ],
        },
        limit: parseInt(limit),
        offset,
      });

      return res.json({ usuarios });
    }

    if (category === 'bienes') {
      const bienes = await Bien.findAndCountAll({
        where: {
          [Op.or]: [
            { tipo: { [Op.iLike]: `%${term}%` } },
            { marca: { [Op.iLike]: `%${term}%` } },
            { modelo: { [Op.iLike]: `%${term}%` } },
            { descripcion: { [Op.iLike]: `%${term}%` } },
          ],
        },
        include: [
          {
            model: DetallesBien,
            as: 'detalles',
            required: false,
            where: {
              identificador_unico: {
                [Op.iLike]: `%${term}%`
              }
            }
          }
        ],
        limit: parseInt(limit),
        offset,
      });

      if (bienes.count === 0) {
        const bienesPorIMEI = await Bien.findAndCountAll({
          include: [
            {
              model: DetallesBien,
              as: 'detalles',
              required: true,
              where: {
                identificador_unico: {
                  [Op.iLike]: `%${term}%`
                }
              }
            }
          ],
          limit: parseInt(limit),
          offset,
        });

        return res.json({ bienes: bienesPorIMEI });
      }

      return res.json({ bienes });
    }

    return res.status(400).json({ message: 'Categoría no válida.' });

  } catch (error) {
    console.error("🔥 Error en búsqueda:", error);
    return res.status(500).json({ message: 'Error interno del servidor.', error: error.message });
  }
};

// 🔍 Búsqueda exclusiva de usuarios con múltiples filtros
const searchUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const whereClause = buildUserFilters(req.query);

    const usuarios = await Usuario.findAndCountAll({
      where: whereClause,
      attributes: ["uuid", "nombre", "apellido", "email", "dni", "rol", "cuit"],
      limit: parseInt(limit),
      offset,
      order: [["apellido", "ASC"]],
    });

    res.json({ usuarios });

  } catch (error) {
    console.error("❌ Error en búsqueda de usuarios:", error);
    res.status(500).json({ message: "Error en la búsqueda de usuarios.", error: error.message });
  }
};

module.exports = {
  searchAll,
  searchUsers,
};
