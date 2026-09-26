# BuildFest 选题调研：UW–Madison 学生在 Reddit 上遇到的问题

调研日期：2026-09-26。当前仅做需求调研与讨论，未开始产品开发。

后续选题状态：用户已否定本轮住房方案，原因是没有证明优于社交媒体发帖；科研信息聚合也需重新评估。下文保留本轮研究过程，当前候选和替代方案比较见 `reddit-discovery-round2-2026-09-26.md`。

## 方法与证据边界

- 通过网页搜索检索 r/UWMadison 的公开帖子正文与可读取评论，关键词覆盖住房、租期、费用、选课、科研、课程平台、社交、交通、空间与无障碍。
- 以下保留 26 条与选题直接相关的独立讨论，优先采用 2025–2026 年材料，较旧案例明确标注日期。它们是目的性检索的材料清单，不是随机抽样，不能据此计算全校问题发生率或用户规模。
- 一部分评论来自搜索索引，另有重点帖子通过原页打开核对；没有抓取完整 subreddit，也没有访问私密群组、联系发帖人或发起问卷。
- 关于具体公寓、教授或服务的负面描述只是发帖人的体验或指控，未独立核实。只提取其反映的任务与困难，不认定争议责任。
- 两篇 2026-08-21 的 Chapter Madison PSA 内容几乎相同，只保留其中一篇，不计为独立重复证据。
- 工具发布帖用来识别现有供给和用户反应，不当成自然产生的需求证据。赞数不等于用户数，也不用于给机会打分。

## 主要发现

### 1. 住房：租期不匹配、总费用不清楚、联系房源无反馈

这组材料的具体困难包括只住秋季却面对全年租约、暑期实习延续到 8 月底但房源更早结束、联系数名发布者后没有后续，以及签约前不了解完整支出。不同帖子中存在相反反馈：春季转租较容易，秋季和非标准日期较困难，不能统一概括为“所有转租都找不到”。

学校已经有 Off-Campus Housing Marketplace、租房指南、室友和转租信息，因此再做一个从零聚集房源的平台，差异和启动成本都需要论证。住房供给和价格本身也不是信息工具能消除的。

可继续验证的产品假设：用户提供房源页面、报价和租约，工具整理已知租金、强制费用、一次性费用、可退押金、优惠条件、付款时间与租期，输出可核对的成本比较和日期缺口。每个数字保留出处，缺失费用标记“待确认”，不能把未知费用当零。产品价值需要通过真实材料能否改善比较过程来验证。

### 2. 本科科研：找到合适实验室及申请入口困难

2026 年不同专业的帖子仍在询问从哪里找实验室、实验室是否接受本科生、研究经历不足能否申请、该联系谁。较旧帖子呈现相同问题，以及邮件无回复的困扰。评论也给出现有办法：URS、院系页面、院系表格、学生岗位网站和通过任课教师介绍。

学校已有 WISCIENCE 的详细科研入门指南与 URS，不能把需求描述成“学校完全没有入口”。更值得验证的是跨院系查找、资格与兴趣比较、信息时效判断，以及把公开研究介绍转换成学生能理解的工作内容。

可继续验证的产品假设：聚合公开实验室资料和明确发布的本科机会，按兴趣、技能和投入时间筛选；列出研究内容、申请办法、公开条件、来源及更新时间。必须区分“明确招募”“接受咨询”和“未发现招募信息”。导师不回复也可能是容量问题，软件无法保证回复或录取。

### 3. 选课：困难存在，现有工具也很多

2026 年有新生为课程满员及候补规则困惑。与此同时，2025 年已有课程关系图、成绩/教师数据聚合与空位通知工具的发布帖，2026-09-23 的新规划器帖子出现了对重复功能的质疑。

结论：不能据此说所有选课产品没有价值，已有工具也有正面反馈。但“再做课表、先修课图或空位提醒”目前缺乏足够差异；需要先验证一个现有产品不能处理的具体决策。

### 4. 社交：转学生和高年级学生也有持续困难

多位学生描述参加课程和社团仍未形成稳定朋友圈。需求信号明确，但“推荐社团”未必触及问题，新增社交平台还依赖真实参与、持续组织与用户密度。黑客松演示匹配界面不能证明形成了关系。

### 5. 交通、空间、课程平台：有具体问题，但要区分成因

- 公交帖子涉及拥挤和乘车习惯，也有新生不熟悉付款、下车方式；这些不是同一个问题。拥挤不能靠再做路线查询解决。
- 2022 和 2025 年均有找线上面试房间的帖子，评论中已指出图书馆和 SuccessWorks 等预约渠道；现有预约体系需要先检查。
- Canvas 材料不在统一日历的强烈抱怨来自 2021 年，不能直接当作 2026 年同等程度的问题。2024、2026 年的宕机是另一个独立问题，不能与日历缺漏合并统计。

## 保留的 Reddit 材料

| 编号 | 日期 | 帖子与链接 | 直接观察到的困难或反馈 | 用途 |
|---|---|---|---|---|
| R01 | 2025-05-07 | [Looking for a sublease for the 2025 fall semester](https://www.reddit.com/r/UWMadison/comments/1khbe4i/) | 交换生寻找秋季单学期住房约一个月，发现多为全年、春季或暑期选项。 | 需求 |
| R02 | 2025-08-05 | [Trying to find housing for Fall only](https://www.reddit.com/r/UWMadison/comments/1mi9jw7/) | 秋季毕业学生寻找住房，Facebook/Craigslist 没找到合适选择，担心全年租约无法转出。 | 需求 |
| R03 | 2026-03-22 | [How easy is it to be a subleaser Aug-Jan?](https://www.reddit.com/r/UWMadison/comments/1s08si2/) | 18 个月医学项目与常见租期不匹配；评论对秋季转租难易意见不一。 | 需求与反证 |
| R04 | 2026-04-27 | [Looking for Apt to Sublease](https://www.reddit.com/r/UWMadison/comments/1swp3ex/) | 需求为 6 月 1 日至 8 月 28 日，回复提供的房源多提前结束。 | 需求 |
| R05 | 2025-12-29 | [Summer Housing (June - August)](https://www.reddit.com/r/UWMadison/comments/1pyzity/) | 暑期实习住房需要延续至 8 月底，部分回复只到 7 月底。 | 需求 |
| R06 | 2026-03-10 | [The terror of apartment searching!!!!](https://www.reddit.com/r/UWMadison/comments/1rqbw97/) | 发帖人称两周内联系 4–5 人后无后续；评论提及现有本地转租工具。 | 需求与现有供给线索 |
| R07 | 2026-08-21 | [PSA about Renting at Chapter Madison](https://www.reddit.com/r/UWMadison/comments/1vu6w34/) | 发帖人指称宣传租金与最终支出不一致，并感到签约压力。具体指控未经核实。 | 费用透明度线索；已去重 |
| R08 | 2024-05-17 | [International students pay double the security deposit?](https://www.reddit.com/r/UWMadison/comments/1cuca2u/) | 国际学生困惑于押金、预付费用及无信用记录的要求；评论不能作为法律依据。 | 较旧的前期付款理解困难 |
| R09 | 2026-02-18 | [Undergrad Research Labs](https://www.reddit.com/r/UWMadison/comments/1r7r89h/) | 生物专业新生不知如何找到实验室；评论建议院系页面、实验室表格。 | 需求 |
| R10 | 2026-02-24 | [Undergraduate CS research at WID?](https://www.reddit.com/r/UWMadison/comments/1rdqtv2/) | 学生从网页看不出本科生是否能加入，也不知如何找联系时段。 | 需求 |
| R11 | 2026-06-15 | [How to get involved in research?](https://www.reddit.com/r/UWMadison/comments/1u6u1si/) | 不清楚招聘时间、年级资格、申请邮件和简历要求；评论指向 URS 和心理学实验室表格。 | 需求与已有资源 |
| R12 | 2022-11-02 | [How do I get into research?](https://www.reddit.com/r/UWMadison/comments/yk7mxp/) | 发邮件后未获回复；评论既提及 URS，也指出匹配、准备和投入时间。 | 较旧重复信号 |
| R13 | 2026-06-11 | [Additional Sections of Classes](https://www.reddit.com/r/UWMadison/comments/1u3856b/) | SOAR 前发现西班牙语多个班满员，不知是否会新增名额。 | 需求 |
| R14 | 2025-06-04 | [UW Madison Course Map](https://www.reddit.com/r/UWMadison/comments/1l2yutu/) | 作者展示聚合课程、先修关系、成绩和教师数据的工具。作者所述功能未经完整实测。 | 竞品供给 |
| R15 | 2025-11-18 | [Wanted to enroll in a course but it was full?](https://www.reddit.com/r/UWMadison/comments/1ozq32f/) | 已有空位通知工具；讨论候补、实际可报名名额差异，后续有用户反馈使用成功。 | 竞品及使用反馈 |
| R16 | 2026-09-23 | [I built a free course planner for UW-Madison](https://www.reddit.com/r/UWMadison/comments/1wns3ao/) | 上传 DARS 生成规划；搜索索引中的评论质疑与官方选课工具的区别。 | 竞品及反面反馈 |
| R17 | 2025-04-25 | [Making friends?](https://www.reddit.com/r/UWMadison/comments/1k7xqxs/) | 转学生进入高年级仍难结交朋友，尝试社团但感到负担。 | 需求 |
| R18 | 2025-09-10 | [Close friends](https://www.reddit.com/r/UWMadison/comments/1nd35y7/) | 会与人交谈但难融入朋友圈，评论建议持续参加社团。 | 需求 |
| R19 | 2025-10-17 | [Making friends as a sophomore](https://www.reddit.com/r/UWMadison/comments/1o8tzjo/) | 大二独居，觉得同学已形成固定群体，虽尝试课程与社团仍孤独。 | 需求 |
| R20 | 2025-02-18 | [Buses](https://www.reddit.com/r/UWMadison/comments/1ishd2t/) | 出入口拥堵、上下车秩序，部分回复称因此错过站点。 | 需求，但软件可干预性有限 |
| R21 | 2026-08-23 | [HELP](https://www.reddit.com/r/UWMadison/comments/1vwfwz2/) | 新生不知道如何要求公交停车下客，对使用公交感到紧张。 | 新手使用困难 |
| R22 | 2025-04-25 | [Best secluded spots for interviews?](https://www.reddit.com/r/UWMadison/comments/1k7ngbt/) | 寻找安静、不被打扰的线上面试空间；评论指向已有预约渠道。 | 需求与已有解法 |
| R23 | 2022-04-11 | [What is a good place to have an online interview?](https://www.reddit.com/r/UWMadison/comments/u1afos/) | 同类问题；评论提及 SuccessWorks 面试房间。 | 较旧重复信号 |
| R24 | 2021-02-06 | [Open letter to all UW professors and TA’s](https://www.reddit.com/r/UWMadison/comments/le7rjl/) | 作业、讨论和日期没有完整进入 Canvas 日历，不同课程使用不同页面。 | 较旧线索，需当前复核 |
| R25 | 2024-11-10 | [Canvas down?](https://www.reddit.com/r/UWMadison/comments/1goelhe/) | 学生称课程页面消失，无法正常访问。 | 可靠性事件 |
| R26 | 2026-05-07 | [Working Canvas Mirror](https://www.reddit.com/r/UWMadison/comments/1t6mb1o/) | 宕机期间尝试备用环境；有人通过 Piazza 组织 Google Drive 资料共享。 | 可靠性事件与手工补救 |

## 官方交叉核对

| 资源 | 核对出的现有服务及其意义 |
|---|---|
| [UW–Madison Off-Campus Housing Services](https://www.housing.wisc.edu/undergraduate/off-campus/) | 已有租房服务、指南、看房清单及 Tenant Resource Center 转介；不能声称学校没有租房支持。 |
| [Off-Campus Housing Marketplace](https://offcampushousing.wisc.edu/) | 已有房源搜索入口。学校的 [2026–2027 住房介绍](https://www.housing.wisc.edu/2025/10/finding-your-home-away-from-home-2026-2027/) 还明确列出住房、停车、室友和转租信息。 |
| [Exchange – Housing](https://studyabroad.wisc.edu/exchange/housing/) | 学校专门提醒交换生关注全年租约与单学期停留的差异，支持“租期匹配是实际决策项”的判断。此处不对个别合同给法律结论。 |
| [WISCIENCE 本科科研指南](https://wiscience.wisc.edu/resources/undergrad-resources/guide-to-undergraduate-research/) | 已有探索兴趣、找研究组、筛选、联系与跟进流程，也列出学生岗位、学分和暑期机会。 |
| [Information for Undergraduate Students](https://research.wisc.edu/information-for-undergraduate-students/) | 已有 URS 等本科科研项目与资源。 |
| [SuccessWorks 房间预约介绍](https://successworks.wisc.edu/2018/01/11/need-a-study-room-book-one-at-successworks/) | 2018 年的官方说明证实这类服务历史上已存在；不能据旧页面保证今天的房间数量或实时可用性。 |
| [Registrar: Updates on Canvas outage](https://registrar.wisc.edu/updates-on-canvas-outage/) | 官方也记录了 2026 年 Canvas 故障对资料、考试和作业的影响，避免只依赖学生单方面描述故障。 |

## 本轮选题判断（研究者推断，不是用户验证结果）

优先继续考察两个方向：

1. **租房成本与租期对比**：付款、时间和决策结果具体；用户提供材料即可形成可演示的完整流程，无须先建立大量房源或双边市场。当前最大的未验证点是材料能否覆盖真实支出，以及学生是否愿意提供资料并使用比较结果。
2. **本科科研机会发现**：有跨专业、跨时间的求助信号，贴近学习与研究场景。最大的未验证点是公开信息是否足以判断本科生机会，以及能否持续维护招募状态。没有确认的开放名额必须保留不确定性。

暂不优先：泛化选课规划器、从零搭建转租市场、泛化社交 App、普通公交查询、只根据旧帖推出的新日历工具。

后续验证可以由团队自行完成：用真实公开房源及费用材料走完比较流程；或者用两个院系的公开资料尝试整理本科机会，记录哪些关键字段必须联系对方才能知道。验证能否减少手工工作，再决定开发范围。
