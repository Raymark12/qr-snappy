# QR Snappy

Event photo management platform with QR code sharing. Upload, manage, and share event photos through automatically generated QR codes.

## Features

- **Event Management** - Create and manage events with custom settings
- **Photo Uploads** - Batch upload photos for events with approval workflow
- **QR Code Generation** - Automatic QR codes for easy event photo access
- **Password Protection** - Optional password protection for events
- **Admin Dashboard** - User management, event assignments, and analytics
- **Public Gallery** - Clean photo viewing experience for event attendees

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Supabase (Database & Auth)
- Cloudflare R2 (Media Storage)
- Material-UI
- TanStack Query
- Zustand

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase account
- Cloudflare R2 bucket

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_SECRET=your_app_secret

# Cloudflare R2
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
R2_ACCOUNT_ID=your_r2_account_id
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=your_r2_endpoint
R2_PUBLIC_DOMAIN=your_public_domain
```

### Database Setup

Run the SQL migrations in `lib/supabase/database.sql` in your Supabase project.

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Build

```bash
npm run build
npm start
```

## Project Structure

```
├── app/                    # Next.js app router pages
│   ├── (admin)/           # Admin dashboard routes
│   ├── (private)/         # Protected event routes
│   ├── api/               # API endpoints
│   └── e/                 # Public event pages
├── components/            # React components
│   ├── admin/            # Admin-specific components
│   ├── events/           # Event management components
│   └── ui/               # Reusable UI components
├── lib/                   # Core utilities
│   ├── actions/          # Server actions
│   ├── db/               # Database queries
│   └── utils/            # Helper functions
├── hooks/                 # Custom React hooks
└── stores/               # Zustand state stores
```

## Usage

1. **Create an Event** - Admin creates event with details and settings
2. **Generate QR Code** - System automatically generates shareable QR code
3. **Upload Photos** - Upload photos to the event (batch upload supported)
4. **Share Access** - Share QR code or link with event attendees
5. **View Gallery** - Attendees scan QR code to view event photos
