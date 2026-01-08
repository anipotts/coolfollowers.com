import { Suspense } from "react";
import Link from "next/link";
import { PasswordForm } from "@/components/password-form";

export default function HomePage() {
  return (
    <div className="container mx-auto px-4 py-16 md:py-24">
      <div className="flex flex-col items-center text-center space-y-8">
        <div className="space-y-4 max-w-2xl">
          <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl md:text-6xl">
            Welcome to{" "}
            <span className="text-primary">coolfollowers</span>
          </h1>
          <p className="mx-auto max-w-[600px] text-muted-foreground md:text-xl">
            A personal Instagram analytics dashboard. View your profile stats,
            browse posts, and explore insights.
          </p>
        </div>

        <Suspense fallback={<div className="h-64 w-full max-w-md animate-pulse bg-muted rounded-lg" />}>
          <PasswordForm />
        </Suspense>

        <div className="mt-8 text-center">
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            How it works & Privacy Policy
          </Link>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-3 text-left max-w-3xl">
          <div className="space-y-2">
            <h3 className="font-semibold">Live Data Refresh</h3>
            <p className="text-sm text-muted-foreground">
              Fetch fresh Instagram data on-demand with smart caching.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Deep Analytics</h3>
            <p className="text-sm text-muted-foreground">
              See who likes your posts, full comment threads, and engagement trends.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Private & Secure</h3>
            <p className="text-sm text-muted-foreground">
              Password protected. Your data stays on your server.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
