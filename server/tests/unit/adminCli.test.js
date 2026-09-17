/**
 * adminCli.test.js — Unit Tests for Administrative Database CLI
 */

const { runAdminCli, parseArgs } = require('../../scripts/admin-cli');

describe('Admin CLI Tool (Phase 2)', () => {
    const VALID_TOKEN = 'test_valid_migration_cli_token_123';
    const origEnv = process.env;

    beforeEach(() => {
        process.env = {
            ...origEnv,
            MIGRATION_CLI_TOKEN: VALID_TOKEN
        };
    });

    afterAll(() => {
        process.env = origEnv;
    });

    test('should parse command line arguments correctly', () => {
        const argv = [
            'node',
            'admin-cli.js',
            '--sql', 'SELECT 1;',
            '--token', 'my-token',
            '--dry-run',
            '--hospital', '3'
        ];
        const args = parseArgs(argv);
        expect(args.sql).toBe('SELECT 1;');
        expect(args.token).toBe('my-token');
        expect(args.dryRun).toBe(true);
        expect(args.hospitalId).toBe(3);
    });

    test('should reject execution if MIGRATION_CLI_TOKEN is unset in environment', async () => {
        delete process.env.MIGRATION_CLI_TOKEN;

        const res = await runAdminCli(null, ['node', 'admin-cli.js', '--sql', 'SELECT 1;']);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/MIGRATION_CLI_TOKEN is not configured/);
    });

    test('should reject execution if provided token mismatches MIGRATION_CLI_TOKEN', async () => {
        const res = await runAdminCli(null, ['node', 'admin-cli.js', '--sql', 'SELECT 1;', '--token', 'wrong_token']);
        expect(res.success).toBe(false);
        expect(res.error).toMatch(/Invalid or missing administrative token/);
    });

    test('should execute query with mock database client when token is valid', async () => {
        const mockQuery = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ id: 1, name: 'Main Hospital' }] });
        const mockRelease = jest.fn();
        const mockPool = {
            connect: jest.fn().mockResolvedValue({
                query: mockQuery,
                release: mockRelease
            })
        };

        const res = await runAdminCli(mockPool, [
            'node',
            'admin-cli.js',
            '--sql', 'SELECT * FROM hospitals;',
            '--token', VALID_TOKEN,
            '--hospital', '1'
        ]);

        expect(res.success).toBe(true);
        expect(mockPool.connect).toHaveBeenCalled();
        expect(mockQuery).toHaveBeenCalledWith(`SELECT set_config('app.current_tenant', $1, false)`, ['1']);
        expect(mockQuery).toHaveBeenCalledWith('SELECT * FROM hospitals;');
        expect(mockRelease).toHaveBeenCalled();
        expect(res.rowCount).toBe(1);
    });

    test('should prefix query with EXPLAIN when --dry-run is supplied', async () => {
        const mockQuery = jest.fn().mockResolvedValue({ rowCount: 1, rows: [{ 'QUERY PLAN': 'Seq Scan on users' }] });
        const mockRelease = jest.fn();
        const mockPool = {
            connect: jest.fn().mockResolvedValue({
                query: mockQuery,
                release: mockRelease
            })
        };

        const res = await runAdminCli(mockPool, [
            'node',
            'admin-cli.js',
            '--sql', 'UPDATE users SET role = \'admin\' WHERE id = 10;',
            '--token', VALID_TOKEN,
            '--dry-run'
        ]);

        expect(res.success).toBe(true);
        expect(mockQuery).toHaveBeenCalledWith("EXPLAIN UPDATE users SET role = 'admin' WHERE id = 10;");
        expect(mockRelease).toHaveBeenCalled();
    });
});
