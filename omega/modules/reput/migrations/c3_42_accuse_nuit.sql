-- c3_42 — REPUT : l'accusé de réception part dans la minute, même la nuit, honnête sur les horaires ; la réponse de fond
-- attend l'ouverture ; libellés au plus juste (session C3, 23/10/2026 ; arbitrage de Teo du 22/10, 21 h 49 Z ; autorisé
-- par Teo dans la session C3 ; s'appuie sur le lot socle c3_42a)
--
--   · private.reput_accuser (reprise de c3_36) : le texte ajoute « Nos horaires : <fiche horaires validée>. Si nous sommes
--     fermés en ce moment, votre demande sera traitée en premier à l'ouverture. » (sans fiche horaires : la seconde phrase
--     seule) ; la préparation de l'envoi se fait sous le drapeau omega.envoi_accuse → l'envoi est marqué accuse et saute
--     le SEUL verrou HORS_HEURES (c3_42a). Pour toute demande, urgente ou non. La validation de l'accusé (ou l'accord
--     permanent « accusés ») est inchangée : le drapeau ne lève que l'heure.
--   · La réponse de fond (clé reput:envoi:…) n'est pas marquée : elle reste différée à l'ouverture. L'astreinte garde sa
--     règle (c3_22 à c3_41).
--   · public.reput_deposer_reponse (reprise de c3_40), libellés : appel d'un fixe ou masqué → raison « … rappelez cette
--     personne. », alerte « Appel à rappeler : … » ; sans adresse → « contactez cette personne vous-même » ; une réponse
--     qui cite des fiches sans tout couvrir → alerte « En partie dans la base, à relire : … » (comme le résumé de la file
--     depuis c3_40), « Hors de la base » seulement sans aucune fiche.
--
-- Règles de pose : APRÈS c3_42a. create or replace ; ni DROP ni DELETE.

-- L'accusé (reprise de c3_36).
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
  v_horaires text;
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
  -- c3_42 (arbitrage de Teo) : l'accusé part même la nuit, honnête sur les horaires — il dit les horaires de la base
  -- (fiche « horaires » validée et en vigueur) et que la demande sera traitée en premier à l'ouverture.
  select left(private.reput_ligne(f ->> 'contenu'), 200) into v_horaires
  from jsonb_array_elements(coalesce(private.reput_base(d.client_id, d.entite_id, now()) -> 'fiches', '[]'::jsonb)) f
  where f ->> 'genre' = 'horaires'
  order by (f ->> 'sujet' = 'horaires') desc, f ->> 'titre'
  limit 1;
  v_phrase := concat_ws(' ', v_phrase, case when v_horaires is not null
    then 'Nos horaires : ' || rtrim(v_horaires, '.') || '. Si nous sommes fermés en ce moment, votre demande sera traitée en premier à l''ouverture.'
    else 'Si nous sommes fermés en ce moment, votre demande sera traitée en premier à l''ouverture.' end);
  if d.canal_reponse in ('sms', 'whatsapp') then
    -- c3_36 : par SMS ou WhatsApp, la forme courte (c3_33) ; un appel manqué s'ouvre sur l'excuse, sauf par WhatsApp
    -- (le modèle Meta porte la sienne).
    v_corps := concat_ws(E'\n',
      case when d.canal = 'appel' and d.canal_reponse = 'whatsapp' then null
           when d.canal = 'appel' then coalesce(nullif(btrim(g.ouverture_appel), ''), nullif(btrim(g.formule_appel), ''))
           else nullif(btrim(g.formule_appel), '') end,
      concat_ws(' ', btrim(g.texte_accuse), v_phrase),
      nullif(btrim(split_part(btrim(g.signature), E'\n', 1)), ''), nullif(btrim(g.mention_automatisee), ''));
  else
    v_corps := concat_ws(E'\n\n', nullif(btrim(g.formule_appel), ''), concat_ws(' ', btrim(g.texte_accuse), v_phrase),
                         concat_ws(E'\n', nullif(btrim(g.formule_politesse), ''), nullif(btrim(g.signature), '')),
                         nullif(btrim(g.mention_automatisee), ''));
  end if;
  v_objet := case when d.canal_reponse = 'email' then left('Re : ' || coalesce(nullif(btrim(d.objet), ''), 'votre message'), 300) end;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload,
                                          echeance, cle_idempotence)
  values (d.client_id, d.entite_id, 'reput', 'reput.accuser', 'reput_demandes', d.id::text,
          left('Accusé de réception à ' || coalesce(nullif(btrim(d.de_nom), ''), d.adresse_reponse), 500),
          jsonb_build_object('demande', d.id, 'canal', d.canal_reponse, 'objet', v_objet, 'corps', v_corps),
          now() + interval '2 days', 'reput:accuse:' || d.id::text)
  returning id into v_dv;
  -- c3_42 : l'accusé, et lui seul, part hors des heures (c3_42a) ; le drapeau ne vit que le temps de sa préparation.
  perform set_config('omega.envoi_accuse', 'on', true);
  begin
    v_envoi := private.reput_preparer_envoi(d, 'fr', v_objet, v_corps, 'reput:accuse:' || d.id::text, v_dv);   -- c3_36
  exception when others then
    perform set_config('omega.envoi_accuse', 'off', true);
    raise;
  end;
  perform set_config('omega.envoi_accuse', 'off', true);
  select * into v_e from public.envois e where e.id = v_envoi;
  update public.reput_demandes x set accuse_envoi = v_envoi, accuse_le = now(), maj_le = now() where x.id = d.id;
  perform private.journaliser_module(d.client_id, 'reput', 'reput.accuse_prepare', 'reput_demandes', d.id::text,
    jsonb_build_object('envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'demande_validation', v_dv,
                       'service_nomme', v_phrase is not null), d.entite_id);
  return jsonb_build_object('demande', d.id, 'envoi', v_envoi, 'envoi_statut', v_e.statut, 'demande_validation', v_dv);
end $function$;

-- Le dépôt de la réponse (reprise de c3_40) : libellés.
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
                       'modele', v_rep.modele, 'cout_eur', v_rep.cout_eur), d.entite_id);

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
                            'envoi', v_envoi, 'envoi_statut', v_e.statut, 'verrou', v_e.verrou, 'erreur', v_erreur);
end $function$;
