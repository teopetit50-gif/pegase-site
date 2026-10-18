-- c4_05 — OFFLOAD : les garde-fous commerciaux et les doublons (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE (lignes de lib/produits/capacites/reprise.ts, familles « Garde-fous commerciaux » et « Lecture de
-- la base clients ») :
--   · « Un compte suivi en direct par un commercial est exclu du cycle automatique » et « le commercial en charge
--     reprend la main d'un seul geste » : porte offload_changer_statut(compte, 'exclu', motif) — la reprise en cours
--     est close (« reprise_en_main »), ses messages en attente annulés au socle, son historique reste attaché.
--     « Seule une personne de votre équipe peut le remettre dans le circuit » : le retour à « suivi » d'un compte
--     retiré à sa demande est réservé au gérant ou à l'admin, motif obligatoire (la désinscription du socle se lève
--     à part, par lever_opposition).
--   · « Les listes d'exclusion se tiennent par compte, par secteur et par commercial » (et par groupe) :
--     public.offload_exclusions, portes offload_exclure / offload_lever_exclusion.
--   · « Les comptes déjà contactés par un commercial sont écartés de la vague en cours » : public.offload_contacts
--     (porte offload_noter_contact) ; un contact dans la quarantaine écarte le compte du cycle automatique.
--     offload_comptes.dernier_contact garde la date du dernier contact (appel, visite, message parti).
--   · « Le plafond de sollicitation s'applique au groupe » (cas limites) : une reprise par groupe à la fois, et la
--     quarantaine vaut pour le groupe.
--   · « Les doublons de fiches sont rapprochés quand deux lignes désignent le même client » et « la fusion n'a lieu
--     qu'après votre accord » : public.offload_rapprochements, proposés (même courriel, même téléphone, même raison
--     sociale une fois les formes juridiques retirées), chacun avec ses raisons en phrases ; porte
--     offload_trancher_rapprochement : accepté, les pièces de B passent à A et B est marqué fusionné ; refusé, la
--     paire n'est plus proposée.
--   · « Les entités d'un même groupe client sont regroupées sous une raison sociale mère » : la colonne groupe (lue
--     dans les exports) regroupe les comptes ; l'écran les montre ensemble ; le plafond s'applique au groupe.
--   · le cycle (private.offload_cycle) est redéfini : chaque candidat passe par private.offload_ecarte(compte), qui
--     dit en une phrase pourquoi il est écarté, ou null.
--
-- Règles de pose : create … if not exists, alter … add column if not exists, create or replace, insert … where not
-- exists. Aucun DROP, aucun DELETE.

alter table public.offload_comptes add column if not exists fusionne_dans uuid;
alter table public.offload_comptes add column if not exists dernier_contact date;

create table if not exists public.offload_exclusions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  type text not null,
  valeur text not null,
  motif text not null,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  levee_le timestamptz,
  levee_par uuid,
  constraint offload_exclusions_type_check check (type in ('compte', 'secteur', 'commercial', 'groupe')),
  constraint offload_exclusions_valeur_check check (char_length(btrim(valeur)) between 1 and 200),
  constraint offload_exclusions_motif_check check (char_length(btrim(motif)) between 1 and 500)
);
comment on table public.offload_exclusions is 'OFFLOAD — liste d''exclusion du cycle automatique : un compte (son id ou son code), un secteur, un commercial ou un groupe. Levée, jamais effacée.';
create index if not exists offload_exclusions_client_idx on public.offload_exclusions (client_id, type) where levee_le is null;

create table if not exists public.offload_contacts (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid not null,
  compte_id uuid not null,
  le date not null,
  canal text not null,
  par text,
  note text,
  saisi_par uuid,
  cree_le timestamptz not null default now(),
  constraint offload_contacts_compte_fkey foreign key (client_id, compte_id) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_contacts_canal_check check (canal in ('appel', 'visite', 'courriel', 'salon', 'autre')),
  constraint offload_contacts_par_check check (char_length(par) <= 120),
  constraint offload_contacts_note_check check (char_length(note) <= 2000)
);
comment on table public.offload_contacts is 'OFFLOAD — un contact d''un commercial avec un compte, hors OFFLOAD (appel, visite, salon…) : il écarte le compte de la vague en cours.';
create index if not exists offload_contacts_compte_idx on public.offload_contacts (compte_id, le desc);

create table if not exists public.offload_rapprochements (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  compte_a uuid not null,
  compte_b uuid not null,
  raisons jsonb not null default '[]'::jsonb,
  statut text not null default 'propose',
  decide_par uuid,
  decide_le timestamptz,
  cree_le timestamptz not null default now(),
  constraint offload_rapprochements_paire unique (compte_a, compte_b),
  constraint offload_rapprochements_ordre check (compte_a < compte_b),
  constraint offload_rapprochements_a_fkey foreign key (client_id, compte_a) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_rapprochements_b_fkey foreign key (client_id, compte_b) references public.offload_comptes(client_id, id) on delete cascade,
  constraint offload_rapprochements_statut_check check (statut in ('propose', 'accepte', 'refuse'))
);
comment on table public.offload_rapprochements is 'OFFLOAD — deux fiches qui semblent désigner le même client, avec les éléments qui le fondent. La fusion n''a lieu qu''après accord.';

alter table public.offload_exclusions enable row level security;
alter table public.offload_contacts enable row level security;
alter table public.offload_rapprochements enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_exclusions'
                 and policyname = 'on lit les exclusions de son organisation') then
    create policy "on lit les exclusions de son organisation" on public.offload_exclusions
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_contacts'
                 and policyname = 'on lit les contacts de son perimetre') then
    create policy "on lit les contacts de son perimetre" on public.offload_contacts
      for select to authenticated using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_rapprochements'
                 and policyname = 'on lit les rapprochements de son organisation') then
    create policy "on lit les rapprochements de son organisation" on public.offload_rapprochements
      for select to authenticated using (client_id in (select private.mes_clients()));
  end if;
end $$;
revoke all on public.offload_exclusions from anon, authenticated;
revoke all on public.offload_contacts from anon, authenticated;
revoke all on public.offload_rapprochements from anon, authenticated;
grant select on public.offload_exclusions to authenticated;
grant select on public.offload_contacts to authenticated;
grant select on public.offload_rapprochements to authenticated;
grant all on public.offload_exclusions to service_role;
grant all on public.offload_contacts to service_role;
grant all on public.offload_rapprochements to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Pourquoi un compte est écarté du cycle automatique (une phrase), ou null
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_ecarte(p_compte uuid)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  x public.offload_exclusions;
  v_contact public.offload_contacts;
  v_autre text;
begin
  select * into c from public.offload_comptes where id = p_compte;
  select * into g from public.offload_reglages where client_id = c.client_id;
  if c.fusionne_dans is not null then
    return 'Fiche fusionnée dans une autre.';
  end if;
  if c.statut = 'exclu' then
    return 'Suivi en direct par un commercial' || coalesce(' : ' || c.statut_motif, '') || '.';
  end if;
  if c.statut = 'arrete' then
    return 'Retiré à sa demande.';
  end if;
  select * into x from public.offload_exclusions e
  where e.client_id = c.client_id and e.levee_le is null
    and ((e.type = 'compte' and (e.valeur = c.id::text or lower(e.valeur) = lower(c.ref)))
      or (e.type = 'secteur' and lower(e.valeur) = lower(c.secteur))
      or (e.type = 'commercial' and lower(e.valeur) = lower(c.commercial))
      or (e.type = 'groupe' and lower(e.valeur) = lower(c.groupe)))
  order by e.cree_le limit 1;
  if x.id is not null then
    return format('Exclu par la liste (%s « %s ») : %s', case x.type when 'compte' then 'compte' when 'secteur' then 'secteur'
                                                               when 'commercial' then 'commercial' else 'groupe' end, x.valeur, x.motif);
  end if;
  select * into v_contact from public.offload_contacts k
  where k.compte_id = c.id and k.le > (now() at time zone 'Europe/Paris')::date - g.quarantaine_jours
  order by k.le desc limit 1;
  if v_contact.id is not null then
    return format('Déjà contacté le %s%s : écarté de la vague en cours.', private.offload_le(v_contact.le), coalesce(' par ' || v_contact.par, ''));
  end if;
  if nullif(btrim(c.groupe), '') is not null then
    select k.nom into v_autre from public.offload_reprises p join public.offload_comptes k on k.id = p.compte_id
    where p.client_id = c.client_id and k.id <> c.id and lower(btrim(k.groupe)) = lower(btrim(c.groupe))
      and (p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
           or coalesce(p.close_le, p.repondu_le, p.cree_le) > now() - make_interval(days => g.quarantaine_jours))
    limit 1;
    if v_autre is not null then
      return format('Le groupe « %s » est déjà sollicité (par %s) : le plafond vaut pour le groupe.', c.groupe, v_autre);
    end if;
  end if;
  return null;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Le cycle, redéfini : chaque candidat passe par offload_ecarte
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  k record;
  v_envoi uuid;
  e public.envois;
  n_commande integer := 0;
  n_relance integer := 0;
  n_sortie integer := 0;
  n_ouverte integer := 0;
  n_refus integer := 0;
  n_ecartes integer := 0;
  v_deja integer;
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 0. OFFLOAD en essai et envois du module réglés en réel : on ne prépare rien, on le dit.
  if private.offload_essai_contre_reel(p_client) then
    perform private.lever_alerte_module(p_client, 'offload', 'attention',
      'OFFLOAD est en mode essai, mais les envois du module sont réglés en réel : aucun message de reprise n''est préparé.',
      '{}'::jsonb, 'offload:essai_contre_reel', false, null);
    return jsonb_build_object('bloque', 'essai_contre_reel');
  end if;

  select count(*) into v_deja from public.offload_reprises p
  where p.client_id = p_client and p.ouverte_par = 'detection' and (p.cree_le at time zone 'Europe/Paris')::date = v_jour;

  -- 1. Une commande arrivée depuis l'ouverture clôt la reprise.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
      and exists (select 1 from public.offload_achats a where a.compte_id = p.compte_id and a.annule_le is null
                  and a.nature <> 'avoir' and a.date_achat >= (p.cree_le at time zone 'Europe/Paris')::date)
  loop
    perform private.offload_clore(k.id, 'commande', 'Une commande est arrivée depuis l''ouverture de la reprise.');
    n_commande := n_commande + 1;
  end loop;

  -- 2. La relance : message 1 parti depuis le délai fixé, sans réponse.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut = 'envoyee'
      and p.envoye1_le <= now() - make_interval(days => g.delai_relance_jours)
  loop
    begin
      v_envoi := private.offload_preparer_message(k.id, 2);
      select * into e from public.envois where id = v_envoi;
      if v_envoi is null or e.statut = 'bloque' then
        perform private.offload_clore(k.id, 'sans_reponse', 'La relance n''a pas pu être préparée' || coalesce(' (' || e.verrou || ')', '') || '.');
        n_sortie := n_sortie + 1;
      else
        update public.offload_reprises set statut = 'relance_a_valider', envoi2_id = v_envoi, maj_le = now() where id = k.id;
        n_relance := n_relance + 1;
      end if;
    exception when others then
      n_refus := n_refus + 1;
    end;
  end loop;

  -- 3. La sortie du cycle : relance partie depuis le délai fixé, sans réponse.
  for k in
    select p.id from public.offload_reprises p
    where p.client_id = p_client and p.statut = 'relancee'
      and p.envoye2_le <= now() - make_interval(days => g.delai_relance_jours)
  loop
    perform private.offload_clore(k.id, 'sans_reponse', 'Deux messages sans réponse : le compte sort du cycle.');
    n_sortie := n_sortie + 1;
  end loop;

  -- 4. Les nouvelles reprises : clôture proche d'abord, puis priorité ; au plus le plafond du jour. Chaque candidat
  --    passe par offload_ecarte (exclusions, contact récent, groupe déjà sollicité), vu au moment où il passe.
  for k in
    select s.compte_id from public.offload_signaux s
    join public.offload_comptes c on c.id = s.compte_id
    where s.client_id = p_client and s.niveau in ('eteint', 'decroche', 'saison') and c.statut = 'suivi' and c.fusionne_dans is null
      and not exists (select 1 from public.offload_reprises p where p.compte_id = s.compte_id
                      and (p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
                           or coalesce(p.close_le, p.repondu_le, p.cree_le) > now() - make_interval(days => g.quarantaine_jours)))
    order by s.avant_cloture desc, s.priorite desc, s.compte_id
  loop
    exit when n_ouverte >= g.plafond_reprises_jour - v_deja;
    if private.offload_ecarte(k.compte_id) is not null then
      n_ecartes := n_ecartes + 1;
      continue;
    end if;
    begin
      perform private.offload_ouvrir(k.compte_id, 'detection', v_jour);
      n_ouverte := n_ouverte + 1;
    exception when others then
      n_refus := n_refus + 1;
    end;
  end loop;

  -- Chaque exécution qui a fait quelque chose laisse son bilan au journal.
  if n_commande + n_relance + n_sortie + n_ouverte + n_refus + n_ecartes > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.cycle', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'commandes', n_commande, 'relances', n_relance, 'sorties', n_sortie,
                         'ouvertes', n_ouverte, 'refus', n_refus, 'ecartes', n_ecartes), null);
  end if;
  return jsonb_build_object('commandes', n_commande, 'relances', n_relance, 'sorties', n_sortie, 'ouvertes', n_ouverte,
                            'refus', n_refus, 'ecartes', n_ecartes);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Les portes : statut, exclusions, contacts
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_changer_statut(p_compte uuid, p_statut text, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  r public.offload_reprises;
  v_motif text := private.offload_texte(p_motif, 500);
  v_envoi uuid;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  if p_statut not in ('suivi', 'exclu') then
    raise exception 'Un compte se met en « suivi » ou « exclu » ; le retrait (« stop ») vient du client.' using errcode = '22023';
  end if;
  if c.statut = 'arrete' then
    perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin'], 'remettre dans le circuit un compte retiré à sa demande');
  else
    perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'changer le suivi d''un compte');
  end if;
  if v_motif is null then
    raise exception 'Un changement de suivi dit pourquoi.' using errcode = '22023';
  end if;
  if c.statut = p_statut then
    return;
  end if;
  update public.offload_comptes set statut = p_statut, statut_motif = v_motif, statut_par = (select auth.uid()), statut_le = now(), maj_le = now()
  where id = c.id;
  if p_statut = 'exclu' then
    -- Le commercial reprend la main : la reprise en cours est close, ses messages en attente annulés au socle.
    select * into r from public.offload_reprises p
    where p.compte_id = c.id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee');
    if r.id is not null then
      foreach v_envoi in array array_remove(array[r.envoi1_id, r.envoi2_id], null) loop
        if exists (select 1 from public.envois e where e.id = v_envoi and e.statut in ('a_valider', 'differe', 'pret')) then
          perform private.annuler_envoi(v_envoi, 'Le commercial reprend la main sur ce compte.');
        end if;
      end loop;
      perform private.offload_clore(r.id, 'reprise_en_main', v_motif);
    end if;
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.compte_statut', 'offload_comptes', c.id::text,
    jsonb_build_object('avant', c.statut, 'apres', p_statut, 'motif', v_motif, 'reprise', r.id), c.entite_id);
end $function$;

create or replace function private.offload_exclure(p_client uuid, p_type text, p_valeur text, p_motif text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_id uuid;
  v_valeur text := private.offload_texte(p_valeur, 200);
  v_motif text := private.offload_texte(p_motif, 500);
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin', 'valideur'], 'tenir les listes d''exclusion');
  if p_type not in ('compte', 'secteur', 'commercial', 'groupe') then
    raise exception 'Une exclusion vise un compte, un secteur, un commercial ou un groupe.' using errcode = '22023';
  end if;
  if v_valeur is null or v_motif is null then
    raise exception 'Une exclusion nomme ce qu''elle écarte et dit pourquoi.' using errcode = '22023';
  end if;
  select e.id into v_id from public.offload_exclusions e
  where e.client_id = p_client and e.type = p_type and lower(e.valeur) = lower(v_valeur) and e.levee_le is null;
  if v_id is not null then
    return v_id;
  end if;
  insert into public.offload_exclusions (client_id, type, valeur, motif, cree_par)
  values (p_client, p_type, v_valeur, v_motif, (select auth.uid())) returning id into v_id;
  perform private.journaliser_module(p_client, 'offload', 'offload.exclusion', 'offload_exclusions', v_id::text,
    jsonb_build_object('type', p_type, 'valeur', v_valeur, 'motif', v_motif), null);
  return v_id;
end $function$;

create or replace function private.offload_lever_exclusion(p_exclusion uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.offload_exclusions;
begin
  select * into x from public.offload_exclusions where id = p_exclusion for update;
  if not found then
    raise exception 'Exclusion introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(x.client_id, null, array['gerant', 'admin', 'valideur'], 'tenir les listes d''exclusion');
  if x.levee_le is not null then
    return;
  end if;
  update public.offload_exclusions set levee_le = now(), levee_par = (select auth.uid()) where id = x.id;
  perform private.journaliser_module(x.client_id, 'offload', 'offload.exclusion_levee', 'offload_exclusions', x.id::text,
    jsonb_build_object('type', x.type, 'valeur', x.valeur), null);
end $function$;

create or replace function private.offload_noter_contact(p_compte uuid, p_le date, p_canal text, p_par text default null, p_note text default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_id uuid;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'noter un contact');
  if p_le is null or p_le > (now() at time zone 'Europe/Paris')::date or p_le < date '1990-01-01' then
    raise exception 'Un contact est daté, et pas dans le futur.' using errcode = '22023';
  end if;
  if p_canal not in ('appel', 'visite', 'courriel', 'salon', 'autre') then
    raise exception 'Canal du contact : appel, visite, courriel, salon ou autre.' using errcode = '22023';
  end if;
  insert into public.offload_contacts (client_id, entite_id, compte_id, le, canal, par, note, saisi_par)
  values (c.client_id, c.entite_id, c.id, p_le, p_canal, private.offload_texte(p_par, 120), private.offload_texte(p_note, 2000), (select auth.uid()))
  returning id into v_id;
  update public.offload_comptes set dernier_contact = greatest(coalesce(dernier_contact, p_le), p_le), maj_le = now() where id = c.id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.contact_note', 'offload_comptes', c.id::text,
    jsonb_build_object('le', p_le, 'canal', p_canal, 'par', p_par), c.entite_id);
  return v_id;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. Les doublons : proposer, trancher
-- ─────────────────────────────────────────────────────────────────────────

-- La raison sociale ramenée à l'essentiel : minuscules, sans accents ni ponctuation, sans forme juridique.
create or replace function private.offload_nom_simple(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select nullif(btrim(regexp_replace(regexp_replace(
           translate(lower(coalesce(p, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ''’-.,&/', 'aaaaaaceeeeiiiinooooouuuuyyoa       '),
           '(^|\s)(sarl|sas|sasu|sa|eurl|sci|snc|scop|ets|etablissements|societe|ste|groupe|et fils|fils)(\s|$)', ' ', 'g'),
         '\s+', ' ', 'g')), '')
$function$;

create or replace function private.offload_proposer_rapprochements(p_client uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  n integer;
begin
  with vivants as (
    select c.id, c.client_id, c.nom, lower(btrim(c.email)) as email,
           nullif(right(regexp_replace(coalesce(c.telephone, ''), '\D', '', 'g'), 9), '') as tel,
           private.offload_nom_simple(c.nom) as nom_simple
    from public.offload_comptes c
    where c.client_id = p_client and c.fusionne_dans is null
  ), paires as (
    select least(a.id, b.id) as ca, greatest(a.id, b.id) as cb,
           jsonb_agg(distinct r.phrase) as raisons
    from vivants a
    join vivants b on b.id > a.id
    cross join lateral (values
      (case when a.email is not null and a.email = b.email then format('Même courriel : %s.', a.email) end),
      (case when a.tel is not null and char_length(a.tel) = 9 and a.tel = b.tel then 'Même numéro de téléphone.' end),
      (case when a.nom_simple is not null and char_length(a.nom_simple) >= 4 and a.nom_simple = b.nom_simple
            then format('Même raison sociale une fois les formes juridiques retirées : « %s » et « %s ».', a.nom, b.nom) end)
    ) r(phrase)
    where r.phrase is not null
    group by 1, 2
  ), ecrits as (
    insert into public.offload_rapprochements (client_id, compte_a, compte_b, raisons)
    select p_client, ca, cb, raisons from paires
    on conflict (compte_a, compte_b) do update set raisons = excluded.raisons
      where public.offload_rapprochements.statut = 'propose' and public.offload_rapprochements.raisons is distinct from excluded.raisons
    returning 1
  )
  select count(*) into n from ecrits;
  return n;
end $function$;

create or replace function private.offload_trancher_rapprochement(p_rapprochement uuid, p_accepter boolean)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.offload_rapprochements;
  a public.offload_comptes;
  b public.offload_comptes;
  v_pieces integer;
begin
  select * into x from public.offload_rapprochements where id = p_rapprochement for update;
  if not found then
    raise exception 'Rapprochement introuvable.' using errcode = 'P0002';
  end if;
  select * into a from public.offload_comptes where id = x.compte_a for update;
  select * into b from public.offload_comptes where id = x.compte_b for update;
  perform private.offload_exiger(x.client_id, a.entite_id, array['gerant', 'admin', 'valideur'], 'fusionner deux fiches');
  perform private.offload_exiger(x.client_id, b.entite_id, array['gerant', 'admin', 'valideur'], 'fusionner deux fiches');
  if x.statut <> 'propose' then
    raise exception 'Ce rapprochement est déjà tranché.' using errcode = '55000';
  end if;
  if not coalesce(p_accepter, false) then
    update public.offload_rapprochements set statut = 'refuse', decide_par = (select auth.uid()), decide_le = now() where id = x.id;
    perform private.journaliser_module(x.client_id, 'offload', 'offload.rapprochement_refuse', 'offload_rapprochements', x.id::text,
      jsonb_build_object('a', a.id, 'b', b.id), a.entite_id);
    return;
  end if;
  -- B rejoint A : les pièces passent à A ; B garde ses reprises et son historique, il ne sort plus.
  update public.offload_achats set compte_id = a.id, entite_id = a.entite_id, maj_le = now() where compte_id = b.id;
  get diagnostics v_pieces = row_count;
  update public.offload_comptes
     set fusionne_dans = a.id, statut = case when b.statut = 'arrete' then b.statut else 'exclu' end,
         statut_motif = 'Fusionnée dans ' || a.nom || ' (' || a.ref || ').', statut_le = now(), maj_le = now()
   where id = b.id;
  -- Une demande d'arrêt sur l'une vaut pour l'autre.
  if b.statut = 'arrete' and a.statut <> 'arrete' then
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue sur la fiche fusionnée ' || b.ref || '.',
           statut_le = now(), maj_le = now() where id = a.id;
  end if;
  update public.offload_comptes set
    email = coalesce(a.email, b.email), telephone = coalesce(a.telephone, b.telephone), contact = coalesce(a.contact, b.contact),
    commercial = coalesce(a.commercial, b.commercial), groupe = coalesce(a.groupe, b.groupe), maj_le = now()
  where id = a.id;
  update public.offload_rapprochements set statut = 'accepte', decide_par = (select auth.uid()), decide_le = now() where id = x.id;
  perform private.journaliser_module(x.client_id, 'offload', 'offload.rapprochement_accepte', 'offload_rapprochements', x.id::text,
    jsonb_build_object('a', a.id, 'b', b.id, 'pieces', v_pieces), a.entite_id);
  perform private.offload_detecter(x.client_id, null);
end $function$;

create or replace function private.offload_rapprocher(p_client uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin', 'valideur', 'collaborateur'], 'chercher les doublons');
  return private.offload_proposer_rapprochements(p_client);
end $function$;

-- Les façades publiques.
create or replace function public.offload_changer_statut(p_compte uuid, p_statut text, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.offload_changer_statut(p_compte, p_statut, p_motif) $function$;
create or replace function public.offload_exclure(p_client uuid, p_type text, p_valeur text, p_motif text)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_exclure(p_client, p_type, p_valeur, p_motif) $function$;
create or replace function public.offload_lever_exclusion(p_exclusion uuid)
 returns void language sql set search_path to ''
as $function$ select private.offload_lever_exclusion(p_exclusion) $function$;
create or replace function public.offload_noter_contact(p_compte uuid, p_le date, p_canal text, p_par text default null, p_note text default null)
 returns uuid language sql set search_path to ''
as $function$ select private.offload_noter_contact(p_compte, p_le, p_canal, p_par, p_note) $function$;
create or replace function public.offload_rapprocher(p_client uuid)
 returns integer language sql set search_path to ''
as $function$ select private.offload_rapprocher(p_client) $function$;
create or replace function public.offload_trancher_rapprochement(p_rapprochement uuid, p_accepter boolean)
 returns void language sql set search_path to ''
as $function$ select private.offload_trancher_rapprochement(p_rapprochement, p_accepter) $function$;

-- La nuit, redéfinie.
-- La nuit : détection, doublons proposés, puis cycle, chez chaque organisation installée (redéfini en c4_05).
create or replace function private.offload_detecter_tout(p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  n integer := 0;
  e integer := 0;
begin
  for k in select g.client_id from public.offload_reglages g order by g.client_id loop
    begin
      perform private.offload_detecter(k.client_id, p_jour);
      perform private.offload_proposer_rapprochements(k.client_id);
      perform private.offload_cycle(k.client_id, p_jour);
      n := n + 1;
    exception when others then
      e := e + 1;
      perform private.lever_alerte_module(k.client_id, 'offload', 'attention',
        'La détection des clients qui décrochent n''a pas pu être calculée.',
        jsonb_build_object('erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'offload:detection', false, null);
    end;
  end loop;
  return jsonb_build_object('organisations', n, 'echecs', e);
end $function$;

-- La liste de l'écran, redéfinie : sans les fiches fusionnées ; avec les doublons proposés et les exclusions.
create or replace function public.offload_tableau(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid())
                                order by c.client_id limit 1)) as client_id
  ), comptes as (
    select c.*, s.niveau, s.score, s.priorite, s.avant_cloture, to_jsonb(s) - 'client_id' - 'entite_id' as signal
    from public.offload_comptes c
    left join public.offload_signaux s on s.compte_id = c.id
    where c.client_id = (select client_id from moi) and c.fusionne_dans is null
  )
  select jsonb_build_object(
    'client', (select client_id from moi),
    'reglages', (select to_jsonb(g) - 'installe_par' from public.offload_reglages g where g.client_id = (select client_id from moi)),
    'compteurs', jsonb_build_object(
      'eteint', (select count(*) from comptes where niveau = 'eteint' and statut = 'suivi'),
      'decroche', (select count(*) from comptes where niveau = 'decroche' and statut = 'suivi'),
      'saison', (select count(*) from comptes where niveau = 'saison' and statut = 'suivi'),
      'ralentit', (select count(*) from comptes where niveau = 'ralentit' and statut = 'suivi'),
      'ok', (select count(*) from comptes where niveau = 'ok'),
      'sans_achat', (select count(*) from comptes where niveau = 'sans_achat'),
      'avant_cloture', (select count(*) from comptes where avant_cloture and statut = 'suivi'),
      'comptes', (select count(*) from comptes),
      'a_valider', (select count(*) from public.offload_reprises p where p.client_id = (select client_id from moi)
                    and p.statut in ('a_valider', 'relance_a_valider')),
      'appels', (select count(*) from public.offload_taches t where t.client_id = (select client_id from moi)
                 and t.type = 'appel' and t.statut = 'a_faire'),
      'doublons', (select count(*) from public.offload_rapprochements x where x.client_id = (select client_id from moi)
                   and x.statut = 'propose'),
      'reponses', (select count(*) from public.offload_taches t where t.client_id = (select client_id from moi)
                   and t.type = 'repondre' and t.statut = 'a_faire')),
    'comptes', coalesce((
      select jsonb_agg(x.j order by x.rang, x.priorite desc nulls last, x.nom)
      from (
        select (to_jsonb(c) - 'signal' - 'niveau' - 'score' - 'priorite' - 'avant_cloture' - 'client_id')
               || jsonb_build_object('signal', c.signal,
                    'reprise', (select to_jsonb(p) - 'raisons' - 'client_id' from public.offload_reprises p
                                where p.compte_id = c.id order by p.cree_le desc limit 1)) as j,
               case when c.statut = 'suivi' and c.niveau in ('eteint', 'decroche', 'saison', 'ralentit') then 0
                    when c.niveau in ('eteint', 'decroche', 'saison', 'ralentit') then 1 else 2 end as rang,
               c.priorite, c.nom
        from comptes c
        order by 2, 3 desc nulls last, 4
        limit 500
      ) x), '[]'::jsonb),
    'a_valider', coalesce((
      select jsonb_agg(jsonb_build_object(
               'reprise', p.id, 'compte_id', p.compte_id, 'compte_nom', c.nom, 'statut', p.statut,
               'rang', case when p.statut = 'relance_a_valider' then 2 else 1 end,
               'envoi', e.id, 'demande', e.demande_id, 'mode', e.mode, 'destinataire', e.destinataire_adresse,
               'sujet', e.sujet, 'corps', e.corps, 'cree_le', p.maj_le) order by p.maj_le)
      from public.offload_reprises p
      join public.offload_comptes c on c.id = p.compte_id
      left join public.envois e on e.id = case when p.statut = 'relance_a_valider' then p.envoi2_id else p.envoi1_id end
      where p.client_id = (select client_id from moi) and p.statut in ('a_valider', 'relance_a_valider')), '[]'::jsonb),
    'rapprochements', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'a', x.compte_a, 'a_nom', a.nom, 'a_ref', a.ref, 'b', x.compte_b, 'b_nom', b.nom,
                                          'b_ref', b.ref, 'raisons', x.raisons) order by x.cree_le)
      from public.offload_rapprochements x join public.offload_comptes a on a.id = x.compte_a join public.offload_comptes b on b.id = x.compte_b
      where x.client_id = (select client_id from moi) and x.statut = 'propose'), '[]'::jsonb),
    'exclusions', coalesce((
      select jsonb_agg(to_jsonb(e) - 'client_id' order by e.cree_le) from public.offload_exclusions e
      where e.client_id = (select client_id from moi) and e.levee_le is null), '[]'::jsonb),
    'taches', coalesce((
      select jsonb_agg((to_jsonb(t) - 'client_id') || jsonb_build_object('compte_nom', c.nom) order by t.echeance, t.cree_le)
      from public.offload_taches t join public.offload_comptes c on c.id = t.compte_id
      where t.client_id = (select client_id from moi) and t.statut = 'a_faire'), '[]'::jsonb))
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 5. Droits (à inscrire dans a5_01 : les six portes)
-- ─────────────────────────────────────────────────────────────────────────
revoke all on function public.offload_changer_statut(uuid, text, text) from public, anon;
revoke all on function public.offload_exclure(uuid, text, text, text) from public, anon;
revoke all on function public.offload_lever_exclusion(uuid) from public, anon;
revoke all on function public.offload_noter_contact(uuid, date, text, text, text) from public, anon;
revoke all on function public.offload_rapprocher(uuid) from public, anon;
revoke all on function public.offload_trancher_rapprochement(uuid, boolean) from public, anon;
grant execute on function public.offload_changer_statut(uuid, text, text) to authenticated, service_role;
grant execute on function public.offload_exclure(uuid, text, text, text) to authenticated, service_role;
grant execute on function public.offload_lever_exclusion(uuid) to authenticated, service_role;
grant execute on function public.offload_noter_contact(uuid, date, text, text, text) to authenticated, service_role;
grant execute on function public.offload_rapprocher(uuid) to authenticated, service_role;
grant execute on function public.offload_trancher_rapprochement(uuid, boolean) to authenticated, service_role;
revoke execute on function private.offload_changer_statut(uuid, text, text) from public, anon;
revoke execute on function private.offload_exclure(uuid, text, text, text) from public, anon;
revoke execute on function private.offload_lever_exclusion(uuid) from public, anon;
revoke execute on function private.offload_noter_contact(uuid, date, text, text, text) from public, anon;
revoke execute on function private.offload_rapprocher(uuid) from public, anon;
revoke execute on function private.offload_trancher_rapprochement(uuid, boolean) from public, anon;
grant execute on function private.offload_changer_statut(uuid, text, text) to authenticated, service_role;
grant execute on function private.offload_exclure(uuid, text, text, text) to authenticated, service_role;
grant execute on function private.offload_lever_exclusion(uuid) to authenticated, service_role;
grant execute on function private.offload_noter_contact(uuid, date, text, text, text) to authenticated, service_role;
grant execute on function private.offload_rapprocher(uuid) to authenticated, service_role;
grant execute on function private.offload_trancher_rapprochement(uuid, boolean) to authenticated, service_role;
revoke execute on function private.offload_ecarte(uuid) from public, anon, authenticated;
revoke execute on function private.offload_nom_simple(text) from public, anon, authenticated;
revoke execute on function private.offload_proposer_rapprochements(uuid) from public, anon, authenticated;
revoke execute on function private.offload_cycle(uuid, date) from public, anon, authenticated;
grant execute on function private.offload_ecarte(uuid) to service_role;
grant execute on function private.offload_nom_simple(text) to service_role;
grant execute on function private.offload_proposer_rapprochements(uuid) to service_role;
grant execute on function private.offload_cycle(uuid, date) to service_role;
revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;
grant execute on function private.offload_detecter_tout(date) to service_role;
