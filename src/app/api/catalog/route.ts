import { loadCatalog } from "@/server/catalog-store";
import { catalogCoverage } from "@/lib/catalog-coverage";
import { departments } from "@/lib/research-metadata";
import { matchesFacultyName } from "@/lib/faculty-search";
import {
  matchesUndergraduate,
  matchesUndergraduateFilters,
  undergraduateFiltersSchema,
} from "@/lib/undergraduate";
import { json, failure, AppError } from "@/server/http";
export const runtime = "nodejs";
let snapshot: Awaited<ReturnType<typeof loadCatalog>> | undefined;
let expires = 0;
export async function GET(request: Request) {
  try {
    if (!snapshot || Date.now() > expires) {
      snapshot = await loadCatalog();
      expires = Date.now() + 30000;
    }
    const { records, shared, warning } = snapshot;
    const params = new URL(request.url).searchParams;
    const filters = undergraduateFiltersSchema.safeParse({
      supervision: params.get("supervision") || "",
      openings: params.get("openings") || "",
      applications: params.get("applications") || "",
    });
    if (!filters.success)
      throw new AppError("INVALID_INPUT", "Invalid undergraduate filter.");
    const undergraduateFilters = filters.data;
    const q = (params.get("q") || "").trim().toLowerCase(),
      department = params.get("department"),
      level = params.get("level"),
      category = params.get("category");
    const filtered = records
      .filter(
        (r) =>
          matchesFacultyName(r.name, q) &&
          (!params.get("id") || r.id === params.get("id")) &&
          (!department || departments(r.department).includes(department)) &&
          (!level ||
            (level === "email"
              ? !!r.contact.email
              : level === "research"
                ? r.coverage?.level !== "roster"
                : r.coverage?.level === level)) &&
          (!category || r.coverage?.category === category) &&
          matchesUndergraduateFilters(r.undergraduate, undergraduateFilters) &&
          matchesUndergraduate(
            r.undergraduate,
            params.get("undergraduate") || "",
          ),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    const rawPage = Number(params.get("page") || 1);
    const page = Math.max(
      1,
      Math.min(
        Number.isFinite(rawPage) ? Math.floor(rawPage) : 1,
        Math.max(1, Math.ceil(filtered.length / 50)),
      ),
    );
    return json({
      coverage: catalogCoverage(records),
      shared,
      warning,
      departments: [
        ...new Set(records.flatMap((r) => departments(r.department))),
      ].sort(),
      total: filtered.length,
      page,
      pageSize: 50,
      records:
        params.get("summary") === "1"
          ? []
          : filtered.slice((page - 1) * 50, page * 50),
    });
  } catch (error) {
    return failure(error);
  }
}
