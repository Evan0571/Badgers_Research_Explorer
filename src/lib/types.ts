import type {
  UndergraduateReview,
  UndergraduateFilters,
} from "./undergraduate";
export type ConditionValue = "supported" | "not-supported" | "unknown";
export type Recruitment = "open" | "closed" | "unknown";
export type ContactRoute = "email" | "form" | "program" | "website" | "closed";
export type Topic = string;
export interface Source {
  id: string;
  title: string;
  url: string;
  note: string;
  checkedAt: string;
  status: "checked" | "unavailable";
  excerpt?: string;
}
export interface Condition {
  value: ConditionValue;
  detail: string;
  sourceId?: string;
  quote?: string;
}
export interface Researcher {
  id: string;
  name: string;
  initials: string;
  department: string;
  lab: string;
  title: string;
  academicTitle?: string;
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
  relevance?: string;
  provenance?: "live" | "sample";
  supersededBy?: string;
  undergraduate?: UndergraduateReview;
  publications?: { title: string; year: number | null; url?: string }[];
  coverage?: {
    level: "roster" | "research-index" | "profile";
    rosterKey: string;
    rosterCheckedAt: string;
    researchCheckedAt?: string;
    profileCheckedAt?: string;
    category:
      | "faculty"
      | "clinical"
      | "teaching"
      | "adjunct"
      | "visiting"
      | "emeritus"
      | "other";
    platformId?: number;
    contactChecked: boolean;
  };
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
  generation?: "ai" | "local-template";
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
  /** Editable draft; an empty string means deliberately cleared. */
  interestDraft?: string;
  searched: boolean;
  topics: Topic[];
  matchAll: boolean;
  department: string;
  recruitment: string;
  undergraduateFilters?: UndergraduateFilters;
  creditOnly: boolean;
  saved: string[];
  comparison: string[];
  notes: Record<string, string>;
  background: Background;
  drafts: Draft[];
  selectedDrafts: string[];
  catalog?: Researcher[];
  search?: import("./contracts").SearchResult;
}
