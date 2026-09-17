/**
 * logger.test.js — Unit tests for Centralized Winston Logger
 * 
 * Part of Wolf HMS Phase 6 Hardening (W2).
 */

const fs = require('fs');
const path = require('path');

describe('UNIT: Centralized Winston Logger (Phase 6 W2)', () => {
    const originalEnv = { ...process.env };
    const tempLogDir = path.join(__dirname, '..', 'fixtures_logger_test');
    const tempLogFile = path.join(tempLogDir, 'nested', 'test.log');

    afterEach(() => {
        process.env = { ...originalEnv };
        jest.resetModules();
    });

    afterAll(() => {
        if (fs.existsSync(tempLogDir)) {
            fs.rmSync(tempLogDir, { recursive: true, force: true });
        }
    });

    test('1. Logger instance exists with all standard log levels', () => {
        const logger = require('../../utils/logger');
        expect(logger).toBeDefined();
        expect(typeof logger.info).toBe('function');
        expect(typeof logger.warn).toBe('function');
        expect(typeof logger.error).toBe('function');
        expect(typeof logger.debug).toBe('function');
    });

    test('2. Honors LOG_LEVEL environment variable', () => {
        process.env.LOG_LEVEL = 'warn';
        const logger = require('../../utils/logger');
        expect(logger.level).toBe('warn');
    });

    test('3. Auto-creates missing log directory without crashing', () => {
        process.env.LOG_FILE = tempLogFile;
        // Verify target dir does not exist before require
        expect(fs.existsSync(path.dirname(tempLogFile))).toBe(false);

        const logger = require('../../utils/logger');
        expect(logger).toBeDefined();
        expect(fs.existsSync(path.dirname(tempLogFile))).toBe(true);

        // Writing a log entry should succeed without throwing
        expect(() => {
            logger.info('Test log line for automated test', { test: true });
        }).not.toThrow();
    });
});
