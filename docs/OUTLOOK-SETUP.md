# Outlook 本人邮箱发送

用户于 2026-09-26 选择：连接并授权 Outlook 后在网站内发送，接受连接时跳转学校认证页面。Resend 继续只发送验证码。以下是当前 Web 服务的配置，不是桌面公共客户端配置。

## 微软应用

在有应用注册权限的 Microsoft Entra 目录中为 Research Explorer 创建独立注册，不覆盖其他项目的注册：

| 设置 | 值 |
| --- | --- |
| 名称 | Research Explorer |
| 平台 | Web（服务端机密客户端） |
| 账号类型 | UW 目录内注册可只支持此目录；外部自有目录中注册则选组织多租户 |
| 当前回调 | `http://127.0.0.1:3002/api/outlook/callback` |
| Graph 委托权限 | `User.Read`、`Mail.Send` |
| 代码额外请求的 OIDC 范围 | `openid`、`profile`、`offline_access` |

不需要 `Mail.Read`、`Mail.ReadWrite`、`Mail.Send.Shared` 或应用级 `Mail.Send`。保持隐式授权和公共客户端流关闭。`offline_access` 用于服务器刷新已授予的授权，不意味着读取邮件。学校策略仍可能要求管理员批准这些委托权限。

当前浏览器使用 **127.0.0.1**。按微软的 [回调地址限制](https://learn.microsoft.com/en-us/entra/identity-platform/reply-url)，HTTP 127.0.0.1 回调需要通过应用清单中的 `web.redirectUris` 设置；控制台输入框可能只接受 HTTP localhost。不要为了绕过输入框直接改浏览器地址，否则会换到不同的 Cookie 和本地草稿存储。若确实改成 localhost，必须同时调整 `APP_ORIGIN`、注册回调和使用地址，并自行处理旧浏览器数据。

只有创建客户端凭据时才能查看其完整 **Value**，Secret ID 不能代替 Value。由应用所有者创建并保存到本工作目录的 `.env.local`，不要放进聊天、前端代码或 Git：

```dotenv
MICROSOFT_CLIENT_ID=<Application (client) ID>
MICROSOFT_CLIENT_SECRET=<Client secret Value>
MICROSOFT_TENANT_ID=<单租户 Directory (tenant) ID，或多租户 organizations>
APP_ORIGIN=http://127.0.0.1:3002
```

已有 `APP_ENCRYPTION_KEY` 必须保留；令牌缓存、发送正文与附件都使用它加密。记录凭据的到期时间，到期前由应用所有者更新。运行 `npm run check:config` 查看布尔配置状态，再重启服务；检查配置通过不代表真实授权已通过。

上线后另加精确的 HTTPS 正式回调，更新 `APP_ORIGIN` 并重新连接。单纯购买域名和验证 Resend 发件域名不会创建 Microsoft 应用，也不会部署网站。

## 用户连接与验证

1. 在邮件工作区用验证码验证 UW 主邮箱。
2. 点击 **Connect Outlook**，在微软/学校页面选择同一个邮箱，审阅权限后授权。
3. 回到工作区确认 **Outlook connected** 及发件地址。服务器会拒绝主邮箱不一致的账号，即使其登录别名与验证码邮箱相同。
4. 预览逐封内容和附件，再明确点击发送。Graph 接受后记录 `accepted`，不声称已经投递或被阅读。邮件保存到本人 Outlook 已发送邮件。
5. 首次真实联调应由用户指定测试收件人、内容和发送范围；不能用教授地址做默认测试。当前未发送教授联系邮件。

若显示需要管理员批准，必须由学校 IT 审核；换端点、密码登录或伪造 From 都不能解决此权限要求。断开连接会删除本应用的令牌并取消排队邮件；如需撤回微软端授权，可在微软账号的应用权限页面处理。

每封附件合计限制 2 MB，整批 6 MB。使用 Graph 简单发送接口；没有收件箱同步或大附件上传权限。网络超时、5xx 或进程中断后的不确定提交不会自动重发，应先查看 Outlook 已发送邮件。

## 协议依据

- [Microsoft Graph sendMail](https://learn.microsoft.com/en-us/graph/api/user-sendmail?view=graph-rest-1.0)：委托 `Mail.Send`、保存已发送邮件、202 只代表请求已接受。
- [MSAL Node 请求](https://learn.microsoft.com/en-us/entra/msal/javascript/node/acquire-token-requests)：授权码和静默令牌获取。
- [授权码流程](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)：PKCE、state、回调和服务器凭据。
- [用户同意策略](https://learn.microsoft.com/en-us/entra/identity/enterprise-apps/manage-app-consent-policies)：组织策略可限制用户授权。
