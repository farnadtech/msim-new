# Migrating from Firebase to Supabase

This guide explains how to migrate your Msim724 application from Firebase to Supabase.

## Prerequisites

1. A Supabase account (https://supabase.com/)
2. Node.js installed on your machine
3. Your Firebase data exported as JSON files

## Step 1: Set up Supabase Project

1. Go to https://supabase.com/ and create a new project
2. Note down your Supabase URL and API key from the project settings

## Step 2: Create Database Schema

1. In your Supabase dashboard, go to the SQL editor
2. Copy and paste the contents of `schema.sql` into the editor
3. Run the SQL script to create all tables and indexes

## Step 3: Export Firebase Data

1. Export your Firebase data as JSON files:
   - users → `data/firebase-users.json`
   - packages → `data/firebase-packages.json`
   - sim_cards → `data/firebase-simcards.json`
   - transactions → `data/firebase-transactions.json`

## Step 4: Migrate Data

1. Install the required dependencies:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Set environment variables:
   ```bash
   export SUPABASE_URL=your_supabase_url
   export SUPABASE_KEY=your_supabase_key
   ```

3. Run the migration script:
   ```bash
   node supabase/migrate-data.js
   ```

## Step 5: Update Application Code

1. Replace Firebase initialization with Supabase initialization
2. Update all database queries to use Supabase instead of Firebase
3. Update authentication to use Supabase Auth instead of Firebase Auth

## Supabase Configuration

### Environment Variables

Add these to your application:

```env
SUPABASE_URL=your_project_url
SUPABASE_KEY=your_project_anon_key
```

### Supabase Client Initialization

```javascript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)
```

## Database Schema Overview

The following tables will be created:

1. **users** - Stores user information
2. **packages** - Subscription packages for sellers
3. **sim_cards** - SIM card listings
4. **auction_details** - Details for auction-type SIM cards
5. **bids** - Bids on auction SIM cards
6. **transactions** - Financial transactions
7. **payment_receipts** - Payment receipt records

## Security Considerations

The schema includes Row Level Security (RLS) policies. You may need to adjust these based on your application's requirements.

## Troubleshooting

If you encounter any issues during migration:

1. Check that all environment variables are set correctly
2. Verify your Supabase project credentials
3. Ensure your JSON data files are in the correct format
4. Check the Supabase logs for any error messages