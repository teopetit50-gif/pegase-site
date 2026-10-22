-- 20261011135527 c4_10_regles_et_garde_fous
-- Source : dépôt : 834b839a omega/modules/offload/migrations/c4_10_regles_et_garde_fous.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c4_10_regles_et_garde_fous.sql @ 834b839a.
-- ═══ omega/modules/offload/migrations/c4_10_regles_et_garde_fous.sql @ 834b839a
-- c4_10 — OFFLOAD : règles en français, coupe-circuit, réponses automatiques, raison sociale mère (session C4, 11/10/2026)
--
-- CE QUE ÇA POSE (lib/produits/capacites/reprise.ts, lignes partielles 11, 38, 6, et le cas tordu « réponse
-- d'absence ») :
--   · Ligne 11 — « Les règles de ton et de contenu s'écrivent en français, sans case à cocher » :
--     public.offload_regles. Le client écrit une phrase ; private.offload_interpreter_regle la lit (lecture
--     déterministe, sans modèle de langue) et répond en une phrase ce qu'il en fera, ou qu'il ne l'a pas comprise.
--     Familles comprises : mot ou sujet interdit (« n'utilise jamais le mot … », « ne propose aucune remise »),
--     montant interdit, tutoiement, longueur maximale, formule d'appel, signature, exclusion d'un secteur, d'un
--     commercial ou d'un groupe. « Compte en litige » est comprise mais pas encore applicable (lien CASHD à venir) :
--     elle le dit. Chaque message (reprise, échéance, retrait) passe par private.offload_regles_appliquer : les
--     formes sont appliquées, et un message qui enfreint une règle est RETENU (le commercial prévient par appel).
--   · Ligne 38 — « Le système s'arrête de lui-même au premier doute, et vous le signale » : coupe-circuit.
--     private.offload_surveiller suspend OFFLOAD (offload_reglages.suspendu_le) si, sur 7 jours, la part de messages
--     non remis dépasse le seuil (20 %, au moins 5 messages terminés), si deux messages du même genre visent la même
--     adresse en 24 heures, ou si le volume du jour dépasse trois fois le plafond. Suspendu : les messages en attente
--     sont annulés, plus rien n'est préparé, une alerte critique est levée ; seul un gérant ou un admin reprend
--     (offload_reprendre). La suspension se pose aussi à la main (offload_suspendre).
--   · Réponses automatiques : une absence (« réponse automatique », « de retour le … ») n'arrête plus la séquence ;
--     un départ (« ne fait plus partie de l'entreprise ») met le compte « à réattribuer », clôt la reprise et crée
--     la tâche de trouver le nouvel interlocuteur ; le système ne devine pas le successeur.
--   · Cas tordu « le message revient en échec » : un message non remis met le compte « à vérifier » ; il ne repart
--     dans aucune vague tant qu'une personne n'a pas levé la vérification (offload_lever_verification).
--   · Ligne 6 — « Les entités d'un même groupe client sont regroupées sous une raison sociale mère » :
--     public.offload_groupes (consolidé par groupe : comptes, chiffre, valeur, pire signal, reprises, échéances,
--     affaires ; et les comptes qui partagent un domaine de courriel professionnel, proposés au rattachement) ;
--     porte offload_rattacher_groupe.
--
-- Règles de pose : create … if not exists, alter … add column if not exists, create or replace, insert … where not
-- exists. Aucun DROP, aucun DELETE.

alter table public.offload_reglages add column if not exists suspendu_le timestamptz;
alter table public.offload_reglages add column if not exists suspendu_motif text;
alter table public.offload_reglages add column if not exists seuil_non_remis_pct smallint not null default 20;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offload_reglages_seuil_non_remis_check') then
    alter table public.offload_reglages add constraint offload_reglages_seuil_non_remis_check
      check (seuil_non_remis_pct between 5 and 80 and char_length(suspendu_motif) <= 500);
  end if;
end $$;

alter table public.offload_comptes add column if not exists verification text;
alter table public.offload_comptes add column if not exists verification_motif text;
alter table public.offload_comptes add column if not exists verification_le timestamptz;
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'offload_comptes_verification_check') then
    alter table public.offload_comptes add constraint offload_comptes_verification_check
      check ((verification is null or verification in ('echec', 'reattribuer')) and char_length(verification_motif) <= 500);
  end if;
end $$;

create table if not exists public.offload_regles (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  texte text not null,
  famille text not null,
  parametres jsonb not null default '{}'::jsonb,
  statut text not null,
  reponse text not null,
  exclusion_id uuid,
  cree_par uuid,
  cree_le timestamptz not null default now(),
  retiree_le timestamptz,
  retiree_par uuid,
  constraint offload_regles_texte_check check (char_length(btrim(texte)) between 3 and 500),
  constraint offload_regles_famille_check check (famille in ('interdit', 'montant', 'tutoiement', 'longueur', 'salutation', 'signature',
                                                             'exclusion', 'litige', 'inconnue')),
  constraint offload_regles_statut_check check (statut in ('appliquee', 'en_attente', 'non_comprise')),
  constraint offload_regles_reponse_check check (char_length(reponse) <= 500)
);
comment on table public.offload_regles is 'OFFLOAD — une règle de ton ou de contenu écrite en français par le client, lue par le système (famille, paramètres, réponse) ; appliquée à chaque message. Retirée, jamais effacée.';
create index if not exists offload_regles_client_idx on public.offload_regles (client_id) where retiree_le is null;
alter table public.offload_regles enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'offload_regles' and policyname = 'on lit les regles de son organisation') then
    create policy "on lit les regles de son organisation" on public.offload_regles for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $$;
revoke all on public.offload_regles from anon, authenticated;
grant select on public.offload_regles to authenticated;
grant all on public.offload_regles to service_role;

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Les règles en français
-- ─────────────────────────────────────────────────────────────────────────
-- Le texte entre guillemets (« », " ", ' ') d'une phrase, ou null.
create or replace function private.offload_entre_guillemets(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select nullif(btrim(coalesce(substring(p from '«\s*([^»]+?)\s*»'), substring(p from '"([^"]+)"'), substring(p from '“([^”]+)”'))), '')
$function$;

-- Ce que le système comprend d'une phrase : {famille, parametres, statut, reponse}. Lecture déterministe : ce qui
-- n'entre dans aucune famille est « non comprise », et le système le dit plutôt que de deviner.
create or replace function private.offload_interpreter_regle(p_texte text)
 returns jsonb
 language plpgsql
 immutable
 set search_path to ''
as $function$
declare
  t text := lower(btrim(coalesce(p_texte, '')));
  q text := private.offload_entre_guillemets(p_texte);
  v text;
  n integer;
begin
  -- Compte en litige : comprise, mais la donnée vient de CASHD (lien à venir).
  if t ~ 'litige|impay|facture[s]? en retard|retard de paiement' then
    return jsonb_build_object('famille', 'litige', 'parametres', '{}'::jsonb, 'statut', 'en_attente',
      'reponse', 'Compris, mais je ne sais pas encore quels comptes sont en litige : la règle s''appliquera quand OFFLOAD lira vos impayés (CASHD). D''ici là, excluez ces comptes un par un.');
  end if;
  -- Exclusions : secteur, commercial, groupe.
  if t ~ '(ne (relance|[ée]cri[st]|contacte|sollicite)|jamais|exclu|[ée]carte|pas de (relance|message))' then
    v := coalesce(q, btrim(substring(p_texte from '(?i)secteur\s+(?:du |de la |des |de l''|d'')?([^,.;]+)')));
    if t ~ 'secteur' and v is not null then
      return jsonb_build_object('famille', 'exclusion', 'parametres', jsonb_build_object('type', 'secteur', 'valeur', v), 'statut', 'appliquee',
        'reponse', format('Compris : les comptes du secteur « %s » sont écartés de toutes les vagues.', v));
    end if;
    v := coalesce(q, btrim(substring(p_texte from '(?i)(?:clients|comptes) (?:de|d'')\s*([A-ZÀ-Ý][^,.;]*)')),
                  btrim(substring(p_texte from '(?i)commercia(?:l|le)\s+([^,.;]+)')));
    if t ~ 'commercia|(clients|comptes) (de|d'')\s*[a-zà-ý]' and t !~ 'groupe' and v is not null then
      return jsonb_build_object('famille', 'exclusion', 'parametres', jsonb_build_object('type', 'commercial', 'valeur', v), 'statut', 'appliquee',
        'reponse', format('Compris : les comptes suivis par %s sont écartés des vagues automatiques.', v));
    end if;
    v := coalesce(q, btrim(substring(p_texte from '(?i)groupe\s+([^,.;]+)')));
    if t ~ 'groupe' and v is not null then
      return jsonb_build_object('famille', 'exclusion', 'parametres', jsonb_build_object('type', 'groupe', 'valeur', v), 'statut', 'appliquee',
        'reponse', format('Compris : les comptes du groupe « %s » sont écartés de toutes les vagues.', v));
    end if;
  end if;
  -- Tutoiement.
  if t ~ 'tutoi|vouvoi' then
    return jsonb_build_object('famille', 'tutoiement', 'parametres', '{}'::jsonb, 'statut', 'appliquee',
      'reponse', 'Compris : toujours le vouvoiement. Un message qui tutoierait serait retenu.');
  end if;
  -- Montants et prix.
  if t ~ '(montant|prix|tarif|somme|chiffre)' and t ~ '(jamais|aucun|pas de|sans|ne .* pas|n''.* pas)' then
    return jsonb_build_object('famille', 'montant', 'parametres', '{}'::jsonb, 'statut', 'appliquee',
      'reponse', 'Compris : aucun montant dans les messages. Le montant de la dernière commande est retiré du texte.');
  end if;
  -- Longueur.
  n := substring(t from '(\d{1,4})\s*mots')::integer;
  if n is not null and t ~ '(plus de|au plus|maximum|max|moins de|pas plus|ne d[ée]passe)' then
    return jsonb_build_object('famille', 'longueur', 'parametres', jsonb_build_object('mots', n), 'statut', 'appliquee',
      'reponse', format('Compris : %s mots au plus. Un message plus long est retenu.', n));
  end if;
  -- Formule d'appel.
  if q is not null and t ~ '(commence|ouvre|d[ée]bute|formule d''appel|salue|salutation)' then
    return jsonb_build_object('famille', 'salutation', 'parametres', jsonb_build_object('texte', q), 'statut', 'appliquee',
      'reponse', format('Compris : chaque message commence par « %s ».', q));
  end if;
  -- Signature.
  if q is not null and t ~ '(sign)' then
    return jsonb_build_object('famille', 'signature', 'parametres', jsonb_build_object('texte', q), 'statut', 'appliquee',
      'reponse', format('Compris : chaque message est signé « %s ».', q));
  end if;
  -- Mot ou sujet interdit : « n'utilise jamais le mot X », « ne parle jamais de X », « ne propose aucune X ».
  v := coalesce(q,
                btrim(substring(t from '(?:le mot|l''expression|le terme)\s+([^,.;]+)')),
                btrim(substring(t from '(?:ne parle|ne mentionne|n''[ée]voque)\s+(?:jamais|pas)\s+(?:de |d''|du |des |de la )?([^,.;]+)')),
                btrim(substring(t from '(?:ne propose|n''offre|ne promets?)\s+(?:jamais|aucune?|pas)\s+(?:de |d''|une? )?([^,.;]+)')),
                btrim(substring(t from '(?:aucune?|jamais de|pas de)\s+([a-zà-ÿ'' -]{3,40})\s+dans')));
  if v is not null and t ~ '(jamais|aucun|pas|interdi|sans)' then
    v := regexp_replace(v, '\s+(dans|aux|à|pour)\s.*$', '');
    v := regexp_replace(v, '^(les?|la|l''|des?|du|une?)\s+', '');
    v := regexp_replace(v, 's$', '');
    if char_length(v) between 2 and 60 then
      return jsonb_build_object('famille', 'interdit', 'parametres', jsonb_build_object('mot', v), 'statut', 'appliquee',
        'reponse', format('Compris : « %s » n''apparaît dans aucun message. Un message qui le contiendrait serait retenu.', v));
    end if;
  end if;
  return jsonb_build_object('famille', 'inconnue', 'parametres', '{}'::jsonb, 'statut', 'non_comprise',
    'reponse', 'Je n''ai pas compris cette règle, elle n''est donc pas appliquée. Reformulez-la, par exemple : « N''utilise jamais le mot remise », « Pas plus de 120 mots », « Commence par « Madame, Monsieur, » », « Ne relance jamais le secteur BTP ».');
end $function$;

-- Une forme sans accents ni casse, pour comparer un mot interdit au texte d'un message.
create or replace function private.offload_plat(p text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select lower(translate(coalesce(p, ''), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿÀÂÄÁÃÅÇÉÈÊËÍÌÎÏÑÓÒÔÖÕÚÙÛÜÝ', 'aaaaaaceeeeiiiinooooouuuuyyaaaaaaceeeeiiiinooooouuuuy'))
$function$;

-- Le message passé au crible des règles : {sujet, corps, retenu (la règle enfreinte, ou null), regles (ids)}.
create or replace function private.offload_regles_appliquer(p_client uuid, p_message jsonb)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_regles;
  v_sujet text := p_message ->> 'sujet';
  v_corps text := p_message ->> 'corps';
  v_ids uuid[] := '{}';
  v_mot text;
begin
  for r in select * from public.offload_regles g where g.client_id = p_client and g.retiree_le is null and g.statut = 'appliquee'
           and g.famille in ('montant', 'salutation', 'signature') order by g.cree_le loop
    if r.famille = 'montant' then
      v_corps := regexp_replace(v_corps, ',?\s*-?\d[\d   .]*(,\d{1,2})?\s?€(\s?(HT|TTC))?', '', 'g');
      v_sujet := regexp_replace(v_sujet, ',?\s*-?\d[\d   .]*(,\d{1,2})?\s?€(\s?(HT|TTC))?', '', 'g');
    elsif r.famille = 'salutation' then
      v_corps := regexp_replace(v_corps, '^Bonjour[^\n]*', r.parametres ->> 'texte');
    elsif r.famille = 'signature' then
      v_corps := regexp_replace(v_corps, '(Bien cordialement,\n)[^\n]*', '\1' || replace(r.parametres ->> 'texte', '\', '\\'));
    end if;
    v_ids := v_ids || r.id;
  end loop;
  for r in select * from public.offload_regles g where g.client_id = p_client and g.retiree_le is null and g.statut = 'appliquee'
           and g.famille in ('interdit', 'tutoiement', 'longueur') order by g.cree_le loop
    v_ids := v_ids || r.id;
    if r.famille = 'interdit' then
      v_mot := private.offload_plat(r.parametres ->> 'mot');
      if private.offload_plat(coalesce(v_sujet, '') || ' ' || coalesce(v_corps, '')) ~ ('(^|[^a-z])' || regexp_replace(v_mot, '([.*+?^${}()|\[\]\\])', '\\\1', 'g') || 's?([^a-z]|$)') then
        return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', r.texte, 'regles', to_jsonb(v_ids));
      end if;
    elsif r.famille = 'tutoiement' then
      if lower(split_part(v_corps, 'Si vous ne souhaitez plus', 1)) ~ '(^|[^a-zà-ÿ''])(tu|toi|ton|ta|tes|t''es)([^a-zà-ÿ]|$)' then
        return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', r.texte, 'regles', to_jsonb(v_ids));
      end if;
    elsif r.famille = 'longueur' then
      if array_length(regexp_split_to_array(btrim(split_part(v_corps, 'Si vous ne souhaitez plus', 1)), '\s+'), 1) > (r.parametres ->> 'mots')::integer then
        return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', r.texte, 'regles', to_jsonb(v_ids));
      end if;
    end if;
  end loop;
  return jsonb_build_object('sujet', v_sujet, 'corps', v_corps, 'retenu', null, 'regles', to_jsonb(v_ids));
end $function$;

create or replace function private.offload_ecrire_regle(p_client uuid, p_texte text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_texte text := private.offload_texte(p_texte, 500);
  i jsonb;
  v_id uuid;
  v_excl uuid;
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin', 'valideur'], 'écrire une règle des messages');
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if v_texte is null or char_length(v_texte) < 3 then
    raise exception 'Une règle s''écrit en une phrase.' using errcode = '22023';
  end if;
  i := private.offload_interpreter_regle(v_texte);
  if i ->> 'famille' = 'exclusion' then
    v_excl := private.offload_exclure(p_client, i -> 'parametres' ->> 'type', i -> 'parametres' ->> 'valeur', left('Règle : ' || v_texte, 500));
  elsif i ->> 'famille' = 'signature' then
    update public.offload_reglages set signature = left(i -> 'parametres' ->> 'texte', 500), maj_le = now() where client_id = p_client;
  end if;
  insert into public.offload_regles (client_id, texte, famille, parametres, statut, reponse, exclusion_id, cree_par)
  values (p_client, v_texte, i ->> 'famille', i -> 'parametres', i ->> 'statut', i ->> 'reponse', v_excl, (select auth.uid()))
  returning id into v_id;
  perform private.journaliser_module(p_client, 'offload', 'offload.regle', 'offload_regles', v_id::text,
    jsonb_build_object('texte', v_texte, 'famille', i ->> 'famille', 'statut', i ->> 'statut'), null);
  return i || jsonb_build_object('id', v_id);
end $function$;

create or replace function private.offload_retirer_regle(p_regle uuid)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare r public.offload_regles;
begin
  select * into r from public.offload_regles where id = p_regle for update;
  if not found then
    raise exception 'Règle introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(r.client_id, null, array['gerant', 'admin', 'valideur'], 'retirer une règle des messages');
  if r.retiree_le is not null then
    return;
  end if;
  update public.offload_regles set retiree_le = now(), retiree_par = (select auth.uid()) where id = r.id;
  if r.exclusion_id is not null then
    update public.offload_exclusions set levee_le = now(), levee_par = (select auth.uid()) where id = r.exclusion_id and levee_le is null;
  end if;
  perform private.journaliser_module(r.client_id, 'offload', 'offload.regle_retiree', 'offload_regles', r.id::text,
    jsonb_build_object('texte', r.texte), null);
end $function$;

create or replace function public.offload_ecrire_regle(p_client uuid, p_texte text)
 returns jsonb language sql set search_path to ''
as $function$ select private.offload_ecrire_regle(p_client, p_texte) $function$;
create or replace function public.offload_retirer_regle(p_regle uuid)
 returns void language sql set search_path to ''
as $function$ select private.offload_retirer_regle(p_regle) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Le coupe-circuit
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_suspendu(p_client uuid)
 returns boolean
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce((select g.suspendu_le is not null from public.offload_reglages g where g.client_id = p_client), false)
$function$;

-- Suspend OFFLOAD : les messages en attente sont annulés, plus rien n'est préparé, l'alerte est levée.
create or replace function private.offload_suspendre_interne(p_client uuid, p_motif text, p_par text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  e record;
  n integer := 0;
begin
  update public.offload_reglages set suspendu_le = now(), suspendu_motif = left(p_motif, 500), maj_le = now()
   where client_id = p_client and suspendu_le is null;
  if not found then
    return 0;
  end if;
  for e in select x.id from public.envois x
           where x.client_id = p_client and x.module = 'offload' and x.statut in ('a_valider', 'pret', 'differe') loop
    begin
      perform private.annuler_envoi(e.id, 'OFFLOAD suspendu : ' || left(p_motif, 200));
      n := n + 1;
    exception when others then
      null;
    end;
  end loop;
  perform private.lever_alerte_module(p_client, 'offload', 'critique',
    left('OFFLOAD s''est arrêté : ' || p_motif || ' Aucun message ne part tant qu''un gérant ne l''a pas relancé.', 300),
    jsonb_build_object('motif', p_motif, 'par', p_par, 'annules', n), 'offload:suspendu', false, null);
  perform private.journaliser_module(p_client, 'offload', 'offload.suspendu', 'offload_reglages', p_client::text,
    jsonb_build_object('motif', p_motif, 'par', p_par, 'annules', n), null);
  return n;
end $function$;

-- Le premier doute : rend le motif de l'arrêt (et arrête), ou null.
create or replace function private.offload_surveiller(p_client uuid)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_termines integer;
  v_non_remis integer;
  v_motif text;
  v_adresse text;
  v_jour integer;
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found or g.suspendu_le is not null then
    return null;
  end if;
  -- a. Trop de messages non remis sur 7 jours : échec chez le fournisseur, ou rebond, plainte, refus signalés après
  --    la remise (envois.remise, posé par private.noter_remise du socle).
  select count(*) filter (where x.statut in ('envoye', 'echec')),
         count(*) filter (where x.statut = 'echec' or x.remise in ('rebond', 'plainte', 'refuse'))
    into v_termines, v_non_remis
  from public.envois x
  where x.client_id = p_client and x.module = 'offload' and x.cree_le > now() - interval '7 days';
  if v_termines >= 5 and v_non_remis * 100 >= g.seuil_non_remis_pct * v_termines then
    v_motif := format('%s messages sur %s n''ont pas été remis ces 7 derniers jours (seuil : %s %%).', v_non_remis, v_termines, g.seuil_non_remis_pct);
  end if;
  -- b. Deux messages du même genre vers la même adresse en 24 heures.
  if v_motif is null then
    select x.destinataire_adresse into v_adresse
    from public.envois x
    where x.client_id = p_client and x.module = 'offload' and x.cree_le > now() - interval '24 hours'
      and x.statut not in ('bloque', 'annule', 'refuse', 'expire') and x.destinataire_adresse is not null
    group by x.destinataire_adresse, x.objet_type having count(distinct x.objet_id) > 1
    limit 1;
    if v_adresse is not null then
      v_motif := format('deux messages du même genre visent %s en moins de 24 heures (fiches en double ?).', v_adresse);
    end if;
  end if;
  -- c. Un volume anormal dans la journée.
  if v_motif is null then
    select count(*) into v_jour from public.envois x
    where x.client_id = p_client and x.module = 'offload' and x.cree_le > now() - interval '24 hours';
    if v_jour > 3 * greatest(g.plafond_reprises_jour, 1) + 20 then
      v_motif := format('%s messages préparés en 24 heures, bien au-delà du plafond (%s par jour).', v_jour, g.plafond_reprises_jour);
    end if;
  end if;
  if v_motif is not null then
    perform private.offload_suspendre_interne(p_client, v_motif, 'surveillance');
  end if;
  return v_motif;
end $function$;

create or replace function private.offload_suspendre(p_client uuid, p_motif text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare v_motif text := private.offload_texte(p_motif, 400);
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin', 'valideur'], 'suspendre OFFLOAD');
  if v_motif is null then
    raise exception 'Une suspension dit pourquoi.' using errcode = '22023';
  end if;
  return private.offload_suspendre_interne(p_client, 'suspendu à la main : ' || v_motif, coalesce((select auth.uid())::text, 'serveur'));
end $function$;

create or replace function private.offload_reprendre(p_client uuid, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_motif text := private.offload_texte(p_motif, 500);
begin
  perform private.offload_exiger(p_client, null, array['gerant', 'admin'], 'relancer OFFLOAD après un arrêt');
  select * into g from public.offload_reglages where client_id = p_client for update;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if v_motif is null then
    raise exception 'Relancer OFFLOAD après un arrêt se justifie : dites ce qui a été vérifié.' using errcode = '22023';
  end if;
  if g.suspendu_le is null then
    return;
  end if;
  update public.offload_reglages set suspendu_le = null, suspendu_motif = null, maj_le = now() where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.repris', 'offload_reglages', p_client::text,
    jsonb_build_object('motif', v_motif, 'arret', g.suspendu_motif, 'depuis', g.suspendu_le), null);
end $function$;

create or replace function public.offload_suspendre(p_client uuid, p_motif text)
 returns integer language sql set search_path to ''
as $function$ select private.offload_suspendre(p_client, p_motif) $function$;
create or replace function public.offload_reprendre(p_client uuid, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.offload_reprendre(p_client, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Réponses automatiques, messages non remis, comptes à vérifier
-- ─────────────────────────────────────────────────────────────────────────
-- 'depart', 'absence' ou null.
create or replace function private.offload_reponse_auto(p_sujet text, p_corps text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case
    when private.offload_plat(split_part(coalesce(p_corps, ''), E'\n>', 1)) ~
         '(ne fait plus partie|a quitte (l''|notre |la |votre )?(entreprise|societe|cabinet|groupe|agence|poste)|n''est plus (en poste|dans (l''|notre |la )(entreprise|societe))|ne travaille plus|n''occupe plus|(cette )?adresse (n''est plus|ne sera plus) (active|consultee|valide|lue))'
      then 'depart'
    when private.offload_plat(coalesce(p_sujet, '')) ~ '(reponse automatique|automatic reply|auto.?reply|out of (the )?office|absen(t|ce)|conges)'
      or private.offload_plat(split_part(coalesce(p_corps, ''), E'\n>', 1)) ~
         '((je suis|actuellement|serai|suis) absente?|en conges|de retour (le|a partir|au bureau|lundi|mardi|mercredi|jeudi|vendredi)|out of (the )?office|en dehors du bureau|message automatique)'
      then 'absence'
  end
$function$;

-- Le compte visé par un envoi d'OFFLOAD (reprise, échéance ou affaire).
create or replace function private.offload_compte_de_envoi(p_envoi uuid)
 returns uuid
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select case e.objet_type
           when 'offload_reprises' then (select r.compte_id from public.offload_reprises r where r.id::text = e.objet_id)
           when 'offload_echeances' then (select h.compte_id from public.offload_echeances h where h.id::text = e.objet_id)
           when 'offload_affaires' then (select a.compte_id from public.offload_affaires a where a.id::text = e.objet_id)
         end
  from public.envois e where e.id = p_envoi and e.module = 'offload'
$function$;

create or replace function private.offload_a_verifier(p_compte uuid, p_type text, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare c public.offload_comptes;
begin
  update public.offload_comptes set verification = p_type, verification_motif = left(p_motif, 500), verification_le = now(), maj_le = now()
   where id = p_compte and (verification is null or verification <> p_type)
  returning * into c;
  if c.id is not null then
    perform private.journaliser_module(c.client_id, 'offload', 'offload.a_verifier', 'offload_comptes', c.id::text,
      jsonb_build_object('type', p_type, 'motif', p_motif), c.entite_id);
  end if;
end $function$;

-- Une réponse automatique : une absence ne change rien ; un départ met le compte « à réattribuer ».
create or replace function private.offload_lire_reponse_auto(p_reception bigint, p_compte uuid, p_genre text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  c public.offload_comptes;
  r record;
begin
  select * into x from public.receptions where id = p_reception;
  select * into c from public.offload_comptes where id = p_compte;
  if c.id is null then
    return jsonb_build_object('statut', 'ignore', 'auto', p_genre);
  end if;
  if p_genre = 'absence' then
    perform private.journaliser_module(c.client_id, 'offload', 'offload.reponse_auto', 'offload_comptes', c.id::text,
      jsonb_build_object('reception', x.id, 'genre', 'absence'), c.entite_id);
    return jsonb_build_object('statut', 'absence', 'compte', c.id);
  end if;
  perform private.offload_a_verifier(c.id, 'reattribuer',
    format('L''interlocuteur a quitté l''entreprise (réponse automatique du %s) : à réattribuer.', private.offload_le((x.recu_le at time zone 'Europe/Paris')::date)));
  for r in select p.id from public.offload_reprises p
           where p.compte_id = c.id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee') loop
    perform private.offload_clore(r.id, 'abandon', 'L''interlocuteur a quitté l''entreprise : la reprise attend un nouvel interlocuteur.');
  end loop;
  insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
  values (c.client_id, c.entite_id, c.id, 'appel', left('Trouver le nouvel interlocuteur de ' || c.nom, 200),
          left(format('%s ne fait plus partie de l''entreprise, d''après une réponse automatique. Le système ne devine pas le successeur : '
                      || 'notez le nouveau contact sur la fiche, puis levez la vérification.%s', coalesce(c.contact, 'L''interlocuteur'),
                      coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
          c.commercial, (now() at time zone 'Europe/Paris')::date + 1);
  return jsonb_build_object('statut', 'depart', 'compte', c.id);
end $function$;

create or replace function private.offload_lever_verification(p_compte uuid, p_motif text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_motif text := private.offload_texte(p_motif, 500);
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'lever la vérification d''un compte');
  if v_motif is null then
    raise exception 'Dites ce qui a été vérifié.' using errcode = '22023';
  end if;
  if c.verification is null then
    return;
  end if;
  update public.offload_comptes set verification = null, verification_motif = null, verification_le = null, maj_le = now() where id = c.id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.verification_levee', 'offload_comptes', c.id::text,
    jsonb_build_object('avant', c.verification, 'motif_avant', c.verification_motif, 'motif', v_motif), c.entite_id);
end $function$;

create or replace function public.offload_lever_verification(p_compte uuid, p_motif text)
 returns void language sql set search_path to ''
as $function$ select private.offload_lever_verification(p_compte, p_motif) $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 4. La raison sociale mère
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.offload_rattacher_groupe(p_comptes uuid[], p_groupe text)
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_groupe text := private.offload_texte(p_groupe, 200);
  c record;
  n integer := 0;
begin
  if coalesce(array_length(p_comptes, 1), 0) = 0 then
    raise exception 'Choisissez au moins un compte.' using errcode = '22023';
  end if;
  for c in select k.* from public.offload_comptes k where k.id = any (p_comptes) loop
    perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'rattacher un compte à son groupe');
    if c.groupe is distinct from v_groupe then
      update public.offload_comptes set groupe = v_groupe, maj_le = now() where id = c.id;
      perform private.journaliser_module(c.client_id, 'offload', 'offload.groupe', 'offload_comptes', c.id::text,
        jsonb_build_object('avant', c.groupe, 'groupe', v_groupe), c.entite_id);
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;

create or replace function public.offload_rattacher_groupe(p_comptes uuid[], p_groupe text)
 returns integer language sql set search_path to ''
as $function$ select private.offload_rattacher_groupe(p_comptes, p_groupe) $function$;

-- Le consolidé par raison sociale mère, et les comptes à rattacher (même domaine de courriel professionnel).
create or replace function public.offload_groupes(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid()) order by c.client_id limit 1)) as client_id
  ), k as (
    select c.*, lower(btrim(c.groupe)) as cle, s.niveau, s.ca_12m, s.valeur_annuelle, s.dernier_achat,
           lower(nullif(split_part(c.email, '@', 2), '')) as domaine
    from public.offload_comptes c left join public.offload_signaux s on s.compte_id = c.id
    where c.client_id = (select client_id from moi) and c.fusionne_dans is null
  ), g as (
    select k.cle, min(k.groupe) as nom,
           jsonb_agg(jsonb_build_object('id', k.id, 'nom', k.nom, 'ref', k.ref, 'niveau', k.niveau, 'ca_12m', k.ca_12m, 'statut', k.statut,
                                        'verification', k.verification) order by k.ca_12m desc nulls last, k.nom) as comptes,
           count(*) as nb, coalesce(sum(k.ca_12m), 0) as ca_12m, coalesce(sum(k.valeur_annuelle), 0) as valeur_annuelle,
           max(k.dernier_achat) as dernier_achat,
           (array_agg(k.niveau order by array_position(array['eteint', 'decroche', 'saison', 'ralentit', 'sous_seuil', 'sans_achat', 'ok'], k.niveau)))[1] as pire_niveau,
           (select count(*) from public.offload_reprises p join k k2 on k2.id = p.compte_id
             where k2.cle = k.cle and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')) as reprises_en_cours,
           (select count(*) from public.offload_echeances h join k k2 on k2.id = h.compte_id
             where k2.cle = k.cle and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee')) as echeances,
           (select coalesce(sum(a.valeur_ht), 0) from public.offload_affaires a join k k2 on k2.id = a.compte_id
             where k2.cle = k.cle and a.statut in ('en_attente', 'relancee_1', 'relancee_2', 'decision', 'repondue')) as affaires_valeur
    from k where k.cle is not null group by k.cle
  ), domaines as (
    select k.domaine, jsonb_agg(jsonb_build_object('id', k.id, 'nom', k.nom, 'groupe', k.groupe) order by k.nom) as comptes,
           count(*) as nb, count(distinct k.cle) as groupes, bool_or(k.cle is null) as sans_groupe
    from k
    where k.domaine is not null
      and k.domaine !~ '^(gmail|googlemail|yahoo|hotmail|outlook|live|msn|orange|wanadoo|free|sfr|neuf|laposte|icloud|me|aol|gmx|protonmail|proton|bbox|numericable)\.'
    group by k.domaine
  )
  select jsonb_build_object(
    'groupes', coalesce((select jsonb_agg(to_jsonb(g) - 'cle' order by g.ca_12m desc, g.nom) from g), '[]'::jsonb),
    'a_rattacher', coalesce((select jsonb_agg(jsonb_build_object('domaine', d.domaine, 'comptes', d.comptes) order by d.nb desc, d.domaine)
                             from domaines d where d.nb > 1 and (d.sans_groupe or d.groupes > 1)), '[]'::jsonb))
$function$;

-- L'état des garde-fous pour l'écran : suspension, règles.
create or replace function public.offload_garde_fous(p_client uuid default null)
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  with moi as (
    select coalesce(p_client, (select c.client_id from public.comptes c where c.user_id = (select auth.uid()) order by c.client_id limit 1)) as client_id
  )
  select jsonb_build_object(
    'suspendu_le', g.suspendu_le, 'suspendu_motif', g.suspendu_motif, 'seuil_non_remis_pct', g.seuil_non_remis_pct,
    'regles', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'texte', r.texte, 'famille', r.famille, 'statut', r.statut,
                                                           'reponse', r.reponse, 'cree_le', r.cree_le) order by r.cree_le desc)
                        from public.offload_regles r where r.client_id = g.client_id and r.retiree_le is null), '[]'::jsonb),
    'a_verifier', (select count(*) from public.offload_comptes c where c.client_id = g.client_id and c.verification is not null))
  from public.offload_reglages g where g.client_id = (select client_id from moi)
$function$;



-- ─────────────────────────────────────────────────────────────────────────
-- 5. Les fonctions du module qui apprennent les règles, l'arrêt et la vérification (recopiées de leur dernière
--    version, puis étendues)
-- ─────────────────────────────────────────────────────────────────────────

-- Un compte « à vérifier » (message non remis, interlocuteur parti) ne repart dans aucune vague.
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
  if c.verification is not null then
    return 'À vérifier : ' || coalesce(c.verification_motif, 'le compte attend une vérification') || '';
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

-- Le cycle des reprises s'arrête quand OFFLOAD est suspendu.
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

  -- 0. OFFLOAD suspendu au premier doute : rien ne se prépare (c4_10).
  if private.offload_suspendu(p_client) then
    return jsonb_build_object('bloque', 'suspendu');
  end if;
  -- 0 bis. OFFLOAD en essai et envois du module réglés en réel : on ne prépare rien, on le dit.
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

-- Le message de reprise passe au crible des règles du client.
create or replace function private.offload_preparer_message(p_reprise uuid, p_rang integer)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  c public.offload_comptes;
  g public.offload_reglages;
  v_msg jsonb;
  v_envoi uuid;
begin
  select * into r from public.offload_reprises where id = p_reprise;
  select * into c from public.offload_comptes where id = r.compte_id;
  select * into g from public.offload_reglages where client_id = r.client_id;
  if nullif(btrim(c.email), '') is null then
    return null;
  end if;
  if private.offload_essai_contre_reel(r.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module sont réglés en réel : rien n''est préparé.' using errcode = '55000';
  end if;
  if private.offload_suspendu(r.client_id) then
    raise exception 'OFFLOAD est suspendu (%) : rien n''est préparé tant qu''un gérant ne l''a pas relancé.',
      (select z.suspendu_motif from public.offload_reglages z where z.client_id = r.client_id) using errcode = '55000';
  end if;
  perform private.offload_assurer_consentement(c.id);
  v_msg := private.offload_regles_appliquer(r.client_id, private.offload_message(c.id, p_rang, r.envoye1_le, null));
  if v_msg ->> 'retenu' is not null then
    -- Une règle du client est enfreinte : le message est retenu, la reprise passe par l'appel.
    update public.offload_reprises set motif = left(format('Message retenu par votre règle « %s » : la reprise passe par l''appel.', v_msg ->> 'retenu'), 500),
           maj_le = now() where id = r.id;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_retenu', 'offload_reprises', r.id::text,
      jsonb_build_object('rang', p_rang, 'regle', v_msg ->> 'retenu'), r.entite_id);
    return null;
  end if;
  v_envoi := private.preparer_envoi(r.client_id, 'offload', 'offload_reprises', r.id::text, 'email',
    jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                       'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
    null, '{}'::jsonb, v_msg ->> 'sujet', v_msg ->> 'corps', null::uuid[],
    'offload:reprise:' || r.id::text || ':' || p_rang, r.entite_id, false, false, null::timestamptz, '{}'::jsonb);
  return v_envoi;
end $function$;

-- L'ouverture d'une reprise : refusée quand OFFLOAD est suspendu ; le motif d'un message retenu par une règle est gardé.
create or replace function private.offload_ouvrir(p_compte uuid, p_par text, p_jour date default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  s public.offload_signaux;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  v_id uuid;
  v_envoi uuid;
  e public.envois;
  v_statut text;
  v_motif text;
  v_dernier public.offload_achats;
  v_detail text;
  v_echeance date;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  select * into g from public.offload_reglages where client_id = c.client_id;
  if c.statut <> 'suivi' then
    raise exception 'Ce compte est % : il ne reçoit aucune reprise.', case c.statut when 'exclu' then 'suivi en direct' else 'retiré à sa demande' end
      using errcode = '55000';
  end if;
  select x.id into v_id from public.offload_reprises x
  where x.compte_id = c.id and x.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee');
  if v_id is not null then
    return v_id;
  end if;
  if exists (select 1 from public.offload_reprises x where x.compte_id = c.id
             and coalesce(x.close_le, x.repondu_le, x.cree_le) > now() - make_interval(days => g.quarantaine_jours)) then
    raise exception 'Ce compte a déjà eu une reprise il y a moins de % jours.', g.quarantaine_jours using errcode = '55000';
  end if;

  if private.offload_suspendu(c.client_id) then
    raise exception 'OFFLOAD est suspendu (%) : rien n''est préparé tant qu''un gérant ne l''a pas relancé.',
      (select z.suspendu_motif from public.offload_reglages z where z.client_id = c.client_id) using errcode = '55000';
  end if;
  if private.offload_essai_contre_reel(c.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module sont réglés en réel : rien n''est préparé.' using errcode = '55000';
  end if;
  select * into s from public.offload_signaux where compte_id = c.id;
  insert into public.offload_reprises (client_id, entite_id, compte_id, statut, ouverte_par, ouverte_par_user, niveau, score, raisons)
  values (c.client_id, c.entite_id, c.id, 'appel', p_par, (select auth.uid()), s.niveau, s.score, coalesce(s.raisons, '[]'::jsonb))
  returning id into v_id;

  -- La tâche d'appel du commercial, avant la clôture (ou sous trois jours si la clôture est loin).
  select * into v_dernier from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir' order by x.date_achat desc limit 1;
  v_echeance := least(coalesce(s.cloture_le, v_jour + 3), v_jour + 3);
  v_detail := concat_ws(E'\n',
    (select string_agg('• ' || (x ->> 'phrase'), E'\n') from jsonb_array_elements(coalesce(s.raisons, '[]'::jsonb)) x),
    case when v_dernier.id is not null then format('Dernière commande : %s, %s HT%s.', private.offload_le(v_dernier.date_achat),
                                                   private.offload_euros(v_dernier.montant_ht), coalesce(', réf. ' || v_dernier.reference, '')) end,
    case when c.telephone is not null then 'Téléphone : ' || c.telephone end,
    case when c.contact is not null then 'Contact : ' || c.contact end);
  insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
  values (c.client_id, c.entite_id, c.id, v_id, 'appel', left('Appeler ' || c.nom, 200), left(v_detail, 4000), c.commercial, v_echeance);

  -- Le message : en validation, ou rien si le compte n'a pas de courriel, ou bloqué par un verrou du socle.
  v_envoi := private.offload_preparer_message(v_id, 1);
  if v_envoi is null then
    v_statut := 'appel';
    v_motif := coalesce((select x.motif from public.offload_reprises x where x.id = v_id),
                        'Pas de courriel connu : la reprise passe par l''appel du commercial.');
  else
    select * into e from public.envois where id = v_envoi;
    if e.statut = 'bloque' then
      v_statut := 'appel';
      v_motif := left(format('Message retenu par le socle (%s) : %s', e.verrou, coalesce(e.motif, '')), 500);
    else
      v_statut := 'a_valider';
    end if;
  end if;
  update public.offload_reprises set statut = v_statut, envoi1_id = v_envoi, motif = v_motif, maj_le = now() where id = v_id;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reprise_ouverte', 'offload_reprises', v_id::text,
    jsonb_build_object('compte', c.id, 'par', p_par, 'niveau', s.niveau, 'score', s.score, 'statut', v_statut, 'envoi', v_envoi,
                       'motif', v_motif), c.entite_id);
  return v_id;
end $function$;

-- Les échéances : rien ne se prépare quand OFFLOAD est suspendu ; le message passe au crible des règles.
create or replace function private.offload_echeances_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  q record;
  k record;
  v_base date;
  v_ailleurs boolean;
  v_due date;
  v_id uuid;
  v_envoi uuid;
  e public.envois;
  c public.offload_comptes;
  v_msg jsonb;
  v_retenu text;
  v_raison text;
  v_n integer;
  n_nouvelles integer := 0; n_honorees integer := 0; n_depassees integer := 0; n_prevenues integer := 0; n_appels integer := 0;
  n_contrats integer := 0; n_ecartees integer := 0;
begin
  if not exists (select 1 from public.offload_reglages g where g.client_id = p_client) then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;

  -- 1. Chaque équipement actif : son échéance datée depuis la dernière intervention enregistrée.
  for q in select x.* from public.offload_equipements x where x.client_id = p_client and x.statut = 'actif' loop
    select i.le, i.ailleurs into v_base, v_ailleurs from public.offload_interventions i
    where i.equipement_id = q.id order by i.le desc, i.ailleurs limit 1;
    if q.derniere_intervention is not null and (v_base is null or q.derniere_intervention > v_base) then
      v_base := q.derniere_intervention;
      v_ailleurs := false;
    end if;
    continue when v_base is null;
    v_due := (v_base + make_interval(months => q.periodicite_mois))::date;
    -- Une intervention plus récente honore les échéances d'avant (ailleurs : « honorée ailleurs »).
    update public.offload_echeances h
       set statut = case when v_ailleurs then 'honoree_ailleurs' else 'honoree' end, honoree_le = v_base, maj_le = now(),
           motif = case when v_ailleurs then 'Intervention faite ailleurs le ' || private.offload_le(v_base) || ' : l''échéance sort du cycle.'
                        else 'Intervention du ' || private.offload_le(v_base) || '.' end
     where h.equipement_id = q.id and h.type = 'entretien' and h.due_le < v_due
       and h.statut in ('a_venir', 'a_valider', 'prevenue', 'appel', 'depassee');
    get diagnostics v_n = row_count;
    n_honorees := n_honorees + v_n;
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, nature, due_le, base_le)
    values (q.client_id, q.entite_id, q.compte_id, 'entretien', q.id, q.nature, v_due, v_base)
    on conflict do nothing
    returning id into v_id;
    if v_id is not null then
      n_nouvelles := n_nouvelles + 1;
    end if;
  end loop;

  -- 2. Tombée sans intervention connue : en attente, jamais relancée une seconde fois.
  update public.offload_echeances h set statut = 'depassee', maj_le = now(),
         motif = 'Échéance du ' || private.offload_le(h.due_le) || ' tombée sans intervention connue : en attente, sans seconde relance.'
   where h.client_id = p_client and h.type = 'entretien' and h.due_le < v_jour and h.statut in ('a_venir', 'prevenue', 'appel');
  get diagnostics n_depassees = row_count;

  -- 3. Les contrats : leur fin est une échéance ; sans reconduction tacite, à 60 jours ou passée, il s'éteint.
  for k in select x.* from public.offload_contrats x where x.client_id = p_client and x.statut = 'actif' loop
    insert into public.offload_echeances (client_id, entite_id, compte_id, type, equipement_id, contrat_id, nature, due_le, base_le)
    values (k.client_id, k.entite_id, k.compte_id, 'contrat', k.equipement_id, k.id, 'commerciale', k.fin, k.debut)
    on conflict do nothing;
    if k.reconduction <> 'tacite' and k.fin <= v_jour + 60
       and not exists (select 1 from public.offload_contrats y where y.compte_id = k.compte_id and y.id <> k.id
                       and y.statut = 'actif' and y.fin > k.fin and coalesce(y.equipement_id, k.equipement_id) is not distinct from k.equipement_id) then
      update public.offload_echeances h set s_eteint = true, maj_le = now(),
             motif = format('Le contrat %s %s le %s sans reconduction %s.', k.numero,
                            case when k.fin < v_jour then 's''est éteint' else 's''éteint' end, private.offload_le(k.fin),
                            case k.reconduction when 'aucune' then 'prévue' else 'tacite : il faut le renouveler' end)
       where h.contrat_id = k.id and h.type = 'contrat' and h.due_le = k.fin and not h.s_eteint
      returning h.id into v_id;
      if found then
        n_contrats := n_contrats + 1;
        select * into c from public.offload_comptes where id = k.compte_id;
        insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
        values (k.client_id, k.entite_id, k.compte_id, v_id, 'appel', left('Proposer le renouvellement du contrat ' || k.numero || ' — ' || c.nom, 200),
                left(format('Le contrat %s%s prend fin le %s, sans reconduction tacite.%s', k.numero, coalesce(' (' || k.libelle || ')', ''),
                            private.offload_le(k.fin), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                c.commercial, least(greatest(v_jour, k.fin - 30), v_jour + 3))
        on conflict do nothing;
        perform private.journaliser_module(k.client_id, 'offload', 'offload.contrat_s_eteint', 'offload_contrats', k.id::text,
          jsonb_build_object('numero', k.numero, 'fin', k.fin, 'reconduction', k.reconduction), k.entite_id);
      end if;
    end if;
    if k.fin < v_jour and k.reconduction <> 'tacite' then
      update public.offload_contrats set statut = 'echu', maj_le = now() where id = k.id;
    elsif k.fin < v_jour and k.reconduction = 'tacite' then
      update public.offload_contrats set statut = 'reconduit', maj_le = now() where id = k.id;
    end if;
  end loop;

  -- 4. Prévenir la semaine qui précède (J-7 à J-1, jamais le jour même), une fois.
  if not private.offload_essai_contre_reel(p_client) and not private.offload_suspendu(p_client) then
    for k in
      select h.* from public.offload_echeances h
      where h.client_id = p_client and h.type = 'entretien' and h.statut = 'a_venir'
        and h.due_le between v_jour + 1 and v_jour + 7
      order by h.due_le, h.nature desc, h.id
    loop
      v_raison := private.offload_ecarte_echeance(k.compte_id, v_jour);
      if v_raison is not null then
        n_ecartees := n_ecartees + 1;
        continue;
      end if;
      select * into c from public.offload_comptes where id = k.compte_id;
      begin
        v_envoi := null;
        v_retenu := null;
        if nullif(btrim(c.email), '') is not null then
          perform private.offload_assurer_consentement(c.id);
          v_msg := private.offload_regles_appliquer(k.client_id, private.offload_message_echeance(k.id));
          v_retenu := v_msg ->> 'retenu';
        end if;
        if v_retenu is null and nullif(btrim(c.email), '') is not null then
          v_envoi := private.preparer_envoi(k.client_id, 'offload', 'offload_echeances', k.id::text, 'email',
            jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                               'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
            null, '{}'::jsonb, v_msg ->> 'sujet', v_msg ->> 'corps', null::uuid[],
            'offload:echeance:' || k.id::text, k.entite_id, false, false, null::timestamptz, '{}'::jsonb);
          select * into e from public.envois where id = v_envoi;
        end if;
        if v_envoi is not null and e.statut <> 'bloque' then
          update public.offload_echeances set statut = 'a_valider', envoi_id = v_envoi, maj_le = now() where id = k.id;
          n_prevenues := n_prevenues + 1;
        else
          update public.offload_echeances set statut = 'appel', envoi_id = v_envoi, maj_le = now(),
                 motif = case when v_retenu is not null then left(format('Message retenu par votre règle « %s » : le commercial prévient le client.', v_retenu), 500)
                              when v_envoi is null then 'Pas de courriel connu : le commercial prévient le client.'
                              else left(format('Message retenu par le socle (%s) : le commercial prévient le client.', e.verrou), 500) end
           where id = k.id;
          insert into public.offload_taches (client_id, entite_id, compte_id, echeance_id, type, titre, detail, commercial, echeance)
          select k.client_id, k.entite_id, k.compte_id, k.id, 'appel',
                 left(format('Prévenir %s : %s le %s', c.nom, case when k.nature = 'reglementaire' then 'contrôle réglementaire' else 'entretien' end,
                             private.offload_le(k.due_le)), 200),
                 left(format('%s (n° %s%s), dernière intervention le %s.%s', q2.designation, q2.ref, coalesce(', site ' || q2.site, ''),
                             private.offload_le(k.base_le), coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
                 c.commercial, v_jour
          from public.offload_equipements q2 where q2.id = k.equipement_id
          on conflict do nothing;
          n_appels := n_appels + 1;
        end if;
      exception when others then
        n_ecartees := n_ecartees + 1;
      end;
    end loop;
  end if;

  if n_nouvelles + n_honorees + n_depassees + n_prevenues + n_appels + n_contrats > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.echeances', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees,
                         'prevenues', n_prevenues, 'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees), null);
  end if;
  return jsonb_build_object('nouvelles', n_nouvelles, 'honorees', n_honorees, 'depassees', n_depassees, 'prevenues', n_prevenues,
                            'appels', n_appels, 'contrats_s_eteignent', n_contrats, 'ecartees', n_ecartees);
end $function$;

-- La relance de retrait passe au crible des règles ; retenue, une personne prévient le client.
create or replace function private.offload_relancer_affaire(p_affaire uuid, p_rang integer, p_appel text default null)
 returns text
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.offload_affaires;
  c public.offload_comptes;
  v_envoi uuid;
  e public.envois;
  v_msg jsonb;
begin
  select * into a from public.offload_affaires where id = p_affaire for update;
  select * into c from public.offload_comptes where id = a.compte_id;
  -- p_appel : la raison pour laquelle on passe par une personne (compte suivi en direct, liste d'exclusion).
  if p_appel is null and nullif(btrim(c.email), '') is not null and c.statut <> 'arrete' then
    perform private.offload_assurer_consentement(c.id);
    v_msg := private.offload_regles_appliquer(a.client_id, private.offload_message_retrait(a.id, p_rang));
    if v_msg ->> 'retenu' is not null then
      p_appel := format('message retenu par votre règle « %s »', v_msg ->> 'retenu');
    else
    v_envoi := private.preparer_envoi(a.client_id, 'offload', 'offload_affaires', a.id::text, 'email',
      jsonb_build_object('adresse', c.email, 'nom', coalesce(c.contact, c.nom), 'ref', c.ref,
                         'professionnel', private.offload_est_professionnel(c.id), 'langue', 'fr'),
      null, '{}'::jsonb, v_msg ->> 'sujet', v_msg ->> 'corps', null::uuid[],
      'offload:affaire:' || a.id::text || ':' || p_rang, a.entite_id, false, false, null::timestamptz, '{}'::jsonb);
    select * into e from public.envois where id = v_envoi;
    end if;
  end if;
  if v_envoi is null or e.statut = 'bloque' then
    -- Sans message (pas de courriel, règle, compte suivi en direct ou à vérifier) : une personne prévient le client.
    insert into public.offload_taches (client_id, entite_id, compte_id, type, titre, detail, commercial, echeance)
    values (a.client_id, a.entite_id, a.compte_id, 'appel',
            left(format('Prévenir %s : %s %s en attente de retrait', c.nom, case a.type when 'intervention' then 'intervention' else 'commande' end, a.reference), 200),
            left(format('%s disponible depuis le %s%s.%s', coalesce(a.libelle, a.reference), private.offload_le(a.disponible_le),
                        case when p_appel is not null then ' (' || p_appel || ')'
                             when v_envoi is not null then ' (message retenu : ' || coalesce(e.verrou, e.statut) || ')' else ' (pas de courriel)' end,
                        coalesce(E'\nTéléphone : ' || c.telephone, '')), 4000),
            c.commercial, (now() at time zone 'Europe/Paris')::date);
  end if;
  if p_rang = 1 then
    update public.offload_affaires set statut = 'relancee_1', relance1_le = clock_timestamp(), envoi1_id = v_envoi, maj_le = now() where id = a.id;
  else
    update public.offload_affaires set statut = 'relancee_2', relance2_le = clock_timestamp(), envoi2_id = v_envoi, maj_le = now() where id = a.id;
  end if;
  perform private.journaliser_module(a.client_id, 'offload', 'offload.affaire_relancee', 'offload_affaires', a.id::text,
    jsonb_build_object('rang', p_rang, 'envoi', v_envoi, 'appel', v_envoi is null or e.statut = 'bloque'), a.entite_id);
  return case when v_envoi is null or e.statut = 'bloque' then 'appel' else 'message' end;
end $function$;

-- Les affaires : rien ne se prépare quand OFFLOAD est suspendu ; un compte à vérifier est prévenu par une personne.
create or replace function private.offload_affaires_cycle(p_client uuid, p_jour date default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  g public.offload_reglages;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  k record;
  n1 integer := 0; n2 integer := 0; nd integer := 0; ne integer := 0;
  -- Une affaire relancée pendant ce passage attend le suivant : jamais deux étapes d'un coup.
  v_debut timestamptz := clock_timestamp();
begin
  select * into g from public.offload_reglages where client_id = p_client;
  if not found then
    raise exception 'OFFLOAD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  if private.offload_essai_contre_reel(p_client) then
    return jsonb_build_object('bloque', 'essai_contre_reel');
  end if;
  if private.offload_suspendu(p_client) then
    return jsonb_build_object('bloque', 'suspendu');
  end if;
  -- 1. Première relance, après le délai fixé.
  -- Un rappel de retrait n'est pas une sollicitation commerciale : un compte inactif, ou déjà contacté, est prévenu
  -- quand même. Seuls l'arrêt demandé et la fiche fusionnée l'écartent ; un compte suivi en direct par un commercial
  -- ou sur une liste d'exclusion est prévenu par une personne (tâche d'appel), jamais par un message automatique.
  for k in select a.id, a.compte_id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'en_attente' and a.disponible_le <= v_jour - g.delai_retrait_jours
           order by a.disponible_le loop
    if k.raison like 'Fiche fusionnée%' or k.raison like 'Retiré à sa demande%' then
      ne := ne + 1;
      continue;
    end if;
    begin
      perform private.offload_relancer_affaire(k.id, 1,
        case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'À vérifier%' then k.raison end);
      n1 := n1 + 1;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 2. Une seule autre, après le délai de relance.
  for k in select a.id, private.offload_ecarte(a.compte_id) as raison from public.offload_affaires a
           where a.client_id = p_client and a.statut = 'relancee_1'
             and (a.relance1_le at time zone 'Europe/Paris')::date <= v_jour - g.delai_relance_retrait_jours and a.relance1_le < v_debut loop
    begin
      perform private.offload_relancer_affaire(k.id, 2,
        case when k.raison like 'Suivi en direct%' or k.raison like 'Exclu par la liste%' or k.raison like 'Retiré à sa demande%'
             or k.raison like 'Fiche fusionnée%' or k.raison like 'À vérifier%' then k.raison end);
      n2 := n2 + 1;
    exception when others then
      ne := ne + 1;
    end;
  end loop;
  -- 3. Deux relances sans réponse : décision manuelle, montant immobilisé en regard.
  update public.offload_affaires a set statut = 'decision', maj_le = now(),
         motif = format('Relancé deux fois sans réponse : à décider (%s immobilisés depuis le %s).',
                        coalesce(private.offload_euros(a.valeur_ht), 'valeur inconnue'), private.offload_le(a.disponible_le))
   where a.client_id = p_client and a.statut = 'relancee_2'
     and (a.relance2_le at time zone 'Europe/Paris')::date <= v_jour - g.delai_relance_retrait_jours and a.relance2_le < v_debut;
  get diagnostics nd = row_count;
  if n1 + n2 + nd > 0 then
    perform private.journaliser_module(p_client, 'offload', 'offload.affaires', 'offload_reglages', p_client::text,
      jsonb_build_object('jour', v_jour, 'relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne), null);
  end if;
  return jsonb_build_object('relances_1', n1, 'relances_2', n2, 'decisions', nd, 'ecartees', ne);
end $function$;

-- Le suivi des envois : un message non remis met le compte à vérifier et réveille la surveillance.
create or replace function private.offload_suivre_envoi(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  r public.offload_reprises;
  e public.envois;
  v_issue text := split_part(coalesce(p_charge ->> 'evenement', ''), '.', 2);
  v_rang integer;
begin
  -- Un message non remis : le compte passe « à vérifier », et la surveillance juge s'il faut s'arrêter (c4_10).
  if v_issue in ('echec', 'non_remis') and p_charge ->> 'envoi' is not null then
    select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
    if e.id is not null and e.module = 'offload' and private.offload_compte_de_envoi(e.id) is not null then
      perform private.offload_a_verifier(private.offload_compte_de_envoi(e.id), 'echec',
        left(format('Le message du %s n''a pas été remis (%s%s) : l''adresse est à vérifier.', private.offload_le((e.cree_le at time zone 'Europe/Paris')::date),
                    v_issue, coalesce(', ' || e.verrou, '')), 500));
      perform private.offload_surveiller(e.client_id);
    end if;
  end if;
  if p_charge ->> 'objet_type' = 'offload_affaires' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_affaire(p_charge);
  end if;
  if p_charge ->> 'objet_type' = 'offload_echeances' and p_charge ->> 'envoi' is not null then
    return private.offload_suivre_envoi_echeance(p_charge);
  end if;
  if p_charge ->> 'objet_type' is distinct from 'offload_reprises' or p_charge ->> 'envoi' is null then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into e from public.envois where id = (p_charge ->> 'envoi')::uuid;
  select * into r from public.offload_reprises where id = (p_charge ->> 'objet_id')::uuid for update;
  if e.id is null or r.id is null or r.client_id <> e.client_id then
    return jsonb_build_object('statut', 'introuvable');
  end if;
  v_rang := case when r.envoi1_id = e.id then 1 when r.envoi2_id = e.id then 2 end;
  if v_rang is null or r.statut in ('repondue', 'close') then
    return jsonb_build_object('statut', 'sans_effet', 'reprise', r.statut);
  end if;

  if v_issue = 'envoye' then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'envoyee', envoye1_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut in ('a_valider', 'appel');
    else
      update public.offload_reprises set statut = 'relancee', envoye2_le = coalesce(e.envoye_le, now()), maj_le = now()
       where id = r.id and statut = 'relance_a_valider';
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_envoye', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'mode', e.mode), r.entite_id);
    return jsonb_build_object('statut', 'envoye', 'rang', v_rang);
  elsif v_issue = 'refuse' then
    -- Refusé en validation : une personne a dit non, la reprise s'arrête là.
    perform private.offload_clore(r.id, 'refusee', 'Le message de rang ' || v_rang || ' a été refusé en validation.');
    return jsonb_build_object('statut', 'refusee', 'rang', v_rang);
  elsif v_issue in ('bloque', 'annule', 'expire', 'echec', 'non_remis') then
    if v_rang = 1 then
      update public.offload_reprises set statut = 'appel', maj_le = now(),
             motif = left(format('Le message n''est pas parti (%s%s) : la reprise passe par l''appel.', v_issue,
                                 coalesce(', ' || e.verrou, '')), 500)
       where id = r.id;
    else
      -- La relance ne part pas : le compte sort du cycle, l'appel reste.
      perform private.offload_clore(r.id, 'sans_reponse', format('La relance n''est pas partie (%s%s).', v_issue, coalesce(', ' || e.verrou, '')));
    end if;
    perform private.journaliser_module(r.client_id, 'offload', 'offload.message_non_parti', 'offload_reprises', r.id::text,
      jsonb_build_object('envoi', e.id, 'rang', v_rang, 'issue', v_issue, 'verrou', e.verrou), r.entite_id);
    return jsonb_build_object('statut', v_issue, 'rang', v_rang);
  end if;
  return jsonb_build_object('statut', 'ignore');
end $function$;

-- La lecture des réponses : les réponses automatiques sont reconnues avant tout.
create or replace function private.offload_lire_reponse(p_charge jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x public.receptions;
  r public.offload_reprises;
  c public.offload_comptes;
  e public.envois;
  v_arret boolean;
  v_auto text;
  v_compte uuid;
begin
  if (p_charge ->> 'reception') !~ '^[0-9]+$' then
    return jsonb_build_object('statut', 'ignore');
  end if;
  select * into x from public.receptions where id = (p_charge ->> 'reception')::bigint;
  if x.id is null or not exists (select 1 from public.offload_reglages g where g.client_id = x.client_id) then
    return jsonb_build_object('statut', 'ignore');
  end if;
  -- 00. Une réponse automatique (c4_10) : une absence ne change rien, un départ met le compte à réattribuer.
  v_auto := private.offload_reponse_auto(x.sujet, x.corps);
  if v_auto is not null then
    if x.en_reponse_a is not null then
      v_compte := private.offload_compte_de_envoi(x.en_reponse_a);
    end if;
    if v_compte is null and nullif(btrim(x.de_adresse), '') is not null then
      select k.id into v_compte from public.offload_comptes k
      where k.client_id = x.client_id and lower(btrim(k.email)) = lower(btrim(x.de_adresse)) and k.fusionne_dans is null
      order by k.maj_le desc limit 1;
    end if;
    if v_compte is not null then
      return private.offload_lire_reponse_auto(x.id, v_compte, v_auto);
    end if;
    return jsonb_build_object('statut', 'ignore', 'auto', v_auto);
  end if;
  -- 0. La réponse à un message de retrait (c4_08).
  if x.en_reponse_a is not null then
    select * into e from public.envois where id = x.en_reponse_a and client_id = x.client_id and module = 'offload'
                                         and objet_type = 'offload_affaires';
    if e.id is not null then
      return private.offload_reponse_affaire(x.id, e.objet_id::uuid);
    end if;
  end if;
  -- 1. La réponse à un envoi d'OFFLOAD.
  if x.en_reponse_a is not null then
    select * into e from public.envois where id = x.en_reponse_a and client_id = x.client_id and module = 'offload'
                                         and objet_type = 'offload_reprises';
    if e.id is not null then
      select * into r from public.offload_reprises where id = e.objet_id::uuid for update;
    end if;
  end if;
  -- 2. À défaut, l'adresse d'un compte dont une reprise attend.
  if r.id is null and x.canal = 'email' and nullif(btrim(x.de_adresse), '') is not null then
    select p.* into r from public.offload_reprises p join public.offload_comptes k on k.id = p.compte_id
    where p.client_id = x.client_id and p.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')
      and lower(btrim(k.email)) = lower(btrim(x.de_adresse))
    order by p.cree_le desc limit 1;
  end if;
  if r.id is null then
    -- À défaut encore, l'adresse d'un compte dont une affaire a été relancée (c4_08).
    if x.canal = 'email' and nullif(btrim(x.de_adresse), '') is not null then
      return coalesce((select private.offload_reponse_affaire(x.id, a.id)
                       from public.offload_affaires a join public.offload_comptes k on k.id = a.compte_id
                       where a.client_id = x.client_id and a.statut in ('relancee_1', 'relancee_2', 'decision')
                         and lower(btrim(k.email)) = lower(btrim(x.de_adresse))
                       order by a.maj_le desc limit 1), jsonb_build_object('statut', 'ignore'));
    end if;
    return jsonb_build_object('statut', 'ignore');
  end if;
  if r.reception_id is not null then
    return jsonb_build_object('statut', 'deja_lue', 'reprise', r.id);
  end if;
  select * into c from public.offload_comptes where id = r.compte_id for update;
  v_arret := private.offload_demande_arret(x.corps);

  update public.offload_reprises set reception_id = x.id, repondu_le = x.recu_le, maj_le = now() where id = r.id;
  perform private.offload_clore(r.id, case when v_arret then 'arret' else 'reponse' end,
    case when v_arret then 'Le client a demandé à ne plus être sollicité.' else 'Le client a répondu : la conversation revient à votre équipe.' end);

  if v_arret then
    update public.offload_comptes set statut = 'arrete', statut_motif = 'Demande d''arrêt reçue le ' || private.offload_le((x.recu_le at time zone 'Europe/Paris')::date),
           statut_le = now(), maj_le = now() where id = c.id;
    perform private.opposer(c.client_id, 'desinscription', coalesce(c.email, x.de_adresse), null, c.ref, null,
                            'Demande d''arrêt reçue en réponse à une reprise OFFLOAD.', 'message', null);
  else
    -- La relance en attente ne part pas : le socle bloque les envois en attente vers cette adresse.
    perform private.opposer(c.client_id, 'pause', coalesce(c.email, x.de_adresse), 'email', null, now() + interval '30 days',
                            'Le client a répondu à une reprise OFFLOAD : la conversation revient à l''équipe.', 'message', null);
    insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
    values (c.client_id, c.entite_id, c.id, r.id, 'repondre', left('Répondre à ' || c.nom, 200),
            left(format('%s a répondu le %s%s.', coalesce(c.contact, c.nom), private.offload_le((x.recu_le at time zone 'Europe/Paris')::date),
                        coalesce(' : « ' || left(regexp_replace(coalesce(x.sujet, ''), '\s+', ' ', 'g'), 120) || ' »', '')), 4000),
            c.commercial, (now() at time zone 'Europe/Paris')::date + 1)
    on conflict do nothing;
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reponse_recue', 'offload_reprises', r.id::text,
    jsonb_build_object('compte', c.id, 'reception', x.id, 'arret', v_arret), c.entite_id);
  return jsonb_build_object('statut', case when v_arret then 'arret' else 'reponse' end, 'reprise', r.id);
end $function$;

-- La nuit : la surveillance passe avant tout le reste.
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
      perform private.offload_surveiller(k.client_id);
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

-- Les réglages : le seuil de messages non remis qui arrête OFFLOAD.
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
                  'arrete_jour', 'seuil_non_remis_pct');
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
    seuil_non_remis_pct = case when p ? 'seuil_non_remis_pct' then (p ->> 'seuil_non_remis_pct')::smallint else seuil_non_remis_pct end,
    arrete_jour = case when p ? 'arrete_jour' then (p ->> 'arrete_jour')::smallint else arrete_jour end,
    maj_le = now()
  where client_id = p_client;
  perform private.journaliser_module(p_client, 'offload', 'offload.reglages', 'offload_reglages', p_client::text,
    jsonb_build_object('avant', to_jsonb(g) - 'branchement_id' - 'installe_par', 'demande', p), null);
  return (select to_jsonb(x) from public.offload_reglages x where x.client_id = p_client);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- 6. Droits (à inscrire dans a5_01 : offload_ecrire_regle, offload_retirer_regle, offload_suspendre,
--    offload_reprendre, offload_lever_verification, offload_rattacher_groupe)
-- ─────────────────────────────────────────────────────────────────────────

revoke all on function public.offload_ecrire_regle(uuid, text) from public, anon;

grant execute on function public.offload_ecrire_regle(uuid, text) to authenticated, service_role;

revoke all on function public.offload_retirer_regle(uuid) from public, anon;

grant execute on function public.offload_retirer_regle(uuid) to authenticated, service_role;

revoke all on function public.offload_suspendre(uuid, text) from public, anon;

grant execute on function public.offload_suspendre(uuid, text) to authenticated, service_role;

revoke all on function public.offload_reprendre(uuid, text) from public, anon;

grant execute on function public.offload_reprendre(uuid, text) to authenticated, service_role;

revoke all on function public.offload_lever_verification(uuid, text) from public, anon;

grant execute on function public.offload_lever_verification(uuid, text) to authenticated, service_role;

revoke all on function public.offload_rattacher_groupe(uuid[], text) from public, anon;

grant execute on function public.offload_rattacher_groupe(uuid[], text) to authenticated, service_role;

revoke all on function public.offload_groupes(uuid) from public, anon;

grant execute on function public.offload_groupes(uuid) to authenticated, service_role;

revoke all on function public.offload_garde_fous(uuid) from public, anon;

grant execute on function public.offload_garde_fous(uuid) to authenticated, service_role;

revoke execute on function private.offload_ecrire_regle(uuid, text) from public, anon;

grant execute on function private.offload_ecrire_regle(uuid, text) to authenticated, service_role;

revoke execute on function private.offload_retirer_regle(uuid) from public, anon;

grant execute on function private.offload_retirer_regle(uuid) to authenticated, service_role;

revoke execute on function private.offload_suspendre(uuid, text) from public, anon;

grant execute on function private.offload_suspendre(uuid, text) to authenticated, service_role;

revoke execute on function private.offload_reprendre(uuid, text) from public, anon;

grant execute on function private.offload_reprendre(uuid, text) to authenticated, service_role;

revoke execute on function private.offload_lever_verification(uuid, text) from public, anon;

grant execute on function private.offload_lever_verification(uuid, text) to authenticated, service_role;

revoke execute on function private.offload_rattacher_groupe(uuid[], text) from public, anon;

grant execute on function private.offload_rattacher_groupe(uuid[], text) to authenticated, service_role;

revoke execute on function private.offload_entre_guillemets(text) from public, anon, authenticated;

grant execute on function private.offload_entre_guillemets(text) to service_role;

revoke execute on function private.offload_interpreter_regle(text) from public, anon, authenticated;

grant execute on function private.offload_interpreter_regle(text) to service_role;

revoke execute on function private.offload_plat(text) from public, anon, authenticated;

grant execute on function private.offload_plat(text) to service_role;

revoke execute on function private.offload_regles_appliquer(uuid, jsonb) from public, anon, authenticated;

grant execute on function private.offload_regles_appliquer(uuid, jsonb) to service_role;

revoke execute on function private.offload_suspendu(uuid) from public, anon, authenticated;

grant execute on function private.offload_suspendu(uuid) to service_role;

revoke execute on function private.offload_suspendre_interne(uuid, text, text) from public, anon, authenticated;

grant execute on function private.offload_suspendre_interne(uuid, text, text) to service_role;

revoke execute on function private.offload_surveiller(uuid) from public, anon, authenticated;

grant execute on function private.offload_surveiller(uuid) to service_role;

revoke execute on function private.offload_reponse_auto(text, text) from public, anon, authenticated;

grant execute on function private.offload_reponse_auto(text, text) to service_role;

revoke execute on function private.offload_compte_de_envoi(uuid) from public, anon, authenticated;

grant execute on function private.offload_compte_de_envoi(uuid) to service_role;

revoke execute on function private.offload_a_verifier(uuid, text, text) from public, anon, authenticated;

grant execute on function private.offload_a_verifier(uuid, text, text) to service_role;

revoke execute on function private.offload_lire_reponse_auto(bigint, uuid, text) from public, anon, authenticated;

grant execute on function private.offload_lire_reponse_auto(bigint, uuid, text) to service_role;

revoke execute on function private.offload_ecarte(uuid) from public, anon, authenticated;

grant execute on function private.offload_ecarte(uuid) to service_role;

revoke execute on function private.offload_cycle(uuid, date) from public, anon, authenticated;

grant execute on function private.offload_cycle(uuid, date) to service_role;

revoke execute on function private.offload_preparer_message(uuid, integer) from public, anon, authenticated;

grant execute on function private.offload_preparer_message(uuid, integer) to service_role;

revoke execute on function private.offload_ouvrir(uuid, text, date) from public, anon, authenticated;

grant execute on function private.offload_ouvrir(uuid, text, date) to service_role;

revoke execute on function private.offload_echeances_cycle(uuid, date) from public, anon, authenticated;

grant execute on function private.offload_echeances_cycle(uuid, date) to service_role;

revoke execute on function private.offload_relancer_affaire(uuid, integer, text) from public, anon, authenticated;

grant execute on function private.offload_relancer_affaire(uuid, integer, text) to service_role;

revoke execute on function private.offload_affaires_cycle(uuid, date) from public, anon, authenticated;

grant execute on function private.offload_affaires_cycle(uuid, date) to service_role;

revoke execute on function private.offload_suivre_envoi(jsonb) from public, anon, authenticated;

grant execute on function private.offload_suivre_envoi(jsonb) to service_role;

revoke execute on function private.offload_lire_reponse(jsonb) from public, anon, authenticated;

grant execute on function private.offload_lire_reponse(jsonb) to service_role;

revoke execute on function private.offload_detecter_tout(date) from public, anon, authenticated;

grant execute on function private.offload_detecter_tout(date) to service_role;

revoke execute on function private.offload_regler(uuid, jsonb) from public, anon;

grant execute on function private.offload_regler(uuid, jsonb) to authenticated, service_role;
