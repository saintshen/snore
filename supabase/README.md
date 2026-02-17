# Backend Setup Instructions

1.  **Run Migration:**
    Copy the contents of `supabase/schema.sql` and run it in your Supabase SQL Editor.

2.  **Verify Storage:**
    Ensure a public bucket named `snore-clips` exists (the SQL script attempts to create it, but permissions might vary).

3.  **Environment Variables:**
    Ensure your `.env` file has:
    - `VITE_SUPABASE_URL`
    - `VITE_SUPABASE_ANON_KEY`
