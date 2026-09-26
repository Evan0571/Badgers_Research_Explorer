import type { Condition, Researcher, Topic } from "@/lib/types";

const unknown: Condition = {
  value: "unknown",
  detail:
    "Not established by the sources checked. Ask about current undergraduate arrangements.",
};
const checkedAt = "2026-09-26";
export const topics: {
  id: Topic;
  title: string;
  description: string;
  question: string;
  keywords: string[];
}[] = [
  {
    id: "learning",
    title: "How people learn",
    description: "Explore how technology can help us understand learning.",
    question: "What can a conversation tell us about how someone thinks?",
    keywords: [
      "learning science",
      "education",
      "教育",
      "学习科学",
      "学习行为",
      "教学",
    ],
  },
  {
    id: "agents",
    title: "AI that works with people",
    description: "Study how AI agents communicate, reason, and collaborate.",
    question: "How does an AI agent change a group conversation?",
    keywords: ["agent", "agents", "智能体", "llm", "语言模型", "planning"],
  },
  {
    id: "robotics",
    title: "Robots in everyday life",
    description:
      "Understand what it takes for people and robots to work together.",
    question: "How could a robot understand when a person needs help?",
    keywords: ["robot", "robots", "robotics", "机器人", "human robot"],
  },
  {
    id: "accessibility",
    title: "Technology for more people",
    description:
      "Design systems around different abilities and real daily needs.",
    question: "How could augmented reality help someone with low vision?",
    keywords: [
      "accessibility",
      "accessible",
      "vision",
      "ar",
      "vr",
      "无障碍",
      "视觉",
      "disability",
    ],
  },
  {
    id: "machine-learning",
    title: "More reliable machine learning",
    description:
      "Investigate what happens when models encounter the unexpected.",
    question: "When should a model admit that it does not know?",
    keywords: [
      "machine learning",
      "ml",
      "机器学习",
      "reliable",
      "安全",
      "模型",
      "deep learning",
    ],
  },
];

// Manually checked public-source snapshots. Not a live campus-wide index.
// Descriptions are concise paraphrases; interpretation examples are explicitly marked in the UI.
export const researchers: Researcher[] = [
  {
    id: "bilge-mutlu",
    name: "Bilge Mutlu",
    initials: "BM",
    department: "Computer Sciences",
    lab: "Wisconsin Human-Computer Interaction",
    title: "Making robots better partners",
    summary:
      "Studies how robots and other interactive systems can communicate and work with people in everyday settings.",
    summaryZh: "研究机器人和交互系统如何在日常场景中与人沟通、协作。",
    question:
      "How can a robot interact with people in ways that fit their social and practical needs?",
    example:
      "Imagine working on a shared task with a robot that needs to understand your gestures. This is an explanatory example, not a listed project.",
    methods:
      "Human-computer interaction and human-robot interaction. See the group page for current projects and methods.",
    topics: ["robotics", "agents", "learning"],
    keywords: ["human computer interaction", "hci", "social", "人机交互"],
    recruitment: "unknown",
    participation: unknown,
    credit: unknown,
    pay: unknown,
    contact: {
      route: "email",
      email: "bmutlu@wisc.edu",
      url: "https://experts.news.wisc.edu/experts/bilge-mutlu",
      note: "A public contact address is listed. Undergraduate openings and the application process have not been established; ask about the appropriate route.",
      sourceId: "mutlu-profile",
    },
    sources: [
      {
        id: "mutlu-group",
        title: "UW Computer Sciences research groups",
        url: "https://www.cs.wisc.edu/research/research-groups/",
        note: "Lists Mutlu in Human-Computer Interaction and describes the group’s interdisciplinary research.",
        checkedAt,
        status: "checked",
      },
      {
        id: "mutlu-profile",
        title: "UW Experts: Bilge Mutlu",
        url: "https://experts.news.wisc.edu/experts/bilge-mutlu",
        note: "Public email and human-robot interaction expertise. Academic rank is omitted because university pages differ.",
        checkedAt,
        status: "checked",
      },
    ],
  },
  {
    id: "yuhang-zhao",
    name: "Yuhang Zhao",
    initials: "YZ",
    department: "Computer Sciences",
    lab: "Accessibility & Human-Computer Interaction",
    title: "Making the world more accessible",
    summary:
      "Builds AI-powered augmented and virtual reality systems that support people with diverse abilities.",
    summaryZh:
      "开发结合 AI 的增强现实和虚拟现实系统，帮助不同能力的人参与日常活动。",
    question:
      "How can interactive systems adapt to the needs of people with different abilities?",
    example:
      "Imagine a visual aid that highlights useful landmarks for a person with low vision. This is an explanatory analogy.",
    methods:
      "Designing and building interactive systems informed by the needs of people with disabilities.",
    topics: ["accessibility", "learning"],
    keywords: [
      "human computer interaction",
      "hci",
      "ai",
      "人工智能",
      "人机交互",
    ],
    recruitment: "unknown",
    participation: unknown,
    credit: unknown,
    pay: unknown,
    contact: {
      route: "email",
      email: "yuhang.zhao@cs.wisc.edu",
      url: "https://www.yuhangz.com/",
      note: "The faculty website lists this email. It does not establish a current undergraduate opening in the material checked.",
      sourceId: "zhao-home",
    },
    sources: [
      {
        id: "zhao-home",
        title: "Yuhang Zhao: research and contact",
        url: "https://www.yuhangz.com/",
        note: "Describes AI-powered XR for accessibility and lists the public contact address.",
        checkedAt,
        status: "checked",
      },
      {
        id: "zhao-affiliation",
        title: "UW Computer Sciences research groups",
        url: "https://www.cs.wisc.edu/research/research-groups/",
        note: "Confirms Yuhang Zhao in the UW Human-Computer Interaction group.",
        checkedAt,
        status: "checked",
      },
    ],
  },
  {
    id: "timothy-rogers",
    name: "Timothy Rogers",
    initials: "TR",
    department: "Psychology",
    lab: "Cognition & AI research",
    title: "Understanding people through AI",
    summary:
      "Uses an AI terrarium project to investigate communication between people and artificial agents.",
    summaryZh: "通过 AI terrarium 研究项目，探索人类与人工智能体之间的交流。",
    question:
      "What can interactions among AI agents help researchers understand about human communication?",
    example:
      "Imagine comparing how a discussion changes when an AI participant joins it. This is an explanatory example, not a claim about a particular experiment.",
    methods:
      "The public project describes studying communication using an AI terrarium. Specific undergraduate tasks are not stated.",
    topics: ["agents"],
    keywords: [
      "psychology",
      "cognition",
      "心理",
      "认知",
      "communication",
      "ai",
      "人工智能",
    ],
    recruitment: "unknown",
    participation: unknown,
    credit: unknown,
    pay: unknown,
    contact: {
      route: "website",
      url: "https://wid.wisc.edu/people/timothy-rogers/",
      note: "Open the university profile to check the current lab and participation route. A contact address has not been verified in this collection.",
      sourceId: "rogers-profile",
    },
    sources: [
      {
        id: "rogers-project",
        title: "UW: AI Terrarium research project",
        url: "https://mcrc.sjmc.wisc.edu/2024/09/09/mcrc-research-team-awarded-research-forward-grant-for-artificial-intelligence-terrarium/",
        note: "Names psychology professor Timothy Rogers as project PI and describes the communication research. Project announcement dates to 2024, not a current opening.",
        checkedAt,
        status: "checked",
      },
      {
        id: "rogers-profile",
        title: "Wisconsin Institute for Discovery profile",
        url: "https://wid.wisc.edu/people/timothy-rogers/",
        note: "University profile linking to the lab. Recruitment conditions were not established.",
        checkedAt,
        status: "checked",
      },
    ],
  },
  {
    id: "sharon-li",
    name: "Sharon Li",
    initials: "SL",
    department: "Computer Sciences",
    lab: "Reliable Machine Learning",
    title: "Knowing when AI does not know",
    summary:
      "Studies reliable machine learning and the challenges models face in an open, uncertain world.",
    summaryZh: "研究可靠机器学习，以及模型在开放、不确定环境中面临的问题。",
    question:
      "How can learning systems remain reliable when they encounter unfamiliar situations?",
    example:
      "Imagine a model recognizing that an unfamiliar input is outside its experience. This is an explanatory analogy.",
    methods:
      "Algorithmic and theoretical research in reliable machine learning; see the faculty page for publications.",
    topics: ["machine-learning", "agents"],
    keywords: [
      "trustworthy",
      "ood",
      "out of distribution",
      "可靠",
      "ai",
      "人工智能",
    ],
    recruitment: "closed",
    participation: {
      value: "not-supported",
      detail:
        "The faculty website says the group is at full capacity and has no current undergraduate research openings.",
      sourceId: "li-home",
    },
    credit: unknown,
    pay: unknown,
    contact: {
      route: "closed",
      url: "https://pages.cs.wisc.edu/~sharonli/",
      note: "No current undergraduate openings are listed. Save this research for future reference; it is excluded from email preparation.",
      sourceId: "li-home",
    },
    sources: [
      {
        id: "li-home",
        title: "Sharon Li: faculty website and openings",
        url: "https://pages.cs.wisc.edu/~sharonli/",
        note: "Confirms UW affiliation and reliable machine learning research. The openings notice explicitly includes undergraduates in its no-openings statement.",
        checkedAt,
        status: "checked",
      },
    ],
  },
];
export const byId = (id: string) => researchers.find((r) => r.id === id);
