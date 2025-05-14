const axios = require('axios');

exports.getData = async (req, res) => {
  const { nroDoc } = req.params;

  try {
    const [responseM, responseF] = await Promise.allSettled([
      axios.get(`http://10.100.1.216:9501/api/v1/Renaper/GetDocumentoRenaper`, {
        params: { nroDoc, sexo: 'M' }
      }),
      axios.get(`http://10.100.1.216:9501/api/v1/Renaper/GetDocumentoRenaper`, {
        params: { nroDoc, sexo: 'F' }
      })
    ]);

    // Verificar si ambas fallaron por problema de red
    const networkError = [responseM, responseF].every(res =>
      res.status === 'rejected' &&
      res.reason &&
      (res.reason.code === 'ECONNREFUSED' || res.reason.message === 'Network Error')
    );

    if (networkError) {
      return res.status(500).json({
        resultado: -1,
        mensaje: 'No se pudo conectar al servicio externo RENAPER.',
      });
    }

    // Función para validar que la respuesta sea útil
    const esValida = (res) =>
      res.status === 'fulfilled' &&
      res.value?.data?.resultado === 0 &&
      res.value?.data?.persona;

    // Devolver la que sea válida
    if (esValida(responseM)) {
      return res.status(200).json(responseM.value.data);
    }

    if (esValida(responseF)) {
      return res.status(200).json(responseF.value.data);
    }

    // Si ninguna fue válida
    return res.status(404).json({
      resultado: 1,
      mensaje: 'No se encontraron datos para este DNI en RENAPER.',
    });

  } catch (error) {
    console.error('❌ Error al consultar RENAPER:', error.message);
    return res.status(500).json({
      resultado: -1,
      mensaje: 'Error inesperado al consultar RENAPER.',
      detalle: error.message,
    });
  }
};
