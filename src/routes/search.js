const express = require('express');
const router = express.Router();
const { Usuario, Bien } = require('../models'); 
const { Op } = require('sequelize');

router.get('/buscar', async (req, res) => {
  const { query, category, tipo, imei } = req.query;
  console.log('Término de búsqueda recibido:', query, 'Categoría:', category);

  try {
      let usuarios = [];
      let bienes = [];

      // Si se proporciona una categoría, realizamos la búsqueda específica
      if (category) {
          if (category === 'dni' || category === 'cuit' || category === 'nombre' || category === 'apellido' || category === 'email') {
              // Búsqueda en los usuarios
              usuarios = await Usuario.findAll({
                  where: { [category]: { [Op.like]: `%${query}%` } }
              });
          } else if (category === 'direccion' || category === 'marca' || category === 'modelo' || category === 'tipo') {
              // Búsqueda en los bienes
              bienes = await Bien.findAll({
                  where: { [category]: { [Op.like]: `%${query}%` } }
              });
          } else {
              return res.status(400).json({ error: 'Categoría no válida' });
          }
      } else {
          // Si no se proporciona categoría, realizar búsqueda tanto en usuarios como en bienes
          usuarios = await Usuario.findAll({
              where: {
                  [Op.or]: [
                      { nombre: { [Op.like]: `%${query}%` } },
                      { apellido: { [Op.like]: `%${query}%` } },
                      { email: { [Op.like]: `%${query}%` } },
                      { dni: { [Op.like]: `%${query}%` } },
                      { cuit: { [Op.like]: `%${query}%` } }
                  ]
              }
          });

          // Filtro de búsqueda en bienes
          const bienesFilters = {
              [Op.or]: [
                  { tipo: { [Op.like]: `%${query}%` } },
                  { marca: { [Op.like]: `%${query}%` } },
                  { modelo: { [Op.like]: `%${query}%` } }
              ]
          };

          // Si el tipo es 'telefono' y se proporciona el imei, incluirlo en los filtros de búsqueda de bienes
          if (tipo === 'telefono' && imei) {
              bienesFilters.imei = { [Op.like]: `%${imei}%` };
          }

          bienes = await Bien.findAll({
              where: bienesFilters
          });
      }

      // Devolver los resultados de usuarios y bienes por separado
      res.json({ usuarios, bienes });
  } catch (error) {
      console.error('Error en la búsqueda:', error);
      res.status(500).json({ error: 'Error en la búsqueda' });
  }
});

module.exports = router;
