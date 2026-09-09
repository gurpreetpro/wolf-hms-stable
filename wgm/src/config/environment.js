/**
 * Wolf Guard Mobile - Environment Configuration
 * 
 * Switch between development (local) and production (cloud) environments
 * by changing the ENV variable below.
 */

// Set to 'vps_cloud' for VPS deployment, 'development' for local
const ENV = 'vps_cloud';

// Production URL (VPS)
const VPS_URL = 'http://185.213.27.158/wolf';

const CONFIG = {
  development: {
    API_URL: 'http://10.0.2.2:5000/api',
    SOCKET_URL: 'http://10.0.2.2:5000',
    ENV_NAME: 'Development',
  },
  test_cloud: {
    API_URL: 'https://wolf-hms-server-test-fdurncganq-el.a.run.app/api',
    SOCKET_URL: 'https://wolf-hms-server-test-fdurncganq-el.a.run.app',
    ENV_NAME: 'Test Cloud',
  },
  vps_cloud: {
    API_URL: 'http://185.213.27.158/wolf/api',
    SOCKET_URL: 'http://185.213.27.158',
    ENV_NAME: 'VPS Cloud',
  },
  production: {
    API_URL: 'https://wolf-hms-server-1026194439642.asia-south1.run.app/api',
    SOCKET_URL: 'https://wolf-hms-server-1026194439642.asia-south1.run.app',
    ENV_NAME: 'Production',
  },
};

// Export the active configuration
export const API_URL = CONFIG[ENV].API_URL;
export const SOCKET_URL = CONFIG[ENV].SOCKET_URL;
export const ENV_NAME = CONFIG[ENV].ENV_NAME;
export const IS_PRODUCTION = ENV === 'production';
export const IS_DEVELOPMENT = ENV === 'development';

// Log the active environment on app start (disable in production)
if (!IS_PRODUCTION) {
  console.log(`🔧 Wolf Guard Mobile running in ${ENV_NAME} mode`);
  console.log(`   API: ${API_URL}`);
  console.log(`   Socket: ${SOCKET_URL}`);
}

export default {
  API_URL,
  SOCKET_URL,
  ENV_NAME,
  IS_PRODUCTION,
  IS_DEVELOPMENT,
};
