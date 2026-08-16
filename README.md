# ZQ Text Sandbox 8F4K2

第一个 Microsoft Store 测试应用。功能：

- 去除行首尾空格
- 合并多余空格
- 删除重复行
- 排序
- Pro：JSON 美化、标题格式转换
- 本地激活 Key 测试

## 本机运行

```bash
cd /Users/freevian/Developer/microsoft-test-project
npm ci
npm test
npm run validate
npm start
```

## Mac 生成 MSIX

首次准备工具：

```bash
brew install cmake
npm run package:msix:build-tool
```

生成包：

```bash
npm run package:msix
```

输出：

```text
/Users/freevian/Developer/microsoft-test-project/out/ZQTextSandbox8F4K2_1.0.0.0_x64.msix
```

打包链路：

```text
Electron Windows x64 文件
        ↓
Microsoft MSIX SDK makemsix
        ↓
ZQTextSandbox8F4K2_1.0.0.0_x64.msix
```

## 上传 Microsoft Store

Partner Center：

1. 打开 `ZQ Text Sandbox 8F4K2`。
2. 点击 **Start submission**。
3. 打开 **Packages**，上传上面的 `.msix`。
4. 填写商店文案、截图、年龄分级和分类。
5. 点击 **Submit for certification**。

包身份已经写入 `Package.appxmanifest`：

- Identity：`38959708.ZQTextSandbox8F4K2`
- Publisher：`CN=C6CECE36-E415-4146-A175-E0B24E2A5BE2`
- Publisher display name：`罗运来`

Store 提交使用未签名包；认证通过后由 Store 处理发布签名。

## 文件说明

- `Package.appxmanifest`：Store 包清单
- `scripts/package-msix-mac.mjs`：Mac 打包脚本
- `scripts/build-makemsix-mac.sh`：构建 MSIX SDK 工具
- `out/`：本地构建产物
- `.tools/`：本机工具缓存，不提交到 Git
