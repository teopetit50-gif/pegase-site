-- ══════════════════════════════════════════════════════════════════════
-- Mon espace › WhatsApp — le schéma (11/11/2026)
--
-- RÉDIGÉ, PAS APPLIQUÉ (la session n'a pas la main sur la base). À
-- coller une fois dans l'éditeur SQL de Supabase (projet noepmkkplxshjbmqqxft),
-- après avoir remplacé REMPLACER_PAR_UN_SECRET par la valeur posée sur
-- Vercel dans WHATSAPP_WEBHOOK_SECRET (une longue chaîne au hasard).
-- Tant que la table n'existe pas, /espace2/teo/whatsapp en « Base réelle »
-- dit que WhatsApp n'est pas branché et montre ses conversations d'exemple
-- en « Données d'exemple » seulement.
--
-- Ce que la page attend :
--   · une ligne par message, reçu (le webhook) ou envoyé (la page) ;
--   · le numéro de l'interlocuteur (wa_id de Meta, sans « + »), son nom
--     de profil, le texte (ou la légende), l'heure, « lu », et pour nos
--     messages l'accusé : envoyé · remis · lu · échec.
-- Qui lit, qui écrit :
--   · le gérant (omega_est_admin(), la même porte que le pilotage) lit,
--     insère (un message envoyé) et met à jour (lu) ;
--   · le webhook n'a pas de session : il appelle omega_whatsapp_recevoir
--     avec la clé publique et le secret ; la fonction, en security definer,
--     vérifie le secret et range messages et accusés. Personne d'autre.
-- Idempotent : create … if not exists, politiques posées si absentes.
-- ══════════════════════════════════════════════════════════════════════

create table if not exists public.omega_whatsapp_messages (
  id uuid primary key default gen_random_uuid(),
  -- l'identifiant du message chez Meta (wamid.…) : unique, pour ne pas ranger deux fois
  wa_id text unique,
  numero text not null,
  nom text,
  sens text not null check (sens in ('recu', 'envoye')),
  type text not null default 'texte',
  texte text,
  quand timestamptz not null default now(),
  lu boolean not null default false,
  -- nos messages : envoye · remis · lu · echec (les accusés du webhook)
  statut text,
  brut jsonb,
  cree_le timestamptz not null default now()
);
create index if not exists omega_whatsapp_messages_numero_quand on public.omega_whatsapp_messages (numero, quand);

alter table public.omega_whatsapp_messages enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'omega_whatsapp_messages' and policyname = 'omega_whatsapp_admin_lit') then
    create policy omega_whatsapp_admin_lit on public.omega_whatsapp_messages for select to authenticated using (public.omega_est_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'omega_whatsapp_messages' and policyname = 'omega_whatsapp_admin_ecrit') then
    create policy omega_whatsapp_admin_ecrit on public.omega_whatsapp_messages for insert to authenticated with check (public.omega_est_admin());
  end if;
  if not exists (select 1 from pg_policies where tablename = 'omega_whatsapp_messages' and policyname = 'omega_whatsapp_admin_modifie') then
    create policy omega_whatsapp_admin_modifie on public.omega_whatsapp_messages for update to authenticated using (public.omega_est_admin()) with check (public.omega_est_admin());
  end if;
end $$;

-- le secret que le webhook présente : le même que WHATSAPP_WEBHOOK_SECRET sur Vercel
alter database postgres set app.whatsapp_jeton = 'REMPLACER_PAR_UN_SECRET';

-- ——— la porte du webhook : range les messages reçus et les accusés ———
create or replace function public.omega_whatsapp_recevoir(p_jeton text, p_messages jsonb default '[]'::jsonb, p_statuts jsonb default '[]'::jsonb)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer := 0;
  m jsonb;
  s jsonb;
begin
  if p_jeton is null or p_jeton <> coalesce(current_setting('app.whatsapp_jeton', true), '') or coalesce(current_setting('app.whatsapp_jeton', true), '') = '' then
    raise exception 'secret refusé' using errcode = '28000';
  end if;
  for m in select * from jsonb_array_elements(coalesce(p_messages, '[]'::jsonb)) loop
    insert into public.omega_whatsapp_messages (wa_id, numero, nom, sens, type, texte, quand, lu, brut)
    values (m->>'wa_id', m->>'numero', m->>'nom', 'recu', coalesce(m->>'type', 'autre'), m->>'texte', coalesce((m->>'quand')::timestamptz, now()), false, m->'brut')
    on conflict (wa_id) do nothing;
    n := n + 1;
  end loop;
  for s in select * from jsonb_array_elements(coalesce(p_statuts, '[]'::jsonb)) loop
    update public.omega_whatsapp_messages
       set statut = s->>'statut'
     where wa_id = s->>'wa_id'
       and sens = 'envoye'
       -- un accusé ne recule pas : envoyé < remis < lu
       and coalesce(array_position(array['envoye','remis','lu'], statut), 0) < coalesce(array_position(array['envoye','remis','lu'], s->>'statut'), 4);
  end loop;
  return n;
end;
$$;

revoke all on function public.omega_whatsapp_recevoir(text, jsonb, jsonb) from public;
grant execute on function public.omega_whatsapp_recevoir(text, jsonb, jsonb) to anon, authenticated;
