import { normalizeTopic } from "./research-metadata";

// Presentation labels only. Keep the original keywords intact for search.
const topicLabels: { en: string; zh: string; aliases: string[] }[] = [
  {
    en: "Human-computer interaction",
    zh: "人机交互",
    aliases: [
      "hci",
      "人機交互",
      "人机互动",
      "human computer interaction (HCI)",
    ],
  },
  {
    en: "Artificial intelligence",
    zh: "人工智能",
    aliases: ["ai", "人工智慧", "artificial intelligence (AI)"],
  },
  { en: "Machine learning", zh: "机器学习", aliases: ["ml", "機器學習"] },
  { en: "Deep learning", zh: "深度学习", aliases: ["dl", "深度學習"] },
  {
    en: "Natural language processing",
    zh: "自然语言处理",
    aliases: ["nlp", "自然語言處理"],
  },
  {
    en: "Large language models",
    zh: "大语言模型",
    aliases: ["llm", "llms", "large language model", "大型语言模型"],
  },
  { en: "Out-of-distribution", zh: "分布外", aliases: ["ood"] },
  { en: "Psychology", zh: "心理学", aliases: ["心理", "心理學"] },
  { en: "Cognition", zh: "认知", aliases: ["認知"] },
  { en: "Accessibility", zh: "无障碍", aliases: ["無障礙"] },
  { en: "Robotics", zh: "机器人学", aliases: ["機器人學"] },
  { en: "Philosophy", zh: "哲学", aliases: ["哲學"] },
  { en: "Economics", zh: "经济学", aliases: ["經濟學"] },
  {
    en: "Computer Sciences",
    zh: "计算机科学",
    aliases: ["computer science", "cs"],
  },
];

const labelsByAlias = new Map(
  topicLabels.flatMap((topic) =>
    [topic.en, topic.zh, ...topic.aliases].map(
      (alias) => [normalizeTopic(alias), topic] as const,
    ),
  ),
);

export function knownTopicAliases(query: string) {
  const topic = labelsByAlias.get(normalizeTopic(query));
  return topic ? [topic.en, topic.zh, ...topic.aliases] : [];
}

export function researchTopicLabels(keywords: string[], locale: "en" | "zh") {
  const seen = new Set<string>();
  return keywords.flatMap((keyword) => {
    const key = normalizeTopic(keyword);
    if (!key) return [];
    const topic = labelsByAlias.get(key);
    const canonicalKey = topic ? normalizeTopic(topic.en) : key;
    if (seen.has(canonicalKey)) return [];
    seen.add(canonicalKey);
    // Unknown topics keep their source wording; do not guess translations or
    // merge related but distinct research areas using substring matching.
    return [topic ? topic[locale] : keyword.trim()];
  });
}
