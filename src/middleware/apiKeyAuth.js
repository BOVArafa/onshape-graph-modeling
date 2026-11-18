const crypto = require('node:crypto');

const API_KEY_HEADER = 'x-api-key';

function hashKey(value) {
  return crypto.createHash('sha256').update(value).digest();
}

function isSameKey(providedKey, expectedKey) {
  return crypto.timingSafeEqual(hashKey(providedKey), hashKey(expectedKey));
}

function createApiKeyAuth(expectedApiKey) {
  return function requireApiKey(request, response, next) {
    const providedKey = request.get(API_KEY_HEADER) ?? '';
    if (!isSameKey(providedKey, expectedApiKey)) {
      return response.status(401).json({ error: 'API Key ausente ou inválida' });
    }
    return next();
  };
}

module.exports = { createApiKeyAuth, API_KEY_HEADER };
