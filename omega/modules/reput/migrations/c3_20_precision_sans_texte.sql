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
