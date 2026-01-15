# FounderDirect

**Instant access to contact info for thousands of Y Combinator founders**

A full-stack tool that helps Engineers,VCs to connect with YC Founders without any hassle.

Built with Next.js, Supabase, Puppeteer, Cheerio, Tailwind, shadcn/ui, and Hunter.io.

<p align="center">
  <img src="/public/founderdirect.png" alt="FounderDirect Banner" width="800"/>
</p>

## Features

- Scrapes latest YC companies & founders.
- Reliably extracts **real company website** (not just YC directory link)
- Enriches founders with emails using Hunter.io (high-confidence) + pattern-based fallbacks
- Beautiful FounderCard component with:
  - Avatar (YC or generated)
  - Email copy button + confidence badge
  - LinkedIn, Twitter/X, company website links
  - "Best way to reach" smart hint
- Fast search by name, company, batch via Supabase
- Responsive design with Tailwind & shadcn/ui

## Tech Stack

- **Frontend** — Next.js 16 (App Router), TypeScript, Tailwind CSS, shadcn/ui, lucide-react
- **Backend / Scraping** — Node.js, Puppeteer, Cheerio
- **Database** — Supabase (PostgreSQL)
- **Email Enrichment** — Hunter.io API + Smart Fallbacks
- **Fonts** — Geist Sans + Geist Mono (Vercel)

## Project Structure

```
foundersdirect/
├── app/
│   ├── api/
│   │   └── search/
│   │       └── route.ts          # Search API endpoint
│   ├── page.tsx                  # Main search page
│   └── components/
│       └── FounderCard.tsx       # Beautiful founder card
├── scripts/
│   ├── scrape-yc.ts              # YC directory scraper
│   └── enrich-emails.ts          # Email enrichment with Hunter.io
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/
│   └── supabase.ts               # Supabase admin client
├── public/                       # Static assets
├── .env.local                    # Secrets (not committed)
├── .env.example                  # Template
└── README.md
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/Vishal2002/founderdirect.git
cd founderdirect
```

### 2. Install dependencies

```bash
npm install
# or
pnpm install
# or
yarn install
```

### 3. Set up environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
# Supabase (get from your project settings)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_KEY=your-service-role-key

# Hunter.io API key (required for email enrichment)
HUNTER_API_KEY=your-hunter-api-key
```

Example `.env.example` content:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Hunter.io (get from https://hunter.io)
HUNTER_API_KEY=your-hunter-api-key-here
```


## Scripts

- `scripts/scrape-yc.ts` — Scrapes YC directory, extracts founders & real websites
- `scripts/enrich-emails.ts` — Finds/enriches emails using Hunter.io + fallbacks

Run them anytime to update data.

## Contributing

Contributions welcome!

1. Fork the repo
2. Create feature branch (`git checkout -b feature/xyz`)
3. Commit changes (`git commit -m 'Add xyz'`)
4. Push (`git push origin feature/xyz`)
5. Open Pull Request

## License

MIT License

Made with ❤️ by [Vishal Sharma](https://x.com/sharma_188)  

