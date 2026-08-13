import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "privacy | coolfollowers.com",
  description: "How coolfollowers.com keeps Instagram data on your device.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16 sm:px-10 sm:py-24">
      <article className="mx-auto flex max-w-2xl flex-col gap-12 rounded-[2rem] bg-white p-8 shadow-[0_24px_80px_rgba(35,79,130,0.12)] sm:p-12">
        <div className="flex flex-col gap-4">
          <Link
            href="/"
            className="w-fit text-lg font-extrabold tracking-[-0.04em] text-foreground outline-none focus-visible:ring-4 focus-visible:ring-ring/25"
          >
            coolfollowers.com
          </Link>
          <h1 className="text-4xl font-extrabold tracking-[-0.05em] sm:text-5xl">
            privacy
          </h1>
        </div>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">your data stays in Chrome</h2>
          <p className="leading-7 text-muted-foreground">
            The extension reads usernames from the followers and following
            lists that you open on your own Instagram account. It does not ask
            for your Instagram password or read your cookies.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">nothing is uploaded</h2>
          <p className="leading-7 text-muted-foreground">
            Usernames, scan progress, and results remain in temporary Chrome
            session storage. They are not sent to coolfollowers.com, an
            analytics provider, or any other server. Clearing results or ending
            the browser session removes them.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">limited access</h2>
          <p className="leading-7 text-muted-foreground">
            The extension is limited to coolfollowers.com and instagram.com.
            It does not follow, unfollow, message, like, or publish anything.
          </p>
        </section>

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold">website hosting</h2>
          <p className="leading-7 text-muted-foreground">
            The website is statically hosted by Vercel. Vercel may process
            ordinary request information such as IP addresses and browser user
            agents under its own privacy policy. The site includes no analytics
            scripts.
          </p>
        </section>
      </article>
    </main>
  );
}
