const axios = require('axios');

exports.getData = async (req, res) => {
    try {
        const nroDoc = req.params.nroDoc;

        // Ejecutar ambas solicitudes en paralelo
        const [responseM, responseF] = await Promise.allSettled([
            axios.get(`http://10.100.1.216:9501/api/v1/Renaper/GetDocumentoRenaper?nroDoc=${nroDoc}&sexo=M`),
            axios.get(`http://10.100.1.216:9501/api/v1/Renaper/GetDocumentoRenaper?nroDoc=${nroDoc}&sexo=F`)
        ]);

        // Verificar si ambas peticiones fallaron por error de red
        const networkError = [responseM, responseF].every(response =>
            response.status === 'rejected' &&
            response.reason &&
            (response.reason.code === 'ECONNREFUSED' ||
                response.reason.message === 'Network Error')
        );

        if (networkError) {
            return res.status(500).json({
                success: false,
                message: 'Error al obtener datos del endpoint externo',
                error: 'Error de conexión con el servidor'
            });
        }

        // Verificar si alguna respuesta es exitosa
        if (responseM.status === 'fulfilled' && responseM.value.data) {
            return res.status(200).json({
                success: true,
                data: responseM.value.data,
            });
        }

        if (responseF.status === 'fulfilled' && responseF.value.data) {
            return res.status(200).json({
                success: true,
                data: responseF.value.data,
            });
        }

        // Si ninguna tuvo datos válidos
        return res.status(404).json({
            success: false,
            message: 'No se encontraron datos para el número de documento proporcionado.',
            datos: responseM
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: 'Error al obtener datos del endpoint externo',
            error: error.message
        });
    }
};