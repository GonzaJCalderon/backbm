const axios = require('axios');
const { getData } = require('../../src/controllers/renaperController');

// Mock axios
jest.mock('axios');

describe('RenaperController', () => {
    let mockRequest;
    let mockResponse;

    beforeEach(() => {
        mockRequest = {
            params: {
                nroDoc: '12345678'
            }
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        jest.clearAllMocks();
    });

    test('debería devolver datos cuando la consulta masculina es exitosa', async () => {
        const mockData = { nombre: 'Juan', apellido: 'Pérez' };
        axios.get.mockImplementationOnce(() => Promise.resolve({ data: mockData }))
            .mockImplementationOnce(() => Promise.reject());

        await getData(mockRequest, mockResponse);

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            data: mockData
        });
    });

    test('debería devolver datos cuando la consulta femenina es exitosa', async () => {
        const mockData = { nombre: 'Maria', apellido: 'González' };
        axios.get.mockImplementationOnce(() => Promise.reject())
            .mockImplementationOnce(() => Promise.resolve({ data: mockData }));

        await getData(mockRequest, mockResponse);

        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(mockResponse.status).toHaveBeenCalledWith(200);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: true,
            data: mockData
        });
    });

    test('debería devolver 404 cuando no se encuentran datos', async () => {
        axios.get.mockImplementationOnce(() => Promise.resolve({ data: null }))
            .mockImplementationOnce(() => Promise.resolve({ data: null }));

        await getData(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(404);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: false,
            message: 'No se encontraron datos para el número de documento proporcionado.'
        });
    });

    test('debería manejar errores de red', async () => {
        const networkError = new Error('Network Error');
        networkError.code = 'ECONNREFUSED';

        axios.get.mockImplementationOnce(() => Promise.reject(networkError))
            .mockImplementationOnce(() => Promise.reject(networkError));

        await getData(mockRequest, mockResponse);

        expect(mockResponse.status).toHaveBeenCalledWith(500);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: false,
            message: 'Error al obtener datos del endpoint externo',
            error: 'Error de conexión con el servidor'
        });
    });
});