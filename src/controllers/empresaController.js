const { Empresa, Usuario } = require('../models');
const { Op } = require('sequelize');
const { enviarCorreo } = require('../services/emailService');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// 🔹 Obtener todas las empresas
const obtenerEmpresas = async (req, res) => {
  try {
    console.log(`Estado recibido: pendiente`);

    const empresas = await Empresa.findAll({
      where: { estado: 'pendiente' },
      include: [
        {
          model: Usuario,
          as: 'delegados', // ✅ USAR EL ALIAS EXACTO DEFINIDO EN LA ASOCIACIÓN
          attributes: ['uuid', 'nombre', 'apellido', 'email', 'dni', 'rolEmpresa']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ empresas });
  } catch (error) {
    console.error('❌ Error al obtener empresas:', error);
    res.status(500).json({ message: 'Error al obtener las empresas', detalles: error.message });
  }
};


const obtenerEmpresasConUsuarios = async (req, res) => {
  try {
    const { estado } = req.query;

    const whereClause = estado ? { estado } : {}; // si no hay query param, trae todo

    const empresas = await Empresa.findAll({
      where: whereClause,
      include: [
        {
          model: Usuario,
          as: 'delegados',
          attributes: ['uuid', 'nombre', 'apellido', 'email', 'dni', 'rolEmpresa', 'createdAt'],
          where: {
            rolEmpresa: ['delegado', 'responsable']
          },
          required: false
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ empresas });
  } catch (error) {
    console.error('❌ Error al obtener empresas:', error);
    res.status(500).json({ message: 'Error al obtener las empresas con usuarios', detalles: error.message });
  }
};

// 🔹 Obtener una empresa por UUID
const obtenerEmpresaPorUuid = async (req, res) => {
  const { uuid } = req.params;

  try {
    const empresa = await Empresa.findOne({
      where: { uuid },
      include: {
        model: Usuario,
        as: 'usuarios',
        attributes: ['uuid', 'nombre', 'email', 'rolEmpresa', 'estado'],
      },
    });

    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada.' });
    }

    res.json(empresa);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener empresa.', error: error.message });
  }
};

// 🔹 Crear empresa
const crearEmpresa = async (req, res) => {
  const { razonSocial, cuit, direccion } = req.body;
  const creadoPor = req.user?.uuid;

  if (!creadoPor) {
    return res.status(401).json({ message: 'Usuario no autorizado para crear empresa.' });
  }

  if (!razonSocial || !cuit || !direccion) {
    return res.status(400).json({ message: 'Faltan datos obligatorios para crear la empresa.' });
  }

  try {
    const empresaExistente = await Empresa.findOne({ where: { cuit } });
    if (empresaExistente) {
      return res.status(400).json({ message: 'Ya existe una empresa con ese CUIT.' });
    }

    const nuevaEmpresa = await Empresa.create({
      razonSocial,
      cuit,
      direccion,
      creadoPor,
    });

    res.status(201).json({ message: 'Empresa creada con éxito.', empresa: nuevaEmpresa });
  } catch (error) {
    console.error('❌ Error al crear empresa:', error.message);
    res.status(500).json({ message: 'Error al crear empresa.', error: error.message });
  }
};

// 🔹 Actualizar empresa
const actualizarEmpresa = async (req, res) => {
  const { uuid } = req.params;
  const { razonSocial, cuit, direccion } = req.body;

  try {
    const empresa = await Empresa.findOne({ where: { uuid } });
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada.' });
    }

    empresa.razonSocial = razonSocial || empresa.razonSocial;
    empresa.cuit = cuit || empresa.cuit;
    empresa.direccion = direccion || empresa.direccion;

    await empresa.save();

    res.json({ message: 'Empresa actualizada con éxito.', empresa });
  } catch (error) {
    res.status(500).json({ message: 'Error al actualizar empresa.', error: error.message });
  }
};

// 🔹 Eliminar empresa
const eliminarEmpresa = async (req, res) => {
  const { uuid } = req.params;

  try {
    const empresa = await Empresa.findOne({ where: { uuid } });
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada.' });
    }

    await empresa.destroy();

    res.json({ message: 'Empresa eliminada correctamente.' });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar empresa.', error: error.message });
  }
}; 

const eliminarDelegadoPorResponsable = async (req, res) => {
  try {
    const { uuid } = req.params;
    const userRequesting = req.user;

    const delegado = await Usuario.findOne({ where: { uuid } });

    if (!delegado) {
      return res.status(404).json({ message: 'Delegado no encontrado.' });
    }

    if (delegado.rolEmpresa !== 'delegado') {
      return res.status(400).json({ message: 'El usuario no es un delegado.' });
    }

    // ✅ ESTA línea es la clave:
    const mismaEmpresa = delegado.delegadoDeEmpresa === userRequesting.empresaUuid;


    const esResponsable = userRequesting.tipo === 'juridica' &&
                          userRequesting.rolEmpresa === 'responsable' &&
                          mismaEmpresa;

    if (!esResponsable) {
      console.log('❌ Falló validación. req.user:', userRequesting);
      console.log('❌ Delegado:', delegado);
      return res.status(403).json({ message: 'No autorizado para eliminar este delegado.' });
    }

    await delegado.destroy();

    return res.status(200).json({ message: 'Delegado eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar delegado:', error);
    return res.status(500).json({ message: 'Error interno al eliminar delegado.' });
  }
};




const getDelegadosEmpresa = async (req, res) => {
  const empresaUuid = req.params.uuid;

  try {
    const empresa = await Empresa.findOne({ where: { uuid: empresaUuid } });

    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada.' });
    }

    const delegados = await Usuario.findAll({
      where: { delegadoDeEmpresa: empresaUuid },
      attributes: [
        'uuid',
        'nombre',
        'apellido',
        'email',
        'estado',
        'createdAt',
        'dni',
        'direccion',
        'rolEmpresa',
        'activo',
      ],
    });

    console.log(`🟡 Empresa UUID: ${empresaUuid}`);
    console.log('🟢 Delegados encontrados:', delegados.length);

    return res.status(200).json({ delegados });
  } catch (error) {
    console.error('❌ Error al obtener delegados:', error);
    return res.status(500).json({ message: 'Error al buscar delegados.' });
  }
};



// 🔹 Obtener empresa del delegado
const obtenerEmpresaDelDelegado = async (req, res) => {
  const delegadoUuid = req.user.uuid;

  try {
    const delegado = await Usuario.findOne({
      where: { uuid: delegadoUuid },
      include: {
        model: Empresa,
        as: 'empresa', // 💥 este alias DEBE coincidir con el definido en el modelo
        attributes: ['uuid', 'razonSocial', 'cuit', 'email', 'direccion'],
      },
    });

    if (!delegado || !delegado.empresa) {
      return res.status(404).json({ mensaje: 'La empresa no fue encontrada para este delegado.' });
    }

    return res.json({ empresa: delegado.empresa });
  } catch (error) {
    console.error('Error al obtener la empresa del delegado:', error);
    return res.status(500).json({ mensaje: 'Error al obtener la empresa.' });
  }
}; 



const cambiarEstadoEmpresa = async (req, res) => {
  const { uuid } = req.params;
  const {
    estado,
    fechaAprobacion,
    aprobadoPor,
    motivoRechazo,
    fechaRechazo,
    rechazadoPor,
  } = req.body;

  try {
    const empresa = await Empresa.findByPk(uuid, {
      include: [
        {
          model: Usuario,
          as: 'delegados',
          where: { rolEmpresa: 'responsable' },
          required: false,
        },
      ],
    });

    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada' });
    }

    empresa.estado = estado;

    const logoSrc = 'https://res.cloudinary.com/dtx5ziooo/image/upload/v1739288789/logo-png-sin-fondo_lyddzv.png';
    const responsable = empresa.delegados?.[0];

    if (estado === 'aprobado') {
      empresa.fechaAprobacion = fechaAprobacion || new Date().toISOString();
      empresa.aprobadoPor = aprobadoPor;

      if (empresa.email) {
        const subject = 'Empresa Aprobada';
        const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <thead>
              <tr>
                <th style="background: linear-gradient(to right, #1e3a8a, #3b82f6); color: #fff; padding: 16px; text-align: center;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <img src="${logoSrc}" alt="Logo" style="max-width: 80px; height: auto;" />
                    <h1 style="margin: 0; font-size: 20px;">¡Su empresa ha sido aprobada!</h1>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 16px; text-align: center;">
                  <p>Hola <strong>${responsable?.nombre || 'usuario'}</strong>,</p>
                  <p>Nos complace informarle que su empresa <strong>${empresa.razonSocial}</strong> ha sido aprobada exitosamente.</p>
                  <p>Ahora puede acceder al sistema con normalidad y comenzar a registrar bienes.</p>
                  <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                    Atentamente,<br>Equipo del Sistema Provincial Preventivo de Bienes Muebles Usados.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;

        await enviarCorreo(empresa.email, subject, `Tu empresa ${empresa.razonSocial} ha sido aprobada.`, htmlContent);
      }
    }

    if (estado === 'rechazado') {
      empresa.fechaRechazo = fechaRechazo || new Date().toISOString();
      empresa.rechazadoPor = rechazadoPor;
      empresa.motivoRechazo = motivoRechazo;

      if (empresa.email) {
        const subject = 'Empresa Rechazada';
        const reenviarLink = `${process.env.FRONTEND_URL}/empresas/${empresa.uuid}/reintentar`;

        const htmlContent = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <table style="width: 100%; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); overflow: hidden;">
            <thead>
              <tr>
                <th style="background: linear-gradient(to right, #b91c1c, #ef4444); color: #fff; padding: 16px; text-align: center;">
                  <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <img src="${logoSrc}" alt="Logo" style="max-width: 80px; height: auto;" />
                    <h1 style="margin: 0; font-size: 20px;">Empresa Rechazada</h1>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 16px; text-align: center;">
                  <p>Hola <strong>${responsable?.nombre || 'usuario'}</strong>,</p>
                  <p style="color: red;">Lamentamos informarle que su empresa <strong>${empresa.razonSocial}</strong> ha sido rechazada.</p>
                  <p style="color: red;">Motivo: "${motivoRechazo}"</p>
                  <p>Puede reenviar su solicitud haciendo clic aquí:</p>
                  <a href="${reenviarLink}" style="color: blue; font-weight: bold;">Reenviar Registro</a>
                  <p style="color: #888; font-size: 0.9em; margin-top: 20px;">
                    Atentamente,<br>Equipo del Sistema Provincial Preventivo de Bienes Muebles Usados.
                  </p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>`;

        await enviarCorreo(empresa.email, subject, `Tu empresa ${empresa.razonSocial} fue rechazada. Motivo: ${motivoRechazo}`, htmlContent);
      }
    }

    await empresa.save();

    return res.status(200).json({
      message: `Empresa ${estado} correctamente`,
      empresa,
    });
  } catch (error) {
    console.error('❌ Error al cambiar estado de empresa:', error);
    return res.status(500).json({ message: 'Error interno al cambiar estado de la empresa.' });
  }
};


const editarEmpresa = async (req, res) => {
  try {
    const uuid = req.params.uuid;
    const { razonSocial, cuit, email, direccion } = req.body;

    const empresa = await Empresa.findByPk(uuid);
    if (!empresa) return res.status(404).json({ message: 'Empresa no encontrada' });

    empresa.razonSocial = razonSocial || empresa.razonSocial;
    empresa.cuit = cuit || empresa.cuit;
    empresa.email = email || empresa.email;
    empresa.direccion = direccion || empresa.direccion;

    await empresa.save();

    res.json({ message: 'Empresa actualizada correctamente.', empresa });
  } catch (err) {
    console.error('Error al editar empresa:', err);
    res.status(500).json({ message: 'Error interno al editar empresa' });
  }
};

// Asociar un usuario como delegado a una empresa
const asociarDelegado = async (req, res) => {
  const empresaUuid = req.params.uuid;       // UUID de la empresa desde ruta
  const { usuarioUuid } = req.body;          // UUID del usuario a asociar

  try {
    // Verificar si la empresa existe
    const empresa = await Empresa.findOne({ where: { uuid: empresaUuid } });
    if (!empresa) {
      return res.status(404).json({ message: 'Empresa no encontrada.' });
    }

    // Verificar si el usuario existe
    const usuario = await Usuario.findOne({ where: { uuid: usuarioUuid } });
    if (!usuario) {
      return res.status(404).json({ message: 'Usuario no encontrado.' });
    }

    // Verificar si el usuario ya es delegado de alguna empresa
    if (usuario.delegadoDeEmpresa === empresaUuid) {
      return res.status(400).json({ message: 'Este usuario ya es delegado de la empresa.' });
    }

    // Actualizar el usuario como delegado
    usuario.delegadoDeEmpresa = empresaUuid;
    usuario.rolEmpresa = 'delegado';
    usuario.activo = true;

    await usuario.save();

    res.status(200).json({
      message: 'Delegado asociado correctamente.',
      delegado: {
        uuid: usuario.uuid,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
      },
      empresa: {
        uuid: empresa.uuid,
        razonSocial: empresa.razonSocial,
      },
    });
  } catch (error) {
    console.error('Error al asociar delegado:', error);
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
};



module.exports = {
  obtenerEmpresas,
  obtenerEmpresaPorUuid,
  cambiarEstadoEmpresa,
  editarEmpresa,
  crearEmpresa,
  actualizarEmpresa,
  eliminarEmpresa,
  getDelegadosEmpresa,
  obtenerEmpresas: obtenerEmpresasConUsuarios,
  obtenerEmpresaDelDelegado,
  eliminarDelegadoPorResponsable,
 asociarDelegado,

};
