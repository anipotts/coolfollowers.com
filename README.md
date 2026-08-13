# coolfollowers.com

see which people you follow are actually cool.

the site is a static Next.js app. a Manifest V3 Chrome extension reads the follower and following dialogs from the Instagram account already logged into Chrome. usernames stay in the browser session and are never sent to the site.

## local development

```bash
npm install
npm run dev
```

open `http://localhost:3000`. use `http://localhost:3000?preview=results` to review the result layout without an Instagram scan.

for a production-build visual check, build with the public `NEXT_PUBLIC_PREVIEW_RESULTS=1` setting and use the same preview URL. normal production builds exclude the preview behavior.

## extension

```bash
npm run extension:build
```

load `extension/dist` as an unpacked extension in `chrome://extensions` with developer mode enabled. the release build requests access only to `coolfollowers.com` and `instagram.com`. it does not request passwords, cookies, or session tokens.

`npm run extension:watch` adds localhost access only to the generated development manifest.

the Chrome Web Store URL can be supplied at build time through the public `NEXT_PUBLIC_CHROME_STORE_URL` setting after a listing exists.

## verification

```bash
npm run verify
```

this runs linting, unit tests, the extension build, and the static site build. neither command deploys the site or submits the extension.

## architecture

- the site is a static export with no API, database, account system, or analytics
- scan progress and results live in `chrome.storage.session` and disappear when the browser session ends
- exact Instagram totals are required before a scan is marked complete
- the scanner observes list mutations, batches DOM reads with animation frames, and stores progress in batches
- the Canvas UI Liquid source is owned in `src/components/canvasui/Liquid.tsx` and loads after the functional interface
