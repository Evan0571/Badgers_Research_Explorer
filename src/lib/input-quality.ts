/** Cheap local checks only. Semantic interpretation happens after explicit AI consent. */
export function readableInput(text: string) {
  const compact = text.replace(/\s/g, "");
  const letters = compact.match(/\p{L}/gu) || [];
  return (
    compact.length >= 2 &&
    letters.length >= 2 &&
    letters.length / compact.length > 0.25 &&
    !/[\u0000-\u0008\u000e-\u001f\ufffd]/.test(text) &&
    !/(.)\1{9,}/u.test(compact)
  );
}

export function resumeInputIssue(
  text: string,
): "unreadable" | "not-resume" | null {
  if (text.trim().length < 20 || !readableInput(text)) return "unreadable";
  // Accept short student biographies as well as conventional English/Chinese CVs.
  const sections = [
    /\b(education|university|college|bachelor|master|degree|student|major)\b|教育|大学|学院|本科|硕士|博士|专业|学生/iu,
    /\b(experience|employment|intern|worked|volunteer|project|research|developed|built)\b|经历|实习|工作|志愿|项目|研究|开发|参与/iu,
    /\b(skills|publications|awards|certifications|coursework|resume|curriculum vitae)\b|技能|论文|获奖|证书|课程|简历/iu,
  ];
  return sections.some((pattern) => pattern.test(text)) ? null : "not-resume";
}
