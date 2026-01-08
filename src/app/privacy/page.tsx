import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Privacy",
};

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-8">Privacy Policy</h1>

      <div className="prose prose-gray dark:prose-invert max-w-none space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>No OAuth or Login Required</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              This website does not use Instagram OAuth or any authentication
              flow. There is no login required. Your Instagram credentials are
              never requested, collected, or stored by this application.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Data Collection</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              <strong>What we collect:</strong> Nothing. This is a static
              website that renders data from local JSON files committed to the
              repository.
            </p>
            <p>
              <strong>How data is obtained:</strong> The site owner manually
              exports their Instagram data using local tools (like Instaloader)
              on their own machine. This data is then committed to the
              repository as JSON files.
            </p>
            <p>
              <strong>What is stored:</strong> Only publicly available
              Instagram data that the site owner chooses to include in the
              repository (profile info, posts, like counts). No sensitive
              information, no credentials, no private messages.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How It Works</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <ol className="list-decimal list-inside space-y-2">
              <li>
                The site owner runs a local Python script to export their
                Instagram data
              </li>
              <li>
                The script outputs JSON files containing profile and post
                information
              </li>
              <li>
                These JSON files are committed to the repository
              </li>
              <li>
                The website reads these static files to display the dashboard
              </li>
              <li>
                No live connections to Instagram are made from the deployed site
              </li>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Third-Party Services</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <p>
              <strong>Hosting:</strong> This site is hosted on Vercel. Vercel
              may collect standard web server logs (IP addresses, user agents)
              as part of their service. Please refer to{" "}
              <a
                href="https://vercel.com/legal/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Vercel&apos;s Privacy Policy
              </a>{" "}
              for details.
            </p>
            <p>
              <strong>Analytics:</strong> No analytics scripts are included on
              this site. We do not track visitors.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal Use Only</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              This website is built for personal use to view my own Instagram
              analytics. It is not intended for commercial purposes or to
              process data for other users.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              If you have any questions about this privacy policy, please open
              an issue on the repository or contact the site owner directly.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
