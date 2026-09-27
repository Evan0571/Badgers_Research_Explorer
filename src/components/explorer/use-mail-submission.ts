"use client";
import { useEffect, useRef, useState } from "react";
import { get } from "idb-keyval";
import { requestJSON } from "@/lib/api";
import type { Draft } from "@/lib/types";

export function useMailSubmission(connected?: boolean) {
  const [capability, setCapability] = useState<{
    sendEnabled: boolean;
    senderAddress: string | null;
  } | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let cancelled = false;
    requestJSON<{
      email: { sendEnabled: boolean; senderAddress: string | null };
    }>("/api/capabilities")
      .then((result) => {
        if (!cancelled) setCapability(result.email);
      })
      .catch(() => {
        if (!cancelled) setCapability(null);
      });
    return () => {
      cancelled = true;
    };
  }, [connected]);
  async function submit(drafts: Draft[], senderEmail: string) {
    if (lock.current) return null;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const snapshots = structuredClone(drafts);
      if (
        snapshots.some(
          (d) =>
            (d.attachments || []).reduce((n, a) => n + a.size, 0) >
            2 * 1024 * 1024,
        )
      )
        throw new Error(
          "Keep attachments within 2 MB total per message for Outlook sending.",
        );
      const metas = [
        ...new Map(
          snapshots.flatMap((d) => d.attachments || []).map((a) => [a.id, a]),
        ).values(),
      ];
      if (
        snapshots
          .flatMap((d) => d.attachments || [])
          .reduce((n, a) => n + a.size, 0) >
        2 * 1024 * 1024
      )
        throw new Error(
          "Choose a smaller batch: total attachments must be at most 2 MB.",
        );
      const attachments = await Promise.all(
        metas.map(async (meta) => {
          const file = await get<Blob>(`research-attachment:${meta.id}`);
          if (!file || file.size !== meta.size || file.size > 2 * 1024 * 1024)
            throw new Error(
              `Reattach ${meta.name}; each attachment must be at most 2 MB.`,
            );
          const content = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = () =>
              reject(new Error("Could not read attachment."));
            reader.readAsDataURL(file);
          });
          return { id: meta.id, content };
        }),
      );
      const payload = {
        drafts: snapshots,
        attachments,
        senderEmail,
        confirmed: true,
      };
      const hash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(JSON.stringify(payload)),
          ),
        ),
      )
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      let idempotencyKey = crypto.randomUUID();
      try {
        const key = `research:batch:${hash}`;
        idempotencyKey = sessionStorage.getItem(key) || idempotencyKey;
        sessionStorage.setItem(key, idempotencyKey);
      } catch {
        /* The server also prevents duplicate draft submissions. */
      }
      return await requestJSON<{ batchId: string }>("/api/mail/send", {
        ...payload,
        idempotencyKey,
      });
    } catch (e) {
      setError(
        `${e instanceof Error ? e.message : "The request could not be confirmed."} Check contact history before submitting again.`,
      );
      return null;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return { capability, busy, error, submit };
}
