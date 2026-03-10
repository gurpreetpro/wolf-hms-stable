/**
 * Error Classes Unit Tests
 */
const { 
    AppError, 
    ValidationError, 
    NotFoundError, 
    AuthenticationError,
    asyncHandler 
} = require('../../utils/errors');

describe('Custom Error Classes', () => {
    
    describe('AppError', () => {
        it('should create error with message and status code', () => {
            const error = new AppError('Test error', 400);
            
            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(400);
            expect(error.isOperational).toBe(true);
        });
    });
    
    describe('ValidationError', () => {
        it('should have 400 status code', () => {
            const error = new ValidationError('Invalid input');
            
            expect(error.statusCode).toBe(400);
            expect(error.name).toBe('ValidationError');
        });
        
        it('should include details if provided', () => {
            const details = ['Field required', 'Invalid format'];
            const error = new ValidationError('Validation failed', details);
            
            expect(error.details).toEqual(details);
        });
    });
    
    describe('NotFoundError', () => {
        it('should have 404 status code', () => {
            const error = new NotFoundError('Patient');
            
            expect(error.statusCode).toBe(404);
            expect(error.message).toBe('Patient not found');
        });
    });
    
    describe('AuthenticationError', () => {
        it('should have 401 status code', () => {
            const error = new AuthenticationError();
            
            expect(error.statusCode).toBe(401);
            expect(error.message).toBe('Authentication required');
        });
    });
    
    describe('asyncHandler', () => {
        it('should pass errors to next middleware', async () => {
            const mockNext = jest.fn();
            const mockReq = {};
            const mockRes = {};
            
            const asyncFn = async () => {
                throw new Error('Test error');
            };
            
            const handler = asyncHandler(asyncFn);
            await handler(mockReq, mockRes, mockNext);
            
            expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
