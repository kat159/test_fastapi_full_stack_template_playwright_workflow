# Playwright 自动化测试脚本文档

## 📁 脚本文件列表

### 1. 完整订阅+聊天机器人测试
- **本地版本**: `frontend/playwright-subscription-test.cjs`
- **GitHub Actions版本**: `.github/scripts/playwright-subscription-test.js`
- **GitHub Actions工作流**: `.github/workflows/playwright-subscription-monitoring.yml`

### 2. 独立聊天机器人测试
- **本地版本**: `frontend/playwright-chatbot-test.cjs`

### 3. 原始注册测试 (之前创建的)
- **本地版本**: `frontend/playwright-signup-test.cjs`
- **GitHub Actions版本**: `.github/scripts/playwright-signup-test.js`
- **GitHub Actions工作流**: `.github/workflows/playwright-signup-monitoring.yml`

## 🚀 功能说明

### 完整订阅+聊天机器人测试脚本功能:

1. **🗑️ 清理测试用户** - 删除之前的测试账户
2. **📱 用户注册** - 使用 `playwright@test.com` 注册新账户
3. **🔐 自动登录** - 如果需要，自动完成登录流程
4. **📋 导航到订阅页面** - 点击 "Manage Subscriptions"
5. **👤 找到 Greg Lam 订阅** - 定位 Greg Lam (Dublin Ward 3) 的订阅选项
6. **✅ 勾选订阅开关** - 智能处理 Chakra UI Switch 组件，启用订阅
7. **🤖 访问聊天界面** - 点击左侧的 Greg Lam 按钮
8. **🆕 开始新对话** - 点击 "Start New Chat" 按钮
9. **💬 发送测试消息** - 发送测试消息给聊天机器人
10. **🔍 验证响应** - 检查聊天机器人是否有回应
11. **📸 截图记录** - 保存操作过程和结果的截图

## 🎯 技术亮点

### 智能元素定位
- **多重选择器策略**: 使用多种选择器来定位元素，提高成功率
- **Chakra UI 适配**: 专门处理 Chakra UI 框架的组件
- **发送按钮检测**: 正确识别 `button[aria-label="Send message"]` 并检查启用状态

### 错误处理
- **截图调试**: 失败时自动截图便于问题排查
- **多种点击策略**: 如果直接点击失败，会尝试强制点击或键盘操作
- **状态验证**: 每步操作后验证状态是否正确

### GitHub Actions 集成
- **定时运行**: 每6小时自动运行测试
- **Slack 通知**: 测试成功/失败时发送详细的 Slack 通知
- **截图上传**: 自动上传测试截图到 GitHub Actions artifacts

## 📊 测试结果

最新测试结果显示所有功能正常工作:
- ✅ 用户注册成功
- ✅ 订阅 Greg Lam 成功
- ✅ 进入聊天界面成功
- ✅ 发送消息成功 (使用正确的发送按钮)
- ✅ 收到聊天机器人回应: "Hello! I'd be happy to help you with information about Dublin Ward"

## 🛠️ 运行方式

### 本地运行
```bash
# 完整测试 (注册 + 订阅 + 聊天)
cd frontend
node playwright-subscription-test.cjs

# 只测试聊天机器人 (需要已有订阅)
node playwright-chatbot-test.cjs

# 只测试注册
node playwright-signup-test.cjs
```

### GitHub Actions
- **自动运行**: 每6小时或每2小时 (注册测试)
- **手动触发**: 在 GitHub Actions 页面手动运行
- **Slack 通知**: 配置 `SLACK_WEBHOOK_URL_FOR_MONITORING` 密钥

## 🔧 配置要求

### 环境变量
- `WEBSITE_URL`: 测试网站地址 (默认: https://denistek.online/)

### GitHub Secrets
- `SLACK_WEBHOOK_URL_FOR_MONITORING`: Slack webhook URL (用于通知)
- `WEBSITE_URL`: 网站地址 (可选，有默认值)

## 📝 测试账户信息

- **邮箱**: `playwright@test.com`
- **密码**: `TestPassword123!`
- **姓名**: `Playwright Test User`

## 🎉 总结

这套自动化测试脚本提供了完整的端到端测试覆盖:
1. 用户注册流程
2. 订阅管理功能
3. 聊天机器人交互
4. 自动化监控和通知

所有脚本都经过实际测试验证，能够稳定运行并提供详细的日志和截图记录。
