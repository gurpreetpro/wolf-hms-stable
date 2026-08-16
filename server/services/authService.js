const QRCode = require('qrcode');
let generateSecret, verifyToken;

try {
  const speakeasy = require('speakeasy');
  generateSecret = function(username) {
    const secret = speakeasy.generateSecret({ name: `WOLF HMS (${username})` });
    return {
      secret: secret.base32,
      otpauth_url: secret.otpauth_url
    };
  };
  verifyToken = function(secret, token) {
    return speakeasy.totp.verify({
      secret: secret,
      encoding: 'base32',
      token: token,
      window: 1
    });
  };
} catch (e) {
  const { authenticator } = require('otplib');
  generateSecret = function(username) {
    const secret = authenticator.generateSecret();
    const otpauth_url = authenticator.keyuri(username, 'WOLF HMS', secret);
    return {
      secret: secret,
      otpauth_url: otpauth_url
    };
  };
  verifyToken = function(secret, token) {
    return authenticator.check(token, secret);
  };
}

module.exports = { generateSecret, verifyToken };