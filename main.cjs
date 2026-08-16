const {
  app,
  BrowserWindow,
  Menu,
  clipboard,
  ipcMain,
  session,
} = require('electron');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const {
  normalizeLicenseKey,
  readPublicKey,
  verifyLicenseKey,
} = require('./shared/license.cjs');

const APP_NAME = 'ZQ Text Sandbox 8F4K2';
const ACTIVATION_FILE = 'activation.json';
const INSTALL_FILE = 'install.json';
let mainWindow;

app.setName(APP_NAME);

function userDataFile(name) {
  return path.join(app.getPath('userData'), name);
}

function readJson(name, fallback) {
  try {
    return JSON.parse(fs.readFileSync(userDataFile(name), 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJson(name, value) {
  const target = userDataFile(name);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function getInstallId() {
  const current = readJson(INSTALL_FILE, null);
  if (current && typeof current.installId === 'string' && current.installId.length > 10) {
    return current.installId;
  }

  const installId = crypto.randomUUID();
  writeJson(INSTALL_FILE, {
    installId,
    createdAt: new Date().toISOString(),
    platform: process.platform,
    arch: process.arch,
  });
  return installId;
}

function getPublicKey() {
  return readPublicKey(path.join(__dirname, 'shared', 'license-public-key.pem'));
}

function makeInactiveStatus(reason = 'not-activated') {
  return {
    active: false,
    plan: 'free',
    reason,
    appVersion: app.getVersion(),
  };
}

function getLicenseStatus() {
  const activation = readJson(ACTIVATION_FILE, null);
  if (!activation || typeof activation.token !== 'string') {
    return makeInactiveStatus();
  }

  const verified = verifyLicenseKey(activation.token, getPublicKey());
  if (!verified.valid) {
    return makeInactiveStatus(verified.reason || 'invalid-license');
  }

  return {
    active: true,
    plan: verified.payload.plan,
    licenseId: verified.payload.id,
    expiresAt: verified.payload.exp,
    activatedAt: activation.activatedAt,
    installId: activation.installId,
    appVersion: app.getVersion(),
  };
}

function activateLicense(rawKey) {
  const token = normalizeLicenseKey(rawKey);
  if (!token) {
    return makeInactiveStatus('empty-key');
  }

  const verified = verifyLicenseKey(token, getPublicKey());
  if (!verified.valid) {
    return makeInactiveStatus(verified.reason || 'invalid-license');
  }

  const installId = getInstallId();
  writeJson(ACTIVATION_FILE, {
    token,
    installId,
    licenseId: verified.payload.id,
    activatedAt: new Date().toISOString(),
  });
  return getLicenseStatus();
}

function deactivateLicense() {
  try {
    fs.rmSync(userDataFile(ACTIVATION_FILE), { force: true });
  } catch {
    // The app is already in the desired state.
  }
  return getLicenseStatus();
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 900,
    minHeight: 640,
    backgroundColor: '#f5f7fb',
    title: APP_NAME,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  if (process.env.QUICKTEXT_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

function registerIpc() {
  ipcMain.handle('license:status', () => getLicenseStatus());
  ipcMain.handle('license:activate', (_event, rawKey) => activateLicense(rawKey));
  ipcMain.handle('license:deactivate', () => deactivateLicense());
  ipcMain.handle('app:info', () => ({
    name: APP_NAME,
    version: app.getVersion(),
    platform: os.platform(),
    arch: process.arch,
    onlineLicense: false,
  }));
  ipcMain.handle('clipboard:write', (_event, text) => {
    clipboard.writeText(String(text || ''));
    return true;
  });
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  registerIpc();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
