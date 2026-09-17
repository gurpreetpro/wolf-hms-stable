/**
 * socketCluster.test.js
 * 
 * Unit tests for Socket.IO Redis clustering adapter attachment (W1).
 * Confirms default-off single-node behavior when REDIS_URL is omitted,
 * and confirms proper pub/sub adapter binding when REDIS_URL is provided.
 */

const { attachAdapter } = require('../../services/socketCluster');

describe('SocketCluster Service (W1 — Realtime Clustering)', () => {
    let mockIo;

    beforeEach(() => {
        mockIo = {
            adapter: jest.fn()
        };
    });

    test('should no-op and return null when redisUrl is absent or empty (default-off)', () => {
        const resNull = attachAdapter(mockIo, null);
        expect(resNull).toBeNull();
        expect(mockIo.adapter).not.toHaveBeenCalled();

        const resUndefined = attachAdapter(mockIo, undefined);
        expect(resUndefined).toBeNull();
        expect(mockIo.adapter).not.toHaveBeenCalled();

        const resEmpty = attachAdapter(mockIo, '');
        expect(resEmpty).toBeNull();
        expect(mockIo.adapter).not.toHaveBeenCalled();
    });

    test('should throw error when redisUrl is provided but io is invalid', () => {
        expect(() => {
            attachAdapter(null, 'redis://localhost:6379');
        }).toThrow(/valid Socket.IO server instance is required/);

        expect(() => {
            attachAdapter({}, 'redis://localhost:6379');
        }).toThrow(/valid Socket.IO server instance is required/);
    });

    test('should create pub/sub pair and attach adapter when redisUrl is provided', () => {
        const eventsRegistered = {};
        const mockPub = {
            on: jest.fn((event, cb) => { eventsRegistered[`pub_${event}`] = cb; }),
            duplicate: jest.fn(() => mockSub)
        };
        const mockSub = {
            on: jest.fn((event, cb) => { eventsRegistered[`sub_${event}`] = cb; })
        };

        const MockRedis = jest.fn().mockImplementation((url, opts) => {
            expect(url).toBe('redis://127.0.0.1:6379');
            expect(opts.enableReadyCheck).toBe(false);
            expect(typeof opts.retryStrategy).toBe('function');
            expect(opts.retryStrategy(2)).toBe(200);
            expect(opts.retryStrategy(50)).toBe(3000);
            return mockPub;
        });

        const mockAdapterInstance = { name: 'mockRedisAdapter' };
        const mockCreateAdapter = jest.fn().mockReturnValue(mockAdapterInstance);

        const result = attachAdapter(mockIo, 'redis://127.0.0.1:6379', {
            RedisClient: MockRedis,
            createAdapter: mockCreateAdapter
        });

        expect(result).toBeDefined();
        expect(result.pubClient).toBe(mockPub);
        expect(result.subClient).toBe(mockSub);
        expect(mockCreateAdapter).toHaveBeenCalledWith(mockPub, mockSub);
        expect(mockIo.adapter).toHaveBeenCalledWith(mockAdapterInstance);
        expect(mockPub.on).toHaveBeenCalledWith('error', expect.any(Function));
        expect(mockSub.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
});
