-- c3_44 — REPUT : la reprise après refus (session C3, 25/10/2026 ; décision de Teo du 23/10, 15 h 05 Z ; socle 19az d'A5,
-- sur le modèle de FILED a4_86 et de CASHD c2_41)
--
-- Quand un valideur refuse une réponse REPUT, le socle (19az) dépose une consigne (motif, commentaire du refus). REPUT
-- la traite dans la minute (cron reput-reprises) :
--   · private.reput_reprendre_refus : la décision de la file recopiée (reput_synchroniser), puis
--       - pas une réponse rédigée (accusé, avis, réglage), refusée comme doublon, refusée sans consigne, déjà remplacée
--         par une version corrigée par une personne, demande qui n'attend plus de réponse, ou sans adresse de réponse
--         → « reprise impossible », avec le motif (journal de la refusée et avis au client, par le socle) ;
--       - sinon la demande repasse « à préparer » et un travail reput.preparer (clé reprise:<refusée>) est déposé :
--         l'ouvrier reput-reponse la reprépare dans la minute.
--   · public.reput_commencer (reprise de c3_40) : pour une reprise, rend `consigne_valideur` (la consigne, puis la
--     réponse refusée, à ne pas redire) et `reprise_de` ; ni regroupement « même question » ni réponse fixe « sans
--     texte » (Edge : sansTexte s'efface devant une consigne).
--   · public.reput_deposer_reponse (reprise de c3_42) : pour une reprise, la version suivante de la réponse ; si le
--     corps et l'objet sont les mêmes qu'avant → « reprise impossible », la demande revient « refusée » ; sinon la
--     demande de validation est private.proposer_reprise (socle : liée à la refusée, même type et même circuit, en
--     attente, au nom du moteur — demandeur « système », jamais le valideur), avec les corrections {champ, avant,
--     apres} (corps, objet, sujet), et l'envoi adossé à cette nouvelle demande, à valider de nouveau.
--   · Une seule reprise : une reprise refusée ne relance rien (socle). Une reprise qui n'aboutit pas dans l'heure
--     (IA absente, plafond, échec du travail) est close « impossible » et la demande revient à une personne.
-- Rien ne part sans une nouvelle validation humaine.
--
-- Règles de pose : APRÈS le lot socle 19az (sinon rien n'est fait : rejouer c3_44 après 19az pour le cron) et c3_43.
-- Rejouable ; create or replace ; ni DROP ni DELETE ; revoke execute de public.

do $garde$
begin
  if to_regprocedure('private.proposer_reprise(uuid,text,jsonb,jsonb,numeric)') is null then
    raise exception 'c3_44 : le lot socle 19az n''est pas posé (private.proposer_reprise absente).';
  end if;
end $garde$;

create table if not exists private.reput_reprises (
  refusee     uuid primary key references public.demandes_validation(id) on delete cascade,
  client_id   uuid not null,
  demande_id  uuid references public.reput_demandes(id) on delete cascade,
  reponse_id  uuid references public.reput_reponses(id) on delete cascade,
  consigne    text,
  statut      text not null default 'a_rediger' check (statut in ('a_rediger', 'proposee', 'impossible')),
  reprise_id  uuid,
  motif       text check (motif is null or char_length(motif) <= 500),
  cree_le     timestamptz not null default now(),
  traite_le   timestamptz
);
comment on table private.reput_reprises is 'c3_44 : les reprises après refus de REPUT, une par demande de validation refusée (socle 19az).';
create unique index if not exists reput_reprises_une_en_cours on private.reput_reprises (demande_id) where statut = 'a_rediger';
revoke all on table private.reput_reprises from public, anon, authenticated;
grant select on table private.reput_reprises to service_role;

-- Deux textes « les mêmes » aux espaces près.
create or replace function private.reput_texte_plat(p text)
 returns text language sql immutable set search_path to ''
as $function$ select btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')) $function$;

-- La consigne d'un refus, en clair : motif, puis commentaire ; null quand le refus n'en dit rien.
create or replace function private.reput_consigne(p_consigne jsonb)
 returns text language sql immutable set search_path to ''
as $function$
  select nullif(concat_ws(E'\n', 'Motif du refus : ' || nullif(btrim(p_consigne ->> 'motif'), ''),
                                 'Commentaire : ' || nullif(btrim(p_consigne ->> 'commentaire'), '')), '')
$function$;

-- Clore une reprise : socle (journal de la refusée, avis au client), suivi REPUT, et la demande revient « refusée »
-- (p_rendre) quand elle attendait la nouvelle rédaction.
create or replace function private.reput_reprise_impossible(p_refusee uuid, p_motif text, p_rendre boolean default true)
 returns void language plpgsql security definer set search_path to ''
as $function$
declare
  rr private.reput_reprises;
  v_motif text := left(coalesce(nullif(btrim(p_motif), ''), 'sans motif'), 480);
begin
  if exists (select 1 from private.reprises x where x.demande_id = p_refusee and x.statut = 'a_faire') then
    perform private.reprise_impossible(p_refusee, v_motif);
  end if;
  update private.reput_reprises x set statut = 'impossible', motif = v_motif, traite_le = now()
   where x.refusee = p_refusee and x.statut = 'a_rediger'
  returning * into rr;
  if rr.refusee is null then
    return;
  end if;
  if p_rendre and rr.demande_id is not null then
    update public.reput_demandes d set statut = 'refusee', motif = left('Reprise impossible : ' || v_motif, 500), maj_le = now()
     where d.id = rr.demande_id and d.statut = 'a_preparer';
  end if;
  perform private.journaliser_module(rr.client_id, 'reput', 'reput.reprise_impossible', 'reput_demandes', coalesce(rr.demande_id::text, p_refusee::text),
    jsonb_build_object('refusee', p_refusee, 'motif', v_motif), null);
end $function$;

-- Traiter une reprise : rend 'a_rediger' (la demande repart chez l'ouvrier), 'impossible', ou null (déjà vue, pas REPUT).
create or replace function private.reput_reprendre_refus(p_refusee uuid, p_consigne jsonb)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  dv public.demandes_validation;
  p public.reput_reponses;
  d public.reput_demandes;
  v_consigne text := private.reput_consigne(p_consigne);
  v_motif text;
begin
  select * into dv from public.demandes_validation x where x.id = p_refusee;
  if dv.id is null or dv.module <> 'reput' or exists (select 1 from private.reput_reprises x where x.refusee = p_refusee) then
    return null;
  end if;
  -- La décision de la file, recopiée sur la réponse et la demande avant d'en juger.
  perform private.reput_synchroniser(dv.client_id);
  select * into p from public.reput_reponses x where x.demande_validation_id = dv.id order by x.version desc limit 1;
  if p.id is not null then
    select * into d from public.reput_demandes x where x.id = p.demande_id for update;
  end if;
  insert into private.reput_reprises (refusee, client_id, demande_id, reponse_id, consigne)
  values (p_refusee, dv.client_id, d.id, p.id, v_consigne);
  v_motif := case
    when dv.objet_type is distinct from 'reput_demandes' or p.id is null or dv.type_action = 'reput.accuser'
      then 'pas une réponse rédigée par REPUT (accusé, avis ou réglage) : rien à reprendre'
    when (p_consigne ->> 'motif') = 'Doublon'
      then 'refusée comme doublon : REPUT ne repropose pas cette réponse'
    when exists (select 1 from public.reput_reponses x where x.demande_id = d.id and x.version > p.version)
      then 'une version corrigée par une personne la remplace déjà'
    when v_consigne is null
      then 'refusée sans consigne (ni motif ni commentaire) : écrivez la réponse vous-même, ou refusez de nouveau en disant quoi corriger'
    when d.statut <> 'refusee'
      then format('la demande n''attend plus cette réponse (%s)', replace(d.statut, '_', ' '))
    when d.canal_reponse is null
      then 'aucune adresse de réponse : contactez cette personne vous-même'
  end;
  if v_motif is not null then
    perform private.reput_reprise_impossible(p_refusee, v_motif, false);
    return 'impossible';
  end if;
  update public.reput_demandes x set statut = 'a_preparer', decidee_le = null,
         motif = 'Reprise après refus : une nouvelle réponse est en préparation, à valider de nouveau.', maj_le = now()
   where x.id = d.id;
  perform private.deposer_travail(d.client_id, 'reput', 'reput.preparer',
    jsonb_build_object('reception', d.reception_id, 'module', 'reput', 'evenement', 'reput.reprise', 'reprise_de', p_refusee),
    'reprise:' || p_refusee::text, 5::smallint);
  perform private.journaliser_module(d.client_id, 'reput', 'reput.reprise_demandee', 'reput_demandes', d.id::text,
    jsonb_build_object('refusee', p_refusee, 'reponse', p.id, 'version', p.version, 'consigne_caracteres', char_length(v_consigne)), d.entite_id);
  return 'a_rediger';
end $function$;

-- Le passage du cron : les refus nouveaux, puis les reprises qui n'aboutissent pas.
create or replace function private.reput_traiter_reprises(p_delai interval default interval '1 hour')
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare x record; n integer := 0;
begin
  if to_regprocedure('private.reprises_a_faire(text)') is null then
    return 0;
  end if;
  for x in select f.* from private.reprises_a_faire('reput') f
           where not exists (select 1 from private.reput_reprises r where r.refusee = f.demande_id) loop
    begin
      if private.reput_reprendre_refus(x.demande_id, x.consigne) is not null then
        n := n + 1;
      end if;
    exception when others then
      perform private.lever_alerte_module(x.client_id, 'reput', 'attention', 'Une réponse refusée n''a pas pu être reprise : elle reste refusée.',
        jsonb_build_object('demande_validation', x.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'reprise:echec:' || x.demande_id::text, true, null);
    end;
  end loop;
  for x in select r.refusee, d.statut from private.reput_reprises r join public.reput_demandes d on d.id = r.demande_id
           where r.statut = 'a_rediger' and (d.statut <> 'a_preparer' or r.cree_le < now() - p_delai) loop
    perform private.reput_reprise_impossible(x.refusee,
      case when x.statut <> 'a_preparer' then 'la nouvelle rédaction n''a pas abouti : la demande revient à une personne'
           else 'la nouvelle rédaction n''a pas abouti dans le délai : la demande revient à une personne' end);
    n := n + 1;
  end loop;
  return n;
end $function$;

do $do$ declare f text; begin
  foreach f in array array['private.reput_texte_plat(text)', 'private.reput_consigne(jsonb)',
                           'private.reput_reprise_impossible(uuid, text, boolean)', 'private.reput_reprendre_refus(uuid, jsonb)',
                           'private.reput_traiter_reprises(interval)'] loop
    execute format('revoke execute on function %s from public, anon, authenticated', f);
    execute format('grant execute on function %s to service_role', f);
  end loop;
end $do$;

-- La préparation (reprise de c3_40) : la consigne du valideur pour une reprise.
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
  v_avant record;
  v_reprise private.reput_reprises;
  v_consigne text;
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
  -- c3_40 (TREPUT-17) : deux messages du même contact à la même seconde (courriel + formulaire) ne se voyaient pas ; un
  -- verrou de transaction par client et par clé de contact les met en file : le second voit le premier (dossier, même
  -- question). Clés triées : jamais d'interblocage.
  perform pg_advisory_xact_lock(hashtextextended(r.client_id::text || ':' || k.cle, 3))
  from (select distinct x as cle from unnest(coalesce(private.reput_cles_contact(r.canal, r.de_adresse, r.detail), '{}'::text[])) x
        order by 1) k;
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
    -- c3_44 : une reprise après refus en cours → la consigne du valideur et la réponse refusée vont au modèle.
    select * into v_reprise from private.reput_reprises x where x.demande_id = d.id and x.statut = 'a_rediger';
    if v_reprise.refusee is not null then
      v_consigne := v_reprise.consigne || coalesce(E'\n\nRéponse refusée (ne pas la redire telle quelle) :\n'
                    || left((select p.corps from public.reput_reponses p where p.id = v_reprise.reponse_id), 1200), '');
    end if;
  else
    -- c3_07 : la même personne sur un autre canal (ou le même) dans les sept jours → le même dossier.
    update public.reput_demandes x set dossier_id = coalesce(private.reput_dossier_de(d.client_id, d.id, d.cles_contact, d.recu_le), d.id)
    where x.id = d.id returning * into d;
    perform private.journaliser_module(r.client_id, 'reput', 'reput.demande_recue', 'reput_demandes', d.id::text,
      jsonb_build_object('reception', r.id, 'canal', r.canal, 'canal_reponse', d.canal_reponse), r.entite_id);
  end if;
  v_precedents := private.reput_precedents(d.client_id, d.dossier_id, d.id);
  -- c3_28 (TREPUT-02) : la même question, du même client, sur un autre canal ou le même, alors que la première attend
  -- encore (48 h) → rattachée à la première, sans nouvel appel au modèle ; une seule réponse à valider.
  -- c3_44 : pas pour une reprise (la demande a déjà été rattachée ou non, au premier passage).
  if d.dossier_id is distinct from d.id and v_reprise.refusee is null then
    select x.id, x.statut, rx.corps, rx.sujet into v_avant
    from public.reput_demandes x join public.receptions rx on rx.id = x.reception_id
    where x.client_id = d.client_id and x.dossier_id = d.dossier_id and x.id <> d.id
      and x.statut in ('a_preparer', 'a_valider', 'a_traiter', 'bloquee', 'validee')
      and x.recu_le >= d.recu_le - interval '48 hours' and x.recu_le <= d.recu_le
    order by x.recu_le desc
    limit 1;
    if v_avant.id is not null and private.reput_meme_question(
         -- c3_32 : le texte d'abord (un objet générique, « Formulaire du site », « Question », ferait manquer la même question) ;
         -- l'objet seulement quand le texte manque.
         coalesce(nullif(btrim(r.corps), ''), r.sujet), coalesce(nullif(btrim(v_avant.corps), ''), v_avant.sujet)) then
      update public.reput_demandes x set statut = 'ignoree', regroupee_avec = v_avant.id,
             motif = 'Même question que le message précédent du même client : une seule réponse, celle déjà préparée.', maj_le = now()
      where x.id = d.id;
      perform private.journaliser_module(d.client_id, 'reput', 'reput.demande_doublon', 'reput_demandes', d.id::text,
        jsonb_build_object('avec', v_avant.id, 'dossier', d.dossier_id, 'canal', r.canal), d.entite_id);
      return jsonb_build_object('statut', 'regroupee', 'demande', d.id, 'avec', v_avant.id,
                                'motif', 'même question que le message précédent du même client (pas de nouvel appel au modèle)');
    end if;
  end if;
  -- c3_20 : une pièce sans un mot, sans message précédent → la précision est demandée ici, sans modèle ni coût ; elle
  -- attend la validation comme toute réponse hors base. L'ouvrier reçoit « preparee » et n'appelle pas l'IA.
  v_n := case when jsonb_typeof(r.pieces) = 'array' then jsonb_array_length(r.pieces) else 0 end;
  -- c3_26 (TREPUT-01) : sans pièce aussi — un message réduit à « Envoyé de mon iPhone » est un message sans texte.
  -- c3_44 : une réponse fixe refusée avec une consigne n'est pas redite : le modèle suit la consigne.
  if v_reprise.refusee is null and not private.reput_parle(r.corps) and not private.reput_parle(r.sujet) and jsonb_array_length(v_precedents) = 0 then
    v_depot := public.reput_deposer_reponse(d.id, jsonb_build_object(
      'sujet', 'autre', 'langue', 'fr', 'urgence', false, 'couverte', false, 'sources', '[]'::jsonb,
      'corps', case when v_n > 0 then private.reput_corps_precision() else private.reput_corps_vide() end,
      'raison', case when v_n > 0
                     then format('Message sans texte (%s pièce%s jointe%s) : précision demandée au client.', v_n,
                                 case when v_n > 1 then 's' else '' end, case when v_n > 1 then 's' else '' end)
                     else 'Message sans texte (rien qu''une signature d''appareil, ou vide) : précision demandée au client.' end,
      'modele', 'regle:sans_texte', 'tokens_entree', 0, 'tokens_sortie', 0, 'cout_eur', 0), 'c3_26/sans_texte');
    return jsonb_build_object('statut', 'preparee', 'demande', d.id, 'motif', case when v_n > 0 then 'précision demandée sans modèle (pièce sans texte)' else 'précision demandée sans modèle (message sans texte)' end,
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
    -- c3_44 : reprise après refus (null sinon).
    'consigne_valideur', v_consigne,
    'reprise_de', v_reprise.refusee,
    'base', v_base);
end $function$;

-- Le dépôt (reprise de c3_42) : la version suivante, liée à la refusée.
create or replace function public.reput_deposer_reponse(p_demande uuid, p_resultat jsonb, p_version text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d public.reput_demandes;
  r public.receptions;
  v_base jsonb;
  v_sujet text;
  v_autorisable boolean;
  v_langue text;
  v_langues text[];
  v_sources uuid[];
  v_couverte boolean;
  v_raison text;
  v_corps text;
  v_objet text;
  v_type text;
  v_rep public.reput_reponses;
  v_dv uuid;
  v_dv_statut text;
  v_politique uuid;
  v_envoi uuid;
  v_e public.envois;
  v_statut_rep text;
  v_statut_dem text;
  v_erreur text;
  v_libelle text;
  v_urgence boolean := coalesce((p_resultat ->> 'urgence')::boolean, false);
  v_reprise private.reput_reprises;
  v_refusee public.reput_reponses;
  v_corr jsonb;
  v_resume text;
  v_payload jsonb;
begin
  if not private.reput_est_serveur() then
    raise exception 'Réservé au serveur d''Omega.' using errcode = '42501';
  end if;
  if p_resultat is null or jsonb_typeof(p_resultat) <> 'object' then
    raise exception 'Le résultat forme un objet JSON.' using errcode = '22023';
  end if;
  select * into d from public.reput_demandes x where x.id = p_demande for update;
  if d.id is null then
    raise exception 'Demande REPUT introuvable.' using errcode = 'P0002';
  end if;
  if d.statut <> 'a_preparer' then
    return jsonb_build_object('statut', 'deja', 'demande', d.id, 'etat', d.statut);
  end if;
  -- c3_44 : la reprise après refus en cours, s'il y en a une.
  select * into v_reprise from private.reput_reprises x where x.demande_id = d.id and x.statut = 'a_rediger' for update;
  if v_reprise.refusee is not null then
    select * into v_refusee from public.reput_reponses x where x.id = v_reprise.reponse_id;
  end if;
  select * into r from public.receptions x where x.id = d.reception_id;
  v_base := private.reput_base(d.client_id, d.entite_id, now());

  -- Le sujet : un sujet actif de l'organisation, sinon « autre ».
  v_sujet := lower(btrim(p_resultat ->> 'sujet'));
  select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
  from public.reput_sujets s where s.client_id = d.client_id and s.code = v_sujet and s.actif;
  if v_sujet is null then
    select s.code, s.autorisable, s.libelle into v_sujet, v_autorisable, v_libelle
    from public.reput_sujets s where s.client_id = d.client_id and s.code = 'autre';
  end if;
  v_autorisable := coalesce(v_autorisable, false) and not (v_sujet = any (private.reput_sujets_proteges()));

  v_langue := lower(btrim(p_resultat ->> 'langue'));
  if v_langue is null or v_langue !~ '^[a-z]{2}$' then
    v_langue := coalesce(d.langue, 'fr');
  end if;
  select array_agg(x) into v_langues from jsonb_array_elements_text(coalesce(v_base -> 'reglages' -> 'langues', '["fr"]'::jsonb)) x;

  -- Les sources : seulement des fiches validées et en vigueur de cette base ; le reste est écarté.
  select coalesce(array_agg(distinct (f ->> 'id')::uuid), '{}') into v_sources
  from jsonb_array_elements(coalesce(v_base -> 'fiches', '[]'::jsonb)) f
  where jsonb_typeof(p_resultat -> 'sources') = 'array' and (p_resultat -> 'sources') ? (f ->> 'id');

  v_raison := nullif(left(btrim(p_resultat ->> 'raison'), 500), '');
  v_couverte := coalesce((p_resultat ->> 'couverte')::boolean, false);
  if v_couverte and cardinality(v_sources) = 0 then
    v_couverte := false;
    v_raison := coalesce(v_raison, 'Aucune fiche de la base citée : la réponse n''est pas sourcée.');
  end if;
  if v_couverte and not (v_langue = any (v_langues)) then
    v_couverte := false;
    v_raison := format('Langue « %s » non couverte par les réglages (%s) : transférée.', v_langue, array_to_string(v_langues, ', '));
  end if;
  if nullif(btrim(p_resultat ->> 'corps'), '') is null then
    raise exception 'Le résultat porte un corps (même un « je ne sais pas »).' using errcode = '22023';
  end if;
  -- c3_06 : un contact en litige ouvert ne reçoit jamais de réponse automatisée.
  -- c3_13 : une urgence n'est jamais envoyée seule, même tirée de la base sur un sujet autorisé.
  v_type := case when v_couverte and v_autorisable and not coalesce(d.litige, false) and not v_urgence
                 then 'reput.repondre.' || v_sujet else 'reput.transferer' end;
  -- c3_25 : le client n'entend parler que du service qui reprend sa demande (celui du sujet principal, c3_07) ; un autre
  -- service de l'organisation nommé par le modèle est ramené à celui-ci, ou à « notre équipe ».
  -- c3_26 (TREPUT-01) : jamais de civilité que le client n'a pas écrite lui-même.
  -- c3_33 : gabarit du canal (appel manqué : l'excuse d'abord ; SMS : forme courte).
  v_corps := private.reput_sans_civilite(private.reput_ramener_service(d.client_id, v_sujet,
               private.reput_gabarit(d.client_id, d.entite_id, d.canal, d.canal_reponse,
                 v_base -> 'reglages', v_langue, p_resultat)), private.reput_civilite_recue(r));
  -- c3_33 : un SMS trop long ne part jamais seul ; une personne le raccourcit.
  if d.canal_reponse in ('sms', 'whatsapp') and char_length(v_corps) > private.reput_limite_sms() then
    v_type := 'reput.transferer';
    v_raison := left(coalesce(v_raison || ' ', '') || format('Réponse par %s trop longue (%s caractères, %s au plus) : à raccourcir.',
                upper(d.canal_reponse), char_length(v_corps), private.reput_limite_sms()), 500);
  end if;
  v_objet := case when d.canal_reponse = 'email'
                  then left(coalesce('Re : ' || nullif(btrim(r.sujet), ''), nullif(btrim(p_resultat ->> 'objet'), ''), 'Votre demande'), 300) end;

  -- c3_44 : une reprise dit ce qu'elle corrige ; le même texte qu'avant n'est pas reproposé.
  if v_reprise.refusee is not null then
    v_corr := '[]'::jsonb;
    if private.reput_texte_plat(v_corps) is distinct from private.reput_texte_plat(v_refusee.corps) then
      v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'corps', 'avant', v_refusee.corps, 'apres', v_corps));
    end if;
    if v_objet is distinct from v_refusee.objet then
      v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'objet', 'avant', v_refusee.objet, 'apres', v_objet));
    end if;
    if jsonb_array_length(v_corr) = 0 then
      perform private.reput_reprise_impossible(v_reprise.refusee,
        'même texte qu''avant : relue avec la consigne (' || left(v_reprise.consigne, 200) || '), la réponse ne change pas. '
        || 'Répondez vous-même, ou complétez la base : la réponse suivante en tiendra compte.');
      return jsonb_build_object('statut', 'refusee', 'demande', d.id, 'reprise', 'impossible', 'reprise_de', v_reprise.refusee,
                                'motif', 'même texte qu''avant');
    end if;
    if v_sujet is distinct from v_refusee.sujet then
      v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'sujet', 'avant', v_refusee.sujet, 'apres', v_sujet));
    end if;
    v_raison := left(coalesce(v_raison || ' ', '') || 'Reprise après refus (consigne suivie) : à valider de nouveau.', 500);
  end if;

  insert into public.reput_reponses (client_id, entite_id, demande_id, version, sujet, langue, couverte, objet, brouillon, corps,
    sources, raison, type_action, statut, modele, version_ouvrier, jetons_entree, jetons_sortie, cout_eur)
  values (d.client_id, d.entite_id, d.id, coalesce((select max(x.version) from public.reput_reponses x where x.demande_id = d.id), 0) + 1, v_sujet, v_langue, v_couverte, v_objet, left(btrim(private.reput_sans_civilite(private.reput_ramener_service(d.client_id, v_sujet, p_resultat ->> 'corps'), private.reput_civilite_recue(r))), 4000), v_corps,
    v_sources, v_raison, v_type, 'a_valider', left(p_resultat ->> 'modele', 80), left(p_version, 80),
    greatest(coalesce((p_resultat ->> 'tokens_entree')::integer, 0), 0), greatest(coalesce((p_resultat ->> 'tokens_sortie')::integer, 0), 0),
    greatest(coalesce((p_resultat ->> 'cout_eur')::numeric, 0), 0))
  returning * into v_rep;

  -- La file de validation du socle, et l'envoi adossé (même canal que la demande).
  begin
    v_resume := left(format('Réponse à %s — %s%s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                       coalesce(v_libelle, v_sujet),
                       -- c3_40 : une réponse tirée de fiches de la base mais pas entièrement couverte n'est pas « hors base ».
                       case when v_couverte then ''
                            when cardinality(v_sources) > 0 then ' (en partie dans la base : à relire)'
                            else ' (hors base : à compléter)' end), 500);
    v_payload := jsonb_build_object('reponse', v_rep.id, 'demande', d.id, 'sujet', v_sujet, 'couverte', v_couverte,
                               'canal', d.canal_reponse, 'langue', v_langue, 'sources', to_jsonb(v_sources),
                               'objet', v_objet, 'corps', v_corps);
    if v_reprise.refusee is not null then
      -- c3_44 : la demande liée à la refusée, au nom du moteur (socle 19az : même type, même circuit, en attente).
      v_dv := private.proposer_reprise(v_reprise.refusee, v_resume, v_payload, v_corr, null);
      select x.statut, x.politique_id into v_dv_statut, v_politique from public.demandes_validation x where x.id = v_dv;
      update private.reput_reprises x set statut = 'proposee', reprise_id = v_dv, traite_le = now() where x.refusee = v_reprise.refusee;
    else
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (d.client_id, d.entite_id, 'reput', private.reput_type_file(v_type, v_sujet), 'reput_demandes', d.id::text,
            v_resume, v_payload,
            now() + interval '7 days', 'reput:reponse:' || v_rep.id::text)
    returning id, statut, politique_id into v_dv, v_dv_statut, v_politique;
    end if;
    if d.canal_reponse is not null then
      -- c3_36 : appel + WhatsApp → le modèle Meta validé ; sinon le texte libre.
      v_envoi := private.reput_preparer_envoi(d, v_langue, v_objet, v_corps, 'reput:envoi:' || v_rep.id::text, v_dv);
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_dv_statut := null; v_politique := null; v_envoi := null; v_e := null;
  end;
  -- c3_44 : une reprise qui n'a pas pu être déposée est close (la demande revient à une personne, ci-dessous).
  if v_reprise.refusee is not null and v_erreur is not null then
    perform private.reput_reprise_impossible(v_reprise.refusee, 'dépôt impossible : ' || v_erreur, false);
  end if;

  v_statut_rep := case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee'
                       when v_e.statut = 'envoye' then 'envoyee'
                       when v_e.statut in ('pret', 'differe', 'en_cours') then 'approuvee'
                       else 'a_valider' end;
  v_statut_dem := case v_statut_rep when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee'
                                    when 'envoyee' then 'envoyee' when 'approuvee' then 'validee' else 'a_valider' end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi, statut = v_statut_rep,
         raison = coalesce(x.raison, case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur
                                          -- c3_42 : le libellé dit le geste ; un appel d'un fixe ou d'un numéro masqué se rappelle.
                                          when d.canal_reponse is null and d.canal = 'appel'
                                            then 'Appel d''un fixe ou d''un numéro masqué : aucun écrit possible, rappelez cette personne.'
                                          when d.canal_reponse is null then 'Aucune adresse de réponse : contactez cette personne vous-même.' end),
         maj_le = now()
  where x.id = v_rep.id returning * into v_rep;
  update public.reput_demandes x set statut = v_statut_dem, sujet = v_sujet, langue = v_langue, urgence = v_urgence,
         couverte = v_couverte, preparee_le = now(),
         decidee_le = case when v_statut_dem in ('validee', 'envoyee') then now() end,
         envoyee_le = case when v_statut_dem = 'envoyee' then now() end,
         motif = case when v_statut_dem in ('a_traiter', 'bloquee') then left(coalesce(v_rep.raison, v_e.motif, v_e.verrou), 500) end,
         maj_le = now()
  where x.id = d.id returning * into d;
  update public.receptions x set statut = 'lue' where x.id = r.id and x.statut = 'nouvelle';

  perform private.journaliser_module(d.client_id, 'reput', 'reput.reponse_preparee', 'reput_demandes', d.id::text,
    jsonb_build_object('reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue, 'couverte', v_couverte, 'urgence', v_urgence,
                       'sources', to_jsonb(v_sources), 'type_action', v_type, 'demande_validation', v_dv, 'politique', v_politique,
                       'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'statut', d.statut,
                       'modele', v_rep.modele, 'cout_eur', v_rep.cout_eur, 'version', v_rep.version, 'reprise_de', v_reprise.refusee), d.entite_id);
  if v_reprise.refusee is not null and v_erreur is null then
    perform private.journaliser_module(d.client_id, 'reput', 'reput.reprise_proposee', 'reput_demandes', d.id::text,
      jsonb_build_object('refusee', v_reprise.refusee, 'reprise', v_dv, 'reponse', v_rep.id, 'version', v_rep.version,
                         'corrections', jsonb_array_length(v_corr)), d.entite_id);
  end if;

  -- Ce qui doit remonter à une personne : la fiche d'escalade est la demande elle-même.
  if v_urgence or v_sujet in ('reclamation', 'humain') or not v_couverte or d.statut in ('a_traiter', 'bloquee') or coalesce(d.litige, false) then
    perform private.lever_alerte_module(d.client_id, 'reput', case when v_urgence then 'critique' else 'attention' end,
      left(case when v_urgence then 'Urgence reçue : ' when v_sujet = 'reclamation' then 'Réclamation reçue : '
                when v_sujet = 'humain' then 'Un client demande à parler à quelqu''un : '
                when d.statut = 'bloquee' then 'Réponse bloquée : '
                when d.statut = 'a_traiter' and d.canal = 'appel' and d.canal_reponse is null then 'Appel à rappeler : '
                when d.statut = 'a_traiter' then 'Demande à traiter vous-même : '
                when coalesce(d.litige, false) then 'Client en litige, réponse à relire : '
                -- c3_42 : même règle que le résumé de la file (c3_40) — des fiches citées sans tout couvrir ne sont pas « hors base ».
                when cardinality(v_sources) > 0 then 'En partie dans la base, à relire : '
                else 'Hors de la base : ' end
           || coalesce(nullif(btrim(d.de_nom), ''), 'un client') || ' (' || coalesce(v_libelle, v_sujet) || ')', 150),
      jsonb_build_object('demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'statut', d.statut, 'verrou', v_e.verrou),
      'demande:' || d.id::text, true, null);
  end if;

  return jsonb_build_object('statut', d.statut, 'demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue,
                            'couverte', v_couverte, 'type_action', v_type, 'demande_validation', v_dv,
                            'demande_validation_statut', v_dv_statut, 'politique', v_politique,
                            'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'erreur', v_erreur,
                            'version', v_rep.version, 'reprise_de', v_reprise.refusee);
end $function$;

-- Le cron, chaque minute, quand pg_cron est là.
do $cron$
begin
  if to_regnamespace('cron') is null then
    raise notice 'c3_44 : pg_cron absent — cron reput-reprises non posé.';
    return;
  end if;
  perform cron.schedule('reput-reprises', '* * * * *', 'select private.reput_traiter_reprises()');
end $cron$;
