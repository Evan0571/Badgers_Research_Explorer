# UW Research Explorer · Apple 组件与原版布局

BuildFest 黑客松项目：帮助 UW-Madison 学生从兴趣开始，理解、比较校内研究，并准备联系材料。

当前已实现首版组件库和可运行的前端流程：介绍首页、兴趣输入、有限资料集检索、研究详情、收藏、比较、逐封邮件草稿、个性化、附件和发送预览。本分支视觉依据 [Apple DESIGN.md](https://getdesign.md/apple/design-md)，规范见 [DESIGN.md](DESIGN.md)。这是第三方设计分析的实现，不是 Apple 官方组件包。

当前按用户要求保留 Apple 版组件样式，恢复原版左右分栏首页、内容分区和侧边导航；不再提供独立组件展示页。Claude 版本原样保留在原项目目录，Git 标签为 `claude-preview-2026-09-26`；上一版 Apple 展示布局保存在 `apple-showcase-2026-09-26`。来源、对应关系和运行方式见 [Apple 对照版说明](docs/APPLE-PREVIEW.md)。

**能力边界：** 当前只检索 4 位真实教授的公开来源快照，不是全校实时检索；草稿使用本地模板，不调用 AI；UW 邮箱验证码、Microsoft 365 授权和真实发送尚未实现。发送按钮禁用，接口返回 503，不伪造授权或发送状态。完整 P0 范围保留在 PRD 中。

## 本地运行

需要 Node.js 22.13+ 或 24。

```bash
npm install
npm run dev -- --port 3002
```

打开 [当前预览](http://127.0.0.1:3002)，工作区在 [/explore](http://127.0.0.1:3002/explore)。[Claude 原版](http://127.0.0.1:3000)使用独立目录与端口。当前版本不需要任何 API key。

```bash
npm run typecheck
npm test
npm run build
npm run start -- --port 3002
```

## 技术与目录

- Next.js App Router、React、TypeScript；原生 CSS tokens、Radix Dialog、Phosphor 图标，自托管字体。
- `src/components/ui/`：直接用于产品界面的通用交互组件。
- `src/app/tokens.css`、`apple.css`：Apple 版视觉和组件样式；`layout.css`：原版布局的适配。
- `src/components/explorer/`：探索、详情、比较、邮件和浏览器状态。
- `src/data/researchers.ts`：明确标注的有限公开资料集，包含来源、核查日期和未知条件。
- `src/lib/`：检索、草稿验证、数据类型和持久化校验。
- `src/app/api/resume/`：PDF、DOCX、TXT 文字提取；不保留原文件、不提供 OCR。
- `src/app/api/capabilities/`：真实能力标记；`api/mail/send/` 在接入完成前拒绝发送。
- `docs/PRD.md`、`docs/BRD.md`：需求原文；[实施状态](docs/IMPLEMENTATION.md)；[验证记录](docs/VERIFICATION.md)。

访客查询、收藏、备注和草稿保存在当前浏览器 localStorage；明确选择的附件保存在 IndexedDB。没有跨设备同步或账户系统，清理浏览器数据会删除记录。上传用于阅读的简历不会自动成为邮件附件。

## 团队协作

克隆仓库：

```bash
git clone https://github.com/Evan0571/BuildFest_project.git
cd BuildFest_project
```

为每个功能创建独立分支，完成后通过 Pull Request 合并到 `main`。

请勿提交 API 密钥、密码或本地 `.env` 文件；需要环境变量时可提供不含真实凭据的 `.env.example`。
