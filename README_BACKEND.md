Backend setup (Supabase + Vercel)
=================================

This project includes simple serverless endpoints under `api/` which can persist contacts to Supabase.

Quick steps to provision and connect Supabase:

1. Create a Supabase project (https://app.supabase.com)
   - Choose a name (e.g., coastify-db)
   - Note the `SUPABASE_URL` and the `Service Role` key (Settings → API)

2. Create the `contacts` and `leads` tables
   - In Supabase Dashboard → SQL Editor, run the SQL in `db/schema.sql`

3. Add environment variables to Vercel (Project Settings → Environment Variables):
   - `SUPABASE_URL` = your Supabase URL (from project settings)
   - `SUPABASE_SERVICE_ROLE_KEY` = your Service Role key (keep secret)
   - `SUPABASE_STORAGE_BUCKET` = your Supabase Storage bucket for uploaded card photos (optional)
   - `VITE_SUPABASE_URL` = your Supabase URL (optional local Vite support)
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key (optional local Vite support)
   - `ANTHROPIC_API_KEY` = your Anthropic API key (optional)
   - `OPENAI_API_KEY` = your OpenAI API key (optional; used when Anthropic is not configured)
   - `GOOGLE_GENERATIVE_AI_API_KEY` = your Google Gemini API key (optional — used when present)

Install the Google AI SDK locally if you want to use Gemini for card extraction:

```bash
npm install @ai-sdk/google ai
```

4. Deploy to Vercel
   - The API endpoint `/api/scan-card` will extract contact details from uploaded card images using Gemini or OpenAI when the provider key is configured.
   - When `SUPABASE_STORAGE_BUCKET` is configured, card photos can also be stored in Supabase Storage before extraction.
   - The new API endpoint `/api/leads` will store lead captures in Supabase and return the latest saved leads.

Notes and security
------------------
- Use the Service Role key server-side only (Vercel environment variables). Do NOT expose it to client-side code.
- For production, consider using Edge Functions or a dedicated backend and a restricted insert key for client flows.
- You can replace the mock OCR extraction in `api/scan-card.js` with a real OCR service call (e.g., Google Vision, Tesseract, or an AI OCR provider).

Local testing
-------------
To test locally, copy `.env.local.example` to `.env.local` and replace the placeholder values with your Supabase keys. Do not commit `.env.local` to git.

```bash
# macOS / Linux
cp .env.local.example .env.local
# Windows PowerShell
Copy-Item .env.local.example .env.local

npm install
npm run dev
```

Then POST to `http://localhost:5173/api/scan-card` with JSON `{ "base64": "..." }`.
