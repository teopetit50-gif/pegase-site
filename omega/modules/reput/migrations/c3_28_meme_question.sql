-- c3_28 — REPUT, correctif TREPUT-02 (série 1 du testeur) : la même question sur deux canaux = une seule réponse à valider,
-- sans second appel au modèle (session C3, 21/10/2026)
--
-- Constat (Nora Céleste) : même question par courriel (demande 09a4ff1e) puis par formulaire (b7cfbaca). Les deux demandes
-- avaient bien le même dossier (c3_07), mais deux réponses préparées par le modèle et deux validations en attente :
-- le regroupement de c3_07 ne traitait que les demandes « à valider », et celles du banc étaient « bloquées » (pas de
-- réglage d'envoi), et il ne joue qu'après la seconde préparation.
--   · private.reput_meme_question(a, b) : mêmes mots (≥ 3 lettres, casse et accents ignorés) à 80 % au moins (indice de
--     Jaccard), ou l'un contenu dans l'autre ;
--   · public.reput_commencer (reprise de c3_26) : une demande qui rejoint un dossier dont la demande précédente (48 h) n'est
--     pas encore close, avec la même question, est rattachée à celle-ci (statut « ignoree », regroupee_avec, journal
--     reput.demande_doublon) et rend « regroupee » : l'ouvrier n'appelle pas le modèle ;
--   · private.reput_regrouper (reprise de c3_07) : une réponse plus ancienne à l'envoi BLOQUÉ cède aussi la place (sa
--     validation est annulée) — pour une question différente du même dossier, il reste une seule réponse à valider.
--
-- Règles de pose : create or replace ; ni DROP ni DELETE.

create or replace function private.reput_meme_question(p_a text, p_b text)
 returns boolean
 language sql
 immutable
 set search_path to ''
as $function$
  with n as (
    select btrim(regexp_replace(translate(lower(coalesce(p_a, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa'), '[^a-z0-9]+', ' ', 'g')) as a,
           btrim(regexp_replace(translate(lower(coalesce(p_b, '')), 'àâäáãåçéèêëíìîïñóòôöõúùûüýÿœæ', 'aaaaaaceeeeiiiinooooouuuuyyoa'), '[^a-z0-9]+', ' ', 'g')) as b
  ), m as (
    select array(select distinct w from unnest(string_to_array(n.a, ' ')) w where char_length(w) >= 3) as ma,
           array(select distinct w from unnest(string_to_array(n.b, ' ')) w where char_length(w) >= 3) as mb, n.a, n.b
    from n
  )
  select case
    when cardinality(m.ma) = 0 or cardinality(m.mb) = 0 then false
    when position(m.a in m.b) > 0 or position(m.b in m.a) > 0 then true
    else (select count(*) from unnest(m.ma) x where x = any (m.mb))::numeric
         / (select count(*) from (select unnest(m.ma) union select unnest(m.mb)) u)::numeric >= 0.8
  end
  from m
$function$;

revoke execute on function private.reput_meme_question(text, text) from public, anon, authenticated;

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
    if v_avant.id is not null and private.reput_meme_question(concat_ws(' ', r.sujet, r.corps), concat_ws(' ', v_avant.sujet, v_avant.corps)) then
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

create or replace function private.reput_regrouper()
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  x record;
  v_n integer := 0;
begin
  for x in
    select a.id, a.client_id, a.entite_id, a.dossier_id, n.id as recente
    from public.reput_demandes a
    join lateral (select b.id from public.reput_demandes b
                  where b.dossier_id = a.dossier_id and b.id <> a.id and (b.recu_le, b.reception_id) > (a.recu_le, a.reception_id)
                    and b.statut in ('a_valider', 'validee', 'envoyee', 'a_traiter', 'bloquee')
                  order by b.recu_le desc, b.reception_id desc limit 1) n on true
    where a.statut in ('a_valider', 'bloquee') and a.dossier_id is not null   -- c3_28 : une réponse à l'envoi bloqué attend aussi
    limit 100
  loop
    update public.demandes_validation v set statut = 'annulee'
    where v.statut = 'en_attente' and v.id in (select p.demande_validation_id from public.reput_reponses p
                                                where p.demande_id = x.id and p.statut in ('a_valider', 'bloquee'));
    update public.reput_reponses p set statut = 'remplacee', raison = coalesce(p.raison, 'Regroupée : une réponse plus récente couvre le dossier.'),
           maj_le = now()
    where p.demande_id = x.id and p.statut in ('a_valider', 'bloquee');
    update public.reput_demandes d set statut = 'ignoree', regroupee_avec = x.recente,
           motif = 'Regroupée avec le message suivant du même client : une seule réponse, sur son dernier canal.', maj_le = now()
    where d.id = x.id and d.statut in ('a_valider', 'bloquee');
    perform private.journaliser_module(x.client_id, 'reput', 'reput.demande_regroupee', 'reput_demandes', x.id::text,
      jsonb_build_object('dossier', x.dossier_id, 'avec', x.recente), x.entite_id);
    v_n := v_n + 1;
  end loop;
  return v_n;
end $function$;
