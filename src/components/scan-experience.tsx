"use client";

import { useCallback, useEffect, useState } from "react";
import { LiquidHero } from "@/components/liquid-hero";
import { RelationshipCard } from "@/components/relationship-card";
import { Button } from "@/components/ui/button";
import {
  EXTENSION_SOURCE,
  PROTOCOL_VERSION,
  WEB_SOURCE,
  emptyScanState,
  type ExtensionEvent,
  type ScanState,
  type WebRequest,
  type WebRequestType,
} from "@/lib/extension-protocol";

const CHROME_STORE_URL =
  process.env.NEXT_PUBLIC_CHROME_STORE_URL ??
  "https://chromewebstore.google.com/";

const PREVIEW_STATE: ScanState = {
  version: PROTOCOL_VERSION,
  phase: "complete",
  collected: 10,
  expected: 10,
  expectedIsExact: true,
  cools: [
    "sunsetdreams",
    "lowtidevisuals",
    "midnightarchive",
    "neonchillz",
    "cloudydaze",
  ].map((username) => ({
    username,
    profileUrl: "https://www.instagram.com/" + username + "/",
  })),
  fools: [
    "ghostprotocol",
    "rarelyonline",
    "pixelcowboy",
    "unknownuser42",
    "brokenmirrorz",
  ].map((username) => ({
    username,
    profileUrl: "https://www.instagram.com/" + username + "/",
  })),
  updatedAt: Date.now(),
};

function postRequest(type: WebRequestType) {
  const request: WebRequest = {
    source: WEB_SOURCE,
    version: PROTOCOL_VERSION,
    type,
  };
  window.postMessage(request, window.location.origin);
}

function DomainName({ compact = false }: { compact?: boolean }) {
  return (
    <h1
      className={
        compact
          ? "text-xl font-extrabold tracking-[-0.05em] sm:text-2xl"
          : "text-center text-5xl font-extrabold tracking-[-0.065em] sm:text-7xl lg:text-8xl"
      }
    >
      coolfollowers.com
    </h1>
  );
}

export function ScanExperience() {
  const [extensionReady, setExtensionReady] = useState(false);
  const [state, setState] = useState<ScanState>(() => emptyScanState());
  const [missingExtension, setMissingExtension] = useState(false);

  useEffect(() => {
    const isPreview =
      (process.env.NODE_ENV === "development" ||
        process.env.NEXT_PUBLIC_PREVIEW_RESULTS === "1") &&
      new URLSearchParams(window.location.search).get("preview") === "results";
    if (isPreview) queueMicrotask(() => setState(PREVIEW_STATE));

    function onMessage(event: MessageEvent<ExtensionEvent>) {
      if (event.source !== window || event.origin !== window.location.origin)
        return;
      const message = event.data;
      if (
        !message ||
        message.source !== EXTENSION_SOURCE ||
        message.version !== PROTOCOL_VERSION
      )
        return;

      setExtensionReady(true);
      setMissingExtension(false);
      if (message.type === "COOLFOLLOWERS_STATE" && message.state) {
        setState(message.state);
      }
    }

    window.addEventListener("message", onMessage);
    postRequest("COOLFOLLOWERS_GET_STATE");
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const startScan = useCallback(() => {
    if (!extensionReady) {
      setMissingExtension(true);
      window.open(CHROME_STORE_URL, "_blank", "noopener,noreferrer");
      return;
    }
    postRequest("COOLFOLLOWERS_START_SCAN");
  }, [extensionReady]);

  const clear = useCallback(() => {
    postRequest("COOLFOLLOWERS_CLEAR");
    setState(emptyScanState());
  }, []);

  if (state.phase === "complete" && state.cools && state.fools) {
    return (
      <main className="min-h-screen bg-background px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col gap-10">
          <DomainName compact />

          <div className="results-arrive grid gap-6 lg:grid-cols-2 lg:gap-8">
            <RelationshipCard
              title="these followers are cools"
              description="they follow you back"
              records={state.cools}
              tone="cool"
            />
            <RelationshipCard
              title="these followers are fools"
              description="they don’t follow you back"
              records={state.fools}
              tone="fool"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-4 pb-6">
            <Button onClick={startScan}>scan again</Button>
            <Button variant="outline" onClick={clear}>
              clear
            </Button>
          </div>
        </div>
      </main>
    );
  }

  if (
    state.phase === "starting" ||
    state.phase === "followers" ||
    state.phase === "following"
  ) {
    const label =
      state.phase === "following"
        ? "checking who you follow"
        : "checking your followers";
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <div className="flex w-full max-w-xl flex-col items-center gap-8 rounded-[2rem] bg-white p-9 text-center shadow-[0_24px_80px_rgba(35,79,130,0.12)] sm:p-14">
          <DomainName compact />
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-extrabold tracking-[-0.05em]">
              {label}
            </h2>
            <p className="font-mono text-xl text-primary">
              {state.expected
                ? state.collected.toLocaleString() + " of " + state.expected.toLocaleString()
                : state.collected.toLocaleString()}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => postRequest("COOLFOLLOWERS_CANCEL_SCAN")}
          >
            cancel
          </Button>
        </div>
      </main>
    );
  }

  if (state.phase === "error" && state.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <div className="flex w-full max-w-xl flex-col items-center gap-8 rounded-[2rem] bg-white p-9 text-center shadow-[0_24px_80px_rgba(35,79,130,0.12)] sm:p-14">
          <DomainName compact />
          <div className="flex flex-col gap-3">
            <h2 className="text-3xl font-extrabold tracking-[-0.05em]">
              the scan stopped
            </h2>
            <p className="leading-7 text-muted-foreground">
              {state.error.message}
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4">
            {state.error.retryable ? (
              <Button onClick={startScan}>try again</Button>
            ) : null}
            <Button variant="outline" onClick={clear}>
              clear
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main>
      <LiquidHero>
        <div className="flex max-w-5xl flex-col items-center gap-10 text-center">
          <div className="flex flex-col items-center gap-5">
            <DomainName />
            <p className="text-xl font-semibold tracking-[-0.025em] text-foreground sm:text-2xl">
              see which followers are actually cool.
            </p>
          </div>
          <Button size="lg" onClick={startScan}>
            check my followers
          </Button>
          {missingExtension ? (
            <p className="max-w-md text-sm font-semibold leading-6 text-muted-foreground">
              add the coolfollowers extension to Chrome, then come back and
              check again.
            </p>
          ) : null}
        </div>
      </LiquidHero>
    </main>
  );
}
