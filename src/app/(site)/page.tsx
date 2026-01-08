import Link from "next/link";
import { Button } from "@/components/ui/button";

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
            browse posts, and explore insights—all from locally exported data.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg">
            <Link href="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/privacy">
              How it Works
            </Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-8 sm:grid-cols-3 text-left max-w-3xl">
          <div className="space-y-2">
            <h3 className="font-semibold">No OAuth Required</h3>
            <p className="text-sm text-muted-foreground">
              Your data stays local. No login flows, no tokens, no third-party access.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Privacy First</h3>
            <p className="text-sm text-muted-foreground">
              Data is committed to the repo as JSON. No databases, no tracking.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-semibold">Personal Use</h3>
            <p className="text-sm text-muted-foreground">
              Built for viewing your own Instagram data. Refresh locally, deploy anywhere.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
