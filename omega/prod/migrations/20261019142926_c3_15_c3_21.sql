-- 20261019142926 c3_15_c3_21
-- Source : dépôt : cb3f1c47 omega/modules/reput/migrations/c3_15_rapprochement_canaux.sql ; cb3f1c47 omega/modules/reput/migrations/c3_16_sujet_secondaire.sql ; cb3f1c47 omega/modules/reput/migrations/c3_17_reglages_sites.sql ; cb3f1c47 omega/modules/reput/migrations/c3_18_accuse_transfert.sql ; cb3f1c47 omega/modules/reput/migrations/c3_19_export_date_fixe.sql ; cb3f1c47 omega/modules/reput/migrations/c3_20_precision_sans_texte.sql ; cb3f1c47 omega/modules/reput/migrations/c3_21_rendez_vous.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_15_rapprochement_canaux.sql @ cb3f1c47, c3_16_sujet_secondaire.sql @ cb3f1c47, c3_17_reglages_sites.sql @ cb3f1c47, c3_18_accuse_transfert.sql @ cb3f1c47, c3_19_export_date_fixe.sql @ cb3f1c47, c3_20_precision_sans_texte.sql @ cb3f1c47, c3_21_rendez_vous.sql @ cb3f1c47.
-- ═══ omega/modules/reput/migrations/c3_15_rapprochement_canaux.sql @ cb3f1c47
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


-- ═══ omega/modules/reput/migrations/c3_16_sujet_secondaire.sql @ cb3f1c47
-- c3_16 — REPUT : le sujet secondaire, et le second service prévenu (session C3, 19/10/2026)
--
-- Chiffrage #49 (« Une demande qui relève de deux services est orientée vers le premier concerné. ») : jusqu'ici une demande
-- n'avait qu'un sujet, donc un seul service, et le second n'en savait rien. Désormais :
--   · reput_demandes.sujet_secondaire : l'autre sujet que la demande touche (posé par l'ouvrier d'après le modèle, ou par
--     une personne qui traite la demande). Le sujet PRINCIPAL ne change pas : la réponse, sa validation et son service
--     restent ceux du premier concerné (c3_07).
--   · public.reput_noter_sujet_secondaire(p_demande, p_sujet) — serveur, ou une personne qui traite la demande (gérant,
--     administrateur, valideur, collaborateur, sur son périmètre). Un sujet inconnu, inactif ou égal au principal est
--     refusé ; nul l'efface.
--   · Si le sujet secondaire est routé vers un AUTRE service que le principal, chaque membre de ce second service dont le
--     périmètre couvre la demande reçoit un courriel interne (socle 19as : gabarit fermé « reput.second_service », une date
--     et un nombre, sans contenu client), une fois par demande et par membre. Le second service lit la demande dans
--     l'espace ; il ne la valide pas (la règle de validation reste celle du sujet principal).
-- Les modes d'envoi ne changent pas : sur la recette et le banc, rien ne part pour de vrai.
--
-- Règles de pose : alter … if not exists, insert … on conflict do nothing, create or replace ; ni DROP ni DELETE.

alter table public.reput_demandes add column if not exists sujet_secondaire text;
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_demandes_sujet_secondaire_check') then
    alter table public.reput_demandes add constraint reput_demandes_sujet_secondaire_check
      check (sujet_secondaire is null or sujet_secondaire ~ '^[a-z][a-z0-9_]{1,39}$');
  end if;
end $do$;

insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values (null, 'reput', 'reput.second_service', 'fr', 1, 'email',
        'REPUT — une demande concerne aussi votre service (sans contenu client)',
        'Une demande client concerne aussi votre service — {{organisation}}',
        'Bonjour,' || chr(10) || chr(10)
        || 'Une demande reçue le {{jour}} concerne aussi votre service ({{organisation}}). Elle est suivie par le service '
        || 'qui en a la charge principale ; {{nombre}} demande(s) de ce jour vous concernent en second.' || chr(10) || chr(10)
        || 'Pour la consulter : https://omegaai.fr/espace2/reput' || chr(10)
        || '(la connexion à votre espace vous est demandée ; le contenu des demandes ne sort jamais par courriel).' || chr(10) || chr(10)
        || 'REPUT, pour {{organisation}}.',
        '{"jour": "date", "nombre": "nombre"}'::jsonb,
        true, false, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

do $$
declare v_id uuid;
begin
  select g.id into v_id from public.gabarits_messages g
  where g.client_id is null and g.code = 'reput.second_service' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon';
  if v_id is not null then
    set local role service_role;
    perform public.valider_gabarit(v_id, 'C3 — courriel « concerne aussi votre service », 19/10/2026');
    reset role;
  end if;
end $$;

-- Les membres du second service prévenus pour une demande (une fois par demande et par membre).
create or replace function private.reput_prevenir_second_service(p_demande uuid)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_eq1 uuid;
  v_eq2 uuid;
  x record;
  v_cle text;
  v_jour date;
  n integer := 0;
begin
  select * into d from public.reput_demandes y where y.id = p_demande;
  if d.id is null or d.sujet_secondaire is null then return 0; end if;
  select s.equipe_id into v_eq1 from public.reput_sujets s where s.client_id = d.client_id and s.code = d.sujet;
  select s.equipe_id into v_eq2 from public.reput_sujets s where s.client_id = d.client_id and s.code = d.sujet_secondaire;
  if v_eq2 is null or v_eq2 is not distinct from v_eq1 then return 0; end if;
  v_jour := (d.recu_le at time zone 'Europe/Paris')::date;
  for x in
    select distinct m.user_id
    from public.equipes_membres m
    join public.comptes c on c.client_id = d.client_id and c.user_id = m.user_id
    where m.equipe_id = v_eq2 and private.perimetre_couvre(m.user_id, d.client_id, d.entite_id)
    order by m.user_id
  loop
    v_cle := 'reput.second_service:' || d.id::text || ':' || x.user_id::text;
    continue when exists (select 1 from public.envois e where e.client_id = d.client_id and e.cle_idempotence = v_cle);
    begin
      perform private.envoyer_interne(
        d.client_id, 'reput', null, null, 'email', x.user_id, 'reput.second_service',
        jsonb_build_object('jour', to_char(v_jour, 'YYYY-MM-DD'),
                           'nombre', (select count(*) from public.reput_demandes z
                                      where z.client_id = d.client_id and z.sujet_secondaire is not null
                                        and (z.recu_le at time zone 'Europe/Paris')::date = v_jour
                                        and exists (select 1 from public.reput_sujets s where s.client_id = z.client_id
                                                    and s.code = z.sujet_secondaire and s.equipe_id = v_eq2))),
        v_cle, d.entite_id);
      n := n + 1;
    exception when others then
      perform private.journaliser_module(d.client_id, 'reput', 'reput.second_service_echec', 'reput_demandes', d.id::text,
        jsonb_build_object('membre', x.user_id, 'erreur', left(sqlerrm, 200)), d.entite_id);
    end;
  end loop;
  return n;
end $function$;

revoke execute on function private.reput_prevenir_second_service(uuid) from public, anon, authenticated;

create or replace function public.reput_noter_sujet_secondaire(p_demande uuid, p_sujet text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_code text := nullif(lower(btrim(coalesce(p_sujet, ''))), '');
  s public.reput_sujets;
  v_prevenus integer := 0;
begin
  if private.reput_est_serveur() then
    select * into d from public.reput_demandes x where x.id = p_demande;
    if d.id is null then
      raise exception 'Demande introuvable.' using errcode = 'P0002';
    end if;
  else
    d := private.reput_demande_traitee_par(p_demande);
  end if;
  if v_code is not null then
    select * into s from public.reput_sujets x where x.client_id = d.client_id and x.code = v_code;
    if s.id is null or not s.actif then
      raise exception 'Sujet secondaire inconnu ou inactif : %.', v_code using errcode = '22023';
    end if;
    if v_code is not distinct from d.sujet then
      raise exception 'Le sujet secondaire diffère du sujet principal.' using errcode = '22023';
    end if;
  end if;
  if d.sujet_secondaire is not distinct from v_code then
    return jsonb_build_object('demande', d.id, 'sujet_secondaire', v_code, 'change', false, 'prevenus', 0);
  end if;
  update public.reput_demandes x set sujet_secondaire = v_code, maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.sujet_secondaire', 'reput_demandes', d.id::text,
    jsonb_build_object('sujet', d.sujet, 'secondaire', v_code, 'service', s.equipe_id, 'par', (select auth.uid())), d.entite_id);
  if v_code is not null then
    v_prevenus := private.reput_prevenir_second_service(d.id);
  end if;
  return jsonb_build_object('demande', d.id, 'sujet_secondaire', v_code, 'change', true, 'service', s.equipe_id, 'prevenus', v_prevenus);
end $function$;

revoke execute on function public.reput_noter_sujet_secondaire(uuid, text) from public, anon;
grant execute on function public.reput_noter_sujet_secondaire(uuid, text) to authenticated, service_role;


-- ═══ omega/modules/reput/migrations/c3_17_reglages_sites.sql @ cb3f1c47
-- c3_17 — REPUT : les réglages par entité et par site (session C3, 19/10/2026)
--
-- Chiffrage #56 (« Le ton, la signature et les formules se règlent entité par entité. ») et #88 (« Chaque société, site ou
-- service a sa base de connaissances, ses horaires et sa signature… un responsable de site ne voit que le sien »).
-- Déjà là : une ligne reput_reglages par entité (entite_id), que la base en vigueur, l'accusé et l'avis préfèrent à celle
-- de l'organisation ; des fiches par entité ; la lecture des demandes au périmètre. Manquait :
--   · L'HÉRITAGE. Une entité sans réglages propres SUIT l'organisation (reput_reglages.suit_organisation) : sa ligne est
--     la copie de celle de l'organisation, tenue à jour à chaque changement de l'organisation. Dès qu'on règle l'entité
--     elle-même, elle a ses PROPRES réglages et ne suit plus ; public.reput_suivre_organisation(p_client, p_entite) l'y
--     ramène. Les lecteurs existants (reput_base, reput_accuser, l'avis) n'ont pas à changer : ils lisent la ligne de
--     l'entité, qui porte toujours les bons réglages.
--   · LE PÉRIMÈTRE. Un gérant ou un administrateur ne règle une entité que si son périmètre la couvre ; les réglages de
--     toute l'organisation demandent un périmètre complet. Un administrateur de site règle donc son site, pas les autres.
--   · LA LECTURE. public.reput_reglages_sites (security_invoker) : par entité, d'où viennent ses réglages (organisation
--     ou propres) et ce qu'ils disent ; chacun ne lit que son périmètre (RLS de reput_reglages et des entités).
-- L'envoi automatique (c3_13) reste un réglage de l'organisation.
--
-- Règles de pose : alter … if not exists, create or replace, triggers recréés sous garde ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists suit_organisation boolean not null default false;

-- Les champs que l'entité hérite de l'organisation.
create or replace function private.reput_copier_reglages(p_cible public.reput_reglages, p_source public.reput_reglages)
 returns public.reput_reglages
 language plpgsql
 immutable
 set search_path to ''
as $function$
begin
  p_cible.signature := p_source.signature;
  p_cible.formule_appel := p_source.formule_appel;
  p_cible.formule_politesse := p_source.formule_politesse;
  p_cible.ton := p_source.ton;
  p_cible.mention_automatisee := p_source.mention_automatisee;
  p_cible.langues := p_source.langues;
  p_cible.actif := p_source.actif;
  p_cible.accuse := p_source.accuse;
  p_cible.texte_accuse := p_source.texte_accuse;
  p_cible.lien_avis := p_source.lien_avis;
  p_cible.texte_avis := p_source.texte_avis;
  p_cible.avis_auto_reglement := p_source.avis_auto_reglement;
  return p_cible;
end $function$;

revoke execute on function private.reput_copier_reglages(public.reput_reglages, public.reput_reglages) from public, anon, authenticated;

create or replace function private.reput_reglages_differents(a public.reput_reglages, b public.reput_reglages)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select (a.signature, a.formule_appel, a.formule_politesse, a.ton, a.mention_automatisee, a.langues, a.actif, a.accuse,
          a.texte_accuse, a.lien_avis, a.texte_avis, a.avis_auto_reglement)
         is distinct from
         (b.signature, b.formule_appel, b.formule_politesse, b.ton, b.mention_automatisee, b.langues, b.actif, b.accuse,
          b.texte_accuse, b.lien_avis, b.texte_avis, b.avis_auto_reglement)
$function$;

revoke execute on function private.reput_reglages_differents(public.reput_reglages, public.reput_reglages) from public, anon, authenticated;

-- Une entité qui s'installe hérite de l'organisation.
create or replace function private.reput_reglages_naissance()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare o public.reput_reglages;
begin
  if new.entite_id is not null then
    select * into o from public.reput_reglages r where r.client_id = new.client_id and r.entite_id is null;
    if o.id is not null then
      new := private.reput_copier_reglages(new, o);
      new.suit_organisation := true;
    end if;
  end if;
  return new;
end $function$;

revoke execute on function private.reput_reglages_naissance() from public, anon, authenticated;

-- Un changement : le périmètre de qui le fait ; une entité réglée elle-même ne suit plus l'organisation.
create or replace function private.reput_reglages_garde()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if coalesce(current_setting('reput.propagation', true), '') = '1' then
    return new;
  end if;
  if not private.reput_reglages_differents(new, old) then
    return new;
  end if;
  if v_uid is not null then
    if new.entite_id is null then
      if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = new.client_id and c.perimetre_total) then
        raise exception 'Les réglages de toute l''organisation se changent avec un périmètre complet.' using errcode = '42501';
      end if;
    elsif not private.perimetre_couvre(v_uid, new.client_id, new.entite_id) then
      raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if new.entite_id is not null then
    new.suit_organisation := false;
  end if;
  return new;
end $function$;

revoke execute on function private.reput_reglages_garde() from public, anon, authenticated;

-- L'organisation change : les entités qui la suivent suivent.
create or replace function private.reput_reglages_propager()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_avant text := current_setting('reput.propagation', true);
  x public.reput_reglages;
begin
  if new.entite_id is not null or not private.reput_reglages_differents(new, old) then
    return null;
  end if;
  perform set_config('reput.propagation', '1', true);
  for x in select * from public.reput_reglages r where r.client_id = new.client_id and r.entite_id is not null and r.suit_organisation for update loop
    x := private.reput_copier_reglages(x, new);
    update public.reput_reglages r set signature = x.signature, formule_appel = x.formule_appel, formule_politesse = x.formule_politesse,
           ton = x.ton, mention_automatisee = x.mention_automatisee, langues = x.langues, actif = x.actif, accuse = x.accuse,
           texte_accuse = x.texte_accuse, lien_avis = x.lien_avis, texte_avis = x.texte_avis, avis_auto_reglement = x.avis_auto_reglement,
           maj_le = now()
    where r.id = x.id;
  end loop;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  return null;
end $function$;

revoke execute on function private.reput_reglages_propager() from public, anon, authenticated;

do $do$ begin
  if not exists (select 1 from pg_trigger where tgname = 'reput_reglages_naissance' and tgrelid = 'public.reput_reglages'::regclass) then
    create trigger reput_reglages_naissance before insert on public.reput_reglages
      for each row execute function private.reput_reglages_naissance();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'reput_reglages_garde' and tgrelid = 'public.reput_reglages'::regclass) then
    create trigger reput_reglages_garde before update on public.reput_reglages
      for each row execute function private.reput_reglages_garde();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'reput_reglages_propager' and tgrelid = 'public.reput_reglages'::regclass) then
    create trigger reput_reglages_propager after update on public.reput_reglages
      for each row execute function private.reput_reglages_propager();
  end if;
end $do$;

-- Ramener une entité aux réglages de l'organisation.
create or replace function public.reput_suivre_organisation(p_client uuid, p_entite uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_avant text := current_setting('reput.propagation', true);
  o public.reput_reglages;
  x public.reput_reglages;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les réglages des réponses se changent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_entite is null or not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  perform private.reput_installer(p_client, null);
  perform private.reput_installer(p_client, p_entite);
  select * into o from public.reput_reglages r where r.client_id = p_client and r.entite_id is null;
  select * into x from public.reput_reglages r where r.client_id = p_client and r.entite_id = p_entite for update;
  x := private.reput_copier_reglages(x, o);
  perform set_config('reput.propagation', '1', true);
  update public.reput_reglages r set signature = x.signature, formule_appel = x.formule_appel, formule_politesse = x.formule_politesse,
         ton = x.ton, mention_automatisee = x.mention_automatisee, langues = x.langues, actif = x.actif, accuse = x.accuse,
         texte_accuse = x.texte_accuse, lien_avis = x.lien_avis, texte_avis = x.texte_avis, avis_auto_reglement = x.avis_auto_reglement,
         suit_organisation = true, maj_par = v_uid, maj_le = now()
  where r.id = x.id;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_suivent_organisation', 'reput_reglages', x.id::text,
    jsonb_build_object('entite', p_entite, 'par', v_uid), p_entite);
  return jsonb_build_object('entite', p_entite, 'suit_organisation', true);
end $function$;

revoke execute on function public.reput_suivre_organisation(uuid, uuid) from public, anon;
grant execute on function public.reput_suivre_organisation(uuid, uuid) to authenticated, service_role;

-- Par entité : d'où viennent ses réglages et ce qu'ils disent (une entité sans ligne suit l'organisation).
create or replace view public.reput_reglages_sites with (security_invoker = true) as
select e.client_id, e.id as entite_id, e.nom, e.type, e.principale,
       case when r.id is null or r.suit_organisation then 'organisation' else 'propres' end as source,
       coalesce(r.signature, o.signature) as signature, coalesce(r.ton, o.ton) as ton,
       coalesce(r.formule_appel, o.formule_appel) as formule_appel, coalesce(r.formule_politesse, o.formule_politesse) as formule_politesse,
       coalesce(r.langues, o.langues) as langues, coalesce(r.actif, o.actif) as actif, coalesce(r.accuse, o.accuse) as accuse,
       coalesce(r.maj_le, o.maj_le) as maj_le
from public.entites e
join public.reput_reglages o on o.client_id = e.client_id and o.entite_id is null
left join public.reput_reglages r on r.client_id = e.client_id and r.entite_id = e.id;

revoke all on public.reput_reglages_sites from public, anon, authenticated;
grant select on public.reput_reglages_sites to authenticated, service_role;


-- ═══ omega/modules/reput/migrations/c3_18_accuse_transfert.sql @ cb3f1c47
-- c3_18 — REPUT : l'accusé de réception nomme le service qui reprend la demande (session C3, 19/10/2026)
--
-- Chiffrage #86 (« Elle est routée vers le service compétent selon les règles définies avec vous, et le client en est
-- informé. ») : la RÉPONSE nommait déjà le service (c3_09), mais l'ACCUSÉ — ce que le client reçoit dans la minute quand une
-- personne doit relire — restait le texte fixe des réglages. Désormais :
--   · reput_reglages.phrase_transfert (réglable par l'organisation et par site, comme le reste ; nulle = pas de phrase) :
--     « Votre demande est transmise au service {service}, qui revient vers vous. » par défaut ;
--   · private.reput_accuser (repris de c3_05) ajoute cette phrase au texte de l'accusé quand le sujet de la demande est
--     routé vers un service (c3_07), {service} remplacé par le nom de l'équipe ; sinon l'accusé ne change pas ;
--   · public.reput_regler (repris de c3_06) accepte la clé phrase_transfert ; l'héritage des sites (c3_17) la recopie.
-- L'accusé reste soumis à validation ou à l'accord « accusés », comme avant : rien ne part de plus.
--
-- Règles de pose : alter … if not exists, create or replace ; ni DROP ni DELETE.

alter table public.reput_reglages add column if not exists phrase_transfert text
  default 'Votre demande est transmise au service {service}, qui revient vers vous.';
do $do$ begin
  if not exists (select 1 from pg_constraint where conname = 'reput_reglages_phrase_transfert_check') then
    alter table public.reput_reglages add constraint reput_reglages_phrase_transfert_check
      check (phrase_transfert is null or (char_length(btrim(phrase_transfert)) between 1 and 300 and phrase_transfert like '%{service}%'));
  end if;
end $do$;

create or replace function private.reput_copier_reglages(p_cible public.reput_reglages, p_source public.reput_reglages)
 returns public.reput_reglages
 language plpgsql
 immutable
 set search_path to ''
as $function$
begin
  p_cible.signature := p_source.signature;
  p_cible.formule_appel := p_source.formule_appel;
  p_cible.formule_politesse := p_source.formule_politesse;
  p_cible.ton := p_source.ton;
  p_cible.mention_automatisee := p_source.mention_automatisee;
  p_cible.langues := p_source.langues;
  p_cible.actif := p_source.actif;
  p_cible.accuse := p_source.accuse;
  p_cible.texte_accuse := p_source.texte_accuse;
  p_cible.lien_avis := p_source.lien_avis;
  p_cible.texte_avis := p_source.texte_avis;
  p_cible.avis_auto_reglement := p_source.avis_auto_reglement;
  p_cible.phrase_transfert := p_source.phrase_transfert;
  return p_cible;
end $function$;

create or replace function private.reput_reglages_differents(a public.reput_reglages, b public.reput_reglages)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select (a.signature, a.formule_appel, a.formule_politesse, a.ton, a.mention_automatisee, a.langues, a.actif, a.accuse,
          a.texte_accuse, a.lien_avis, a.texte_avis, a.avis_auto_reglement, a.phrase_transfert)
         is distinct from
         (b.signature, b.formule_appel, b.formule_politesse, b.ton, b.mention_automatisee, b.langues, b.actif, b.accuse,
          b.texte_accuse, b.lien_avis, b.texte_avis, b.avis_auto_reglement, b.phrase_transfert)
$function$;

create or replace function private.reput_reglages_propager()
 returns trigger
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_avant text := current_setting('reput.propagation', true);
  x public.reput_reglages;
begin
  if new.entite_id is not null or not private.reput_reglages_differents(new, old) then
    return null;
  end if;
  perform set_config('reput.propagation', '1', true);
  for x in select * from public.reput_reglages r where r.client_id = new.client_id and r.entite_id is not null and r.suit_organisation for update loop
    x := private.reput_copier_reglages(x, new);
    update public.reput_reglages r set signature = x.signature, formule_appel = x.formule_appel, formule_politesse = x.formule_politesse,
           ton = x.ton, mention_automatisee = x.mention_automatisee, langues = x.langues, actif = x.actif, accuse = x.accuse,
           texte_accuse = x.texte_accuse, lien_avis = x.lien_avis, texte_avis = x.texte_avis, avis_auto_reglement = x.avis_auto_reglement,
           phrase_transfert = x.phrase_transfert, maj_le = now()
    where r.id = x.id;
  end loop;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  return null;
end $function$;

create or replace function public.reput_suivre_organisation(p_client uuid, p_entite uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_avant text := current_setting('reput.propagation', true);
  o public.reput_reglages;
  x public.reput_reglages;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les réglages des réponses se changent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_entite is null or not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  end if;
  if not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  perform private.reput_installer(p_client, null);
  perform private.reput_installer(p_client, p_entite);
  select * into o from public.reput_reglages r where r.client_id = p_client and r.entite_id is null;
  select * into x from public.reput_reglages r where r.client_id = p_client and r.entite_id = p_entite for update;
  x := private.reput_copier_reglages(x, o);
  perform set_config('reput.propagation', '1', true);
  update public.reput_reglages r set signature = x.signature, formule_appel = x.formule_appel, formule_politesse = x.formule_politesse,
         ton = x.ton, mention_automatisee = x.mention_automatisee, langues = x.langues, actif = x.actif, accuse = x.accuse,
         texte_accuse = x.texte_accuse, lien_avis = x.lien_avis, texte_avis = x.texte_avis, avis_auto_reglement = x.avis_auto_reglement,
         phrase_transfert = x.phrase_transfert, suit_organisation = true, maj_par = v_uid, maj_le = now()
  where r.id = x.id;
  perform set_config('reput.propagation', coalesce(v_avant, ''), true);
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_suivent_organisation', 'reput_reglages', x.id::text,
    jsonb_build_object('entite', p_entite, 'par', v_uid), p_entite);
  return jsonb_build_object('entite', p_entite, 'suit_organisation', true);
end $function$;

create or replace function public.reput_regler(p_client uuid, p_entite uuid, p_reglages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_cle text;
  v_r public.reput_reglages;
  v_langues text[];
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Les réglages des réponses se changent par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_reglages is null or jsonb_typeof(p_reglages) <> 'object' then
    raise exception 'Les réglages forment un objet JSON.' using errcode = '22023';
  end if;
  for v_cle in select jsonb_object_keys(p_reglages) loop
    if v_cle not in ('signature', 'formule_appel', 'formule_politesse', 'ton', 'mention_automatisee', 'langues', 'actif',
                     'accuse', 'texte_accuse', 'lien_avis', 'texte_avis', 'avis_auto_reglement', 'phrase_transfert') then
      raise exception 'Réglage inconnu : « % » (signature, formule_appel, formule_politesse, ton, mention_automatisee, langues, actif, accuse, texte_accuse, lien_avis, texte_avis, avis_auto_reglement, phrase_transfert).', v_cle
        using errcode = '22023';
    end if;
  end loop;
  perform private.reput_installer(p_client, p_entite);
  select * into v_r from public.reput_reglages r where r.client_id = p_client and r.entite_id is not distinct from p_entite for update;
  if p_reglages ? 'langues' then
    if jsonb_typeof(p_reglages -> 'langues') <> 'array' then
      raise exception 'Les langues forment une liste de codes à deux lettres (fr, en, es…).' using errcode = '22023';
    end if;
    select array_agg(lower(btrim(x)) order by o) into v_langues
    from jsonb_array_elements_text(p_reglages -> 'langues') with ordinality t(x, o);
  end if;
  update public.reput_reglages r set
    signature = case when p_reglages ? 'signature' then btrim(p_reglages ->> 'signature') else r.signature end,
    formule_appel = case when p_reglages ? 'formule_appel' then coalesce(p_reglages ->> 'formule_appel', '') else r.formule_appel end,
    formule_politesse = case when p_reglages ? 'formule_politesse' then coalesce(p_reglages ->> 'formule_politesse', '') else r.formule_politesse end,
    ton = case when p_reglages ? 'ton' then p_reglages ->> 'ton' else r.ton end,
    mention_automatisee = case when p_reglages ? 'mention_automatisee' then nullif(btrim(p_reglages ->> 'mention_automatisee'), '') else r.mention_automatisee end,
    langues = coalesce(v_langues, r.langues),
    actif = case when p_reglages ? 'actif' then (p_reglages ->> 'actif')::boolean else r.actif end,
    accuse = case when p_reglages ? 'accuse' then (p_reglages ->> 'accuse')::boolean else r.accuse end,
    texte_accuse = case when p_reglages ? 'texte_accuse' then btrim(p_reglages ->> 'texte_accuse') else r.texte_accuse end,
    lien_avis = case when p_reglages ? 'lien_avis' then nullif(btrim(p_reglages ->> 'lien_avis'), '') else r.lien_avis end,
    texte_avis = case when p_reglages ? 'texte_avis' then btrim(p_reglages ->> 'texte_avis') else r.texte_avis end,
    avis_auto_reglement = case when p_reglages ? 'avis_auto_reglement' then (p_reglages ->> 'avis_auto_reglement')::boolean else r.avis_auto_reglement end,
    phrase_transfert = case when p_reglages ? 'phrase_transfert' then nullif(btrim(p_reglages ->> 'phrase_transfert'), '') else r.phrase_transfert end,
    maj_par = v_uid, maj_le = now()
  where r.id = v_r.id
  returning * into v_r;
  perform private.journaliser_module(p_client, 'reput', 'reput.reglages_modifies', 'reput_reglages', v_r.id::text,
    jsonb_build_object('cles', (select jsonb_agg(k order by k) from jsonb_object_keys(p_reglages) k)), p_entite);
  return to_jsonb(v_r);
end $function$;

create or replace function private.reput_accuser(p_demande uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  g public.reput_reglages;
  v_corps text;
  v_objet text;
  v_dv uuid;
  v_envoi uuid;
  v_e public.envois;
  v_service text;
  v_phrase text;
begin
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null or d.accuse_le is not null or d.statut not in ('a_valider', 'a_traiter') or d.canal_reponse is null then
    return jsonb_build_object('ignore', 'demande absente, déjà accusée, déjà répondue ou sans adresse');
  end if;
  select * into g from public.reput_reglages r
  where r.client_id = d.client_id and (r.entite_id = d.entite_id or r.entite_id is null)
  order by (r.entite_id is not null) desc limit 1;
  if g.id is null or not g.actif or not g.accuse then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;   -- rien à accuser : ne plus y revenir
    return jsonb_build_object('ignore', 'accusé désactivé dans les réglages');
  end if;
  if coalesce(d.langue, 'fr') <> 'fr' then
    update public.reput_demandes x set accuse_le = now() where x.id = d.id;
    return jsonb_build_object('ignore', 'accusé écrit en français, demande en ' || d.langue);
  end if;
  -- c3_18 : un sujet routé vers un service → l'accusé le dit, en le nommant (« le client en est informé »).
  select e.nom into v_service
  from public.reput_sujets s join public.equipes e on e.client_id = s.client_id and e.id = s.equipe_id
  where s.client_id = d.client_id and s.code = d.sujet;
  if v_service is not null and g.phrase_transfert is not null then
    v_phrase := replace(btrim(g.phrase_transfert), '{service}', btrim(v_service));
  end if;
  v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''), concat_ws(' ', btrim(g.texte_accuse), v_phrase),
                       concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')),
                       nullif(btrim(g.mention_automatisee), ''));
  v_objet := case when d.canal_reponse = 'email' then left('Re : ' || coalesce(nullif(btrim(d.objet), ''), 'votre message'), 300) end;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                          echeance, cle_idempotence)
  values (d.client_id, d.entite_id, 'reput', 'reput.accuser', 'reput_demandes', d.id::text,
          left('Accusé de réception à ' || coalesce(nullif(btrim(d.de_nom), ''), d.adresse_reponse), 500),
          jsonb_build_object('demande', d.id, 'canal', d.canal_reponse, 'objet', v_objet, 'corps', v_corps),
          now() + interval '2 days', 'reput:accuse:' || d.id::text)
  returning id into v_dv;
  v_envoi := private.preparer_envoi(d.client_id, 'reput', 'reput_demandes', d.id::text, d.canal_reponse,
    jsonb_build_object('adresse', d.adresse_reponse, 'nom', d.de_nom, 'langue', 'fr', 'professionnel', false),
    null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:accuse:' || d.id::text, d.entite_id,
    true, false, null::timestamptz, jsonb_build_object('demande', v_dv));
  select * into v_e from public.envois e where e.id = v_envoi;
  update public.reput_demandes x set accuse_envoi = v_envoi, accuse_le = now(), maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.accuse_prepare', 'reput_demandes', d.id::text,
    jsonb_build_object('envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'demande_validation', v_dv,
                       'service_nomme', v_phrase is not null), d.entite_id);
  return jsonb_build_object('demande', d.id, 'envoi', v_envoi, 'envoi_statut', v_e.statut, 'demande_validation', v_dv);
end $function$;


-- ═══ omega/modules/reput/migrations/c3_19_export_date_fixe.sql @ cb3f1c47
-- c3_19 — REPUT : l'export à date fixe (session C3, 19/10/2026)
--
-- Chiffrage #78 (« Chaque tableau s'exporte vers un tableur, à la demande ou à date fixe. ») et #93 (« … avec un export
-- daté ») : à la demande, l'écran fabriquait déjà le CSV (export.ts). À date fixe, désormais :
--   · public.reput_exports_programmes : un programme par organisation (ou par site), hebdomadaire (jour de la semaine,
--     1 = lundi) ou mensuel (jour du mois, 1 à 28), actif ou non, et qui est prévenu (des membres de l'organisation).
--   · public.reput_programmer_export(p_client, p_frequence, p_jour, p_entite, p_destinataires, p_actif) — gérant ou
--     administrateur dont le périmètre couvre le site (toute l'organisation : périmètre complet).
--   · La tâche « reput-exports » (chaque jour à 5 h UTC) fabrique, le jour dit, le fichier de la période échue — les sept
--     jours précédents, ou le mois précédent — dans public.reput_exports (CSV « ; », UTF-8 avec BOM, heures de Paris, mêmes
--     colonnes que l'export à la demande, plus le site). Une période n'est fabriquée qu'une fois.
--   · Les destinataires reçoivent un courriel interne (socle 19as, gabarit fermé « reput.export_pret » : une date, un
--     nombre de lignes) qui mène à l'espace : le FICHIER NE PART JAMAIS PAR COURRIEL ; il se télécharge connecté, par le
--     gérant ou un administrateur du périmètre (RLS de reput_exports).
--
-- Règles de pose : create … if not exists, insert … on conflict do nothing, create or replace ; ni DROP ni DELETE.

create table if not exists public.reput_exports_programmes (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  frequence text not null,
  jour integer not null,
  destinataires uuid[] not null default '{}',
  actif boolean not null default true,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint reput_exports_programmes_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_exports_programmes_frequence_check check (frequence in ('hebdomadaire', 'mensuel')),
  constraint reput_exports_programmes_jour_check check ((frequence = 'hebdomadaire' and jour between 1 and 7)
                                                        or (frequence = 'mensuel' and jour between 1 and 28)),
  constraint reput_exports_programmes_dest_check check (cardinality(destinataires) between 1 and 20)
);
create unique index if not exists reput_exports_programmes_un
  on public.reput_exports_programmes (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.reput_exports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  programme_id uuid not null references public.reput_exports_programmes(id) on delete cascade,
  periode_du date not null,
  periode_au date not null,
  lignes integer not null,
  nom_fichier text not null,
  contenu text not null,
  cree_le timestamptz not null default now(),
  constraint reput_exports_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_exports_une_fois unique (programme_id, periode_du),
  constraint reput_exports_periode_check check (periode_du <= periode_au),
  constraint reput_exports_taille_check check (char_length(contenu) <= 5000000)
);
create index if not exists reput_exports_client_idx on public.reput_exports (client_id, cree_le desc);

-- Le périmètre STRICT d'un export : un site → le périmètre le couvre ; toute l'organisation → périmètre complet
-- (perimetre_couvre du socle tient une entité nulle pour couverte, ce qui ouvrirait le consolidé à un responsable de site).
create or replace function private.reput_couvre_strict(p_user uuid, p_client uuid, p_entite uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case when p_entite is null
              then exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client and c.perimetre_total)
              else private.perimetre_couvre(p_user, p_client, p_entite) end
$function$;

revoke execute on function private.reput_couvre_strict(uuid, uuid, uuid) from public, anon;
grant execute on function private.reput_couvre_strict(uuid, uuid, uuid) to authenticated;

alter table public.reput_exports_programmes enable row level security;
alter table public.reput_exports enable row level security;
revoke all on public.reput_exports_programmes, public.reput_exports from authenticated, anon;
grant select on public.reput_exports_programmes, public.reput_exports to authenticated;
grant all on public.reput_exports_programmes, public.reput_exports to service_role;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_exports_programmes'
                 and policyname = 'dirigeants lisent les exports programmes de leur perimetre') then
    create policy "dirigeants lisent les exports programmes de leur perimetre" on public.reput_exports_programmes
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin'])
             and private.reput_couvre_strict((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_exports'
                 and policyname = 'dirigeants lisent les exports de leur perimetre') then
    create policy "dirigeants lisent les exports de leur perimetre" on public.reput_exports
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.a_un_role(client_id, array['gerant', 'admin'])
             and private.reput_couvre_strict((select auth.uid()), client_id, entite_id));
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
                 select x from unnest(array['reput_exports_programmes', 'reput_exports']) x
                 where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then
      raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
end $do$;

insert into public.gabarits_messages (client_id, module, code, langue, version, canal, libelle, sujet, corps, variables,
                                      transactionnel, donnees_sante, espacement, statut)
values (null, 'reput', 'reput.export_pret', 'fr', 1, 'email',
        'REPUT — l''export programmé est prêt (sans contenu client)',
        'Votre export des demandes clients est prêt — {{organisation}}',
        'Bonjour,' || chr(10) || chr(10)
        || 'L''export programmé des demandes clients de {{organisation}} est prêt : {{nombre}} ligne(s), période échue au {{jour}}.' || chr(10) || chr(10)
        || 'Pour le télécharger : https://omegaai.fr/espace2/reput (onglet « Réglages et avis »)' || chr(10)
        || '(la connexion à votre espace vous est demandée ; le fichier ne part jamais par courriel).' || chr(10) || chr(10)
        || 'REPUT, pour {{organisation}}.',
        '{"jour": "date", "nombre": "nombre"}'::jsonb,
        true, false, false, 'brouillon')
on conflict (client_id, code, langue, version) do nothing;

do $$
declare v_id uuid;
begin
  select g.id into v_id from public.gabarits_messages g
  where g.client_id is null and g.code = 'reput.export_pret' and g.langue = 'fr' and g.version = 1 and g.statut = 'brouillon';
  if v_id is not null then
    set local role service_role;
    perform public.valider_gabarit(v_id, 'C3 — courriel « export prêt », 19/10/2026');
    reset role;
  end if;
end $$;

-- Une cellule CSV (séparateur « ; ») et une heure de Paris, comme export.ts.
create or replace function private.reput_csv(p_v text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when coalesce(p_v, '') ~ '[";\r\n]' then '"' || replace(p_v, '"', '""') || '"' else coalesce(p_v, '') end
$function$;

revoke execute on function private.reput_csv(text) from public, anon, authenticated;

-- Le fichier d'une période : une ligne par demande reçue, dans le périmètre du programme.
create or replace function private.reput_fabriquer_export(p_programme uuid, p_du date, p_au date)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  p public.reput_exports_programmes;
  v_csv text;
  v_n integer;
  v_id uuid;
begin
  select * into p from public.reput_exports_programmes x where x.id = p_programme;
  if p.id is null then return null; end if;
  select count(*)::int,
         string_agg(concat_ws(';',
           private.reput_csv(to_char(d.recu_le at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI')),
           private.reput_csv(d.canal),
           private.reput_csv(coalesce(d.de_nom, d.adresse_reponse, '')),
           private.reput_csv(coalesce(s.libelle, d.sujet, '')),
           private.reput_csv(coalesce(d.langue, '')),
           case when d.urgence then 'oui' else 'non' end,
           case when d.couverte is null then '' when d.couverte then 'oui' else 'non' end,
           private.reput_csv(d.statut),
           private.reput_csv(coalesce(to_char(d.envoyee_le at time zone 'Europe/Paris', 'DD/MM/YYYY HH24:MI'), '')),
           coalesce(greatest(1, round(extract(epoch from (d.envoyee_le - d.recu_le)) / 60))::text, ''),
           case when d.escaladee_le is not null then 'oui' else 'non' end,
           private.reput_csv(coalesce(e.nom, ''))), E'\r\n' order by d.recu_le, d.id)
    into v_n, v_csv
  from public.reput_demandes d
  left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
  left join public.entites e on e.client_id = d.client_id and e.id = d.entite_id
  where d.client_id = p.client_id and (p.entite_id is null or d.entite_id = p.entite_id)
    and (d.recu_le at time zone 'Europe/Paris')::date between p_du and p_au;
  v_csv := chr(65279) || 'Reçue le;Canal;Client;Sujet;Langue;Urgente;Tirée de la base;Statut;Répondue le;Délai de réponse (min);'
           || 'Délai de traitement dépassé;Site' || case when v_n > 0 then E'\r\n' || v_csv else '' end;
  insert into public.reput_exports (client_id, entite_id, programme_id, periode_du, periode_au, lignes, nom_fichier, contenu)
  values (p.client_id, p.entite_id, p.id, p_du, p_au, v_n,
          'reput-demandes-' || to_char(p_du, 'YYYY-MM-DD') || '-au-' || to_char(p_au, 'YYYY-MM-DD') || '.csv', v_csv)
  on conflict (programme_id, periode_du) do nothing
  returning id into v_id;
  return v_id;
end $function$;

revoke execute on function private.reput_fabriquer_export(uuid, date, date) from public, anon, authenticated;

-- Le jour dit : la période échue, fabriquée une fois, puis les destinataires prévenus.
create or replace function private.reput_exports_du_jour(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date := (p_maintenant at time zone 'Europe/Paris')::date;
  p public.reput_exports_programmes;
  v_du date;
  v_au date;
  v_export uuid;
  v_lignes integer;
  m uuid;
  n integer := 0;
begin
  for p in
    select * from public.reput_exports_programmes x
    where x.actif and ((x.frequence = 'hebdomadaire' and extract(isodow from v_jour) = x.jour)
                       or (x.frequence = 'mensuel' and extract(day from v_jour) = x.jour))
    order by x.client_id, x.id
  loop
    if p.frequence = 'hebdomadaire' then
      v_du := v_jour - 7; v_au := v_jour - 1;
    else
      v_du := (date_trunc('month', v_jour) - interval '1 month')::date; v_au := (date_trunc('month', v_jour) - interval '1 day')::date;
    end if;
    v_export := private.reput_fabriquer_export(p.id, v_du, v_au);
    continue when v_export is null;   -- déjà fabriqué pour cette période
    select x.lignes into v_lignes from public.reput_exports x where x.id = v_export;
    perform private.journaliser_module(p.client_id, 'reput', 'reput.export_fabrique', 'reput_exports', v_export::text,
      jsonb_build_object('programme', p.id, 'du', v_du, 'au', v_au, 'lignes', v_lignes), p.entite_id);
    foreach m in array p.destinataires loop
      continue when not exists (select 1 from public.comptes c where c.client_id = p.client_id and c.user_id = m
                                and c.role in ('gerant', 'admin'))
                    or not private.reput_couvre_strict(m, p.client_id, p.entite_id);
      begin
        perform private.envoyer_interne(p.client_id, 'reput', null, null, 'email', m, 'reput.export_pret',
          jsonb_build_object('jour', to_char(v_au, 'YYYY-MM-DD'), 'nombre', v_lignes),
          'reput.export_pret:' || v_export::text || ':' || m::text, p.entite_id);
      exception when others then
        perform private.journaliser_module(p.client_id, 'reput', 'reput.export_echec', 'reput_exports', v_export::text,
          jsonb_build_object('membre', m, 'erreur', left(sqlerrm, 200)), p.entite_id);
      end;
    end loop;
    n := n + 1;
  end loop;
  return n;
end $function$;

revoke execute on function private.reput_exports_du_jour(timestamptz) from public, anon, authenticated;

create or replace function public.reput_programmer_export(p_client uuid, p_frequence text, p_jour integer, p_entite uuid default null,
                                                          p_destinataires uuid[] default null, p_actif boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := (select auth.uid());
  v_dest uuid[] := coalesce(p_destinataires, array[v_uid]);
  v_id uuid;
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'L''export programmé se règle par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_entite is null then
    if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.perimetre_total) then
      raise exception 'L''export de toute l''organisation demande un périmètre complet.' using errcode = '42501';
    end if;
  elsif not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  elsif not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(v_dest) m
             where not exists (select 1 from public.comptes c where c.client_id = p_client and c.user_id = m and c.role in ('gerant', 'admin'))
                or not private.reput_couvre_strict(m, p_client, p_entite)) then
    raise exception 'Les destinataires sont des gérants ou administrateurs dont le périmètre couvre l''export.' using errcode = '22023';
  end if;
  insert into public.reput_exports_programmes (client_id, entite_id, frequence, jour, destinataires, actif, cree_par)
  values (p_client, p_entite, p_frequence, p_jour, v_dest, coalesce(p_actif, true), v_uid)
  on conflict (client_id, coalesce(entite_id, '00000000-0000-0000-0000-000000000000'::uuid)) do update
    set frequence = excluded.frequence, jour = excluded.jour, destinataires = excluded.destinataires, actif = excluded.actif, maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(p_client, 'reput', 'reput.export_programme', 'reput_exports_programmes', v_id::text,
    jsonb_build_object('frequence', p_frequence, 'jour', p_jour, 'entite', p_entite, 'destinataires', cardinality(v_dest),
                       'actif', coalesce(p_actif, true), 'par', v_uid), p_entite);
  return jsonb_build_object('programme', v_id, 'frequence', p_frequence, 'jour', p_jour, 'actif', coalesce(p_actif, true));
end $function$;

revoke execute on function public.reput_programmer_export(uuid, text, integer, uuid, uuid[], boolean) from public, anon;
grant execute on function public.reput_programmer_export(uuid, text, integer, uuid, uuid[], boolean) to authenticated, service_role;

-- La tâche : chaque jour à 5 h UTC (6 h ou 7 h à Paris) ; rejouable.
select cron.schedule('reput-exports', '0 5 * * *', $cron$select private.reput_exports_du_jour()$cron$);


-- ═══ omega/modules/reput/migrations/c3_20_precision_sans_texte.sql @ cb3f1c47
-- c3_20 — REPUT : la précision demandée quand il n'y a qu'une pièce, sans texte — côté base (session C3, 19/10/2026)
--
-- Chiffrage #84 (« La pièce est conservée et rattachée au dossier. Le système demande la précision qui manque… ») : la règle
-- vivait dans l'ouvrier (rediger.ts sansTexte, 11/10), qui n'est pas redéployé et qui attend l'IA pour tourner (clé, plafond,
-- crédit). Elle passe dans la base, où elle ne dépend plus de rien :
--   · public.reput_commencer (repris de c3_07) : une demande dont la réception porte au moins une pièce, dont ni le texte ni
--     l'objet ne « parlent » (aucun mot de trois lettres hors des noms de fichier : img, dsc, jpg, photo, scan, pièce,
--     jointe… ; « Envoyé de mon iPhone » et pareilles signatures automatiques ne comptent pas), et qui n'a pas de message précédent dans son dossier, reçoit aussitôt la réponse de précision (texte fixe,
--     le même que l'ouvrier), sujet « autre », hors base, donc relue avant envoi. Coût nul, aucun appel au modèle.
--   · L'ouvrier reçoit « preparee » au lieu de « a_preparer » et clôt le travail sans appeler l'IA.
--   · Un message qui parle, ou qui suit un message du même dossier, suit le chemin habituel.
--
-- Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_parle(p_texte text)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  select exists (
    select 1 from regexp_matches(
      regexp_replace(lower(coalesce(p_texte, '')),
                     '(envoy[ée] (de|depuis) mon|sent from my|get outlook for|téléchargez outlook pour)[^\n]*', ' ', 'g'),
      '[a-zà-öø-ÿœæ]{3,}', 'g') as m
    where not (m[1] = any (array['img', 'dsc', 'dcim', 'jpg', 'jpeg', 'png', 'heic', 'pdf', 'photo', 'photos', 'image', 'images',
                                 'scan', 'pic', 'fwd', 'pièce', 'jointe'])))
$function$;

revoke execute on function private.reput_parle(text) from public, anon, authenticated;

create or replace function private.reput_corps_precision()
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select 'Merci pour votre message. Nous avons bien reçu votre pièce jointe, rattachée à votre demande, mais sans précision sur ce que vous souhaitez : pouvez-vous nous l''écrire en quelques mots ? Nous pourrons alors vous répondre.'::text
$function$;

revoke execute on function private.reput_corps_precision() from public, anon, authenticated;

create or replace function public.reput_commencer(p_reception bigint)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.receptions;
  d public.reput_demandes;
  v_base jsonb;
  v_rep jsonb;
  v_precedents jsonb;
  v_n integer;
  v_depot jsonb;
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  select * into r from public.receptions x where x.id = p_reception;
  if r.id is null then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réception introuvable');
  end if;
  if r.module is distinct from 'reput' then
    return jsonb_build_object('statut', 'ignore', 'motif', format('réception du module %s', coalesce(r.module, 'aucun')));
  end if;
  if r.statut in ('ignoree', 'indesirable') then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réception ' || r.statut);
  end if;
  perform private.reput_installer(r.client_id, null);
  v_base := private.reput_base(r.client_id, r.entite_id, now());
  if not coalesce((v_base -> 'reglages' ->> 'actif')::boolean, false) then
    return jsonb_build_object('statut', 'ignore', 'motif', 'réponses désactivées dans les réglages');
  end if;
  v_rep := private.reput_canal_reponse(r);
  insert into public.reput_demandes (client_id, entite_id, reception_id, canal, canal_reponse, adresse_reponse, de_nom, objet, recu_le, langue,
                                     de_empreinte, litige, cles_contact)
  values (r.client_id, r.entite_id, r.id, r.canal, v_rep ->> 'canal', v_rep ->> 'adresse', left(r.de_nom, 200), left(r.sujet, 300),
          r.recu_le, case when r.langue ~ '^[a-z]{2}$' then r.langue end,
          r.de_empreinte, private.reput_en_litige(r.client_id, coalesce(v_rep ->> 'adresse', r.de_adresse)),
          private.reput_cles_contact(r.canal, r.de_adresse, r.detail))
  on conflict (client_id, reception_id) do nothing
  returning * into d;
  if d.id is null then
    select * into d from public.reput_demandes x where x.client_id = r.client_id and x.reception_id = r.id;
    if d.statut <> 'a_preparer' then
      return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
    end if;
  else
    -- c3_07 : la même personne sur un autre canal (ou le même) dans les sept jours → le même dossier.
    update public.reput_demandes x set dossier_id = coalesce(private.reput_dossier_de(d.client_id, d.id, d.cles_contact, d.recu_le), d.id)
    where x.id = d.id returning * into d;
    perform private.journaliser_module(r.client_id, 'reput', 'reput.demande_recue', 'reput_demandes', d.id::text,
      jsonb_build_object('reception', r.id, 'canal', r.canal, 'canal_reponse', d.canal_reponse), r.entite_id);
  end if;
  v_precedents := private.reput_precedents(d.client_id, d.dossier_id, d.id);
  -- c3_20 : une pièce sans un mot, sans message précédent → la précision est demandée ici, sans modèle ni coût ; elle
  -- attend la validation comme toute réponse hors base. L'ouvrier reçoit « preparee » et n'appelle pas l'IA.
  v_n := case when jsonb_typeof(r.pieces) = 'array' then jsonb_array_length(r.pieces) else 0 end;
  if v_n > 0 and not private.reput_parle(r.corps) and not private.reput_parle(r.sujet) and jsonb_array_length(v_precedents) = 0 then
    v_depot := public.reput_deposer_reponse(d.id, jsonb_build_object(
      'sujet', 'autre', 'langue', 'fr', 'urgence', false, 'couverte', false, 'sources', '[]'::jsonb,
      'corps', private.reput_corps_precision(),
      'raison', format('Message sans texte (%s pièce%s jointe%s) : précision demandée au client.', v_n,
                       case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end),
      'modele', 'regle:sans_texte', 'tokens_entree', 0, 'tokens_sortie', 0, 'cout_eur', 0), 'c3_20/sans_texte');
    return jsonb_build_object('statut', 'preparee', 'demande', d.id, 'motif', 'précision demandée sans modèle (pièce sans texte)',
                              'reponse', v_depot ->> 'reponse', 'envoi_statut', v_depot ->> 'envoi_statut');
  end if;
  return jsonb_build_object(
    'statut', 'a_preparer',
    'demande', d.id,
    'client', r.client_id,
    'reception', jsonb_build_object('id', r.id, 'canal', r.canal, 'de_nom', r.de_nom, 'sujet', left(r.sujet, 300),
                                    'corps', left(coalesce(r.corps, ''), 8000), 'langue', r.langue, 'recu_le', r.recu_le,
                                    'pieces', jsonb_array_length(coalesce(r.pieces, '[]'::jsonb)),
                                    'en_reponse_a', r.en_reponse_a is not null),
    'canal_reponse', d.canal_reponse,
    -- c3_06 : le client reconnu à son adresse (ses demandes précédentes, sans leur texte) et son litige éventuel.
    'client_connu', private.reput_historique(d.client_id, d.de_empreinte, d.id),
    'litige', d.litige,
    -- c3_07 : les messages précédents du même dossier, pour une seule réponse qui couvre tout.
    'precedents', v_precedents,
    'base', v_base);
end $function$;


-- ═══ omega/modules/reput/migrations/c3_21_rendez_vous.sql @ cb3f1c47
-- c3_21 — REPUT : le bloc rendez-vous côté base — créneaux, durée par type, rappel, replanification — SANS agenda externe
-- (session C3, 19/10/2026)
--
-- Chiffrage #27, #30, #81 (décision de Teo du 17/10 : K:122 = transmission au service qui tient le planning, pas d'agenda
-- branché). Ce lot donne à ce service un planning DANS la base, sans connecteur agenda :
--   · public.reput_rdv_types : les types de rendez-vous de l'organisation (code, libellé, DURÉE en minutes, délai du RAPPEL
--     en heures, service qui les tient) — porte reput_regler_type_rdv (gérant, administrateur).
--   · public.reput_rdv_plages : les heures d'ouverture au rendez-vous, par jour de la semaine, pour l'organisation ou un site,
--     éventuellement pour un seul type ; public.reput_rdv_fermetures : congés, fermetures — portes reput_regler_plages et
--     reput_fermer (gérant, administrateur du périmètre). Une plage n'est jamais effacée : elle est désactivée.
--   · public.reput_creneaux_libres(p_client, p_entite, p_type, p_du, p_nombre) : les prochains créneaux LIBRES (plages, moins
--     fermetures, moins rendez-vous posés, à partir d'une heure d'ici), heure du site.
--   · public.reput_rdv : les rendez-vous. reput_poser_rdv (une personne qui traite les demandes, sur son périmètre) pose un
--     créneau libre ; s'il vient d'être pris, rien n'est posé et les SUIVANTS sont rendus (« le second client se voit
--     proposer les suivants »). Deux rendez-vous ne se chevauchent jamais sur un même planning (verrou par planning).
--     reput_replanifier_rdv (l'ancien passe « replanifie », le nouveau le remplace) et reput_annuler_rdv.
--   · LE RAPPEL : la tâche « reput-rdv-rappels » (chaque quart d'heure) prépare, au délai du type avant l'heure, un message
--     au client sur le canal de la demande (sous la signature des réglages du site) — par la préparation d'envoi du socle,
--     donc relu ou couvert par un accord « reput.rappel_rdv », comme l'accusé. Rien ne part pour de vrai en mode essai.
-- Aucune écriture dans un agenda : le connecteur agenda reste hors de ce lot.
--
-- Règles de pose : create … if not exists, create or replace ; ni DROP ni DELETE.

create table if not exists public.reput_rdv_types (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  code text not null,
  libelle text not null,
  duree_minutes integer not null default 30,
  rappel_heures integer not null default 24,
  equipe_id uuid,
  actif boolean not null default true,
  maj_le timestamptz not null default now(),
  constraint reput_rdv_types_code_key unique (client_id, code),
  constraint reput_rdv_types_code_check check (code ~ '^[a-z][a-z0-9_]{1,39}$'),
  constraint reput_rdv_types_libelle_check check (char_length(btrim(libelle)) between 1 and 120),
  constraint reput_rdv_types_duree_check check (duree_minutes between 5 and 480),
  constraint reput_rdv_types_rappel_check check (rappel_heures between 0 and 168)
);

create table if not exists public.reput_rdv_plages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  jour integer not null,
  debut time not null,
  fin time not null,
  type_code text,
  actif boolean not null default true,
  cree_le timestamptz not null default now(),
  constraint reput_rdv_plages_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_rdv_plages_jour_check check (jour between 1 and 7),
  constraint reput_rdv_plages_heures_check check (debut < fin)
);
create index if not exists reput_rdv_plages_idx on public.reput_rdv_plages (client_id, entite_id, jour) where actif;

create table if not exists public.reput_rdv_fermetures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  du timestamptz not null,
  au timestamptz not null,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  constraint reput_rdv_fermetures_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_rdv_fermetures_periode_check check (du < au),
  constraint reput_rdv_fermetures_motif_check check (motif is null or char_length(motif) <= 200)
);

create table if not exists public.reput_rdv (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  entite_id uuid,
  demande_id uuid references public.reput_demandes(id) on delete set null,
  type_code text not null,
  debut timestamptz not null,
  fin timestamptz not null,
  statut text not null default 'confirme',
  client_nom text,
  canal text,
  adresse text,
  rappel_le timestamptz,
  rappel_envoi uuid references public.envois(id) on delete set null,
  remplace uuid references public.reput_rdv(id) on delete set null,
  motif text,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  maj_le timestamptz not null default now(),
  constraint reput_rdv_entite_fkey foreign key (client_id, entite_id) references public.entites(client_id, id) on delete cascade,
  constraint reput_rdv_statut_check check (statut in ('confirme', 'replanifie', 'annule', 'honore', 'absent')),
  constraint reput_rdv_periode_check check (debut < fin),
  constraint reput_rdv_canal_check check ((canal is null) = (adresse is null) and (canal is null or canal in ('email', 'whatsapp', 'sms'))),
  constraint reput_rdv_textes_check check ((client_nom is null or char_length(client_nom) <= 200) and (motif is null or char_length(motif) <= 500))
);
create index if not exists reput_rdv_planning_idx on public.reput_rdv (client_id, entite_id, debut) where statut = 'confirme';
create index if not exists reput_rdv_rappel_idx on public.reput_rdv (rappel_le) where statut = 'confirme' and rappel_envoi is null;

alter table public.reput_rdv_types enable row level security;
alter table public.reput_rdv_plages enable row level security;
alter table public.reput_rdv_fermetures enable row level security;
alter table public.reput_rdv enable row level security;
revoke all on public.reput_rdv_types, public.reput_rdv_plages, public.reput_rdv_fermetures, public.reput_rdv from authenticated, anon;
grant select on public.reput_rdv_types, public.reput_rdv_plages, public.reput_rdv_fermetures, public.reput_rdv to authenticated;
grant all on public.reput_rdv_types, public.reput_rdv_plages, public.reput_rdv_fermetures, public.reput_rdv to service_role;

do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv_types' and policyname = 'membres lisent les types de rendez-vous') then
    create policy "membres lisent les types de rendez-vous" on public.reput_rdv_types for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv_plages' and policyname = 'membres lisent les plages de leur perimetre') then
    create policy "membres lisent les plages de leur perimetre" on public.reput_rdv_plages for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv_fermetures' and policyname = 'membres lisent les fermetures de leur perimetre') then
    create policy "membres lisent les fermetures de leur perimetre" on public.reput_rdv_fermetures for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'reput_rdv' and policyname = 'membres lisent les rendez-vous de leur perimetre') then
    create policy "membres lisent les rendez-vous de leur perimetre" on public.reput_rdv for select to authenticated
      using (client_id in (select private.mes_clients()) and private.perimetre_couvre((select auth.uid()), client_id, entite_id));
  end if;
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom)
                 select x from unnest(array['reput_rdv_types', 'reput_rdv_plages', 'reput_rdv_fermetures', 'reput_rdv']) x
                 where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then
      raise notice 'tables_locataires : %', sqlerrm;
    end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Aides
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_fuseau(p_client uuid, p_entite uuid)
 returns text
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce((select e.fuseau from public.entites e where e.client_id = p_client and e.id = p_entite),
                  (select e.fuseau from public.entites e where e.client_id = p_client and e.principale), 'Europe/Paris')
$function$;

revoke execute on function private.reput_fuseau(uuid, uuid) from public, anon, authenticated;

-- Dirige le planning d'un site (gérant, administrateur, périmètre strict : toute l'organisation = périmètre complet).
create or replace function private.reput_dirige_planning(p_client uuid, p_entite uuid)
 returns void
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin']) then
    raise exception 'Le planning des rendez-vous se règle par le gérant ou un administrateur.' using errcode = '42501';
  end if;
  if p_entite is null then
    if not exists (select 1 from public.comptes c where c.user_id = v_uid and c.client_id = p_client and c.perimetre_total) then
      raise exception 'Le planning de toute l''organisation demande un périmètre complet.' using errcode = '42501';
    end if;
  elsif not exists (select 1 from public.entites e where e.client_id = p_client and e.id = p_entite) then
    raise exception 'Entité introuvable dans cette organisation.' using errcode = '22023';
  elsif not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Cette entité n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
end $function$;

revoke execute on function private.reput_dirige_planning(uuid, uuid) from public, anon, authenticated;

-- Traite les rendez-vous d'un site : une personne qui traite les demandes (pas un lecteur), sur son périmètre.
create or replace function private.reput_tient_planning(p_client uuid, p_entite uuid)
 returns void
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare v_uid uuid := (select auth.uid());
begin
  if v_uid is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur', 'collaborateur'])
     or not private.perimetre_couvre(v_uid, p_client, p_entite) then
    raise exception 'Les rendez-vous se posent par une personne qui traite les demandes de ce site.' using errcode = '42501';
  end if;
end $function$;

revoke execute on function private.reput_tient_planning(uuid, uuid) from public, anon, authenticated;

-- Les créneaux libres : plages actives du jour (pour ce type ou tous), au pas de la durée, à partir d'une heure d'ici,
-- hors fermetures et hors rendez-vous confirmés du même planning (organisation ou site).
create or replace function private.reput_creneaux(p_client uuid, p_entite uuid, p_type text, p_du timestamptz, p_nombre integer,
                                                  p_sauf uuid default null)
 returns table (debut timestamptz, fin timestamptz)
 language sql
 stable security definer
 set search_path to ''
as $function$
  with t as (select x.duree_minutes from public.reput_rdv_types x where x.client_id = p_client and x.code = p_type and x.actif),
  fz as (select private.reput_fuseau(p_client, p_entite) as fz),
  jours as (
    select ((greatest(p_du, now()) at time zone fz.fz)::date + g) as j
    from fz, generate_series(0, 62) g
  ),
  candidats as (
    select ((j.j + pl.debut) + make_interval(mins => t.duree_minutes * k)) at time zone fz.fz as debut,
           ((j.j + pl.debut) + make_interval(mins => t.duree_minutes * (k + 1))) at time zone fz.fz as fin
    from t, fz, jours j
    join public.reput_rdv_plages pl on pl.client_id = p_client and pl.entite_id is not distinct from p_entite and pl.actif
      and pl.jour = extract(isodow from j.j) and (pl.type_code is null or pl.type_code = p_type)
    cross join lateral generate_series(0, greatest(0, (extract(epoch from (pl.fin - pl.debut)) / 60)::int / t.duree_minutes - 1)) k
    where (pl.debut + make_interval(mins => t.duree_minutes * (k + 1))) <= pl.fin
  )
  select distinct c.debut, c.fin
  from candidats c
  where c.debut >= greatest(p_du, now() + interval '1 hour')
    and not exists (select 1 from public.reput_rdv_fermetures f where f.client_id = p_client and f.entite_id is not distinct from p_entite
                    and f.du < c.fin and f.au > c.debut)
    and not exists (select 1 from public.reput_rdv r where r.client_id = p_client and r.entite_id is not distinct from p_entite
                    and r.statut = 'confirme' and r.id is distinct from p_sauf and r.debut < c.fin and r.fin > c.debut)
  order by c.debut
  limit greatest(1, least(coalesce(p_nombre, 5), 50))
$function$;

revoke execute on function private.reput_creneaux(uuid, uuid, text, timestamptz, integer, uuid) from public, anon, authenticated;

create or replace function private.reput_creneaux_json(p_client uuid, p_entite uuid, p_type text, p_du timestamptz, p_nombre integer,
                                                       p_sauf uuid default null)
 returns jsonb
 language sql
 stable security definer
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object('debut', c.debut, 'fin', c.fin) order by c.debut), '[]'::jsonb)
  from private.reput_creneaux(p_client, p_entite, p_type, p_du, p_nombre, p_sauf) c
$function$;

revoke execute on function private.reput_creneaux_json(uuid, uuid, text, timestamptz, integer, uuid) from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- Régler le planning
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_regler_type_rdv(p_client uuid, p_code text, p_libelle text, p_duree_minutes integer,
                                                        p_rappel_heures integer default 24, p_equipe uuid default null,
                                                        p_actif boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_code text := lower(btrim(coalesce(p_code, '')));
begin
  perform private.reput_dirige_planning(p_client, null);
  if p_equipe is not null and not exists (select 1 from public.equipes e where e.client_id = p_client and e.id = p_equipe) then
    raise exception 'Équipe introuvable dans cette organisation.' using errcode = '22023';
  end if;
  insert into public.reput_rdv_types (client_id, code, libelle, duree_minutes, rappel_heures, equipe_id, actif)
  values (p_client, v_code, btrim(p_libelle), p_duree_minutes, coalesce(p_rappel_heures, 24), p_equipe, coalesce(p_actif, true))
  on conflict (client_id, code) do update set libelle = excluded.libelle, duree_minutes = excluded.duree_minutes,
    rappel_heures = excluded.rappel_heures, equipe_id = excluded.equipe_id, actif = excluded.actif, maj_le = now()
  returning id into v_id;
  perform private.journaliser_module(p_client, 'reput', 'reput.rdv_type_regle', 'reput_rdv_types', v_id::text,
    jsonb_build_object('code', v_code, 'duree', p_duree_minutes, 'rappel', p_rappel_heures, 'actif', coalesce(p_actif, true)), null);
  return jsonb_build_object('type', v_id, 'code', v_code);
end $function$;

revoke execute on function public.reput_regler_type_rdv(uuid, text, text, integer, integer, uuid, boolean) from public, anon;
grant execute on function public.reput_regler_type_rdv(uuid, text, text, integer, integer, uuid, boolean) to authenticated, service_role;

-- Les plages d'un planning, remplacées d'un coup : les anciennes sont désactivées, jamais effacées.
-- p_plages : [{"jour": 1, "debut": "09:00", "fin": "12:00", "type": null}, …]
create or replace function public.reput_regler_plages(p_client uuid, p_entite uuid, p_plages jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare x jsonb; n integer := 0;
begin
  perform private.reput_dirige_planning(p_client, p_entite);
  if p_plages is null or jsonb_typeof(p_plages) <> 'array' or jsonb_array_length(p_plages) > 70 then
    raise exception 'Les plages forment une liste (70 au plus).' using errcode = '22023';
  end if;
  update public.reput_rdv_plages pl set actif = false
  where pl.client_id = p_client and pl.entite_id is not distinct from p_entite and pl.actif;
  for x in select * from jsonb_array_elements(p_plages) loop
    if nullif(x ->> 'type', '') is not null
       and not exists (select 1 from public.reput_rdv_types t where t.client_id = p_client and t.code = x ->> 'type') then
      raise exception 'Type de rendez-vous inconnu : %.', x ->> 'type' using errcode = '22023';
    end if;
    insert into public.reput_rdv_plages (client_id, entite_id, jour, debut, fin, type_code)
    values (p_client, p_entite, (x ->> 'jour')::int, (x ->> 'debut')::time, (x ->> 'fin')::time, nullif(x ->> 'type', ''));
    n := n + 1;
  end loop;
  perform private.journaliser_module(p_client, 'reput', 'reput.rdv_plages_reglees', 'clients', p_client::text,
    jsonb_build_object('entite', p_entite, 'plages', n), p_entite);
  return jsonb_build_object('entite', p_entite, 'plages', n);
end $function$;

revoke execute on function public.reput_regler_plages(uuid, uuid, jsonb) from public, anon;
grant execute on function public.reput_regler_plages(uuid, uuid, jsonb) to authenticated, service_role;

create or replace function public.reput_fermer(p_client uuid, p_entite uuid, p_du timestamptz, p_au timestamptz, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_id uuid; v_touches integer;
begin
  perform private.reput_dirige_planning(p_client, p_entite);
  insert into public.reput_rdv_fermetures (client_id, entite_id, du, au, motif, cree_par)
  values (p_client, p_entite, p_du, p_au, nullif(btrim(p_motif), ''), (select auth.uid()))
  returning id into v_id;
  select count(*)::int into v_touches from public.reput_rdv r
  where r.client_id = p_client and r.entite_id is not distinct from p_entite and r.statut = 'confirme' and r.debut < p_au and r.fin > p_du;
  perform private.journaliser_module(p_client, 'reput', 'reput.rdv_fermeture', 'reput_rdv_fermetures', v_id::text,
    jsonb_build_object('entite', p_entite, 'du', p_du, 'au', p_au, 'rdv_a_replanifier', v_touches), p_entite);
  -- Les rendez-vous déjà posés dans la fermeture ne bougent pas seuls : ils sont dits, une personne les replanifie.
  return jsonb_build_object('fermeture', v_id, 'rdv_a_replanifier', v_touches);
end $function$;

revoke execute on function public.reput_fermer(uuid, uuid, timestamptz, timestamptz, text) from public, anon;
grant execute on function public.reput_fermer(uuid, uuid, timestamptz, timestamptz, text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Les créneaux, les rendez-vous
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.reput_creneaux_libres(p_client uuid, p_entite uuid, p_type text, p_du timestamptz default null,
                                                        p_nombre integer default 5)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if not private.reput_est_serveur() then
    if (select auth.uid()) is null or p_client not in (select private.mes_clients())
       or not private.perimetre_couvre((select auth.uid()), p_client, p_entite) then
      raise exception 'Ce planning n''est pas dans votre périmètre.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.reput_rdv_types t where t.client_id = p_client and t.code = p_type and t.actif) then
    raise exception 'Type de rendez-vous inconnu ou inactif : %.', p_type using errcode = '22023';
  end if;
  return jsonb_build_object('type', p_type, 'entite', p_entite, 'fuseau', private.reput_fuseau(p_client, p_entite),
                            'creneaux', private.reput_creneaux_json(p_client, p_entite, p_type, coalesce(p_du, now()), p_nombre));
end $function$;

revoke execute on function public.reput_creneaux_libres(uuid, uuid, text, timestamptz, integer) from public, anon;
grant execute on function public.reput_creneaux_libres(uuid, uuid, text, timestamptz, integer) to authenticated, service_role;

-- Pose un rendez-vous sur un créneau libre (verrou par planning) ; pris entre-temps → rien n'est posé, les suivants sont rendus.
create or replace function private.reput_poser(p_client uuid, p_entite uuid, p_type text, p_debut timestamptz, p_demande uuid,
                                               p_nom text, p_canal text, p_adresse text, p_remplace uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.reput_rdv_types;
  v_id uuid;
begin
  select * into t from public.reput_rdv_types x where x.client_id = p_client and x.code = p_type and x.actif;
  if t.id is null then
    raise exception 'Type de rendez-vous inconnu ou inactif : %.', p_type using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('reput_rdv:' || p_client::text || ':' || coalesce(p_entite::text, '-'), 0));
  if not exists (select 1 from private.reput_creneaux(p_client, p_entite, p_type, p_debut, 1, p_remplace) c where c.debut = p_debut) then
    return jsonb_build_object('pose', false, 'motif', 'Ce créneau n''est pas libre (pris entre-temps, fermé ou hors des plages).',
                              'suivants', private.reput_creneaux_json(p_client, p_entite, p_type, p_debut, 3, p_remplace));
  end if;
  insert into public.reput_rdv (client_id, entite_id, demande_id, type_code, debut, fin, client_nom, canal, adresse, rappel_le, remplace, cree_par)
  values (p_client, p_entite, p_demande, p_type, p_debut, p_debut + make_interval(mins => t.duree_minutes), left(nullif(btrim(p_nom), ''), 200),
          p_canal, nullif(btrim(p_adresse), ''),
          case when t.rappel_heures > 0 then p_debut - make_interval(hours => t.rappel_heures) end, p_remplace, (select auth.uid()))
  returning id into v_id;
  return jsonb_build_object('pose', true, 'rdv', v_id, 'debut', p_debut, 'fin', p_debut + make_interval(mins => t.duree_minutes));
end $function$;

revoke execute on function private.reput_poser(uuid, uuid, text, timestamptz, uuid, text, text, text, uuid) from public, anon, authenticated;

create or replace function public.reput_poser_rdv(p_client uuid, p_entite uuid, p_type text, p_debut timestamptz,
                                                  p_demande uuid default null, p_nom text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  v_j jsonb;
begin
  perform private.reput_tient_planning(p_client, p_entite);
  if p_demande is not null then
    d := private.reput_demande_lue(p_demande);
    if d.client_id <> p_client then
      raise exception 'Cette demande n''est pas de cette organisation.' using errcode = '22023';
    end if;
  end if;
  v_j := private.reput_poser(p_client, p_entite, p_type, p_debut, d.id, coalesce(nullif(btrim(p_nom), ''), d.de_nom),
                             d.canal_reponse, d.adresse_reponse, null);
  if (v_j ->> 'pose')::boolean then
    perform private.journaliser_module(p_client, 'reput', 'reput.rdv_pose', 'reput_rdv', v_j ->> 'rdv',
      jsonb_build_object('type', p_type, 'debut', p_debut, 'demande', d.id, 'par', (select auth.uid())), p_entite);
  end if;
  return v_j;
end $function$;

revoke execute on function public.reput_poser_rdv(uuid, uuid, text, timestamptz, uuid, text) from public, anon;
grant execute on function public.reput_poser_rdv(uuid, uuid, text, timestamptz, uuid, text) to authenticated, service_role;

create or replace function public.reput_replanifier_rdv(p_rdv uuid, p_debut timestamptz, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.reput_rdv;
  v_j jsonb;
begin
  select * into r from public.reput_rdv x where x.id = p_rdv for update;
  if r.id is null then
    raise exception 'Rendez-vous introuvable.' using errcode = 'P0002';
  end if;
  perform private.reput_tient_planning(r.client_id, r.entite_id);
  if r.statut <> 'confirme' then
    raise exception 'Seul un rendez-vous confirmé se replanifie.' using errcode = '22023';
  end if;
  v_j := private.reput_poser(r.client_id, r.entite_id, r.type_code, p_debut, r.demande_id, r.client_nom, r.canal, r.adresse, r.id);
  if (v_j ->> 'pose')::boolean then
    update public.reput_rdv x set statut = 'replanifie', motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now() where x.id = r.id;
    perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_replanifie', 'reput_rdv', r.id::text,
      jsonb_build_object('nouveau', v_j ->> 'rdv', 'avant', r.debut, 'apres', p_debut, 'par', (select auth.uid())), r.entite_id);
  end if;
  return v_j;
end $function$;

revoke execute on function public.reput_replanifier_rdv(uuid, timestamptz, text) from public, anon;
grant execute on function public.reput_replanifier_rdv(uuid, timestamptz, text) to authenticated, service_role;

create or replace function public.reput_annuler_rdv(p_rdv uuid, p_motif text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r public.reput_rdv;
begin
  select * into r from public.reput_rdv x where x.id = p_rdv for update;
  if r.id is null then
    raise exception 'Rendez-vous introuvable.' using errcode = 'P0002';
  end if;
  perform private.reput_tient_planning(r.client_id, r.entite_id);
  if r.statut <> 'confirme' then
    return jsonb_build_object('rdv', r.id, 'annule', false, 'statut', r.statut);
  end if;
  update public.reput_rdv x set statut = 'annule', motif = left(nullif(btrim(p_motif), ''), 500), maj_le = now() where x.id = r.id;
  perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_annule', 'reput_rdv', r.id::text,
    jsonb_build_object('debut', r.debut, 'par', (select auth.uid())), r.entite_id);
  return jsonb_build_object('rdv', r.id, 'annule', true);
end $function$;

revoke execute on function public.reput_annuler_rdv(uuid, text) from public, anon;
grant execute on function public.reput_annuler_rdv(uuid, text) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- Le rappel
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.reput_rappeler_rdv(p_maintenant timestamptz default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r record;
  g public.reput_reglages;
  v_fz text;
  v_corps text;
  v_objet text;
  v_dv uuid;
  v_envoi uuid;
  n integer := 0;
begin
  for r in
    select x.*, t.libelle, coalesce(e.nom, c.nom) as lieu
    from public.reput_rdv x
    join public.reput_rdv_types t on t.client_id = x.client_id and t.code = x.type_code
    join public.clients c on c.id = x.client_id
    left join public.entites e on e.client_id = x.client_id and e.id = x.entite_id
    where x.statut = 'confirme' and x.rappel_envoi is null and x.rappel_le is not null and x.rappel_le <= p_maintenant
      and x.debut > p_maintenant and x.canal is not null
    order by x.rappel_le
    limit 200
  loop
    select * into g from public.reput_reglages rg
    where rg.client_id = r.client_id and (rg.entite_id = r.entite_id or rg.entite_id is null)
    order by (rg.entite_id is not null) desc limit 1;
    continue when g.id is null or not g.actif;
    v_fz := private.reput_fuseau(r.client_id, r.entite_id);
    v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''),
      format('Nous vous rappelons votre rendez-vous « %s » le %s à %s (%s). Pour le déplacer ou l''annuler, il suffit de répondre à ce message.',
             r.libelle, to_char(r.debut at time zone v_fz, 'DD/MM/YYYY'), replace(to_char(r.debut at time zone v_fz, 'HH24:MI'), ':', ' h '),
             r.lieu),
      concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')),
      nullif(btrim(g.mention_automatisee), ''));
    v_objet := case when r.canal = 'email' then left('Rappel : votre rendez-vous du ' || to_char(r.debut at time zone v_fz, 'DD/MM/YYYY'), 300) end;
    begin
      insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                              echeance, cle_idempotence)
      values (r.client_id, r.entite_id, 'reput', 'reput.rappel_rdv', 'reput_rdv', r.id::text,
              left('Rappel de rendez-vous à ' || coalesce(r.client_nom, r.adresse), 500),
              jsonb_build_object('rdv', r.id, 'canal', r.canal, 'objet', v_objet, 'corps', v_corps),
              r.debut, 'reput:rappel_rdv:' || r.id::text)
      returning id into v_dv;
      v_envoi := private.preparer_envoi(r.client_id, 'reput', 'reput_rdv', r.id::text, r.canal,
        jsonb_build_object('adresse', r.adresse, 'nom', r.client_nom, 'langue', 'fr', 'professionnel', false),
        null, '{}'::jsonb, v_objet, v_corps, null::uuid[], 'reput:rappel_rdv:' || r.id::text, r.entite_id,
        true, false, r.debut, jsonb_build_object('demande', v_dv));
      update public.reput_rdv x set rappel_envoi = v_envoi, maj_le = now() where x.id = r.id;
      perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_rappel_prepare', 'reput_rdv', r.id::text,
        jsonb_build_object('envoi', v_envoi, 'demande_validation', v_dv), r.entite_id);
      n := n + 1;
    exception when others then
      perform private.journaliser_module(r.client_id, 'reput', 'reput.rdv_rappel_echec', 'reput_rdv', r.id::text,
        jsonb_build_object('erreur', left(sqlerrm, 200)), r.entite_id);
    end;
  end loop;
  return n;
end $function$;

revoke execute on function private.reput_rappeler_rdv(timestamptz) from public, anon, authenticated;

-- La tâche : chaque quart d'heure ; rejouable.
select cron.schedule('reput-rdv-rappels', '*/15 * * * *', $cron$select private.reput_rappeler_rdv()$cron$);
