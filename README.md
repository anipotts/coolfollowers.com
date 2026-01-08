# coolfollowers.com

A personal Instagram analytics dashboard built with Next.js 15. View your profile stats, browse posts, and explore insights—all from locally exported data.

## Features

- **Dashboard** - Profile overview with follower stats and recent posts
- **Posts Browser** - Search, sort, and filter posts with grid/table views
- **Insights** - Top posts, posting frequency, and engagement metrics
- **Dark Mode** - Automatic theme detection with manual toggle
- **Privacy First** - No OAuth, no credentials, data stored in repo

## Tech Stack

- [Next.js 15](https://nextjs.org/) (App Router)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Zod](https://zod.dev/) (schema validation)
- [date-fns](https://date-fns.org/) (date formatting)

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, or pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/coolfollowers.com.git
cd coolfollowers.com

# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Refresh Instagram Data

The site renders from static JSON files in `/data/instagram/`. To update with real data:

```bash
# Install Python dependencies
pip install instaloader

# Run the refresh script (replace with your username)
python scripts/refresh_instagram_data.py your_username

# Commit the updated files
git add data/instagram/*.json
git commit -m "Update Instagram data"
```

See [scripts/README.md](scripts/README.md) for detailed instructions.

## Deploy to Vercel

### Quick Deploy

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy preview
vercel

# Deploy to production
vercel --prod
```

### Connect Domain (Namecheap → Vercel)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project → Settings → Domains
3. Add `coolfollowers.com` (and optionally `www.coolfollowers.com`)
4. Vercel will provide DNS records. Choose one method:

   **Option A: Nameservers (Recommended)**
   - In Namecheap → Domain List → Manage → Nameservers
   - Select "Custom DNS" and add Vercel's nameservers

   **Option B: DNS Records**
   - In Namecheap → Domain List → Manage → Advanced DNS
   - Add the A record and/or CNAME record provided by Vercel

5. Wait for DNS propagation (can take up to 48 hours, usually faster)
6. Vercel will automatically provision SSL certificate

## Project Structure

```
/
├── data/instagram/          # Static JSON data files
│   ├── profile.json
│   └── posts.json
├── scripts/                 # Local-only refresh scripts
│   ├── refresh_instagram_data.py
│   └── README.md
├── src/
│   ├── app/                 # Next.js App Router pages
│   │   ├── (site)/          # Landing page
│   │   ├── dashboard/       # Dashboard, posts, insights
│   │   └── privacy/         # Privacy policy
│   ├── components/          # React components
│   │   └── ui/              # shadcn/ui components
│   └── lib/
│       ├── ig/              # Instagram data schemas & loaders
│       └── utils.ts         # Utility functions
└── ...config files
```

## Data Contract

### profile.json

```json
{
  "username": "string",
  "fullName": "string",
  "bio": "string",
  "profilePicUrl": "string (URL)",
  "followersCount": 0,
  "followingCount": 0,
  "lastUpdated": "ISO 8601 datetime"
}
```

### posts.json

```json
[
  {
    "id": "string",
    "shortcode": "string",
    "caption": "string | null",
    "mediaType": "image | video | carousel",
    "mediaUrls": ["string (URLs)"],
    "permalink": "string (URL)",
    "timestamp": "ISO 8601 datetime",
    "likeCount": 0,
    "commentCount": 0,
    "likers": [
      {
        "username": "string",
        "fullName": "string | null",
        "profilePicUrl": "string | null"
      }
    ]
  }
]
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |

## Privacy

This is a personal project that:

- Does **not** use Instagram OAuth
- Does **not** collect any credentials
- Stores data only in the repository
- Uses local-only scripts for data refresh

See [/privacy](https://coolfollowers.com/privacy) for the full privacy policy.

## License

MIT
