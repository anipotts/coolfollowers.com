# coolfollowers.com

A personal Instagram analytics dashboard built with Next.js 15. View your profile stats, browse posts, explore insights, and track followers—all powered by live data refresh via Instaloader.

## Features

- **Password Protected** - Simple password gate to protect your dashboard
- **Live Data Refresh** - Fetch fresh Instagram data on-demand via Instaloader
- **Smart Caching** - 1-hour cache with Vercel KV (Redis) to respect rate limits
- **Dashboard** - Profile overview with follower stats and recent posts
- **Posts Browser** - Search, sort, and filter posts with likers & comments
- **Followers/Following** - Browse your followers and following lists
- **Insights** - Best time to post, hashtag performance, engagement metrics
- **Dark Mode** - Automatic theme detection with manual toggle

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zod](https://zod.dev/) (schema validation)
- [Vercel KV](https://vercel.com/storage/kv) (Redis cache)
- [Instaloader](https://instaloader.github.io/) (Instagram data fetching)

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- Python 3.8+ (for session creation)
- Vercel account (for KV storage)

### 1. Clone & Install

```bash
git clone https://github.com/anipotts/coolfollowers.com.git
cd coolfollowers.com

# Install Node dependencies
npm install

# Install Python dependencies (for session creation)
pip install instaloader
```

### 2. Create Instagram Session

Instaloader needs a valid Instagram session to fetch data. Create one locally:

```bash
# Login to Instagram via Instaloader
instaloader --login=YOUR_USERNAME

# This creates a session file at:
# macOS/Linux: ~/.config/instaloader/session-YOUR_USERNAME
# Windows: %LOCALAPPDATA%\instaloader\session-YOUR_USERNAME
```

Then encode it for the environment variable:

```bash
# macOS/Linux
base64 -i ~/.config/instaloader/session-YOUR_USERNAME

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$env:LOCALAPPDATA\instaloader\session-YOUR_USERNAME"))
```

Copy the output—you'll need it for `IG_SESSION_DATA`.

### 3. Set Up Vercel KV

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Storage → Create Database → KV
3. Name it (e.g., "coolfollowers-cache")
4. Copy the `KV_REST_API_URL` and `KV_REST_API_TOKEN` values

### 4. Configure Environment Variables

Create `.env.local`:

```bash
# Copy the example file
cp .env.example .env.local
```

Fill in the required values:

```env
SITE_PASSWORD=your-dashboard-password
IG_USERNAME=your_instagram_username
IG_SESSION_DATA=your-base64-encoded-session
KV_REST_API_URL=your-vercel-kv-url
KV_REST_API_TOKEN=your-vercel-kv-token
```

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), enter your password, and click "Refresh Data" to fetch your Instagram data.

## Deploy to Vercel

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login and deploy
vercel login
vercel --prod
```

### Configure Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables and add:

| Variable | Description |
|----------|-------------|
| `SITE_PASSWORD` | Password to access the dashboard |
| `IG_USERNAME` | Your Instagram username |
| `IG_SESSION_DATA` | Base64-encoded session file |
| `KV_REST_API_URL` | Auto-set when you link Vercel KV |
| `KV_REST_API_TOKEN` | Auto-set when you link Vercel KV |

### Connect Custom Domain

1. Vercel Dashboard → Your Project → Settings → Domains
2. Add your domain (e.g., `coolfollowers.com`)
3. Configure DNS as instructed by Vercel

## Project Structure

```
/
├── api/                     # Python serverless functions
│   └── ig-refresh.py        # Instaloader refresh endpoint
├── src/
│   ├── app/
│   │   ├── (site)/          # Landing page (password form)
│   │   ├── api/             # Next.js API routes
│   │   │   ├── auth/        # Authentication
│   │   │   ├── data/        # Data endpoints
│   │   │   └── refresh/     # Refresh trigger
│   │   └── dashboard/       # Protected dashboard pages
│   │       ├── posts/
│   │       ├── followers/
│   │       ├── following/
│   │       └── insights/
│   ├── components/          # React components
│   │   └── ui/              # shadcn/ui components
│   └── lib/
│       ├── ig/              # Instagram schemas & loaders
│       ├── cache.ts         # Vercel KV cache utilities
│       └── auth.ts          # Authentication utilities
├── requirements.txt         # Python dependencies for Vercel
└── middleware.ts            # Route protection
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth` | POST | Authenticate with password |
| `/api/auth` | DELETE | Logout (clear cookie) |
| `/api/refresh` | GET | Get refresh status |
| `/api/refresh` | POST | Trigger data refresh |
| `/api/data/profile` | GET | Get cached profile |
| `/api/data/posts` | GET | Get cached posts |
| `/api/data/followers` | GET | Get cached followers |
| `/api/data/following` | GET | Get cached following |
| `/api/data/stats` | GET | Get computed statistics |

## Rate Limits & Caching

To avoid Instagram rate limits:

- Data is cached in Vercel KV for 1 hour (configurable via `CACHE_TTL_SECONDS`)
- Refresh requests within the cache window return cached data
- Limited to 50 posts, 50 likers per post, 1000 followers/following by default
- Configure limits via environment variables (see `.env.example`)

## Troubleshooting

### Session Expired

If refresh fails with a session error:

1. Re-login with Instaloader locally: `instaloader --login=YOUR_USERNAME`
2. Re-encode the session file
3. Update `IG_SESSION_DATA` in Vercel

### Rate Limited

Instagram may temporarily block requests if you refresh too frequently. Wait an hour and try again. The cache prevents automatic rate limiting when used normally.

### KV Connection Error

Make sure Vercel KV is linked to your project and the environment variables are set. In local dev, you need to copy the KV credentials from Vercel dashboard.

## Privacy

This is a personal project that:

- Only accesses **your own** Instagram data
- Requires **your own** session (no OAuth flow)
- Stores data in **your own** Vercel KV instance
- Is password protected for your eyes only

See [/privacy](https://coolfollowers.com/privacy) for the full privacy policy.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## License

MIT
