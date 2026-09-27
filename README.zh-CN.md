<div align="center">

<img src="public/brand/badgers-research-explorer.png" alt="Badgers Research Explorer 项目标志" width="88" />

# Badgers Research Explorer

**从好奇出发，找到研究的起点。**

面向 UW–Madison 学生，帮助你发现研究、理解方向，并迈出联系导师的第一步。

[English](README.md) · **简体中文**

[访问网站](https://researchexplorer.online) · [开始探索](https://researchexplorer.online/explore) · [本地运行](#本地运行) · [项目文档](#项目文档)

[![网站](https://img.shields.io/badge/Website-researchexplorer.online-C5050C?style=flat-square)](https://researchexplorer.online) [![Next.js](https://img.shields.io/badge/Next.js-16-171717?style=flat-square&logo=nextdotjs)](package.json) [![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](tsconfig.json)

</div>

<a href="https://researchexplorer.online">
  <img src="docs/images/home.png" alt="Badgers Research Explorer 线上首页：从兴趣出发，并展示附有来源的真实研究案例" width="100%" />
</a>

## 为学生找到研究的起点

寻找研究导师时，信息往往散落在不同的教师主页里。研究术语不熟悉，也不知道第一封邮件该怎么写。**Badgers Research Explorer** 把研究发现、导师比较和逐人联系整合进同一个工作区，帮助 UW–Madison 学生从兴趣走向行动。

一个问题、一个主题，或者一位研究者的名字，都可以作为起点。不需要先准备好简历，也不要求已有科研经验。

## 从好奇到联系

| 步骤         | 你可以做什么                                                                                   |
| ------------ | ---------------------------------------------------------------------------------------------- |
| **探索研究** | 用中文或英文描述兴趣，搜索已有的教师目录，也可通过公开网页检索扩展发现范围。                   |
| **理解方向** | 阅读易懂的研究解释，查看原始来源，区分已有依据、信息缺失和需要更新的内容。                     |
| **比较选择** | 收藏研究者、记录笔记、比较研究方向，再决定联系谁。                                             |
| **准备材料** | 按需补充个人背景，或上传 PDF、DOCX、TXT 简历；为每位导师准备邮件，并在应用 AI 修改前预览内容。 |
| **发起联系** | 验证 UW 邮箱并连接同一个 Outlook 账户，逐封检查邮件与附件，在联系历史中查看提交状态。          |

> **研究方向相关，不代表实验室正在招人。** 研究匹配、公开联系方式和招生信息分别核查；没有依据的信息会保留为未知。

<details>
<summary><strong>查看探索工作区</strong></summary>

<br />
<img src="docs/images/workspace.png" alt="探索工作区：研究兴趣输入、可选个人背景、简历上传，以及侧边栏中的完整操作流程" width="100%" />

截图来自 2026 年 9 月 27 日的线上网站。目录覆盖范围会随数据更新变化。

</details>

## 技术栈

| 层次       | 技术                                                                                    |
| ---------- | --------------------------------------------------------------------------------------- |
| 应用框架   | Next.js App Router · React · TypeScript                                                 |
| 界面       | CSS 设计变量 · Radix UI · Phosphor Icons                                                |
| AI 辅助    | OpenAI：兴趣解析、网页发现、研究解释和写作辅助                                          |
| 数据       | Supabase / PostgreSQL 保存生产环境状态与共享教师目录；SQLite 保存本地开发环境的应用状态 |
| 邮件       | Microsoft Entra + Microsoft Graph 连接 Outlook 发信；Resend 发送验证码                  |
| 文档解析   | `pdf-parse` + 原生 canvas 处理 PDF；Mammoth 处理 DOCX                                   |
| 部署与检查 | Vercel · Vitest · Playwright                                                            |

浏览器通过服务端 API 使用外部服务，服务密钥保留在服务器。共享教师目录只包含公开的职业信息，生产环境的应用状态存放在独立的私有数据库 schema 中。

## 本地运行

需要 **Node.js 22.13+**，推荐使用 Node.js 24。

```bash
git clone https://github.com/Evan0571/BuildFest_project.git
cd BuildFest_project
npm ci
```

将 [`.env.example`](.env.example) 复制为 `.env.local`，再按需配置以下服务：

| 环境变量                                                                | 用途                                                                                                            |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `APP_ORIGIN`                                                            | 必须与浏览器访问地址完全一致；下方启动命令对应 `http://127.0.0.1:3002`。                                        |
| `APP_ENCRYPTION_KEY`                                                    | 用于加密服务端数据的 64 位十六进制密钥；生成命令见 `.env.example`。                                             |
| `OPENAI_API_KEY`、`OPENAI_MODEL`                                        | AI 发现与写作功能；调用可能产生服务商费用。                                                                     |
| `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`                             | 连接你自己的共享教师目录；导入前先应用[目录数据库迁移](supabase/migrations/202609270001_research_catalog.sql)。 |
| `DATABASE_URL`                                                          | 生产环境的 PostgreSQL 应用状态；本地留空时使用 SQLite。                                                         |
| `RESEND_API_KEY`、`VERIFICATION_FROM`                                   | 使用已验证发件域名发送 UW 邮箱验证码。                                                                          |
| `MICROSOFT_CLIENT_ID`、`MICROSOFT_CLIENT_SECRET`、`MICROSOFT_TENANT_ID` | Outlook 授权与发信，见 [Outlook 接入说明](docs/OUTLOOK-SETUP.md)。                                              |

```bash
npm run check:config
npm run dev -- --port 3002
```

打开 [http://127.0.0.1:3002](http://127.0.0.1:3002)。`check:config` 只检查配置是否存在，不验证服务商凭据是否有效。

新克隆的代码**不包含**生产数据库或已填充的教师目录。请按[目录说明](docs/CATALOG.md)配置并导入你自己的数据。未配置的集成功能不可用；搜索失败时不会用演示人物代替真实结果。凭据保存在已被 Git 忽略的 `.env.local` 中。

<details>
<summary><strong>开发检查与生产构建</strong></summary>

```bash
npm run typecheck
npm test -- --maxWorkers=2
npm run build
npm run start -- --port 3002
```

构建前请停止使用同一工作目录的开发服务。云端部署请参考 [Vercel 部署说明](docs/VERCEL-DEPLOYMENT.md)，完成 PostgreSQL 数据库迁移、环境变量和 Outlook 回调地址配置。

</details>

## 由你保存，由你确认

- **浏览器工作区：** 兴趣、收藏、笔记、草稿和附件保存在当前浏览器中，不会自动跨设备或跨网站域名同步。
- **可选简历：** 支持含文本的 PDF、DOCX 和 TXT，文件上限 3 MiB；PDF 最多 20 页，扫描件需要先做 OCR。提取文本不会保留原始上传文件，也不会自动将其附在邮件中。
- **发送前审核：** AI 修改可以预览、应用和撤销。Outlook 发信需要邮箱验证和账户授权，应用不读取收件箱；服务商接受邮件提交也不代表已经送达。
- **服务端持久化：** 生产环境使用 PostgreSQL 保存会话、任务和联系历史，并加密保存敏感邮件快照、附件及 Outlook 令牌。运行细节见[部署与持久化说明](docs/VERCEL-DEPLOYMENT.md)。

## 项目结构

```text
src/app/                 页面与服务端 API
src/components/explorer/ 研究发现、比较、草稿与联系历史
src/components/ui/       共用界面组件
src/server/              AI、来源证据、存储、文档解析与邮件
src/lib/                 共用类型、校验与浏览器辅助逻辑
supabase/migrations/     教师目录与应用状态数据库迁移
scripts/                 配置检查、数据导入与验证脚本
docs/                    产品、部署、设计与验证记录
```

## 项目文档

| 文档                                            | 内容                                   |
| ----------------------------------------------- | -------------------------------------- |
| [Vercel 部署](docs/VERCEL-DEPLOYMENT.md)        | 当前生产环境、存储、环境变量与运行限制 |
| [研究目录](docs/CATALOG.md)                     | 公开数据来源、导入流程与证据覆盖范围   |
| [Outlook 接入](docs/OUTLOOK-SETUP.md)           | 微软应用注册、账户授权与发送流程       |
| [后端参考](docs/BACKEND.md)                     | API 行为、校验、任务与邮件工作流       |
| [验证记录](docs/VERIFICATION.md)                | 带日期的测试、部署验证与已知边界       |
| [产品需求](docs/PRD.md) · [设计说明](DESIGN.md) | 产品目标与界面设计决策                 |

技术文档包含带日期的开发历史；当前托管方式以部署说明为准。

---

为 **Badger BuildFest** 构建。面向 UW–Madison 的独立学生项目，并非学校官方服务。项目图标与设计参考见[品牌资源](docs/BRAND-ASSET.md)和[设计说明](DESIGN.md)。
