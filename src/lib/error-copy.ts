export function errorCopy(message: string, locale: "en" | "zh") {
  const limited = message.match(
    /^Too many requests\. Try again in (\d+) minutes\./,
  );
  if (limited && locale === "zh")
    return `操作次数已达本时段上限，请约 ${limited[1]} 分钟后再试。你仍可浏览教授名录和使用已保存的结果。`;
  if (/^Too many requests\./.test(message) && locale === "zh")
    return "操作次数已达本时段上限，请稍后再试。你仍可浏览教授名录和使用已保存的结果。";
  if (locale === "zh" && message.startsWith("Required research concepts: "))
    return (
      "必须同时涉及的研究主题：" +
      message.slice("Required research concepts: ".length)
    );
  if (
    locale === "zh" &&
    message.startsWith("Needs confirmation with the lab: ")
  )
    return (
      "以下条件需要向实验室确认：" +
      message
        .slice("Needs confirmation with the lab: ".length)
        .replace(
          ". These conditions have not been verified for the listed profiles.",
          "。当前资料尚未证实这些条件。",
        )
    );
  if (locale === "zh" && message.startsWith("Required source evidence: ")) {
    const match = message.match(
      /^Required source evidence: (.+)\. (\d+) topic-related/,
    );
    const labels: Record<string, string> = {
      supervision: "本科科研指导",
      openings: "当前本科生名额",
      applications: "接受本科生咨询或申请",
      pay: "付薪",
      credit: "学分",
    };
    if (match)
      return `仅显示来源明确支持以下条件的教授：${match[1]
        .split(", ")
        .map((key) => labels[key] || key)
        .join(
          "、",
        )}。${match[2]} 位主题相关教授尚未证实符合全部条件，因此未列入。未知不代表没有机会。`;
  }
  if (/A basic editable email template was saved/.test(message))
    return locale === "zh"
      ? "AI 暂不可用，已保留可编辑的基础邮件模板。请补充个人内容并核对后再发送。"
      : message;
  if (
    /credit_balance_exhausted|insufficient_quota|billing_hard_limit/i.test(
      message,
    )
  )
    return locale === "zh"
      ? "AI 服务当前额度不足。你可以继续浏览教授名录、查看已有结果及编辑草稿；重复重试暂时无法解决。"
      : "The AI service has no remaining credit. You can still browse the catalog, use existing results and edit drafts. Retrying now will not resolve this.";
  if (
    /AI service|AI draft generation|OpenAI API key/i.test(message) &&
    /usage limit|not configured|rejected/i.test(message)
  )
    return locale === "zh"
      ? "AI 服务暂不可用。可以先浏览教授名录、查看已有结果或编辑草稿，稍后再试。"
      : "AI is temporarily unavailable. You can browse the catalog, use existing results or edit drafts and try again later.";
  if (message.startsWith("AI interpretation is unavailable."))
    return locale === "zh"
      ? "AI 暂不可用，当前按完整研究词及已知同义词匹配资料库。复杂意图与排除条件尚未进行语义分析。"
      : message;
  if (locale === "en") return message;
  if (/research terms could not be translated reliably/.test(message))
    return "研究词的中英文对应暂时无法可靠确认。可尝试用英文输入研究主题，或直接浏览教授名录。";
  const draftMessages: Record<string, string> = {
    "Replace the unfinished placeholders.": "请替换姓名等尚未填写的占位符。",
    "Add one valid recipient address.": "请填写一个有效的收件人邮箱。",
    "Add a subject on one line.": "请填写单行邮件主题。",
    "Add the email body.": "请填写邮件正文。",
    "Keep attachments within 2 MB total per message for Outlook sending.":
      "通过 Outlook 发送时，每封邮件的附件总大小须在 2 MB 以内。",
  };
  if (draftMessages[message]) return draftMessages[message];
  if (/does not look like.*resume/i.test(message))
    return "未识别出可读的简历或个人背景。请上传简历，或直接填写教育、项目及工作经历。";
  if (/not a valid (DOCX|PDF)/i.test(message))
    return "文件格式与内容不符，请上传有效的 PDF、DOCX 或 TXT 简历。";
  if (/cancelled/i.test(message)) return "搜索已取消，可以修改输入后重新搜索。";
  if (/timed out|too long|finish in time|timeout|aborted/i.test(message))
    return "请求超时，搜索已停止等待。请重试或缩小问题范围，已保存的内容仍然保留。";
  if (/fetch|network|load failed/i.test(message))
    return "连接中断，请检查网络后重试。已保存的内容仍然保留。";
  if (/expired|does not belong/i.test(message))
    return "此任务已过期，请重新搜索。";
  return message;
}

export const isAIQuotaError = (message: string) =>
  /credit_balance_exhausted|insufficient_quota|billing_hard_limit/i.test(
    message,
  );
