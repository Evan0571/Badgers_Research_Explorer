export type ConditionValue = "supported" | "not-supported" | "unknown";
export type Recruitment = "open" | "closed" | "unknown";
export type ContactRoute = "email" | "form" | "program" | "website" | "closed";
export type Topic =
  "learning" | "agents" | "robotics" | "accessibility" | "machine-learning";
export interface Source {
  id: string;
  title: string;
  url: string;
  note: string;
  checkedAt: string;
  status: "checked" | "unavailable";
}
export interface Condition {
  value: ConditionValue;
  detail: string;
  sourceId?: string;
}
export interface Researcher {
  id: string;
  name: string;
  initials: string;
  department: string;
  lab: string;
  title: string;
  summary: string;
  summaryZh: string;
  question: string;
  example: string;
  methods: string;
  topics: Topic[];
  keywords: string[];
  recruitment: Recruitment;
  participation: Condition;
  credit: Condition;
  pay: Condition;
  contact: {
    route: ContactRoute;
    url: string;
    email?: string;
    note: string;
    sourceId: string;
  };
  sources: Source[];
}
export interface Background {
  name: string;
  major: string;
  year: string;
  experience: string;
  resumeText: string;
}
export interface Draft {
  id: string;
  researcherId: string;
  to: string;
  subject: string;
  body: string;
  recipientEdited: boolean;
  updatedAt: string;
  answers: { interest: string; experience: string; request: string };
  attachments?: { id: string; name: string; size: number; type: string }[];
}
export type DeliveryState =
  "queued" | "submitting" | "accepted" | "failed" | "unknown" | "cancelled";
export interface DeliverySnapshot {
  id: string;
  batchId: string;
  draft: Draft;
  sender: string;
  state: DeliveryState;
  createdAt: string;
  providerRequestId?: string;
}
export interface Workspace {
  version: 1;
  query: string;
  searched: boolean;
  topics: Topic[];
  matchAll: boolean;
  department: string;
  recruitment: string;
  creditOnly: boolean;
  saved: string[];
  comparison: string[];
  notes: Record<string, string>;
  background: Background;
  drafts: Draft[];
  selectedDrafts: string[];
}
