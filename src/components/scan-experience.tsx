"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { LiquidHero } from "@/components/liquid-hero";
import { Button } from "@/components/ui/button";
import {
  EXTENSION_SOURCE,
  PROTOCOL_VERSION,
  WEB_SOURCE,
  type ExtensionEvent,
  type WebRequest,
  type WebRequestType,
} from "@/lib/extension-protocol";

function postRequest(type: WebRequestType) {
  window.postMessage(
    { source: WEB_SOURCE, version: PROTOCOL_VERSION, type } satisfies WebRequest,
    window.location.origin,
  );
}

const steps = [
  { number: 1, title: "ready", status: "connected to your Instagram" },
  { number: 2, title: "scan followers", status: "guided on Instagram" },
  { number: 3, title: "scan following", status: "verified against the total" },
  { number: 4, title: "results", status: "cools and fools" },
] as const;

export function ScanExperience() {
  const [extensionReady, setExtensionReady] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    function onMessage(event: MessageEvent<ExtensionEvent>) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const message = event.data;
      if (!message || message.source !== EXTENSION_SOURCE || message.version !== PROTOCOL_VERSION) return;
      setExtensionReady(true);
      setShowSetup(false);
    }
    window.addEventListener("message", onMessage);
    postRequest("COOLFOLLOWERS_GET_STATE");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const openExtension = useCallback(() => {
    if (extensionReady) {
      postRequest("COOLFOLLOWERS_OPEN_APP");
      return;
    }
    setShowSetup(true);
  }, [extensionReady]);

  return (
    <main>
      <LiquidHero>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.08fr_.92fr] lg:gap-20">
          <section className="flex flex-col items-center text-center lg:items-start lg:text-left">
            <p className="mb-6 rounded-full bg-white/72 px-4 py-2 text-xs font-extrabold tracking-[0.08em] text-primary shadow-[0_8px_24px_rgba(35,79,130,0.08)]">
              private chrome beta
            </p>
            <h1 className="text-5xl font-extrabold tracking-[-0.065em] sm:text-7xl lg:text-[5.25rem] lg:leading-[.96]">
              coolfollowers.com
            </h1>
            <p className="mt-6 max-w-xl text-xl font-semibold leading-8 tracking-[-0.025em] text-foreground sm:text-2xl">
              see which followers are actually cool.
            </p>
            <p className="mt-4 max-w-lg text-base font-semibold leading-7 text-muted-foreground">
              scan beside Instagram, watch every step, and keep the results inside Chrome.
            </p>
            <Button className="mt-9" size="lg" onClick={openExtension}>
              {extensionReady ? "open coolfollowers" : "get the private beta"}
            </Button>
            {showSetup ? (
              <div className="mt-5 max-w-md rounded-[1.25rem] bg-white/78 px-5 py-4 text-sm font-semibold leading-6 text-muted-foreground shadow-[0_12px_32px_rgba(35,79,130,0.1)]">
                load the private beta from Chrome extensions, then refresh this page. public installation comes later.
              </div>
            ) : null}
            <Link className="mt-6 text-sm font-bold text-muted-foreground underline decoration-primary/30 decoration-2 underline-offset-4 hover:text-primary" href="/privacy">
              how your data stays private
            </Link>
          </section>

          <aside className="w-full rounded-[2rem] bg-[#eef7ff]/94 p-4 shadow-[0_28px_80px_rgba(35,79,130,0.18)] sm:p-5" aria-label="coolfollowers extension preview">
            <div className="flex items-baseline justify-between px-2 pb-5 pt-1">
              <p className="text-lg font-extrabold tracking-[-0.05em] text-primary">coolfollowers.com</p>
              <p className="text-xs font-bold text-muted-foreground">private in Chrome</p>
            </div>
            <div className="flex flex-col gap-3">
              {steps.map((step, index) => (
                <div
                  key={step.number}
                  className={
                    "rounded-[1.35rem] bg-white/88 px-4 py-4 shadow-[0_10px_28px_rgba(35,79,130,0.08)] " +
                    (index === 1 ? "ring-2 ring-primary/20" : "")
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className={
                      "grid size-9 shrink-0 place-items-center rounded-full font-mono text-xs font-medium " +
                      (index === 1 ? "bg-primary text-white" : "bg-muted text-muted-foreground")
                    }>{step.number}</span>
                    <div className="min-w-0">
                      <p className="font-extrabold tracking-[-0.025em]">{step.title}</p>
                      <p className="mt-0.5 truncate text-xs font-semibold text-muted-foreground">{step.status}</p>
                    </div>
                  </div>
                  {index === 1 ? (
                    <div className="ml-12 mt-4">
                      <p className="text-sm font-semibold leading-6 text-muted-foreground">follow the moving outline and click followers.</p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                        <span className="block h-full w-[38%] rounded-full bg-primary" />
                      </div>
                      <p className="mt-3 font-mono text-lg text-primary">376 of 1,134</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
            <p className="px-2 pb-1 pt-5 text-center text-xs font-bold text-muted-foreground">
              no passwords or remote follower database
            </p>
          </aside>
        </div>
      </LiquidHero>
    </main>
  );
}
