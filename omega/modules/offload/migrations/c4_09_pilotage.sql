-- c4_09 — OFFLOAD : le pilotage (session C4, 06/10/2026)
--
-- CE QUE ÇA POSE (lib/produits/capacites/reprise.ts, famille « Pilotage ») :
--   · « Le chiffre d'affaires remis en jeu se lit vague par vague » : chaque reprise garde, à son ouverture, la valeur
--     annuelle attendue du compte (offload_reprises.valeur_en_jeu) et son segment ; une vague est le passage d'un
--     jour. Par vague : comptes sollicités, chiffre en jeu, messages partis, réponses, commandes reprises et chiffre
--     repris (achats du compte dans les 90 jours qui suivent l'ouverture).
--   · « Le taux de réponse se compare par segment, par canal et par message » : par secteur et par niveau du signal ;
--     par canal (courriel, appel) ; par message (premier message, relance, rappel de retrait).
--   · « Les échéances honorées et les commandes reprises alimentent un tableau de suivi » : mois par mois, échéances
--     honorées (dont après un message), commandes reprises et leur chiffre, affaires retirées après relance.
--   · « Les résultats se lisent par entité, par site et en consolidé » : chaque ligne rattachée à sa société (entité de
--     type société, ou parent d'un site) et à son site (entité de type site ou établissement) ; total consolidé.
--   · « Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe » : à la demande, depuis l'écran (CSV) ;
--     à date fixe, l'arrêté mensuel (offload_arretes, jour réglé offload_reglages.arrete_jour, 1 par défaut), posé la
--     nuit, téléchargeable en tableur depuis l'écran.
--   · lecture : public.offload_pilotage(client, depuis) (gérant, admin, valideur : la vue consolidée couvre toutes les
--     entités) ; public.offload_arretes_liste(client).
--
-- Règles de pose : create … if not exists, alter … add column if not exists, create or replace, insert … where not
-- exists. Aucun DROP, aucun DELETE.

alter table public.offload_reprises add column if not exists valeur_en_jeu numeric(14,2);
alter table public.offload_reprises add column if not exists segment text;
alter table public.offload_affaires add column if not exists repondu_le timestamptz;
alter table public.offload_reglages add column if not exists arrete_jour smallint not null default 1;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_arrete_check') then
    alter table public.offload_reglages add constraint offload_reglages_arrete_check check (arrete_jour between 1 and 28);
  end if;
end $$;

-- L'instantané d'une reprise à son ouverture : ce que le compte pesait, et son segment.
create or replace function private.offload_reprise_instantane()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if new.valeur_en_jeu is null then
    select coalesce(s.valeur_annuelle, s.ca_12m_precedent, s.ca_12m) into new.valeur_en_jeu
    from public.offload_signaux s where s.compte_id = new.compte_id;
  end if;
  if new.segment is null then
    select coalesce(nullif(btrim(c.secteur), ''), 'Secteur non renseigné') into new.segment
    from public.offload_comptes c where c.id = new.compte_id;
  end if;
  return new;
end $function$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'offload_reprises_instantane' and tgrelid = 'public.offload_reprises'::regclass) then
    create trigger offload_reprises_instantane before insert on public.offload_reprises
      for each row execute function private.offload_reprise_instantane();
  end if;
end $$;

-- Les reprises déjà ouvertes : l'instantané au mieux (la valeur du jour).
update public.offload_reprises r
   set valeur_en_jeu = coalesce(s.valeur_annuelle, s.ca_12m_precedent, s.ca_12m)
  from public.offload_signaux s
 where s.compte_id = r.compte_id and r.valeur_en_jeu is null;
update public.offload_reprises r
   set segment = coalesce(nullif(btrim(c.secteur), ''), 'Secteur non renseigné')
  from public.offload_comptes c
 where c.id = r.compte_id and r.segment is null;

-- L'arrêté à date fixe : le pilotage du mois, figé, téléchargeable en tableur.
create table if not exists public.offload_arretes (
  client_id uuid not null references public.clients(id) on delete cascade,
  jour date not null,
  pilotage jsonb not null,
  cree_le timestamptz not null default now(),
  primary key (client_id, jour)
);
comment on table public.offload_arretes is 'OFFLOAD — l''arrêté mensuel du pilotage (vagues, taux de réponse, suivi, entités), posé la nuit au jour réglé ; exportable en tableur.';
alter table public.offload_arretes enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_arretes' and policyname = 'la direction lit les arretes') then
    create policy "la direction lit les arretes" on public.offload_arretes for select to authenticated
      using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin', 'valideur']));
  end if;
end $$;
revoke all on public.offload_arretes from anon, authenticated;
grant select on public.offload_arretes to authenticated;
grant all on public.offload_arretes to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Le calcul du pilotage (sans contrôle : la porte et la nuit l'appellent)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_pilotage_calcul(p_client uuid, p_depuis date default null)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with bornes as (
    select coalesce(p_depuis, (now() at time zone 'Europe/Paris')::date - 365) as depuis,
           (now() at time zone 'Europe/Paris')::date as jour
  ), lieux as (
    -- La société et le site de chaque entité.
    select e.id as entite_id,
           case when e.type = 'societe' or p.id is null then e.id else p.id end as societe_id,
           case when e.type = 'societe' or p.id is null then e.nom else p.nom end as societe,
           case when e.type in ('site', 'etablissement') then e.id end as site_id,
           case when e.type in ('site', 'etablissement') then e.nom end as site
    from public.entites e left join public.entites p on p.id = e.parent_id
    where e.client_id = p_client
  ), rep as (
    select r.*, (r.cree_le at time zone 'Europe/Paris')::date as vague,
           r.repondu_le is not null as a_repondu,
           coalesce(c.chiffre, 0) as chiffre_repris,
           (r.issue = 'commande' or coalesce(c.chiffre, 0) > 0) as a_commande,
           r.envoi1_id is not null as par_courriel,
           exists (select 1 from public.offload_taches t where t.reprise_id = r.id and t.type = 'appel') as par_appel,
           exists (select 1 from public.offload_taches t where t.reprise_id = r.id and t.type = 'appel' and t.statut = 'faite') as appel_passe,
           sg.niveau as niveau_actuel
    from public.offload_reprises r
    left join lateral (select sum(a.montant_ht) as chiffre from public.offload_achats a
                       where a.compte_id = r.compte_id and a.annule_le is null
                         and a.date_achat between (r.cree_le at time zone 'Europe/Paris')::date
                                              and (r.cree_le at time zone 'Europe/Paris')::date + 90) c on true
    left join public.offload_signaux sg on sg.compte_id = r.compte_id
    where r.client_id = p_client and (r.cree_le at time zone 'Europe/Paris')::date >= (select depuis from bornes)
  ), aff as (
    select a.*, e.envoye_le as envoye1_le
    from public.offload_affaires a left join public.envois e on e.id = a.envoi1_id
    where a.client_id = p_client and a.disponible_le >= (select depuis from bornes) - 90
  ), ech as (
    select h.* from public.offload_echeances h
    where h.client_id = p_client and h.type = 'entretien' and h.honoree_le >= (select depuis from bornes)
      and h.statut in ('honoree', 'honoree_ailleurs')
  ), par as (
    select l.societe_id, l.societe, l.site_id, l.site,
           (select count(*) from rep where rep.entite_id = l.entite_id) as comptes,
           (select coalesce(sum(valeur_en_jeu), 0) from rep where rep.entite_id = l.entite_id) as en_jeu,
           (select count(*) from rep where rep.entite_id = l.entite_id and a_repondu) as reponses,
           (select count(*) from rep where rep.entite_id = l.entite_id and a_commande) as commandes,
           (select coalesce(sum(chiffre_repris), 0) from rep where rep.entite_id = l.entite_id) as chiffre_repris,
           (select count(*) from ech where ech.entite_id = l.entite_id) as echeances_honorees,
           (select count(*) from aff where aff.entite_id = l.entite_id and aff.statut = 'retiree' and aff.relance1_le is not null) as affaires_retirees
    from lieux l
  ), taux as (
    -- Une ligne par sollicitation comparable : (axe, valeur, sollicité, a répondu).
    select 'segment' as axe, segment as valeur, true as sollicite, a_repondu from rep where envoye1_le is not null or par_appel
    union all select 'niveau', coalesce(niveau, 'inconnu'), true, a_repondu from rep where envoye1_le is not null or par_appel
    union all select 'canal', 'Courriel', true, a_repondu from rep where envoye1_le is not null
    union all select 'canal', 'Appel', true, appel_passe or a_repondu from rep where par_appel and envoye1_le is null
    union all select 'message', 'Premier message', true, a_repondu and (envoye2_le is null or repondu_le < envoye2_le) from rep where envoye1_le is not null
    union all select 'message', 'Relance', true, a_repondu and envoye2_le is not null and repondu_le >= envoye2_le from rep where envoye2_le is not null
    union all select 'message', 'Rappel de retrait', true, repondu_le is not null from aff where envoye1_le is not null
  )
  select jsonb_build_object(
    'depuis', (select depuis from bornes),
    'calcule_le', now(),
    'vagues', coalesce((select jsonb_agg(v order by v ->> 'vague' desc) from (
        select jsonb_build_object('vague', vague, 'comptes', count(*), 'en_jeu', coalesce(sum(valeur_en_jeu), 0),
                                  'messages', count(*) filter (where envoye1_le is not null),
                                  'appels', count(*) filter (where par_appel),
                                  'reponses', count(*) filter (where a_repondu),
                                  'commandes', count(*) filter (where a_commande),
                                  'chiffre_repris', coalesce(sum(chiffre_repris), 0),
                                  'taux_reponse', round(100.0 * count(*) filter (where a_repondu)
                                                        / nullif(count(*) filter (where envoye1_le is not null or par_appel), 0), 1)) as v
        from rep group by vague) z), '[]'::jsonb),
    'taux', coalesce((select jsonb_object_agg(axe, lignes) from (
        select axe, jsonb_agg(jsonb_build_object('valeur', valeur, 'sollicites', n, 'reponses', r,
                                                 'taux', round(100.0 * r / nullif(n, 0), 1)) order by n desc, valeur) as lignes
        from (select axe, valeur, count(*) as n, count(*) filter (where a_repondu) as r from taux group by axe, valeur) t
        group by axe) z), '{}'::jsonb),
    'suivi', coalesce((select jsonb_agg(m order by m ->> 'mois' desc) from (
        select jsonb_build_object('mois', mois,
                 'echeances_honorees', coalesce((select count(*) from ech where to_char(ech.honoree_le, 'YYYY-MM') = mois), 0),
                 'echeances_apres_message', coalesce((select count(*) from ech where to_char(ech.honoree_le, 'YYYY-MM') = mois and ech.envoi_id is not null), 0),
                 'commandes_reprises', coalesce((select count(*) from rep where a_commande and to_char(vague, 'YYYY-MM') = mois), 0),
                 'chiffre_repris', coalesce((select sum(chiffre_repris) from rep where to_char(vague, 'YYYY-MM') = mois), 0),
                 'affaires_retirees', coalesce((select count(*) from aff where aff.statut = 'retiree' and aff.relance1_le is not null
                                                and to_char(aff.retire_le, 'YYYY-MM') = mois), 0),
                 'valeur_liberee', coalesce((select sum(aff.valeur_ht) from aff where aff.statut = 'retiree' and aff.relance1_le is not null
                                             and to_char(aff.retire_le, 'YYYY-MM') = mois), 0)) as m
        from (select distinct to_char(d, 'YYYY-MM') as mois
              from generate_series(date_trunc('month', (select depuis from bornes)), (select jour from bornes), interval '1 month') d) mm) z), '[]'::jsonb),
    'entites', jsonb_build_object(
      'par_entite', coalesce((select jsonb_agg(to_jsonb(x) order by x.societe) from (
          select societe_id, societe, sum(comptes) as comptes, sum(en_jeu) as en_jeu, sum(reponses) as reponses, sum(commandes) as commandes,
                 sum(chiffre_repris) as chiffre_repris, sum(echeances_honorees) as echeances_honorees, sum(affaires_retirees) as affaires_retirees
          from par group by societe_id, societe) x), '[]'::jsonb),
      'par_site', coalesce((select jsonb_agg(to_jsonb(x) order by x.societe, x.site) from (
          select societe_id, societe, site_id, site, sum(comptes) as comptes, sum(en_jeu) as en_jeu, sum(reponses) as reponses, sum(commandes) as commandes,
                 sum(chiffre_repris) as chiffre_repris, sum(echeances_honorees) as echeances_honorees, sum(affaires_retirees) as affaires_retirees
          from par where site_id is not null group by societe_id, societe, site_id, site) x), '[]'::jsonb),
      'consolide', (select jsonb_build_object('comptes', coalesce(sum(comptes), 0), 'en_jeu', coalesce(sum(en_jeu), 0), 'reponses', coalesce(sum(reponses), 0),
                                              'commandes', coalesce(sum(commandes), 0), 'chiffre_repris', coalesce(sum(chiffre_repris), 0),
                                              'echeances_honorees', coalesce(sum(echeances_honorees), 0), 'affaires_retirees', coalesce(sum(affaires_retirees), 0))
                    from par))
  )
$function$;

create or replace function private.offload_pilotage(p_client uuid, p_depuis date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin', 'valideur'], 'lire le pilotage');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  return private.offload_pilotage_calcul(p_client, p_depuis);
end $function$;

create or replace function public.offload_pilotage(p_client uuid default null, p_depuis date default null)
 returns jsonb language sql set search_path to ''
as $function$
  select private.offload_pilotage(coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid())
                                                     order by c.client_id limit 1)), p_depuis)
$function$;

create or replace function public.offload_arretes_liste(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('jour', a.jour, 'pilotage', a.pilotage, 'cree_le', a.cree_le) order by a.jour desc), '[]'::jsonb)
  from public.offload_arretes a
  where a.client_id = coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid()) order by c.client_id limit 1))
$function$;

-- L'arrêté du mois, posé une fois, le jour réglé ou au premier passage qui suit.
create or replace function private.offload_arreter(p_client uuid, p_jour date default null)
 returns date
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found or extract(day from v_jour)::integer < g.arrete_jour
     or exists (select 1 from public.offload_arretes a where a.client_id = p_client and date_trunc('month', a.jour) = date_trunc('month', v_jour)) then
    return null;
  end if;
  insert into public.offload_arretes (client_id, jour, pilotage)
  values (p_client, v_jour, private.offload_pilotage_calcul(p_client, (v_jour - interval '12 months')::date))
  on conflict (client_id, jour) do nothing;
  perform private.journaliser_module(p_client, 'offload', 'offload.arrete', 'offload_arretes', v_jour::text,
    jsonb_build_object('jour', v_jour), null);
  return v_jour;
end $function$;



-- ─────────────────────────────────────────────────────────────────────────
-- Les fonctions du module qui apprennent le pilotage (recopiées de leur dernière version, puis étendues)
-- ─────────────────────────────────────────────────────────────────────────

-- La réponse à un rappel de retrait est datée (taux de réponse par message).
create or replace function private.offload_reponse_affaire(p_reception bigint, p_affaire uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  a public.offload_affaires;
  c public.offload_comptes;
  v_arret boolean;
begin
  select * into x from public.receptions where id = p_reception;
  select * into a from public.offload_affaires where id = p_affaire for update;
  if a.id is null or a.statut not in ('relancee_1', 'relancee_2', 'decision') then
    return jsonb_build_object('statut', 'sans_effet');
  end if;
  select * into c from public.offload_comptes where id = a.compte_id;
  v_arret := private.offload_demande_arret(x.corps);
  -- La relance encore en validation ne part pas.
  if a.envoi2_id is not null and exists (select 1 from public.envois e where e.id = a.envoi2_id and e.statut in ('a_valider', 'pret')) then
    perform private.annuler_envoi(a.envoi2_id, 'Le client a répondu à la relance de retrait.');
  end if;
  update public.offload_affaires set statut = 'repondue', repondu_le = coalesce(x.recu_le, now()), maj_le = now(),
         motif = case when v_arret then 'Le client a demandé l''arrêt des messages : à traiter au magasin.'
                      else 'Le client a répondu le ' || private.offload_le((x.recu_le at time zone 'Europe/Paris')::date) || ' : la conversation revient au magasin.' end
   where id = a.id;
  if v_arret then
    perform private.opposer(c.client_id, 'desinscription', coalesce(c.email, x.de_adresse), null, c.ref, null,
                            'Demande d''arrêt reçue en réponse à une relance de retrait OFFLOAD.', 'message', null);
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue', statut_le = now(), maj_le = now() where id = c.id;
  else
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    values (a.client_id, a.entite_id, a.compte_id, 'repondre', left('Répondre à ' || c.nom || ' (retrait ' || a.reference || ')', 200),
            left(format('%s a répondu à la relance de retrait de %s.', coalesce(c.contact, c.nom), a.reference), 4000),
            c.commercial, (now() at time zone 'Europe/Paris')::date + 1);
  end if;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.reponse_retrait', 'offload_affaires', a.id::text,
    jsonb_build_object('reception', x.id, 'arret', v_arret), a.entite_id);
  return jsonb_build_object('statut', case when v_arret then 'arret' else 'reponse' end, 'affaire', a.id);
end $function$;

-- La nuit : détection, doublons, reprises, échéances, affaires, puis l'arrêté du mois au jour réglé.
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
      perform private.offload_echeances_cycle(k.client_id, p_jour);
      perform private.offload_affaires_cycle(k.client_id, p_jour);
      perform private.offload_arreter(k.client_id, p_jour);
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

-- Les réglages : le jour de l'arrêté mensuel.
create or replace function private.offload_regler(p_client uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_inconnus text;
  p jsonb := coalesce(p_reglages, '{}'::jsonb);
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'régler les seuils');
  if jsonb_typeof(p) <> 'object' then
    raise exception 'Les réglages se donnent en objet.' using errcode = '22023';
  end if;
  select string_agg(k, ', ') into v_inconnus from jsonb_object_keys(p) k
  where k not in ('delai_silence_jours', 'montant_min', 'jour_cloture', 'alerte_avant_cloture_jours', 'signature',
                  'delai_relance_jours', 'quarantaine_jours', 'plafond_reprises_jour', 'delai_retrait_jours', 'delai_relance_retrait_jours',
                  'arrete_jour');
  if v_inconnus is not null then
    raise exception 'Réglage inconnu : %.', v_inconnus using errcode = '22023';
  end if;
  select * into g from public.offload_reglages where client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  update public.offload_reglages set
    delai_silence_jours = case when p ? 'delai_silence_jours' then (p ->> 'delai_silence_jours')::integer else delai_silence_jours end,
    montant_min = case when p ? 'montant_min' then (p ->> 'montant_min')::numeric else montant_min end,
    jour_cloture = case when p ? 'jour_cloture' then (p ->> 'jour_cloture')::smallint else jour_cloture end,
    alerte_avant_cloture_jours = case when p ? 'alerte_avant_cloture_jours' then (p ->> 'alerte_avant_cloture_jours')::smallint
                                      else alerte_avant_cloture_jours end,
    signature = case when p ? 'signature' then private.offload_texte(p ->> 'signature', 500) else signature end,
    delai_relance_jours = case when p ? 'delai_relance_jours' then (p ->> 'delai_relance_jours')::smallint else delai_relance_jours end,
    quarantaine_jours = case when p ? 'quarantaine_jours' then (p ->> 'quarantaine_jours')::smallint else quarantaine_jours end,
    plafond_reprises_jour = case when p ? 'plafond_reprises_jour' then (p ->> 'plafond_reprises_jour')::smallint else plafond_reprises_jour end,
    delai_retrait_jours = case when p ? 'delai_retrait_jours' then (p ->> 'delai_retrait_jours')::smallint else delai_retrait_jours end,
    delai_relance_retrait_jours = case when p ? 'delai_relance_retrait_jours' then (p ->> 'delai_relance_retrait_jours')::smallint
                                       else delai_relance_retrait_jours end,
    arrete_jour = case when p ? 'arrete_jour' then (p ->> 'arrete_jour')::smallint else arrete_jour end,
    maj_le = now()
  where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', to_jsonb(g) - 'branchement_id' - 'installe_par', 'demande', p), null);
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans a5_01 : offload_pilotage, appelée par la porte publique SECURITY INVOKER)
-- ─────────────────────────────────────────────────────────────────────────

revoke all on function public.offload_pilotage(uuid, date) from public, anon;

grant execute on function public.offload_pilotage(uuid, date) to authenticated, service_role;

revoke all on function public.offload_arretes_liste(uuid) from public, anon;

grant execute on function public.offload_arretes_liste(uuid) to authenticated, service_role;

revoke execute on function private.offload_pilotage(uuid, date) from public, anon;

grant execute on function private.offload_pilotage(uuid, date) to authenticated, service_role;

revoke execute on function private.offload_pilotage_calcul(uuid, date) from public, anon, authenticated;

grant execute on function private.offload_pilotage_calcul(uuid, date) to service_role;

revoke execute on function private.offload_arreter(uuid, date) from public, anon, authenticated;

grant execute on function private.offload_arreter(uuid, date) to service_role;

revoke execute on function private.offload_reprise_instantane() from public, anon, authenticated;

grant execute on function private.offload_reprise_instantane() to service_role;

revoke execute on function private.offload_reponse_affaire(bigint, uuid) from public, anon, authenticated;

grant execute on function private.offload_reponse_affaire(bigint, uuid) to service_role;

revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;

grant execute on function private.offload_detecter_tout(date) to service_role;

revoke execute on function private.offload_regler(uuid, jsonb) from public, anon;

grant execute on function private.offload_regler(uuid, jsonb) to authenticated, service_role;
