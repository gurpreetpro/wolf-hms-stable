/**
 * openapiCoverage.test.js — Verifies that OpenAPI 3.1 Contract covers all new modular route paths
 * 
 * Part of Wolf HMS Phase 3 Hardening.
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

describe('OpenAPI 3.1 Contract Coverage (Phase 3)', () => {
    let openapiSpec;
    let specPaths;

    beforeAll(() => {
        const specPath = path.resolve(__dirname, '../../../docs/openapi.yaml');
        expect(fs.existsSync(specPath)).toBe(true);
        const fileContent = fs.readFileSync(specPath, 'utf8');
        openapiSpec = yaml.load(fileContent);
        specPaths = Object.keys(openapiSpec.paths || {});
    });

    test('OpenAPI spec is valid OpenAPI 3.1.x document', () => {
        expect(openapiSpec.openapi).toMatch(/^3\.1\.\d+/);
        expect(openapiSpec.info).toBeDefined();
        expect(openapiSpec.info.title).toBe('Wolf HMS API Contract');
        expect(specPaths.length).toBeGreaterThanOrEqual(30);
    });

    test('Covers all core authentication and clinical endpoints', () => {
        const coreRequired = [
            '/api/auth/login',
            '/api/auth/token/refresh',
            '/api/auth/logout',
            '/api/emergency/trigger',
            '/api/emergency/status',
            '/api/security/location',
            '/api/security/sos',
            '/api/security/patrols/start',
            '/api/opd/queue',
            '/api/admissions/active',
            '/api/lab/orders',
            '/api/finance/invoices',
            '/api/health'
        ];

        coreRequired.forEach(route => {
            expect(specPaths).toContain(route);
        });
    });

    test('Covers all routes declared in systemRoutes.js', () => {
        const systemRoutesPath = path.resolve(__dirname, '../../routes/systemRoutes.js');
        const content = fs.readFileSync(systemRoutesPath, 'utf8');
        
        // Extract router.(get|post|put|delete|all) paths
        const routeRegex = /router\.(get|post|put|delete|all)\(\s*['"]([^'"]+)['"]/g;
        let match;
        const systemRoutes = [];
        while ((match = routeRegex.exec(content)) !== null) {
            let p = match[2];
            // Normalize path params e.g. :code -> {code}
            p = p.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
            systemRoutes.push('/api' + p);
        }

        expect(systemRoutes.length).toBeGreaterThan(0);
        systemRoutes.forEach(r => {
            expect(specPaths).toContain(r);
        });
    });

    test('Covers all routes declared in securityCompatRoutes.js', () => {
        const securityCompatPath = path.resolve(__dirname, '../../routes/securityCompatRoutes.js');
        const content = fs.readFileSync(securityCompatPath, 'utf8');
        
        const routeRegex = /router\.(get|post|put|delete|all)\(\s*['"]([^'"]+)['"]/g;
        let match;
        const compatRoutes = [];
        while ((match = routeRegex.exec(content)) !== null) {
            let p = match[2];
            p = p.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
            compatRoutes.push('/api' + p);
        }

        expect(compatRoutes.length).toBeGreaterThan(0);
        compatRoutes.forEach(r => {
            expect(specPaths).toContain(r);
        });
    });

    test('Covers all routes declared in setupRoutes.js', () => {
        const setupRoutesPath = path.resolve(__dirname, '../../routes/setupRoutes.js');
        const content = fs.readFileSync(setupRoutesPath, 'utf8');
        
        const routeRegex = /router\.(get|post|put|delete|all)\(\s*['"]([^'"]+)['"]/g;
        let match;
        const setupRoutes = [];
        while ((match = routeRegex.exec(content)) !== null) {
            let p = match[2];
            p = p.replace(/:([a-zA-Z0-9_]+)/g, '{$1}');
            setupRoutes.push('/api' + p);
        }

        expect(setupRoutes.length).toBeGreaterThan(0);
        setupRoutes.forEach(r => {
            expect(specPaths).toContain(r);
        });
    });
});
