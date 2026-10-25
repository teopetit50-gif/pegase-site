-- 20261022204607 c3_40_astreinte_epuisee_course
-- Source : dépôt : fed2f4a7637153025ea5d31646c5b5a115acccfa omega/modules/reput/migrations/c3_40_astreinte_epuisee_course.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_40_astreinte_epuisee_course.sql @ fed2f4a7637153025ea5d31646c5b5a115acccfa.
-- ═══ omega/modules/reput/migrations/c3_40_astreinte_epuisee_course.sql @ fed2f4a7637153025ea5d31646c5b5a115acccfa
-- c3_40 — REPUT, écarts TREPUT-16 et TREPUT-17 (T-REPUT, 22/10) et le résumé « hors base » (session C3, 22/10/2026)
--
--   · TREPUT-16 (U7, 213ee66b) : une astreinte épuisée ne prévenait personne. private.reput_astreinte (reprise de c3_39) :
--     à l'épuisement, ALERTE critique au gérant (« Urgence sans personne de garde : … rappelez-le vous-même », une fois
--     par demande). La demande de validation du socle ne se modifie pas après sa création (seul son statut avance) :
--     c'est l'écran REPUT qui met en tête les urgences à l'astreinte épuisée non prises, avec la pastille « Garde
--     injoignable ».
--   · TREPUT-17 (R7c/R7d) : deux dépôts identiques du même contact à la même seconde passaient tous deux au modèle.
--     public.reput_commencer (reprise de c3_32) prend un verrou de transaction (pg_advisory_xact_lock) par client et par
--     clé de contact (triées) avant de créer la demande : le second attend le premier, le voit, et la règle « même
--     question » (c3_28/c3_32) le rattache — un seul appel au modèle, une seule validation.
--   · Résumé de la file : public.reput_deposer_reponse (reprise de c3_36) — couverte → rien ; des fiches citées sans
--     tout couvrir → « (en partie dans la base : à relire) » ; aucune fiche → « (hors base : à compléter) ».
--
-- Règles de pose : create or replace ; ni DROP ni DELETE.

-- TREPUT-16 (reprise de c3_39).
create or replace function private.reput_astreinte(p_maintenant timestamptz default now())
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  d record;
  a public.reput_appels;
  g public.reput_gardes;
  v_lances integer := 0;
  v_escalades integer := 0;
  v_epuisees integer := 0;
  v_non_passes integer := 0;
begin
  for d in
    select x.*, r.astreinte_minutes
    from public.reput_demandes x
    join public.reput_reglages r on r.client_id = x.client_id and r.entite_id is null and r.actif and r.astreinte
    where x.urgence and x.urgence_prise_le is null and x.astreinte_epuisee_le is null
      and x.statut in ('a_preparer', 'a_valider', 'a_traiter') and x.recu_le >= p_maintenant - interval '6 hours'
    order by x.recu_le
    limit 200
  loop
    select * into a from public.reput_appels y where y.demande_id = d.id order by y.rang desc limit 1;
    if a.id is null then
      g := private.reput_garde_suivante(d.client_id, d.entite_id, 0, p_maintenant);
      if g.id is null then
        insert into public.reput_appels (client_id, entite_id, demande_id, rang, statut, issue_le)
        values (d.client_id, d.entite_id, d.id, 0, 'sans_garde', p_maintenant) on conflict (demande_id, rang) do nothing;
        perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_sans_garde', 'reput_demandes', d.id::text,
          '{}'::jsonb, d.entite_id);
      else
        insert into public.reput_appels (client_id, entite_id, demande_id, garde_id, user_id, rang)
        values (d.client_id, d.entite_id, d.id, g.id, g.user_id, g.rang) on conflict (demande_id, rang) do nothing;
        perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_lancee', 'reput_demandes', d.id::text,
          jsonb_build_object('rang', g.rang, 'membre', g.user_id), d.entite_id);
        v_lances := v_lances + 1;
      end if;
      continue;
    end if;
    continue when a.statut in ('pris', 'clos', 'sans_garde');
    -- Sans prise au délai, ou l'appel n'a pas abouti : on passe au rang suivant.
    continue when a.statut in ('a_appeler', 'en_cours', 'sonne', 'non_passe')
                  and coalesce(a.essai_le, a.cree_le) > p_maintenant - make_interval(mins => d.astreinte_minutes);
    -- c3_39 (TREPUT-15) : un appel dont aucun téléphone n'a sonné (jamais pris par l'ouvrier, ou pris sans nouvelle de
    -- Twilio) n'est PAS « sans réponse » : il devient « non_passe », le gérant est alerté une fois, et l'on n'escalade
    -- pas (le rang suivant ne sonnerait pas davantage). L'ouvrier le reprend à son prochain passage.
    if a.statut in ('a_appeler', 'en_cours', 'non_passe') then
      if a.statut <> 'non_passe' then
        -- Seulement si l'ouvrier n'a pas pris l'appel entre-temps (même état, même essai) : jamais d'écrasement.
        update public.reput_appels y set statut = 'non_passe', issue_le = p_maintenant
        where y.id = a.id and y.statut = a.statut and y.essai_le is not distinct from a.essai_le;
        continue when not found;
        perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_non_passee', 'reput_demandes', d.id::text,
          jsonb_build_object('rang', a.rang, 'pris_par_ouvrier', a.essai_le is not null), d.entite_id);
        perform private.lever_alerte_module(d.client_id, 'reput', 'critique',
          left('L''appel d''astreinte n''a pas pu partir : urgence de ' || coalesce(nullif(btrim(d.de_nom), ''), 'un client')
               || ' — appelez la garde vous-même', 150),
          jsonb_build_object('demande', d.id, 'appel', a.id, 'rang', a.rang), 'astreinte_non_passe:' || d.id::text, true, null);
        v_non_passes := v_non_passes + 1;
      end if;
      continue;
    end if;
    if a.statut = 'sonne' then
      update public.reput_appels y set statut = 'sans_reponse', issue_le = p_maintenant where y.id = a.id and y.statut = 'sonne';
      continue when not found;   -- une issue est arrivée entre-temps (pris, par exemple) : la minute suivante la lit
    end if;
    g := private.reput_garde_suivante(d.client_id, d.entite_id, a.rang, p_maintenant);
    if g.id is null then
      update public.reput_demandes y set astreinte_epuisee_le = p_maintenant, maj_le = now() where y.id = d.id;
      perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_epuisee', 'reput_demandes', d.id::text,
        jsonb_build_object('rangs', a.rang), d.entite_id);
      -- c3_40 (TREPUT-16) : personne de garde n'a pris l'urgence → alerte CRITIQUE au gérant. (La demande de validation
      -- du socle ne se modifie pas après sa création : c'est l'écran REPUT qui met ces demandes en tête.)
      perform private.lever_alerte_module(d.client_id, 'reput', 'critique',
        left('Urgence sans personne de garde : ' || coalesce(nullif(btrim(d.de_nom), ''), 'un client')
             || ' attend, aucun membre de garde n''a pris l''appel — rappelez-le vous-même', 150),
        jsonb_build_object('demande', d.id, 'rangs', a.rang), 'astreinte_epuisee:' || d.id::text, true, null);
      v_epuisees := v_epuisees + 1;
    else
      insert into public.reput_appels (client_id, entite_id, demande_id, garde_id, user_id, rang)
      values (d.client_id, d.entite_id, d.id, g.id, g.user_id, g.rang) on conflict (demande_id, rang) do nothing;
      perform private.journaliser_module(d.client_id, 'reput', 'reput.astreinte_escaladee', 'reput_demandes', d.id::text,
        jsonb_build_object('rang', g.rang, 'membre', g.user_id), d.entite_id);
      v_escalades := v_escalades + 1;
    end if;
  end loop;
  return jsonb_build_object('lances', v_lances, 'escalades', v_escalades, 'epuisees', v_epuisees, 'non_passes', v_non_passes);
end $function$;

-- TREPUT-17 (reprise de c3_32).
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
  if d.dossier_id is distinct from d.id then
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
  if not private.reput_parle(r.corps) and not private.reput_parle(r.sujet) and jsonb_array_length(v_precedents) = 0 then
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
    'base', v_base);
end $function$;

-- Le résumé de la file (reprise de c3_36).
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

  insert into public.reput_reponses (client_id, entite_id, demande_id, version, sujet, langue, couverte, objet, brouillon, corps,
    sources, raison, type_action, statut, modele, version_ouvrier, jetons_entree, jetons_sortie, cout_eur)
  values (d.client_id, d.entite_id, d.id, 1, v_sujet, v_langue, v_couverte, v_objet, left(btrim(private.reput_sans_civilite(private.reput_ramener_service(d.client_id, v_sujet, p_resultat ->> 'corps'), private.reput_civilite_recue(r))), 4000), v_corps,
    v_sources, v_raison, v_type, 'a_valider', left(p_resultat ->> 'modele', 80), left(p_version, 80),
    greatest(coalesce((p_resultat ->> 'tokens_entree')::integer, 0), 0), greatest(coalesce((p_resultat ->> 'tokens_sortie')::integer, 0), 0),
    greatest(coalesce((p_resultat ->> 'cout_eur')::numeric, 0), 0))
  returning * into v_rep;

  -- La file de validation du socle, et l'envoi adossé (même canal que la demande).
  begin
    insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                            echeance, cle_idempotence)
    values (d.client_id, d.entite_id, 'reput', private.reput_type_file(v_type, v_sujet), 'reput_demandes', d.id::text,
            left(format('Réponse à %s — %s%s', coalesce(nullif(btrim(d.de_nom), ''), coalesce(d.adresse_reponse, 'un client')),
                        coalesce(v_libelle, v_sujet),
                        -- c3_40 : une réponse tirée de fiches de la base mais pas entièrement couverte n'est pas « hors base ».
                        case when v_couverte then ''
                             when cardinality(v_sources) > 0 then ' (en partie dans la base : à relire)'
                             else ' (hors base : à compléter)' end), 500),
            jsonb_build_object('reponse', v_rep.id, 'demande', d.id, 'sujet', v_sujet, 'couverte', v_couverte,
                               'canal', d.canal_reponse, 'langue', v_langue, 'sources', to_jsonb(v_sources),
                               'objet', v_objet, 'corps', v_corps),
            now() + interval '7 days', 'reput:reponse:' || v_rep.id::text)
    returning id, statut, politique_id into v_dv, v_dv_statut, v_politique;
    if d.canal_reponse is not null then
      -- c3_36 : appel + WhatsApp → le modèle Meta validé ; sinon le texte libre.
      v_envoi := private.reput_preparer_envoi(d, v_langue, v_objet, v_corps, 'reput:envoi:' || v_rep.id::text, v_dv);
      select * into v_e from public.envois e where e.id = v_envoi;
    end if;
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    v_dv := null; v_dv_statut := null; v_politique := null; v_envoi := null; v_e := null;
  end;

  v_statut_rep := case when v_erreur is not null or v_envoi is null then 'sans_envoi'
                       when v_e.statut in ('bloque', 'refuse', 'annule', 'expire', 'echec') then 'bloquee'
                       when v_e.statut = 'envoye' then 'envoyee'
                       when v_e.statut in ('pret', 'differe', 'en_cours') then 'approuvee'
                       else 'a_valider' end;
  v_statut_dem := case v_statut_rep when 'sans_envoi' then 'a_traiter' when 'bloquee' then 'bloquee'
                                    when 'envoyee' then 'envoyee' when 'approuvee' then 'validee' else 'a_valider' end;
  update public.reput_reponses x set demande_validation_id = v_dv, envoi_id = v_envoi, statut = v_statut_rep,
         raison = coalesce(x.raison, case when v_erreur is not null then 'Dépôt impossible : ' || v_erreur
                                          when d.canal_reponse is null then 'Aucune adresse de réponse : à traiter par une personne.' end),
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
                       'modele', v_rep.modele, 'cout_eur', v_rep.cout_eur), d.entite_id);

  -- Ce qui doit remonter à une personne : la fiche d'escalade est la demande elle-même.
  if v_urgence or v_sujet in ('reclamation', 'humain') or not v_couverte or d.statut in ('a_traiter', 'bloquee') or coalesce(d.litige, false) then
    perform private.lever_alerte_module(d.client_id, 'reput', case when v_urgence then 'critique' else 'attention' end,
      left(case when v_urgence then 'Urgence reçue : ' when v_sujet = 'reclamation' then 'Réclamation reçue : '
                when v_sujet = 'humain' then 'Un client demande à parler à quelqu''un : '
                when d.statut = 'bloquee' then 'Réponse bloquée : '
                when d.statut = 'a_traiter' then 'Demande à traiter vous-même : '
                when coalesce(d.litige, false) then 'Client en litige, réponse à relire : '
                else 'Hors de la base : ' end
           || coalesce(nullif(btrim(d.de_nom), ''), 'un client') || ' (' || coalesce(v_libelle, v_sujet) || ')', 150),
      jsonb_build_object('demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'statut', d.statut, 'verrou', v_e.verrou),
      'demande:' || d.id::text, true, null);
  end if;

  return jsonb_build_object('statut', d.statut, 'demande', d.id, 'reponse', v_rep.id, 'sujet', v_sujet, 'langue', v_langue,
                            'couverte', v_couverte, 'type_action', v_type, 'demande_validation', v_dv,
                            'demande_validation_statut', v_dv_statut, 'politique', v_politique,
                            'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'erreur', v_erreur);
end $function$;
