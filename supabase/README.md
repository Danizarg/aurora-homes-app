# Database

The database schema is shared with zouza.ai and lives in the aurora-homes repo, in
`supabase/migrations/`. Do not add SQL here. Apply and test it from that repo with
`node scripts/supabase/run.mjs migrate` and `node scripts/supabase/run.mjs test`.

`types/database.ts` in this repo is generated from that schema:
`node <aurora-homes>/scripts/supabase/run.mjs types types/database.ts`.
