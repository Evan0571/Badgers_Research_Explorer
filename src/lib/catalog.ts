import { byId as sampleById } from "@/data/researchers";
import type { Workspace } from "./types";
// Legacy examples remain available only for existing saved items and the labeled landing example.
// Live searches never fall back to this sample collection.
export const researcherById = (workspace: Workspace, id: string) =>
  workspace.catalog?.find((r) => r.id === id) || sampleById(id);
