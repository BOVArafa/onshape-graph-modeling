const crypto = require('node:crypto');

const NONCE_LENGTH = 25;
const NONCE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const DEFAULT_CONTENT_TYPE = 'application/json';

function createNonce() {
  let nonce = '';
  for (let index = 0; index < NONCE_LENGTH; index += 1) {
    nonce += NONCE_ALPHABET[crypto.randomInt(NONCE_ALPHABET.length)];
  }
  return nonce;
}

function buildSignaturePayload({ method, nonce, date, contentType, path, query }) {
  return `${method}\n${nonce}\n${date}\n${contentType}\n${path}\n${query}\n`.toLowerCase();
}

function signPayload(payload, secretKey) {
  return crypto.createHmac('sha256', secretKey).update(payload).digest('base64');
}

function buildAuthHeaders({
  method,
  url,
  contentType = DEFAULT_CONTENT_TYPE,
  nonce = createNonce(),
  date = new Date().toUTCString(),
  accessKey = process.env.ONSHAPE_ACCESS_KEY,
  secretKey = process.env.ONSHAPE_SECRET_KEY,
}) {
  const { pathname, searchParams } = new URL(url);
  const payload = buildSignaturePayload({
    method,
    nonce,
    date,
    contentType,
    path: pathname,
    query: searchParams.toString(),
  });
  const signature = signPayload(payload, secretKey);

  return {
    'Content-Type': contentType,
    Date: date,
    'On-Nonce': nonce,
    Authorization: `On ${accessKey}:HmacSHA256:${signature}`,
  };
}

module.exports = { createNonce, buildAuthHeaders };
