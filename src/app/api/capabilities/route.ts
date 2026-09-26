import { config, integrationStatus } from "@/server/config";
import { json } from "@/server/http";
export const dynamic = "force-dynamic";
export function GET() {
  const status = integrationStatus();
  return json({
    search: { mode: "live-source-review", liveCampusSearch: status.discovery },
    resume: {
      textExtraction: true,
      aiSuggestions: status.generation,
      ocr: false,
    },
    drafts: { mode: "ai", aiGeneration: status.generation },
    email: {
      uwIdentityVerification: status.verification,
      microsoft365Connected: false,
      sendEnabled: status.sending,
      transport: status.sending ? "platform" : null,
      senderAddress: status.sending ? config().mailFrom : null,
    },
  });
}
