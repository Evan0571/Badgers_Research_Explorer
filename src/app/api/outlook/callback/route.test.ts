import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { completeOutlookAuthorization } from "@/server/outlook";
import { AppError } from "@/server/http";

vi.mock("@/server/security", () => ({
  session: vi.fn().mockResolvedValue({ id: "test-session" }),
}));
vi.mock("@/server/config", () => ({
  config: () => ({ origin: "http://127.0.0.1:3002" }),
}));
vi.mock("@/server/outlook", () => ({ completeOutlookAuthorization: vi.fn() }));

beforeEach(() => {
  vi.mocked(completeOutlookAuthorization).mockReset();
});

describe("Outlook returns to account settings", () => {
  it("returns successful authorization to Settings without exposing OAuth parameters", async () => {
    const response = await GET(
      new Request(
        "http://127.0.0.1:3002/api/outlook/callback?state=test-state&code=private-code",
      ),
    );
    expect(response.status).toBe(303);
    expect(response.headers.get("Location")).toBe(
      "http://127.0.0.1:3002/explore/settings?outlook=connected",
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
  });

  it("returns a failed authorization to Settings with only the safe status", async () => {
    vi.mocked(completeOutlookAuthorization).mockRejectedValue(
      new AppError("OUTLOOK_DENIED", "Private provider details", 403),
    );
    const response = await GET(
      new Request(
        "http://127.0.0.1:3002/api/outlook/callback?error=access_denied&error_description=private-description",
      ),
    );
    expect(response.headers.get("Location")).toBe(
      "http://127.0.0.1:3002/explore/settings?outlook=outlook_denied",
    );
  });
});
