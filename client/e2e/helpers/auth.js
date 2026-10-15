import { expect } from '@playwright/test';
import { demoUser, API_ORIGIN, HOSPITAL_ID } from './demoData.js';

/**
 * Authenticate the SPA.
 *
 * Fast path (default): fetch a real JWT from the API, then inject it into
 * localStorage before the app boots. Deterministic and immune to login-page
 * animation timing.
 *
 * `loginViaUi(page, role)` exercises the real form (used once, in the journey,
 * to prove the login screen itself works).
 */
export async function loginAs(page, role = 'admin') {
    const { username, password } = demoUser(role);

    const res = await page.request.post(`${API_ORIGIN}/api/auth/login`, {
        data: { username, password },
        headers: { 'Content-Type': 'application/json' },
    });
    expect(res.ok(), `API login failed for ${username}: ${res.status()} ${await res.text()}`).toBeTruthy();
    const body = await res.json();
    const payload = body.data || body;
    expect(payload.token, 'login response must carry a token').toBeTruthy();

    const state = {
        token: payload.token,
        user: payload.user,
        hospitalId: (payload.user && payload.user.hospital_id) || HOSPITAL_ID,
    };

    await page.addInitScript((s) => {
        window.localStorage.setItem('token', s.token);
        window.localStorage.setItem('user', JSON.stringify(s.user));
        window.localStorage.setItem('hospitalId', String(s.hospitalId));
    }, state);

    return state;
}

/** Drive the real login form (proves the Reception/front-desk entry point works). */
export async function loginViaUi(page, role = 'admin') {
    const { username, password } = demoUser(role);
    await page.goto('/login');
    await page.getByPlaceholder(/username/i).first().fill(username);
    await page.locator('input[type="password"]').first().fill(password);
    await page.getByRole('button', { name: /log\s?in|sign\s?in/i }).first().click();
    await page.waitForURL((url) => !/\/login/.test(url.pathname), { timeout: 30_000 });
    await expect(page.locator('body')).not.toContainText('Invalid response from server');
}
