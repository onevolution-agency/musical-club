"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { isHandheldInstallTarget } from "./install-target";

type BeforeInstall = Event & { prompt: () => Promise<void> };

function subscribe(onStoreChange: () => void) {
  const queries = [
    window.matchMedia("(hover: hover) and (pointer: fine)"),
    window.matchMedia("(pointer: coarse)"),
    window.matchMedia("(max-width: 900px)"),
  ];
  for (const query of queries) query.addEventListener("change", onStoreChange);
  return () => {
    for (const query of queries) query.removeEventListener("change", onStoreChange);
  };
}

function handheldNow() {
  return isHandheldInstallTarget({
    userAgent: window.navigator.userAgent,
    finePointer: window.matchMedia("(hover: hover) and (pointer: fine)").matches,
    coarsePointer: window.matchMedia("(pointer: coarse)").matches,
    narrow: window.matchMedia("(max-width: 900px)").matches,
  });
}

function iosInstallHint() {
  const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
  const standalone = window.matchMedia("(display-mode: standalone)").matches;
  return ios && !standalone;
}

export function Pwa() {
  const [install, setInstall] = useState<BeforeInstall | null>(null);
  const [hidden, setHidden] = useState(false);
  const handheld = useSyncExternalStore(subscribe, handheldNow, () => false);
  const iosHint = useSyncExternalStore(subscribe, iosInstallHint, () => false);
  const visible = !hidden && handheld && Boolean(install || iosHint);

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

  useEffect(() => {
    if (!visible) return;
    document.body.classList.add("has-install-banner");
    return () => document.body.classList.remove("has-install-banner");
  }, [visible]);

  if (!visible) return null;
  return (
    <div className="install-banner" role="dialog" aria-label="Instalar la app">
      <div className="install-banner-inner">
        <p>Instalá la app</p>
        <span className="row">
          <button
            className="btn btn-red"
            onClick={() => {
              if (!install) return;
              void install.prompt();
              setHidden(true);
            }}
          >
            Instalar
          </button>
          <button className="btn btn-ghost install-dismiss" onClick={() => setHidden(true)}>
            Ahora no
          </button>
        </span>
      </div>
    </div>
  );
}
