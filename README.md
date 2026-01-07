# ClipInsight AI

Transform video content into multi-channel marketing campaigns with AI-powered content generation.

## Features

- **Video Analysis**: Upload MP4/MOV files for multimodal AI analysis using Google Gemini 2.0 Flash
- **Multi-Format Output**: Generate newsletters, Twitter threads, LinkedIn posts, and SEO blogs
- **Live Previews**: See how content looks in native platform mockups
- **Project Management**: Save, edit, and manage generated content projects
- **Analytics Dashboard**: Track usage and content generation metrics
- **Subscription Billing**: Stripe-powered tiered pricing (Free, Pro, Enterprise)
- **Platform Export**: Publish directly to Twitter, LinkedIn, and email (API integration required)

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **Authentication**: NextAuth.js v5 (Google, GitHub OAuth + Demo credentials)
- **Database**: Supabase (PostgreSQL)
- **AI**: Google Gemini 2.0 Flash
- **Payments**: Stripe
- **Icons**: Lucide React

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account (for database)
- Google Cloud account (for Gemini API)
- Stripe account (for billing, optional for MVP)

### 1. Clone and Install

```bash
cd clipinsight-ai
npm install
```

### 2. Environment Setup

Copy the example environment file and fill in your credentials:

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Authentication
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=http://localhost:3000

# OAuth (at least one provider, or use demo login)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_ID=
GITHUB_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Stripe (optional for MVP)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
```

### 3. Database Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor and run the schema in `supabase/schema.sql`
3. Copy your project URL and service role key to `.env.local`

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login/Register pages
│   ├── (dashboard)/     # Protected dashboard pages
│   ├── (marketing)/     # Public marketing pages
│   └── api/             # API routes
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── dashboard/       # Dashboard-specific components
│   ├── content/         # Content preview components
│   └── marketing/       # Landing page components
├── lib/
│   ├── auth.ts          # NextAuth configuration
│   ├── supabase.ts      # Supabase client
│   ├── gemini.ts        # Gemini AI integration
│   └── stripe.ts        # Stripe configuration
└── types/               # TypeScript types
```

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/[...nextauth]` | GET/POST | NextAuth.js authentication |
| `/api/generate` | POST | Generate content from video |
| `/api/projects` | GET/POST/PUT/DELETE | CRUD operations for projects |
| `/api/export/[platform]` | POST | Export content to platforms |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |
| `/api/webhooks/stripe/checkout` | POST | Create checkout session |

## Subscription Tiers

| Tier | Price | Credits | Features |
|------|-------|---------|----------|
| Free | $0 | 3/month | Basic content generation |
| Pro | $29/month | 50/month | Priority processing, analytics, direct publishing |
| Enterprise | $99/month | Unlimited | All features + dedicated support |

## Demo Mode

The app includes a demo login option that doesn't require OAuth setup. Use any email address to sign in with the demo credentials provider.

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import the repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### Stripe Webhooks

For production, set up Stripe webhooks:

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/api/webhooks/stripe`
3. Select events: `checkout.session.completed`, `customer.subscription.*`, `invoice.*`
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

## Platform Integrations (Phase 5)

To enable direct publishing:

### Twitter/X
1. Create a Twitter Developer account
2. Create an app with OAuth 2.0 permissions
3. Add API keys to environment variables

### LinkedIn
1. Create a LinkedIn Developer app
2. Enable Marketing API access
3. Add client credentials to environment variables

### Email (Newsletter)
Integrate with your preferred email service:
- SendGrid
- Resend
- Mailchimp
- etc.

## License

MIT

## Support

For questions or issues, please open a GitHub issue or contact support@clipinsight.ai
