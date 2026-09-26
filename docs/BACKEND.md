# 后端接入与运行

2026-09-26。此版本在 `codex/research-backend` 分支，基于已确认的前端标签 `frontend-approved-2026-09-26`。Apple 组件和原版布局保留；Claude 版本仍在原目录及 `claude-preview-2026-09-26` 标签。

## 当前状态

已实现 OpenAI 联网搜索、原始网页抓取和证据校验、AI 研究解释、逐人邮件草稿、可确认的简历建议、邮件验证码、数据库任务状态，以及逐封邮件提交和历史记录。原来的四人资料集只用于首页示例和旧收藏兼容，不作为搜索失败的替代结果。

本机已配置 OpenAI 与 Resend 凭据；Resend 域名查询接口已真实返回成功。域名 `researchexplorer.online` 已添加到 Resend，Cloudflare DNS 已按当前 Resend 控制台要求配置，公网 DNS-over-HTTPS 查询已能读取全部记录。验证码发件地址为 `Research Explorer <verify@researchexplorer.online>`；真实收件联调状态见 [VERIFICATION.md](VERIFICATION.md)。模型回答质量仍需单独评估，配置存在不能当成完整端到端验证。

用户已选择 OpenAI，并确认发信前连接、授权 Outlook，接受连接时可能出现学校认证页。邮箱验证码仍用于证明归属；它不能授予发信权限。项目通过微软官方登录页面授权，不收集学校密码。

教授联系邮件改为 Microsoft Graph `/me/sendMail`，实际 From 由用户授权的邮箱确定，保存到该邮箱的已发送邮件。平台代发适配器已移除；Resend 只发送验证码。Outlook 代码与模拟测试已完成，真实微软应用配置及邮箱授权仍待完成，当前发送入口保持禁用。详见 [OUTLOOK-SETUP.md](OUTLOOK-SETUP.md)。

## 配置与启动

需要 Node.js 22.13+（本机测试 Node 24）。使用 Next.js Node 服务和持久磁盘，不能直接部署到无状态 Edge 或每次请求重置文件系统的函数环境。

1. 在**本分支的工作目录**将 `.env.example` 复制为 `.env.local`。当前本机文件已创建，并已生成独立的 `APP_ENCRYPTION_KEY`，无需覆盖。
2. 填写 `OPENAI_API_KEY`，确保项目可使用 Responses API、web_search 和所选模型。`OPENAI_MODEL` 默认 `gpt-5.5`，可改为账号实际可用且支持这些功能的模型。
3. 邮箱验证码需要 `RESEND_API_KEY` 和 `VERIFICATION_FROM`。From 必须是邮件服务允许的发件地址；通常需先在 Resend 验证自己的域名。不要填学生的 `@wisc.edu` 地址作为平台 From。
4. `APP_ENCRYPTION_KEY` 为 64 位十六进制随机值，用于验证码摘要、发送正文、附件和 Microsoft 令牌缓存的加密。更换密钥会使旧快照和连接无法解密，数据库与密钥需要一起备份。
5. 按 [Outlook 接入说明](OUTLOOK-SETUP.md) 注册 Microsoft Entra Web 应用，填写 `MICROSOFT_CLIENT_ID`、`MICROSOFT_CLIENT_SECRET`、`MICROSOFT_TENANT_ID`。只请求委托 `User.Read` 和 `Mail.Send`；不申请应用级邮箱权限或读取收件箱权限。
6. `APP_ORIGIN` 必须与浏览器的实际地址完全一致；当前是 `http://127.0.0.1:3002`。换端口、使用 localhost 或正式域名时同时修改。

```powershell
npm ci
npm run check:config
npm run dev -- --port 3002
```

生产预览：停止同一目录正在运行的 Next 进程，再执行：

```powershell
npm run typecheck
npm test
npm run build
npm run start -- --port 3002
```

不要在运行 production server 的同一个目录同时重建 `.next`。修改 `.env.local` 后重启服务。`npm run check:config` 只显示是否配置，不输出密钥。配置完整不等于凭据有效，后者需要真实请求验证。

### 本机发信域名

域名注册与 DNS 位于 Cloudflare，Resend 区域为 `us-east-1`。2026-09-26 按 Resend 为此域名实际生成的记录配置：

| 类型 | 名称 | 目标 / 内容 |
| --- | --- | --- |
| TXT | `resend._domainkey` | 此域名在 Resend 控制台生成的 DKIM 公钥 |
| CNAME | `rsend` | `rsend.forge.rmta.net`，DNS only |
| CNAME | `send` | `send.forge.rmta.net`，DNS only |
| TXT | `_dmarc` | `v=DMARC1; p=none;`，初始观察策略 |

TTL 均为 Auto。不要依据旧教程额外叠加冲突的 SPF/MX 记录；以后更换服务时以提供商当前给出的值为准。尚未启用收信服务或创建该域名的收件箱。网站仍运行在本机 3002，注册域名与验证发信域名不等于网站已经部署。

## 搜索与 AI 的实际逻辑

1. 用户自然语言交给 OpenAI Responses API 的 `web_search`，先限定 UW 域名寻找相关的在职研究者；不使用原来的关键词表来决定真实搜索结果。
2. 模型整理候选人，但候选 UW 资料页必须实际出现在检索来源列表中。服务器独立读取网页；外部个人/实验室网站必须由已经读取的 UW 页面明确链接。
3. 服务器只访问 HTTPS 公网地址，校验每次重定向、限制主机、固定已校验 DNS 地址，并限制网页大小和请求时间。
4. 模型基于实际取得的正文生成结构化说明。服务端要求身份与条件有原文片段支撑；缺失、冲突或无法核对的招募、学分、报酬条件为 unknown。邮箱必须真的出现在正文中。表单与项目申请途径单独保留。
5. 单次查找目标最多 6 人，结构化输出上限 8 人；这是有限检索结果，不代表全校穷尽名单。相同查询缓存 6 小时；页面显示核查时间与缓存状态。
6. 筛选和比较已返回的结果在浏览器进行，所以调整筛选仍然很快。首次联网搜索需要多次模型请求，耗时取决于模型与网页。

原文引证与语义校验能降低编造风险，但不保证模型不会误解网页。遇到登录墙、反爬、动态渲染页或读取失败，会明确说明或省略该候选人。当前不读取全文论文、不执行网页脚本、不承诺提供职位或录取概率。

简历文字提取在服务器短暂处理 PDF/DOCX/TXT，不保存原始上传，不提供 OCR。用户明确点击 AI 分析时才把文字发给 OpenAI；提议字段要经过确认才进入背景。草稿生成只读取已确认的姓名、专业、年级和经历，不读取未确认简历。草稿仍需人工核对；生成新草稿不会覆盖现有手动编辑。

## 验证与发送

验证码 6 位、10 分钟有效、最多 5 次尝试、每分钟最多请求一次，按浏览器、邮箱和全局限流。成功后绑定当前浏览器会话与 UW 邮箱，验证状态持续 24 小时。没有开发后门、固定验证码或在日志里打印验证码。

连接 Outlook 使用官方 MSAL Node、授权码、PKCE、state 与 nonce；回调只能消费一次。Graph 返回的主邮箱必须与已验证 UW 邮箱完全一致，不能用匹配的登录别名替代不同的主邮箱。每次发送前刷新令牌并重新核查账号。断开连接会删除本应用保存的令牌并取消排队邮件；不会撤销已经提交的邮件或自动撤销微软端授权。

发送前逐封保存不可变正文、收件人、实际发件人、附件字节和校验信息；同一次确认具有幂等键，并阻止同一草稿的重复提交。预览确认的发件地址必须与当前连接邮箱一致。单次最多 6 封；附件 PDF/DOCX/TXT，每封附件总计最多 2 MB，整批附件最多 6 MB。浏览器附件不存在或大小变化时拒绝发送。

每封发送前重新抓取其公开联系方式并通过模型检查当前身份和联系途径。来源不可读、联系地址消失或明确关闭等情况不会提交邮件。验证码过期、登出或账号变化会取消尚未提交的消息。

- `queued`：已持久保存，尚未提交；可取消或在服务重启后人工继续。
- `submitting`：已领取提交任务；不能再取消。
- `accepted`：邮件服务确认接收请求，**不代表投递、阅读或回复**。
- `failed`：来源检查失败或服务明确拒绝；可查看原内容后人工重试。
- `unknown`：超时、网络中断、服务异常或中断提交；可能已经发出，禁止自动或普通重试，应先在 Outlook 已发送邮件中核对。Graph 的 `client-request-id` 只用于诊断，不提供发送幂等保证。
- `cancelled`：提交前取消。

历史只显示当前浏览器会话与已验证邮箱所属的真实数据库记录；草稿或导出不产生发送记录。手动进度备注与服务状态分开。没有投递 Webhook、收件箱同步或自动读取教授回复。

## 数据与部署边界

SQLite 默认位于 `.data/research.sqlite`，WAL 模式。会话 Cookie 为 HttpOnly、SameSite=Lax，HTTPS 环境启用 Secure。写接口检查 Origin，服务端验证请求体并限制流式上传大小。密钥只在服务器环境中，正文与附件快照用 AES-256-GCM 加密，日志不输出文档、正文、验证码或提供商响应。

查询结果、收藏、草稿仍保留在当前浏览器；任务状态、来源快照、验证码摘要和发送历史在 SQLite。草稿任务结果也会暂存在本地数据库任务表中，不要公开数据库文件。清理浏览器 Cookie 会失去该浏览器历史的访问会话；跨设备同步属于后续范围，不能把当前验证码功能理解为完整账号云同步。

异步工作由 Next `after()` 执行，数据库保存状态。它能恢复已完成结果和部分成功草稿，但不是独立常驻任务队列；进程中断后，搜索任务会明确失败并要求重试，排队邮件需要人工继续。部署前仍需确定持久磁盘、备份/保留期、共享设备的数据策略，并根据用户规模选择外部数据库和任务工作进程。当前服务只在本机回环地址运行。

## API

| 路径                             | 用途                                         |
| -------------------------------- | -------------------------------------------- |
| GET `/api/capabilities`          | 返回配置状态，不承诺外部凭据有效             |
| POST `/api/search`               | 创建异步真实检索任务，202 返回任务 ID        |
| GET `/api/jobs/:id`              | 查询当前会话任务及部分/最终结果              |
| POST `/api/drafts/generate`      | 每位研究者独立生成草稿，部分失败保留成功结果 |
| POST `/api/resume`               | 有大小限制的简历文字提取                     |
| POST `/api/resume/analyze`       | 可审阅的 AI 简历建议                         |
| GET / DELETE `/api/auth/session` | 会话验证状态 / 登出邮箱                      |
| POST `/api/auth/request-code`    | 发送真实邮箱验证码                           |
| POST `/api/auth/verify-code`     | 核对并消费验证码                             |
| POST `/api/outlook/connect`      | 为已验证会话创建 Microsoft 授权链接         |
| GET `/api/outlook/callback`      | 消费单次回调，核对邮箱并加密保存令牌         |
| POST `/api/outlook/disconnect`   | 删除本地令牌并取消尚未提交的消息             |
| POST `/api/mail/send`            | 确认不可变批次后提交，配置不完整时拒绝       |
| GET / PATCH `/api/mail/history`  | 历史、取消排队消息、手动备注                 |
| POST `/api/mail/retry`           | 人工确认后恢复指定排队消息或重试明确失败消息 |

## 验证

自动测试覆盖来源证据、未知条件、账号隔离、验证码与 OAuth 回调过期/重放、邮箱不匹配、授权撤回、连接并发变化、流式请求上限、任务部分恢复、不可变快照、并发提交防重、超时禁止重试、附件一致性和提供商状态分类。OpenAI、Resend、MSAL 和 Graph 的提供商边界使用显式模拟响应；测试不发送真实邮件。

`npm run probe:sources` 可独立验证网页抓取链路，不调用 AI，也不发送邮件。已实际读取 UW 计算机科学研究组页面。浏览器验证与最终构建结果见 `docs/VERIFICATION.md`。

服务协议参考：[OpenAI web search](https://developers.openai.com/api/docs/guides/tools-web-search)、[Structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs)、[Resend send email](https://resend.com/docs/api-reference/emails/send-email)、[Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0)、[MSAL Node](https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests)、[Node SQLite](https://nodejs.org/api/sqlite.html)。
