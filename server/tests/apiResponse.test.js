/**
 * API Response Helpers Unit Tests
 */
const { success, error, notFound, paginated } = require('../../utils/apiResponse');

// Mock response object
const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('API Response Helpers', () => {
    
    describe('success()', () => {
        it('should return success response with data', () => {
            const res = mockRes();
            const data = { id: 1, name: 'Test' };
            
            success(res, data, 'Success');
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    message: 'Success',
                    data: data
                })
            );
        });
        
        it('should include timestamp', () => {
            const res = mockRes();
            success(res, null);
            
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    timestamp: expect.any(String)
                })
            );
        });
    });
    
    describe('error()', () => {
        it('should return error response with status code', () => {
            const res = mockRes();
            
            error(res, 'Something went wrong', 500);
            
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Something went wrong'
                })
            );
        });
    });
    
    describe('notFound()', () => {
        it('should return 404 status', () => {
            const res = mockRes();
            
            notFound(res, 'Patient not found');
            
            expect(res.status).toHaveBeenCalledWith(404);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Patient not found'
                })
            );
        });
    });
    
    describe('paginated()', () => {
        it('should return paginated response', () => {
            const res = mockRes();
            const items = [{ id: 1 }, { id: 2 }];
            
            paginated(res, items, 1, 10, 100);
            
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: true,
                    data: items,
                    pagination: {
                        page: 1,
                        limit: 10,
                        total: 100,
                        totalPages: 10
                    }
                })
            );
        });
    });
});
