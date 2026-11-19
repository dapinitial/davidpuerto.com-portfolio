-- The admin's second step: run once in the visit log's Supabase project
-- (SQL editor), before the deploy that needs it. Schema only: no rows, no keys.
--
--   passkey   credential_id + public_key (COSE, base64url) + counter
--   totp      secret: AES-256-GCM ciphertext under ADMIN_FACTOR_KEY; last_step stops a replay
--   recovery  code_hash: HMAC-SHA256 under ADMIN_FACTOR_KEY; used_at marks the one use
--
-- Only the server's secret key (service_role) reads or writes it. Row level
-- security is on with no policies, so the public keys can't reach it at all.
create table if not exists public.admin_factors (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('passkey', 'totp', 'recovery')),
  credential_id text unique,
  public_key text,
  counter bigint not null default 0,
  transports text[],
  secret text,
  code_hash text unique,
  last_step bigint not null default 0,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.admin_factors enable row level security;
revoke all on public.admin_factors from anon, authenticated;
grant select, insert, update, delete on public.admin_factors to service_role;

-- To start the setup over (a lost passkey and no recovery codes left), sign in
-- to Supabase and run:
--   delete from public.admin_factors;
-- The next admin sign-in then opens the one-time setup page again.
