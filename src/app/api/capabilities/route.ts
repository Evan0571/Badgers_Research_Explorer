import { integrationStatus } from "@/server/config";
import { session } from "@/server/security";
import { outlookStatus } from "@/server/outlook";
import { json } from "@/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const status = integrationStatus();
  const outlook = outlookStatus(await session());
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
      outlookAvailable: status.outlook,
      microsoft365Connected: outlook.connected,
      sendEnabled: status.sending && outlook.connected,
      transport: "outlook",
      senderAddress: outlook.email,
    },
  });
}
