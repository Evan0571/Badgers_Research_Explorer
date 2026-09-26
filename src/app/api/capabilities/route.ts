export function GET() {
  return Response.json({
    search: { mode: "curated", liveCampusSearch: false },
    resume: { textExtraction: true, ocr: false },
    drafts: { mode: "local-template", aiGeneration: false },
    email: {
      uwIdentityVerification: false,
      microsoft365Connected: false,
      sendEnabled: false,
    },
  });
}
