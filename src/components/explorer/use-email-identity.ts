"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { requestJSON } from "@/lib/api";

export interface EmailIdentity {
  verified: boolean;
  email: string | null;
  verificationAvailable: boolean;
  outlook: { configured: boolean; connected: boolean; email: string | null };
}

// Account status is independent of the settings form. Read it on page entry and
// when returning from another tab, including after verification or disconnect.
export function useEmailIdentity() {
  const [identity, setIdentity] = useState<EmailIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const epoch = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++epoch.current;
    setLoading(true);
    setError("");
    try {
      const value = await requestJSON<EmailIdentity>("/api/auth/session");
      if (current === epoch.current) setIdentity(value);
    } catch (e) {
      if (current === epoch.current) {
        setIdentity(null);
        setError(
          e instanceof Error
            ? e.message
            : "Could not check your email connection.",
        );
      }
    } finally {
      if (current === epoch.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      epoch.current++;
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);
  return { identity, loading, error, refresh };
}
