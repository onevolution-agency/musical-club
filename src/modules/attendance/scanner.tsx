"use client";

import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/brand/avatar";
import { scanAttendance, type ScanResult } from "./actions";

type RosterRow = {
  id: string;
  name: string;
  present: boolean;
  avatarUrl?: string | null;
  kid?: boolean;
  contact?: string | null;
};

export function Scanner({ sessionId, initialRoster }: { sessionId: string; initialRoster: RosterRow[] }) {
  const [roster, setRoster] = useState(initialRoster);
  const [feedback, setFeedback] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const busy = useRef(false);

  useEffect(() => {
    let scanner: { stop: () => Promise<void> } | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const instance = new Html5Qrcode("qr-reader");
        scanner = instance;
        await instance.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 240, height: 240 } },
          async (text) => {
            if (busy.current || cancelled) return;
            busy.current = true;
            const result = await scanAttendance(sessionId, text);
            setFeedback(result);
            if (result.ok) {
              setRoster((current) =>
                current.map((row) =>
                  row.id === result.studentId ? { ...row, present: true, avatarUrl: result.avatarUrl ?? row.avatarUrl } : row,
                ),
              );
              navigator.vibrate?.(40);
            } else {
              navigator.vibrate?.([40, 40, 40]);
            }
            window.setTimeout(() => {
              busy.current = false;
            }, 1400);
          },
          () => undefined,
        );
      } catch {
        if (!cancelled) setCameraError("No pudimos abrir la cámara.");
      }
    })();
    return () => {
      cancelled = true;
      void scanner?.stop().catch(() => undefined);
    };
  }, [sessionId]);

  return (
    <div className="scanner-shell">
      <div id="qr-reader" />
      {cameraError ? <p className="form-error">{cameraError}</p> : <p className="hint">Apuntá al QR.</p>}
      {feedback ? (
        <p className={feedback.ok ? "feedback feedback-ok" : "feedback feedback-bad"} role="status" aria-live="polite">
          {feedback.ok ? <Avatar name={feedback.message} url={feedback.avatarUrl} size={44} /> : null} {feedback.message}
        </p>
      ) : null}
      <ul className="stars">
        {roster.map((row) => (
          <li key={row.id}>
            <span className="person">
              <Avatar name={row.name} url={row.avatarUrl} size={44} />
              {row.name} {row.kid ? <span className="badge">Kid</span> : null} {row.present ? "· presente" : "· ausente"}
              {row.contact ? <span className="hint">{row.contact}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
