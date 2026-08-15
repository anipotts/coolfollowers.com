"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const Liquid = dynamic(
  () => import("@/components/canvasui/Liquid").then((module) => module.Liquid),
  { ssr: false },
);

export function LiquidHero({ children }: { children: ReactNode }) {
  return (
    <section className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-16">
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <Liquid
          className="size-full"
          simResolution={64}
          dyeResolution={256}
          densityDissipation={0.945}
          velocityDissipation={0.985}
          pressure={0.72}
          pressureIterations={3}
          curl={1.2}
          radius={0.24}
          force={0.72}
          intensity={1.25}
          distortion={0.08}
          blend={2}
          color={[0.12, 0.46, 0.94]}
        >
          <div
            className="size-full bg-background"
            style={{
              backgroundImage:
                "radial-gradient(circle at 18% 22%, rgba(143, 196, 255, 0.75), transparent 34%), radial-gradient(circle at 78% 72%, rgba(184, 218, 255, 0.82), transparent 38%), radial-gradient(circle at 70% 16%, rgba(255, 255, 255, 0.96), transparent 30%)",
            }}
          />
        </Liquid>
      </div>

      <div className="pointer-events-none absolute inset-4 z-0 rounded-[2.75rem] bg-white/48 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.9),0_30px_90px_rgba(35,79,130,0.12)] sm:inset-6" />
      <div className="relative z-10 w-full">{children}</div>
    </section>
  );
}
