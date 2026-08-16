# ZQ Text Sandbox 8F4K2：第一个微软商店测试应用

这个空项目现在已经被做成一个可以跑的首版产品：**ZQ Text Sandbox 8F4K2**，本地文字工具。

首版目标是先形成完整闭环：

```text
Electron 应用 → Free/Pro → 本地签名激活码 → Windows x64 → MSIX → Partner Center
```

## 已经写好的部分

* 可运行的 Windows 桌面 UI；
* 去除行首尾空格、合并空格、删除重复行、排序；
* Pro 的 JSON 美化、标题格式转换；
* Ed25519 离线签名许可证；
* 本机保存激活状态；
* Electron x64 打包脚本；
* `Package.appxmanifest`、商店文案、隐私政策模板；
* Windows GitHub Actions MSIX 构建流程。

V1.0 采用离线签名 Key，不需要先建 License Server。生成 Key 的私钥留在 `secrets/`，不会进入安装包；应用只携带公钥。后续有销量后，再把激活替换成 `/license/activate` 服务端校验。

## 现在在本机运行

```bash
cd /Users/freevian/Developer/microsoft-test-project
npm install
npm run license:keys
npm test
npm run validate
npm start
```

生成一个用于手工测试的 Pro Key：

```bash
npm run license:generate -- --days 365
```

把命令输出的整段 Key 粘贴到应用中的激活框即可。`--days 0` 表示生成永久有效的测试 Key。

## 你负责的现实操作：按这个顺序做

### A. 注册 Partner Center

1. 用准备发布应用的 Microsoft 账号注册 Individual 开发者账号；
2. 完成身份、证件和自拍验证；
3. 进入 Apps & Games，创建产品并保留名称 `ZQ Text Sandbox 8F4K2`。

### B. 把商店身份写入 MSIX

保留应用名称后，在 Partner Center 复制这三个值：

* `Identity Name`；
* `Publisher`；
* `Publisher display name`。

在 Windows PowerShell 中设置环境变量：

```powershell
$env:STORE_IDENTITY_NAME = "从 Partner Center 复制的 Identity Name"
$env:STORE_PUBLISHER = "从 Partner Center 复制的 Publisher，例如 CN=..."
$env:STORE_PUBLISHER_DISPLAY_NAME = "你的商店显示名"
```

然后在 Windows 机器或 Windows GitHub Runner 上运行：

```powershell
npm ci
npm run validate
npm run package:msix
```

输出目录是：

```text
out\ZQTextSandbox8F4K2.msix
out\ZQTextSandbox8F4K2.msixupload
```

本地侧载使用 `.msix`；Partner Center 的 Packages 页面优先上传 `.msixupload`。

### C. 先做本地安装测试

在 Windows 上，如果要侧载测试，可以先生成开发证书：

```powershell
npx winapp cert generate
$env:SIGN_MSIX = "true"
npm run package:msix
npx winapp cert install .\devcert.pfx
Add-AppxPackage .\out\ZQTextSandbox8F4K2.msix
```

提交 Store 的包时开一个新 PowerShell 窗口，保持 `SIGN_MSIX` 未设置；Store 会在认证后重新签名。

然后逐项测试：安装、启动、四个 Free 操作、Pro Key 激活、JSON 操作、重启后状态保留、卸载。

### D. 准备 Partner Center 提交

在 Partner Center 的 Submission 中按以下最小路径填写：

```text
Pricing and availability：Free / Public / Make discoverable / Release as soon as possible
Properties：选择 Desktop / Productivity（或最接近的类别）
Age ratings：完成问卷
Packages：上传 out\ZQTextSandbox8F4K2.msixupload
Store listing：使用 store-listing\listing.zh-CN.md 或 listing.en-US.md
Screenshots：至少 1 张真实运行截图
```

截图用 Windows 真实运行的应用窗口，不要使用设计稿。第一版准备 1–3 张即可。

### E. 提交认证

确认下面几件事后点击 Submit for certification：

* 商店描述明确写了基础功能免费、部分高级功能需要许可证；
* 应用启动后不要求登录；
* 输入测试 Key 能解锁 Pro；
* 卸载后没有残留安装器或后台进程；
* 包内没有 `secrets/`、开发证书或调试文件。

## 以后改名时要改的地方

当前产品名是测试名 `ZQ Text Sandbox 8F4K2`。正式改名时同步修改：

* `package.json` 的 `productName`、`description`、`author`；
* `Package.appxmanifest` 的 DisplayName、Description；
* `src/index.html`、`src/renderer.js`、`src/styles.css` 中的展示文本；
* `store-listing/` 文案；
* `Assets/` 图标。

## 当前版本的边界

这版故意不做账号、云同步、在线支付和后台管理；最快先把第一个免费应用送进 Store。Pro Key 目前是离线签名版本，适合手工发 Key 验证交易闭环。销量稳定后，再接自动发 Key、设备数限制和 License Server。
