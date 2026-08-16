import {
  collapseWhitespace,
  prettyJson,
  removeDuplicateLines,
  sortLines,
  titleCase,
  trimLines,
} from './transform.mjs';

const input = document.querySelector('#inputText');
const output = document.querySelector('#outputText');
const modeBadge = document.querySelector('#modeBadge');
const licenseState = document.querySelector('#licenseState');
const licenseInput = document.querySelector('#licenseInput');
const licenseForm = document.querySelector('#licenseForm');
const deactivateButton = document.querySelector('#deactivateButton');
const toast = document.querySelector('#toast');
const proButtons = [...document.querySelectorAll('[data-pro="true"]')];
let currentStatus = { active: false };
let toastTimer;

const errorLabels = {
  'empty-key': '请输入激活码。',
  'invalid-format': '激活码格式错误。',
  'invalid-payload': '激活码内容错误。',
  'unsupported-license': '这不是 Pro 激活码。',
  'bad-signature': '激活码校验失败。',
  expired: '激活码已过期。',
};

function notify(message, kind = 'info') {
  toast.textContent = message;
  toast.dataset.kind = kind;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2800);
}

function setOutput(value) {
  output.value = value;
  output.classList.toggle('has-content', Boolean(value));
}

function formatExpiry(value) {
  if (!value) return '永久有效';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '有效期已设置' : `有效期至 ${date.toLocaleDateString('zh-CN')}`;
}

function renderStatus(status) {
  currentStatus = status || { active: false };
  const active = Boolean(currentStatus.active);
  modeBadge.textContent = active ? 'PRO' : 'FREE';
  modeBadge.classList.toggle('pro', active);
  document.body.classList.toggle('pro-active', active);
  proButtons.forEach((button) => {
    button.classList.toggle('locked', !active);
    button.setAttribute('aria-label', active ? button.dataset.label : `${button.dataset.label}（需要 Pro）`);
  });

  if (active) {
    licenseState.textContent = `Pro 已激活 · ${formatExpiry(currentStatus.expiresAt)}`;
    deactivateButton.hidden = false;
  } else {
    licenseState.textContent = errorLabels[currentStatus.reason] || '免费版 · 输入激活码解锁 Pro';
    deactivateButton.hidden = true;
  }
}

function ensurePro() {
  if (currentStatus.active) return true;
  licenseInput.focus();
  notify('请先激活 Pro。', 'warn');
  return false;
}

function applyFreeOperation(operation) {
  const value = input.value;
  if (operation === 'trim') return trimLines(value);
  if (operation === 'spaces') return collapseWhitespace(value);
  if (operation === 'dedupe') return removeDuplicateLines(value);
  if (operation === 'sort') return sortLines(value);
  return value;
}

function runOperation(operation) {
  const button = document.querySelector(`[data-operation="${operation}"]`);
  if (button?.dataset.pro === 'true' && !ensurePro()) return;

  try {
    if (operation === 'json') {
      setOutput(prettyJson(input.value));
    } else if (operation === 'title') {
      setOutput(titleCase(input.value));
    } else {
      setOutput(applyFreeOperation(operation));
    }
    notify('完成。', 'success');
  } catch (error) {
    setOutput('');
    notify(error instanceof SyntaxError ? 'JSON 格式错误。' : '处理失败。', 'error');
  }
}

document.querySelectorAll('[data-operation]').forEach((button) => {
  button.addEventListener('click', () => runOperation(button.dataset.operation));
});

document.querySelector('#copyButton').addEventListener('click', async () => {
  if (!output.value) {
    notify('请先处理文字。', 'warn');
    return;
  }
  await window.quicktext.copyText(output.value);
  notify('已复制。', 'success');
});

document.querySelector('#clearButton').addEventListener('click', () => {
  input.value = '';
  setOutput('');
  input.focus();
});

document.querySelector('#sampleButton').addEventListener('click', () => {
  input.value = '  apple  \napple\n  banana  ';
  setOutput('');
  notify('已载入示例。');
});

licenseForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const status = await window.quicktext.activateLicense(licenseInput.value);
  renderStatus(status);
  if (status.active) {
    licenseInput.value = '';
    notify('Pro 已激活。', 'success');
  } else {
    notify(errorLabels[status.reason] || '激活码校验失败。', 'error');
  }
});

deactivateButton.addEventListener('click', async () => {
  renderStatus(await window.quicktext.deactivateLicense());
  notify('已退出 Pro。');
});

input.value = '  apple  \napple\n  banana  ';
setOutput('');
window.quicktext.getLicenseStatus().then(renderStatus);
