"use client";
import { ClockCounterClockwise, ArrowRight } from "@phosphor-icons/react";
import { EmptyState, LinkButton, Notice } from "@/components/ui";
export function HistoryView() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Keep the next step clear</p>
        <h1>Your contact history.</h1>
        <p>
          A record of each individual message, with its original content and an
          honest status.
        </p>
      </div>
      <Notice title="Sending is not connected">
        This build has not sent any emails. Connecting UW Microsoft 365 and
        verifying delivery submission are still required. Draft exports do not
        create sent records.
      </Notice>
      <EmptyState
        icon={<ClockCounterClockwise size={35} />}
        title="No messages submitted."
        action={
          <LinkButton href="/explore/mail" variant="secondary">
            Open email workspace <ArrowRight size={17} />
          </LinkButton>
        }
      >
        When sending is connected, each message will have its own record here.
        An accepted submission will not be labelled delivered or read.
      </EmptyState>
    </>
  );
}
