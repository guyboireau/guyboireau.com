-- Table des prospects issus du formulaire de contact du portfolio.
-- Alimentée par src/pages/api/contact.ts (clé anon, côté serveur Astro).
-- Données à caractère personnel : à déclarer au registre des traitements.

create table if not exists public.portfolio_contacts (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null,
  email       text        not null,
  message     text        not null,
  created_at  timestamptz not null default now(),

  -- Miroir du schéma Zod de la route API, pour que les mêmes bornes
  -- s'appliquent aux insertions faites directement via l'API Supabase.
  constraint portfolio_contacts_name_len    check (char_length(name) between 2 and 100),
  constraint portfolio_contacts_email_len   check (char_length(email) between 3 and 320),
  constraint portfolio_contacts_email_shape check (email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  -- 5000 (message) + le préfixe "[project_type] " ajouté par la route.
  constraint portfolio_contacts_message_len check (char_length(message) between 10 and 5200)
);

create index if not exists portfolio_contacts_created_at_idx
  on public.portfolio_contacts (created_at desc);

alter table public.portfolio_contacts enable row level security;

-- Privilèges explicites : on repart de zéro plutôt que de se fier
-- aux grants par défaut du schéma public.
revoke all on public.portfolio_contacts from anon, authenticated;
grant insert on public.portfolio_contacts to anon;
grant select on public.portfolio_contacts to authenticated;

-- Le formulaire est public : la clé anon ne peut qu'insérer.
drop policy if exists "anon peut déposer un message" on public.portfolio_contacts;
create policy "anon peut déposer un message"
  on public.portfolio_contacts
  for insert
  to anon
  with check (true);

-- Lecture réservée aux comptes authentifiés (back-office / accès direct Supabase).
drop policy if exists "authenticated peut lire les messages" on public.portfolio_contacts;
create policy "authenticated peut lire les messages"
  on public.portfolio_contacts
  for select
  to authenticated
  using (true);

-- Pas de policy update/delete : RLS actif => refusé pour anon et authenticated.
-- Seule la service_role (qui contourne RLS) peut purger.
