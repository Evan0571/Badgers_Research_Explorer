# 第二轮选题调研：为什么不直接用社交媒体或通用 AI？

日期：2026-09-26。仅做研究与讨论，未开始实现。

## 本轮约束

用户已否定住房工具：目前提出的房源/租期匹配没有证明优于在现有社交媒体发帖。此方向退出当前候选。科研名单、问答、邮件生成等信息类产品也不能因使用 AI 而自动成立。

评估每个候选时，同时比较：现有学校工具、发帖/问同学、直接用通用 AI、简单手工操作。通用 AI 配合工具也能执行很多任务，因此不能把“AI 绝对做不到”作为卖点。需要证明专用工具减少了持续提供上下文、重复操作和核对结果的成本。

研究方式：检索 r/UWMadison 公开讨论并交叉查看官方现有功能。针对提交错误，扩展到 r/canvas 和其他高校；这些材料只证明跨校现象，不能据此声称 UW–Madison 已验证高频需求。没有调查问卷、用户访谈、完整 subreddit 抓取或发生率统计。

## 候选一：提交作业时的自动核验

### 证据

- [2026-09-23，r/canvas：Canvas assignment missing, but I submitted it](https://www.reddit.com/r/canvas/comments/1wntjk8/canvas_assignment_missing_but_i_submitted_it/)：发帖人认为已上传编程作业，次日发现缺交。评论对原因有不同猜测；不能据帖子认定 Canvas 丢失文件。
- [2026-02-19，r/ucla：Gradescope uploading issues](https://www.reddit.com/r/ucla/comments/1r9f4so/gradescope_uploading_issues/)：发帖人称五页作业中两页显示空白；同一 PDF 发给助教时也空白，因此故障可能在文件而非 Gradescope。
- [2026-03-24，r/udub：Submission right before the deadline](https://www.reddit.com/r/udub/comments/1s2sw4k/submission_right_before_the_deadline/)：交错版本后看到零分，联系教师后获准修正。这是华盛顿大学，不能当成 UW–Madison。
- [2026-05-05，r/canvas：error updating submission draft](https://www.reddit.com/r/canvas/comments/1t48mo8/canvas_error_updating_submission_draft/)：上传错误持续到截止，发帖人最终经教师允许改用邮件。
- [2020-12-22，r/UWMadison：A Look Under The Hood](https://www.reddit.com/r/UWMadison/comments/ki7t7k/)：教师描述处理部分缺失或损坏的提交。仅为本校较旧线索，不证明当前发生率。

### 产品假设

浏览器扩展在实际提交流程中工作。用户选定待交文件后，检查文件是否为空、能否渲染、是否有疑似异常页；提交后读取平台可确认的状态，并在支持的情况下回读实际收到的附件，与本次选定文件核对。保存课程、作业、版本和平台返回的时间/回执。未确认时明确显示未确认，不能把点击上传当作成功。

工具无法判断用户脑中哪份文件才是最终版本。用户必须明确选定目标文件；内容、题号与课程不符只能作为待确认提示。记录只能保存观察到的事实，不能自行成为学校认可的正式提交或证明。

### 为什么不用替代方案

- 社交媒体可以给补救建议，但不在提交那一刻检查用户的真实文件和操作结果。
- 通用 AI 能检查用户上传的 PDF，但用户仍要主动提供文件、说明作业上下文、再到另一平台提交，并核对平台收到的内容。专用工具要省掉这一串重复步骤才成立。
- 最强简单替代方案是主动看一遍预览及回执。如果扩展只是再次显示成功提示、生成邮件或提醒小心，应该淘汰。

### 已有功能及门槛

[Gradescope 官方 PDF 提交流程](https://guides.gradescope.com/hc/en-us/articles/21864315441677-Submitting-a-PDF-for-an-assignment)已经提供预览、页面分配、成功信息与确认邮件。Canvas 也有提交详情和[提交故障排查](https://community.instructure.com/en/kb/articles/662704-submitting-a-canvas-assignment)。因此产品不是填补“没有回执”，而是验证自动核验能否减少漏看或异常文件造成的错误。

优先级：本轮最值得做小规模验证，但尚未验证 UW 学生的安装意愿及本校问题频率。尚未测试平台接口、浏览器集成和误报率，不能直接承诺可靠支持。

## 候选二：到具体教室的楼内导航，重点考虑无台阶路线

### 证据

- [2021-09-05，r/UWMadison：Floor plan for Mosse Humanities Building](https://www.reddit.com/r/UWMadison/comments/pikewi/)：新生寻找室内平面图，多名评论者描述楼层和编号难理解。
- [2022-01-27，Is the humanities building accessible?](https://www.reddit.com/r/UWMadison/comments/se3ha3/)：使用者不易找到无障碍入口和电梯。
- [2022-01-31，The humanities building IS inaccessible](https://www.reddit.com/r/UWMadison/comments/sh7g73/)：同一发帖人的后续描述电梯故障，应与上一帖视为同一段经历，而不是两名独立用户。
- [2026-04-30，Forgot water bottle in vilas](https://www.reddit.com/r/UWMadison/comments/1t0779k/forgot_water_bottle_in_vilas/)：涉及寻找楼内服务点，回复需要详细说明入口与楼层。这是辅助线索，不是对导航产品的直接需求验证。

### 产品假设

从明确的楼宇入口或二维码锚点开始，选择目的教室，给出逐段照片/地图路线和无台阶路径。首版仅覆盖一栋实地核验过的建筑，不依赖未经验证的室内 GPS。路线状态没有可靠数据时显示最后核验时间，不能宣称实时或保证电梯可用。

### 为什么不用替代方案

- 社交媒体文字指路可以解决一次问题，但需要提问、等待、解释自己的具体位置；地图与连续路线可以直接执行。
- 通用 AI 如果获得准确、现行的楼内路线数据也可以指路。专用产品的价值是可核验的空间数据、定位起点和路径计算，不是聊天能力。
- 最强简单替代是提前探路、看楼内标识、问门口工作人员。若只能做面向普通新生的一次性导览，使用频率可能过低。

### 已有功能及门槛

[官方校园地图](https://www.map.wisc.edu/)已有建筑、无障碍入口和路线信息；[Bascom Hall 电梯页面](https://intranet.bascom.wisc.edu/elevators/)有详细替代路线；[CSI](https://kb.wisc.edu/fpm/149726)提供楼宇/房间/平面图数据。因此需要先实测既有资料能否完成入口到目标教室的具体任务，不能声称校园没有地图。

优先级：有本校线索，区别于通用 AI 的理由明确；但强证据主要来自旧帖，当前缺口、使用频率和路线维护成本未验证，暂不直接定题。

## 候选三：预约未到场后的空间释放与候补（暂不优先）

- [2025-02-02，People always be in study rooms without booking](https://www.reddit.com/r/UWMadison/comments/1ig54i3/)：预约者与临时使用者产生交接摩擦；评论提到预约后未到场。
- [2025-12-01，Where are some good places on campus to do interviews?](https://www.reddit.com/r/UWMadison/comments/1pb3mqr/)：学生称面试房间订满后只能协调室友离开。
- [2026-03-03，Why do frats and sororities ... book so much study room](https://www.reddit.com/r/UWMadison/comments/1rjvzqc/)：表达预订空间困难；关于某类组织大量占用的指控未经核实，不能据此认定违规。

产品设想：管理方授权下实现到场确认、主动退订、按既定政策释放未使用预约和候补通知。发帖或通用聊天不能直接变更权威预约状态。

但是，[UW Law Library](https://library.law.wisc.edu/study-rooms/)已有领钥匙签到、迟到宽限及取消规则。没有获得目标空间的预约系统接入及管理方配合时，新工具不能合法有效地宣布房间可用，更不能把未扫码等同于无人。现有工具是否已经支持自动释放/候补也未完整核对。因此目前仅保留为运营合作方向，不能包装成即用的学生端产品。

## 本轮明确排除的方向

| 方向 | 排除或降级原因 | 证据 |
|---|---|---|
| 普通课表导出 | 已有专门扩展且维护过兼容问题 | [2024-09-03 发布/修复帖](https://www.reddit.com/r/UWMadison/comments/1f84ptv/) |
| 普通课表壁纸 | 已有面向 UW 的工具和使用反馈 | [2025-09-12 帖子](https://www.reddit.com/r/UWMadison/comments/1nes83r/) |
| Canvas 基础离线下载 | Canvas Student 已支持启用后的离线同步，不能声称全新；UW 启用状态未查验 | [Canvas 官方文档](https://community.instructure.com/t5/tkb/articleprintpage/tkb-id/student_android/article-id/81) |
| 小组项目任务分配 | 抱怨集中在不参与和质量，更多列表/提醒未必改变行为 | [2023-04-28 原帖](https://www.reddit.com/r/UWMadison/comments/131ig2z/) |
| 找打印机/问公交怎么坐 | 现有问答、官方信息和社交渠道就能完成，尚未发现独有操作价值 | [2024-09-06 打印求助](https://www.reddit.com/r/UWMadison/comments/1fai2g4/) |
| 普通房源/科研资源聚合 | 未证明比既有渠道与通用 AI 更省力，且房源/实验室容量问题不会因页面而消失 | 见第一轮与用户反馈 |

## 下一步验证标准

优先考虑提交核验：先拿真实但不含私人信息的失败案例，比较“平台原生预览/回执”“用户自行问 AI”和“自动检查流程”。若只能重复平台已有提示，或误报、延迟使提交更麻烦，就停止这个方向。

楼内导航先选择一条现有地图难以完成的具体路线，核对可公开数据并实地测试。找不到这样的路线，就不以泛校园地图作为替代选题。

本轮仍没有完成用户验证，不把候选称为已证明的高频刚需。
