-- 20261021200415 c3_32_libelle_statut
-- Source : dépôt : 192a033f omega/modules/reput/migrations/c3_32_libelle_statut.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c3_32_libelle_statut.sql @ 192a033f.
-- ═══ omega/modules/reput/migrations/c3_32_libelle_statut.sql @ 192a033f
-- c3_32 — REPUT, correctif TREPUT-08 (mineur, série 1, R7a) : le statut s'écrit en clair pour le client (session C3, 21/10/2026)
--
-- Constat : l'export affichait le code brut « ignoree » pour une demande regroupée avec une autre. Désormais
-- private.reput_libelle_statut(p_demande) donne le libellé lisible de chaque statut ; une demande regroupée dit avec laquelle :
-- « Regroupée avec la demande du 21/10/2026 14:05 (courriel, Nora Céleste) », à l'heure de son site. L'export à date fixe
-- (private.reput_fabriquer_export, reprise de c3_30) l'emploie ; l'écran et son export à la demande ont le même libellé.
-- Au passage (vu en écrivant ce test) : la même question de c3_28 comparait objet + texte ; un objet générique (« Formulaire
-- du site » d'un côté, « Question » de l'autre) la faisait manquer. public.reput_commencer (reprise de c3_28) compare
-- désormais les textes, et l'objet seulement quand le texte manque.
-- Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_libelle_statut(p_demande uuid)
 returns text
 language sql
 stable security definer
 set search_path to ''
as $function$
  select case d.statut
    when 'a_preparer' then 'En préparation'
    when 'a_valider' then 'Réponse à valider'
    when 'a_traiter' then 'À traiter par une personne'
    when 'validee' then 'Validée, en cours d''envoi'
    when 'envoyee' then 'Répondue'
    when 'refusee' then 'Refusée'
    when 'bloquee' then 'Bloquée à l''envoi'
    when 'ignoree' then case
      when g.id is not null then format('Regroupée avec la demande du %s (%s%s)',
             to_char(g.recu_le at time zone private.reput_fuseau(g.client_id, g.entite_id), 'DD/MM/YYYY HH24:MI'),
             case g.canal when 'email' then 'courriel' when 'formulaire' then 'formulaire du site' when 'appel' then 'appel manqué' else g.canal end,
             coalesce(', ' || nullif(btrim(g.de_nom), ''), ''))
      else 'Écartée (sans réponse à faire)' end
    else d.statut end
  from public.reput_demandes d
  left join public.reput_demandes g on g.id = d.regroupee_avec
  where d.id = p_demande
$function$;

revoke execute on function private.reput_libelle_statut(uuid) from public, anon, authenticated;

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
  v_fz text;
begin
  select * into p from public.reput_exports_programmes x where x.id = p_programme;
  if p.id is null then return null; end if;
  v_fz := private.reput_fuseau(p.client_id, p.entite_id);   -- c3_30 : la période au fuseau du programme
  select count(*)::int,
         string_agg(concat_ws(';',
           private.reput_csv(to_char(d.recu_le at time zone private.reput_fuseau(d.client_id, d.entite_id), 'DD/MM/YYYY HH24:MI')),
           private.reput_csv(d.canal),
           private.reput_csv(coalesce(d.de_nom, d.adresse_reponse, '')),
           private.reput_csv(coalesce(s.libelle, d.sujet, '')),
           private.reput_csv(coalesce(d.langue, '')),
           case when d.urgence then 'oui' else 'non' end,
           case when d.couverte is null then '' when d.couverte then 'oui' else 'non' end,
           private.reput_csv(private.reput_libelle_statut(d.id)),   -- c3_32 : un libellé lisible, jamais le code brut
           private.reput_csv(coalesce(to_char(d.envoyee_le at time zone private.reput_fuseau(d.client_id, d.entite_id), 'DD/MM/YYYY HH24:MI'), '')),
           case when d.envoyee_le is null then '' else greatest(1, round(extract(epoch from (d.envoyee_le - d.recu_le)) / 60))::text end,
           case when d.escaladee_le is not null then 'oui' else 'non' end,
           private.reput_csv(coalesce(e.nom, ''))), E'\r\n' order by d.recu_le, d.id)
    into v_n, v_csv
  from public.reput_demandes d
  left join public.reput_sujets s on s.client_id = d.client_id and s.code = d.sujet
  left join public.entites e on e.client_id = d.client_id and e.id = d.entite_id
  where d.client_id = p.client_id and (p.entite_id is null or d.entite_id = p.entite_id)
    and (d.recu_le at time zone v_fz)::date between p_du and p_au;
  v_csv := chr(65279) || 'Reçue le;Canal;Client;Sujet;Langue;Urgente;Tirée de la base;Statut;Répondue le;Délai de réponse (min);'
           || 'Délai de traitement dépassé;Site' || case when v_n > 0 then E'\r\n' || v_csv else '' end;
  insert into public.reput_exports (client_id, entite_id, programme_id, periode_du, periode_au, lignes, nom_fichier, contenu)
  values (p.client_id, p.entite_id, p.id, p_du, p_au, v_n,
          'reput-demandes-' || to_char(p_du, 'YYYY-MM-DD') || '-au-' || to_char(p_au, 'YYYY-MM-DD') || '.csv', v_csv)
  on conflict (programme_id, periode_du) do nothing
  returning id into v_id;
  return v_id;
end $function$;

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
