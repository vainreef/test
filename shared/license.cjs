const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const LICENSE_PREFIX = 'QT1';
const DEFAULT_PUBLIC_KEY_PATH = path.join(__dirname, 'license-public-key.pem');

function toBase64Url(value) {
  return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value) {
  return Buffer.from(value, 'base64url');
}

function normalizeLicenseKey(value) {
  return String(value || '').trim().replace(/[\s\u200b]+/g, '');
}

function readPublicKey(filePath = DEFAULT_PUBLIC_KEY_PATH) {
  return fs.readFileSync(filePath, 'utf8');
}

function ensureKeyPair({
  privateKeyPath = path.join(process.cwd(), 'secrets', 'license-private-key.pem'),
  publicKeyPath = DEFAULT_PUBLIC_KEY_PATH,
} = {}) {
  if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    return { privateKeyPath, publicKeyPath, created: false };
  }

  if (!fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
    throw new Error('The public key already exists. Restore the matching private key before generating licenses.');
  }

  fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true });
  fs.mkdirSync(path.dirname(publicKeyPath), { recursive: true });
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  fs.writeFileSync(
    privateKeyPath,
    privateKey.export({ type: 'pkcs8', format: 'pem' }),
    { mode: 0o600 },
  );
  fs.writeFileSync(
    publicKeyPath,
    publicKey.export({ type: 'spki', format: 'pem' }),
    'utf8',
  );
  return { privateKeyPath, publicKeyPath, created: true };
}

function buildLicensePayload({ days = 365, licenseId } = {}) {
  const now = Date.now();
  const expiresAt = Number(days) > 0
    ? new Date(now + Number(days) * 24 * 60 * 60 * 1000).toISOString()
    : null;

  return {
    v: 1,
    id: licenseId || `QT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
    plan: 'pro',
    iat: new Date(now).toISOString(),
    exp: expiresAt,
    maxDevices: 1,
  };
}

function createLicenseKey({ privateKey, days = 365, licenseId } = {}) {
  if (!privateKey) throw new Error('A private key is required.');
  const payload = buildLicensePayload({ days, licenseId });
  const payloadSegment = toBase64Url(JSON.stringify(payload));
  const signedContent = `${LICENSE_PREFIX}.${payloadSegment}`;
  const signature = crypto.sign(null, Buffer.from(signedContent), privateKey);
  return `${signedContent}.${toBase64Url(signature)}`;
}

function verifyLicenseKey(rawToken, publicKey, now = Date.now()) {
  const token = normalizeLicenseKey(rawToken);
  if (!token) return { valid: false, reason: 'empty-key' };

  const segments = token.split('.');
  if (segments.length !== 3 || segments[0] !== LICENSE_PREFIX) {
    return { valid: false, reason: 'invalid-format' };
  }

  let payload;
  let signature;
  try {
    payload = JSON.parse(fromBase64Url(segments[1]).toString('utf8'));
    signature = fromBase64Url(segments[2]);
  } catch {
    return { valid: false, reason: 'invalid-payload' };
  }

  if (!payload || payload.v !== 1 || payload.plan !== 'pro' || !payload.id) {
    return { valid: false, reason: 'unsupported-license' };
  }

  let signatureValid = false;
  try {
    signatureValid = crypto.verify(
      null,
      Buffer.from(`${LICENSE_PREFIX}.${segments[1]}`),
      publicKey,
      signature,
    );
  } catch {
    signatureValid = false;
  }
  if (!signatureValid) return { valid: false, reason: 'bad-signature' };

  if (payload.exp && new Date(payload.exp).getTime() <= now) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, payload };
}

module.exports = {
  LICENSE_PREFIX,
  DEFAULT_PUBLIC_KEY_PATH,
  buildLicensePayload,
  createLicenseKey,
  ensureKeyPair,
  normalizeLicenseKey,
  readPublicKey,
  verifyLicenseKey,
};
