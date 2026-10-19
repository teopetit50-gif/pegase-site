-- c3_15 — REPUT : rapprocher une même demande reçue sur deux canaux, même quand rien ne la relie d'avance (session C3, 19/10/2026)
--
-- Chiffrage #51 (« Une même demande reçue sur deux canaux est reconnue comme un seul dossier. ») : c3_07 regroupe déjà deux
-- messages dont les clés de contact se recoupent (même courriel, même téléphone, ou formulaire qui donne les deux). Restait
-- l'inconnu : un courriel de marie@… puis un WhatsApp du 06…, sans rien en commun d'avance. Ce lot ajoute :
--   · LA SIGNATURE. Le courriel, le téléphone écrits dans le texte du message (la signature « Marie Durand — 06 12 34 56 78 »)
--     deviennent des clés « tirées du texte » (reput_demandes.cles_texte). Elles rapprochent une demande d'une autre dont
--     l'adresse d'ENVOI est ce courriel ou ce numéro — jamais deux textes entre eux : une citation qui reprend la signature de
--     l'organisation ne relie pas deux clients. Le texte cité (« > », « Le … a écrit : », « On … wrote: », « De : ») est
--     ôté avant la lecture, et l'adresse de la boîte de réception n'est jamais une clé.
--   · LE NOM, EN PROPOSITION. Même nom et prénom (dans n'importe quel ordre, accents et casse ignorés), autre canal, dans les
--     48 heures, sans clé commune : la demande porte « rapprochement_propose » (l'autre demande). Rien n'est fusionné seul :
--     deux homonymes ne reçoivent jamais la réponse de l'autre. Une personne décide :
--       public.reput_rapprocher(p_demande, p_avec)      — même dossier ; une réponse plus ancienne en attente cède la place ;
--       public.reput_ecarter_rapprochement(p_demande)   — la proposition tombe ;
--       public.reput_separer(p_demande)                 — sort la demande de son dossier (fusion à tort) ; regroupée, elle
--                                                         revient « à traiter » par une personne.
--     Qui : gérant, administrateur, valideur ou collaborateur, qui lit les deux demandes (périmètre d'entité).
--
-- Règles de pose : alter … if not exists, create or replace, triggers recréés sous garde ; ni DROP ni DELETE.

alter table public.reput_demandes add column if not exists cles_texte text[] not null default '{}';
alter table public.reput_demandes add column if not exists rapprochement_propose uuid;
create index if not exists reput_demandes_cles_texte_idx on public.reput_demandes using gin (cles_texte);

-- Le texte propre de la personne : sans ce qu'elle cite.
create or replace function private.reput_texte_propre(p_corps text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select regexp_replace(coalesce(p_corps, ''),
    '(^|\n)[ \t]*(>|Le [^\n]{0,200}a écrit ?:|On [^\n]{0,200}wrote ?:|-{2,} ?(Message d''origine|Original Message)|De ?:[^\n]*@|From ?:[^\n]*@).*$',
    '')
$function$;

revoke execute on function private.reput_texte_propre(text) from public, anon, authenticated;

-- Les clés tirées du texte : courriels et téléphones écrits dans le message, hors citation et hors clés exclues.
create or replace function private.reput_cles_texte(p_corps text, p_exclure text[] default '{}')
 returns text[]
 language sql
 immutable
 set search_path to ''
as $function$
  with t as (select left(private.reput_texte_propre(p_corps), 20000) as t),
  brut as (
    select m[1] as x from t, regexp_matches(t.t, '([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,})', 'g') as m
    union
    select m[1] from t, regexp_matches(t.t, '((\+33|0033|\m0)[ .-]?[1-9]([ .-]?[0-9]{2}){4})', 'g') as m
    union
    select m[1] from t, regexp_matches(t.t, '(\+[1-9][0-9]([ .-]?[0-9]){7,13})', 'g') as m
  )
  select coalesce(array_agg(distinct k) filter (where k is not null and not (k = any (coalesce(p_exclure, '{}')))), '{}')
  from brut, lateral unnest(private.reput_cles_contact('texte', brut.x, '{}'::jsonb)) as k
$function$;

revoke execute on function private.reput_cles_texte(text, text[]) from public, anon, authenticated;

-- Le nom comparable : minuscules, sans accents, mots triés ; au moins deux mots de deux lettres, sinon rien.
create or replace function private.reput_nom_cle(p_nom text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  with m as (
    select w from unnest(regexp_split_to_array(
      btrim(regexp_replace(translate(lower(coalesce(p_nom, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa'),
                           '[^a-z]+', ' ', 'g')), ' ')) as w
    where char_length(w) >= 2
  )
  select case when count(*) >= 2 and count(*) <= 5 then string_agg(w, ' ' order by w) end from m
$function$;

revoke execute on function private.reput_nom_cle(text) from public, anon, authenticated;

-- À l'arrivée d'une demande : ses clés tirées du texte (hors la boîte de réception et ses propres clés d'envoi).
create or replace function private.reput_demande_cles_texte()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r public.receptions;
begin
  select * into r from public.receptions x where x.id = new.reception_id;
  if r.id is not null then
    new.cles_texte := private.reput_cles_texte(r.corps, coalesce(new.cles_contact, '{}') || private.reput_cles_contact('texte', r.boite, '{}'::jsonb));
  end if;
  return new;
end $function$;

revoke execute on function private.reput_demande_cles_texte() from public, anon, authenticated;

-- Au rangement dans son dossier : seule dans le sien, la demande cherche un homonyme sur un autre canal (48 h) → proposition.
create or replace function private.reput_demande_proposer()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_nom text;
begin
  if old.dossier_id is null and new.dossier_id = new.id and new.rapprochement_propose is null then
    v_nom := private.reput_nom_cle(new.de_nom);
    if v_nom is not null then
      select d.id into new.rapprochement_propose
      from public.reput_demandes d
      where d.client_id = new.client_id and d.id <> new.id and d.canal <> new.canal
        and d.recu_le between new.recu_le - interval '48 hours' and new.recu_le
        and d.statut <> 'ignoree' and d.entite_id is not distinct from new.entite_id
        and private.reput_nom_cle(d.de_nom) = v_nom
        and not (d.cles_contact && new.cles_contact)
      order by d.recu_le desc
      limit 1;
    end if;
  end if;
  return new;
end $function$;

revoke execute on function private.reput_demande_proposer() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgname = 'reput_demandes_cles_texte' and tgrelid = 'public.reput_demandes'::regclass) then
    create trigger reput_demandes_cles_texte before insert on public.reput_demandes
      for each row execute function private.reput_demande_cles_texte();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'reput_demandes_proposer' and tgrelid = 'public.reput_demandes'::regclass) then
    create trigger reput_demandes_proposer before update of dossier_id on public.reput_demandes
      for each row execute function private.reput_demande_proposer();
  end if;
end $do$;

-- Le dossier d'une demande (repris de c3_07) : clé d'envoi commune, OU clé tirée du texte de l'une = clé d'envoi de l'autre.
create or replace function private.reput_dossier_de(p_client uuid, p_demande uuid, p_cles text[], p_recu_le timestamptz)
 returns uuid
 language sql
 stable security definer
 set search_path to ''
as $function$
  with moi as (select coalesce((select x.cles_texte from public.reput_demandes x where x.id = p_demande), '{}'::text[]) as texte)
  select coalesce(d.dossier_id, d.id)
  from public.reput_demandes d, moi
  where d.client_id = p_client and d.id <> p_demande
    and ((cardinality(p_cles) > 0 and (d.cles_contact && p_cles or d.cles_texte && p_cles))
         or (cardinality(moi.texte) > 0 and d.cles_contact && moi.texte))
    and d.recu_le >= p_recu_le - interval '7 days' and d.recu_le <= p_recu_le
  order by d.recu_le desc
  limit 1
$function$;

-- La demande, si la personne connectée la lit et peut la traiter (pas un lecteur).
create or replace function private.reput_demande_traitee_par(p_demande uuid)
 returns public.reput_demandes
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare d public.reput_demandes;
begin
  d := private.reput_demande_lue(p_demande);
  if not private.a_un_role(d.client_id, array['gerant', 'admin', 'valideur', 'collaborateur']) then
    raise exception 'Rapprocher ou séparer des demandes demande un compte qui les traite.' using errcode = '42501';
  end if;
  return d;
end $function$;

revoke execute on function private.reput_demande_traitee_par(uuid) from public, anon, authenticated;

create or replace function public.reput_rapprocher(p_demande uuid, p_avec uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes := private.reput_demande_traitee_par(p_demande);
  a public.reput_demandes := private.reput_demande_lue(p_avec);
  v_dossier uuid;
  v_ancien uuid;
  v_n int;
begin
  if a.client_id <> d.client_id or a.id = d.id then
    raise exception 'Deux demandes différentes de la même organisation se rapprochent.' using errcode = '22023';
  end if;
  v_dossier := coalesce(a.dossier_id, a.id);
  v_ancien := coalesce(d.dossier_id, d.id);
  if v_ancien = v_dossier then
    return jsonb_build_object('dossier', v_dossier, 'deja', true);
  end if;
  update public.reput_demandes x set dossier_id = v_dossier, rapprochement_propose = null, maj_le = now()
  where x.client_id = d.client_id and (x.id = d.id or x.dossier_id = v_ancien);
  get diagnostics v_n = row_count;
  update public.reput_demandes x set rapprochement_propose = null where x.id = a.id and x.rapprochement_propose = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.demande_rapprochee', 'reput_demandes', d.id::text,
    jsonb_build_object('avec', a.id, 'dossier', v_dossier, 'demandes', v_n, 'par', (select auth.uid())), d.entite_id);
  return jsonb_build_object('dossier', v_dossier, 'demandes', v_n, 'regroupees', private.reput_regrouper());
end $function$;

revoke execute on function public.reput_rapprocher(uuid, uuid) from public, anon;
grant execute on function public.reput_rapprocher(uuid, uuid) to authenticated, service_role;

create or replace function public.reput_ecarter_rapprochement(p_demande uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare d public.reput_demandes := private.reput_demande_traitee_par(p_demande);
begin
  if d.rapprochement_propose is null then
    return jsonb_build_object('demande', d.id, 'ecarte', false);
  end if;
  update public.reput_demandes x set rapprochement_propose = null, maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.rapprochement_ecarte', 'reput_demandes', d.id::text,
    jsonb_build_object('avec', d.rapprochement_propose, 'par', (select auth.uid())), d.entite_id);
  return jsonb_build_object('demande', d.id, 'ecarte', true);
end $function$;

revoke execute on function public.reput_ecarter_rapprochement(uuid) from public, anon;
grant execute on function public.reput_ecarter_rapprochement(uuid) to authenticated, service_role;

create or replace function public.reput_separer(p_demande uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes := private.reput_demande_traitee_par(p_demande);
  v_revient boolean := d.statut = 'ignoree' and d.regroupee_avec is not null;
begin
  if coalesce(d.dossier_id, d.id) = d.id and not exists (select 1 from public.reput_demandes x where x.dossier_id = d.id and x.id <> d.id) then
    return jsonb_build_object('demande', d.id, 'separee', false);
  end if;
  if coalesce(d.dossier_id, d.id) = d.id then
    -- tête de son dossier : ce sont les autres qui gardent le dossier, sous le plus récent d'entre eux
    update public.reput_demandes x set dossier_id = (select y.id from public.reput_demandes y where y.dossier_id = d.id and y.id <> d.id
                                                     order by y.recu_le desc limit 1)
    where x.dossier_id = d.id and x.id <> d.id;
  end if;
  update public.reput_demandes x set dossier_id = d.id, rapprochement_propose = null,
         statut = case when v_revient then 'a_traiter' else x.statut end,
         regroupee_avec = case when v_revient then null else x.regroupee_avec end,
         motif = case when v_revient then 'Séparée de son dossier : à traiter par une personne (sa réponse avait été remplacée).' else x.motif end,
         maj_le = now()
  where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.demande_separee', 'reput_demandes', d.id::text,
    jsonb_build_object('dossier', d.dossier_id, 'a_traiter', v_revient, 'par', (select auth.uid())), d.entite_id);
  return jsonb_build_object('demande', d.id, 'separee', true, 'a_traiter', v_revient);
end $function$;

revoke execute on function public.reput_separer(uuid) from public, anon;
grant execute on function public.reput_separer(uuid) to authenticated, service_role;
