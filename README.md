# TPIMS - Third Party Inventory Management System

Internal order management system for automatically syncing Shopee and TikTok orders to inventory database. Used for tracking sales, managing stock, and financial reporting.

## Features

- 📦 **Multi-Platform Order Sync**
  - Shopee API integration
  - TikTok Shop API integration
  - Automatic order fetching with financial details

- 💰 **Financial Tracking**
  - Detailed fee breakdowns (commission, service, transaction fees)
  - Net income calculation
  - Payment status tracking

- 📊 **Inventory Management**
  - Real-time stock updates
  - Product variations tracking
  - Automated stock deduction on orders

- 🎨 **Modern UI**
  - Built with Next.js 16 + React 19
  - Shadcn/UI components
  - Responsive design

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript
- **Styling**: Tailwind CSS, Shadcn/UI
- **Database**: Supabase (PostgreSQL)
- **APIs**: Shopee Partner API, TikTok Shop API
- **Hosting**: Render.com

## Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Shopee API
SHOPEE_PARTNER_ID=
SHOPEE_PARTNER_KEY=
SHOPEE_REDIRECT_URL=

# TikTok API
TIKTOK_APP_KEY=
TIKTOK_APP_SECRET=
TIKTOK_REDIRECT_URI=
```

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Open http://localhost:3000
```

## Database Setup

Run SQL migrations in Supabase SQL Editor:

1. `create_shopee_orders_table.sql`
2. `add_shopee_constraints.sql`
3. Other table creation scripts as needed

## Deployment (Render)

1. Push to GitHub
2. Create new Web Service on Render
3. Connect GitHub repo
4. Set environment variables
5. Deploy!

See `deployment_plan.md` for detailed instructions.

## API Setup

### Shopee Partner Platform
1. Create app at [partner.shopeemobile.com](https://partner.shopeemobile.com)
2. Set redirect URL: `https://your-domain.com/api/shopee/callback`
3. Copy Partner ID and Partner Key to `.env.local`

### TikTok Developer Platform
1. Create app at TikTok Developer Portal
2. Set redirect URL: `https://your-domain.com/api/tiktok/callback`
3. Copy App Key and App Secret to `.env.local`

## License

Private/Internal Use Only
