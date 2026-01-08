import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t py-6 md:py-0">
      <div className="container mx-auto flex flex-col items-center justify-between gap-4 md:h-14 md:flex-row px-4">
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built for personal use.{" "}
          <Link
            href="/privacy"
            className="font-medium underline underline-offset-4"
          >
            Privacy Policy
          </Link>
        </p>
        <p className="text-center text-sm text-muted-foreground md:text-right">
          Data from local exports only.
        </p>
      </div>
    </footer>
  );
}
