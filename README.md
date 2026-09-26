# UW Research Explorer

帮助 UW-Madison 学生从兴趣出发理解、比较研究，并准备逐人联系材料。当前沿用已确认的 Apple 风格组件与原版布局，无独立组件说明页。

后端已接入 OpenAI 联网检索、来源核查、AI 草稿、简历建议、邮件验证码、持久任务和发送历史。本机已配置 OpenAI；Resend 域名和真实验证码投递已验证。Outlook 本人邮箱发送已完成微软应用配置和真实授权，用户批准的一封自发测试邮件已确认出现在收件箱和已发送邮件；详见 [验证记录](docs/VERIFICATION.md)。

邮箱归属通过验证码验证；发信前另行连接同一个 UW Outlook 邮箱，连接时可能跳转学校认证页。邮件通过 Microsoft Graph 从本人邮箱发出并保存到 Outlook 已发送邮件。Resend 只发验证码，项目不读取收件箱。配置步骤见 [Outlook 接入说明](docs/OUTLOOK-SETUP.md)。

## 启动

需要 Node.js 22.13+，建议本机使用 Node 24。

```powershell
npm ci
# 首次运行时复制 .env.example 为 .env.local，并按说明填写凭据。
npm run check:config
npm run dev -- --port 3002
```

[当前预览](http://127.0.0.1:3002) · [探索工作区](http://127.0.0.1:3002/explore)

完整配置、API、实际搜索逻辑、发送状态和限制见 [后端说明](docs/BACKEND.md)。`APP_ORIGIN` 要与浏览器地址一致。密钥只能放在本分支工作目录的 `.env.local`，不提交 Git。

```powershell
npm run typecheck
npm test
npm run build
npm run start -- --port 3002
```

构建前停止同一目录的 Next 服务。原 Claude 版在独立目录、[3000 端口](http://127.0.0.1:3000)及 `claude-preview-2026-09-26` 标签保留。纯 Apple 展示布局保存在 `apple-showcase-2026-09-26`；后端修改前的已确认前端保存在 `frontend-approved-2026-09-26`。

## 结构

- `src/server/`：OpenAI、网页检索与证据、SQLite、验证码、持久任务、逐封发送。
- `src/app/api/`：有输入校验、会话约束和速率限制的服务接口。
- `src/components/explorer/`：产品流程及异步任务恢复。
- `src/components/ui/`、`src/app/{tokens,apple,layout}.css`：现有组件与视觉布局。
- `src/data/researchers.ts`：旧示例与历史收藏兼容；真实搜索失败时不会回退到此数据。
- `docs/PRD.md`、`docs/BRD.md`：原始需求；[实施状态](docs/IMPLEMENTATION.md)；[验证记录](docs/VERIFICATION.md)。

浏览器保存查询、收藏、备注、草稿和附件；服务器 SQLite 保存任务、来源及发送历史。当前没有跨设备同步。发送快照的正文和附件加密保存，数据库目录 `.data/` 已排除提交。简历分析与邮件附件是两个独立操作。

设计依据第三方 [Apple DESIGN.md](https://getdesign.md/apple/design-md)，不是 Apple 官方组件包；来源见 [DESIGN.md](DESIGN.md) 和 [设计对照说明](docs/APPLE-PREVIEW.md)。
