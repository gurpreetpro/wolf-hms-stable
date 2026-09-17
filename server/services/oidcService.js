/**
 * oidcService.js — OpenID Connect (OIDC) Service for Wolf HMS
 * 
 * Part of Wolf HMS Phase 5 Hardening (W1).
 * Provides lazy discovery and client instantiation for enterprise IdPs (Azure AD, Google Workspace, Keycloak).
 * If required environment variables are absent, OIDC remains completely disabled.
 */

const { Issuer, generators } = require('openid-client');

let oidcClient = null;
let oidcIssuer = null;
let mockClientOverride = null;

/**
 * Checks if all required OIDC environment variables are present.
 * @returns {boolean}
 */
const isConfigured = () => {
    return !!(
        process.env.OIDC_ISSUER_URL &&
        process.env.OIDC_CLIENT_ID &&
        process.env.OIDC_CLIENT_SECRET &&
        process.env.OIDC_REDIRECT_URI
    );
};

/**
 * Lazily initializes and returns the OIDC client.
 * Returns null if not configured.
 * @param {Object} [options] - Optional overrides for testing
 * @returns {Promise<Object|null>}
 */
const getClient = async (options = {}) => {
    if (mockClientOverride) {
        return mockClientOverride;
    }

    if (!isConfigured() && !options.force) {
        return null;
    }

    if (oidcClient) {
        return oidcClient;
    }

    const issuerUrl = options.issuerUrl || process.env.OIDC_ISSUER_URL;
    const clientId = options.clientId || process.env.OIDC_CLIENT_ID;
    const clientSecret = options.clientSecret || process.env.OIDC_CLIENT_SECRET;
    const redirectUri = options.redirectUri || process.env.OIDC_REDIRECT_URI;

    try {
        const discoverFn = options.discover || Issuer.discover;
        oidcIssuer = await discoverFn(issuerUrl);

        oidcClient = new oidcIssuer.Client({
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uris: [redirectUri],
            response_types: ['code']
        });

        console.log(`[SSO] OIDC client initialized with issuer: ${issuerUrl}`);
        return oidcClient;
    } catch (err) {
        console.error('[SSO] Failed to initialize OIDC client:', err.message);
        throw err;
    }
};

/**
 * Allows test suites to inject a mocked OIDC client or reset state.
 */
const setMockClient = (mockClient) => {
    mockClientOverride = mockClient;
};

const resetClient = () => {
    oidcClient = null;
    oidcIssuer = null;
    mockClientOverride = null;
};

module.exports = {
    isConfigured,
    getClient,
    generators,
    setMockClient,
    resetClient
};
