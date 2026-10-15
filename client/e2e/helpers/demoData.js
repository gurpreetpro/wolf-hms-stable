import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDED_PATH = path.resolve(__dirname, '..', '..', '..', 'plans', 'seeded_ids.json');

/** Reads the golden-seed identifiers produced by `npm --prefix server run demo:seed`. */
export function demoData() {
    if (!fs.existsSync(SEEDED_PATH)) {
        throw new Error(`Missing ${SEEDED_PATH} — run "npm --prefix server run demo:seed" first`);
    }
    return JSON.parse(fs.readFileSync(SEEDED_PATH, 'utf8'));
}

/** Demo logins (username/password) for each clinical persona. */
export function demoUser(role = 'admin') {
    const data = demoData();
    const entry = data.demoLogins && data.demoLogins[role];
    if (entry) return entry;
    return { username: 'admin', password: 'password123', role };
}

/** API origin used for direct HTTP assertions (backend, not the Vite dev server). */
export const API_ORIGIN = process.env.E2E_API_ORIGIN || 'http://127.0.0.1:8080';
export const HOSPITAL_ID = 1;

/** Bucket C route patterns that are allowed to 404 (intentionally disabled modules). */
export function bucketCPaths() {
    const p = path.resolve(__dirname, '..', '..', '..', 'plans', 'bucket_c_routes.json');
    if (!fs.existsSync(p)) return [];
    const { routes } = JSON.parse(fs.readFileSync(p, 'utf8'));
    return routes.map(r => r.path);
}
