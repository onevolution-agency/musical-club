"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

type BeforeInstall = Event & { prompt: () => Promise<void> };

function subscribe() {
  return () => undefined;
}

function iosInstallHint() {
  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export function Pwa() {
  const [install, setInstall] = useState<BeforeInstall | null>(null);
  const [hidden, setHidden] = useState(false);
  const iosHint = useSyncExternalStore(subscribe, iosInstallHint, () => false);

  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setInstall(event as BeforeInstall);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (hidden || (!install && !iosHint)) return null;
  return (
    <div className="install-banner" role="dialog" aria-label="Instalar Musical Club">
      <p style={{ margin: 0 }}>
        {iosHint
          ? "En el iPhone: Compartir y después Agregar a inicio."
          : "Instalá Musical Club en el teléfono para la lista y tu QR."}
      </p>
      <span className="row">
        {install ? (
          <button
            className="btn btn-red"
            onClick={() => {
              void install.prompt();
              setHidden(true);
            }}
          >
            Instalar
          </button>
        ) : null}
        <button className="btn btn-ghost" style={{ color: "#0c0c0c", borderColor: "#0c0c0c" }} onClick={() => setHidden(true)}>
          Ahora no
        </button>
      </span>
    </div>
  );
}
