// __tests__/middleware/validateDocumentNumber.test.js

const validateDocumentNumber = require('../../src/middlewares/renaperMiddleware');

describe('validateDocumentNumber Middleware', () => {
    let mockRequest;
    let mockResponse;
    let nextFunction;

    beforeEach(() => {
        // Reset mocks antes de cada test
        mockRequest = {
            params: {}
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        nextFunction = jest.fn();
    });

    test('debería permitir un número válido', () => {
        mockRequest.params.nroDoc = '12345678';

        validateDocumentNumber(mockRequest, mockResponse, nextFunction);

        expect(nextFunction).toHaveBeenCalled();
        expect(mockResponse.status).not.toHaveBeenCalled();
    });

    test('debería rechazar un número menor al mínimo', () => {
        mockRequest.params.nroDoc = '4999999';

        validateDocumentNumber(mockRequest, mockResponse, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: false,
            message: 'El número de documento debe estar entre 5.000.000 y 99.999.999'
        });
    });

    test('debería rechazar valores no numéricos', () => {
        mockRequest.params.nroDoc = 'abc123';

        validateDocumentNumber(mockRequest, mockResponse, nextFunction);

        expect(mockResponse.status).toHaveBeenCalledWith(400);
        expect(mockResponse.json).toHaveBeenCalledWith({
            success: false,
            message: 'El número de documento debe ser un número válido'
        });
    });
});