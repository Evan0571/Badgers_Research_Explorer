// Fail closed until identity verification, consent, server-side sessions,
// durable batches, idempotency, and the Graph adapter have been implemented.
export function POST() {
  return Response.json(
    {
      error:
        "UW Microsoft 365 sending is not connected. Your drafts have not been sent.",
      code: "MAIL_NOT_CONFIGURED",
    },
    { status: 503 },
  );
}
