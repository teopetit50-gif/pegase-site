-- 20261015133816 b6_34_decalage_prevenu
-- Source : dépôt : 8bd8c09 omega/modules/daliro/migrations/b6_34_decalage_prevenu.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_34_decalage_prevenu.sql @ 8bd8c09 ; b6_30 cité comme test : ignoré.
-- ═══ omega/modules/daliro/migrations/b6_34_decalage_prevenu.sql @ 8bd8c09
-- b6_34 — DALIRO : le sous-traitant prévenu quand son passage est décalé (session B6, 15/10/2026)
--
-- LA PROMESSE (/secteurs/btp, Électricité) : « Comme le plaquiste a pris du retard, l'électricien est prévenu à J-2
-- et ne se déplace pas pour rien. » Le recalage (b6_19) déplaçait les passages en aval et le socle remettait leur
-- confirmation à « non demandée » ; mais le sous-traitant qui avait déjà reçu (ou confirmé) l'ancienne date n'en
-- savait rien.
--
-- CE QUI EST POSÉ.
--   · private.btp_appliquer_recalage (b6_19) : pour chaque passage déplacé dont le sous-traitant avait été sollicité
--     (confirmation demandée ou confirmée) et dont le début change, l'événement daliro.passage_decale (clé
--     decale:<passage>:<nouveau début>, une seule fois par date).
--   · private.abonnements : daliro.passage_decale → travail daliro.decalage (module daliro).
--   · private.btp_texte_decalage(client, charge) : « Votre passage du … sur … est décalé au … ; la confirmation vous
--     sera redemandée deux jours avant. » Court, sans lien.
--   · private.btp_envoyer_decalage(travail) : l'envoi par le socle (preparer_envoi), au canal du sous-traitant ; il
--     suit les mêmes règles qu'un J-2 (plages d'envoi, « À valider » sans accord permanent). Rien si le passage
--     n'est plus prévu ou a encore bougé depuis (la clé de l'envoi porte la nouvelle date).
--   · private.btp_ouvrier (b6_24b) : prend aussi les travaux daliro.decalage. Le reste est inchangé.
--
-- Règles de pose : create or replace / where not exists ; rien n'est retiré ni effacé.

insert into private.abonnements (evenement, module, genre)
select 'daliro.passage_decale', 'daliro', 'daliro.decalage'
where not exists (select 1 from private.abonnements a
                  where a.evenement = 'daliro.passage_decale' and a.module = 'daliro' and a.genre = 'daliro.decalage');

create or replace function private.btp_texte_decalage(p_client uuid, p_charge jsonb)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to ''
as $function$
declare
  v_org text;
  v_jours text[] := array['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
  v_mois text[] := array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  v_avant date := (p_charge ->> 'ancien_debut')::date;
  v_apres date := (p_charge ->> 'nouveau_debut')::date;
  v_d1 text;
  v_d2 text;
begin
  select coalesce(to_jsonb(c) ->> 'nom_commercial', to_jsonb(c) ->> 'nom', to_jsonb(c) ->> 'raison_sociale', 'Votre donneur d''ordre')
    into v_org from public.clients c where c.id = p_client;
  v_d1 := v_jours[extract(dow from v_avant)::int + 1] || ' ' || extract(day from v_avant)::int || ' ' || v_mois[extract(month from v_avant)::int];
  v_d2 := v_jours[extract(dow from v_apres)::int + 1] || ' ' || extract(day from v_apres)::int || ' ' || v_mois[extract(month from v_apres)::int];
  return jsonb_build_object(
    'sujet', left(format('Passage décalé au %s — %s', v_d2, coalesce(p_charge ->> 'chantier_nom', 'chantier')), 300),
    'corps', format(E'Bonjour %s,\n\nVotre passage du %s sur le chantier %s%s est décalé au %s : ne vous déplacez pas à l''ancienne date.\n\nLa confirmation vous sera redemandée deux jours avant.\n\n%s',
                    coalesce(p_charge ->> 'tiers_nom', ''), v_d1, coalesce(p_charge ->> 'chantier_nom', ''),
                    case when nullif(btrim(p_charge ->> 'tache'), '') is not null then ' (' || btrim(p_charge ->> 'tache') || ')' else '' end,
                    v_d2, v_org));
end $function$;

create or replace function private.btp_envoyer_decalage(t public.travaux)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_canal text := t.charge ->> 'canal';
  v_adresse text;
  v_texte jsonb;
  v_envoi uuid;
  v_passage public.btp_passages;
begin
  select * into v_passage from public.btp_passages p
  where p.client_id = t.client_id and p.id = (t.charge ->> 'passage')::uuid;
  if v_passage.id is null or v_passage.statut <> 'prevu' or v_passage.debut is distinct from (t.charge ->> 'nouveau_debut')::date then
    return jsonb_build_object('ignore', 'passage absent, plus prévu, ou déplacé encore depuis');
  end if;
  if v_canal is null or v_canal not in ('email', 'whatsapp', 'sms') then
    return jsonb_build_object('ignore', format('canal %s : le bureau prévient lui-même', coalesce(v_canal, 'vide')));
  end if;
  v_adresse := case when v_canal = 'email' then t.charge ->> 'email' else t.charge ->> 'telephone' end;
  v_texte := private.btp_texte_decalage(t.client_id, t.charge);
  v_envoi := private.preparer_envoi(t.client_id, 'daliro', 'btp_passages', v_passage.id::text, v_canal,
    jsonb_build_object('adresse', v_adresse, 'nom', t.charge ->> 'tiers_nom', 'ref', t.charge ->> 'tiers',
                       'professionnel', true, 'langue', 'fr'),
    null, '{}'::jsonb,
    case when v_canal = 'email' then v_texte ->> 'sujet' end,
    case when v_canal = 'email' then v_texte ->> 'corps' else (v_texte ->> 'sujet') || E'\n\n' || (v_texte ->> 'corps') end,
    null::uuid[], 'daliro:decale:' || v_passage.id::text || ':' || (t.charge ->> 'nouveau_debut'),
    v_passage.entite_id, true, false, null::timestamptz, '{}'::jsonb);
  perform private.journaliser(t.client_id, 'daliro.decalage_envoye', 'btp_passages', v_passage.id::text,
    jsonb_build_object('envoi', v_envoi, 'canal', v_canal, 'tiers', t.charge ->> 'tiers',
                       'ancien_debut', t.charge ->> 'ancien_debut', 'nouveau_debut', t.charge ->> 'nouveau_debut'),
    v_passage.entite_id);
  return jsonb_build_object('envoi', v_envoi, 'canal', v_canal, 'statut', (select e.statut from public.envois e where e.id = v_envoi));
end $function$;

create or replace function private.btp_appliquer_recalage(p public.btp_passages, p_nouvelle_fin date, p_motif text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_r jsonb;
  m jsonb;
  v_avant public.btp_passages;
  t public.btp_tiers;
  c public.btp_chantiers;
begin
  perform pg_advisory_xact_lock(hashtextextended('daliro.dependances:' || p.chantier_id::text, 0));
  v_r := private.btp_calculer_recalage(p.id, p_nouvelle_fin);
  for m in select x from jsonb_array_elements(v_r -> 'deplaces') x loop
    select * into v_avant from public.btp_passages where id = (m ->> 'passage_id')::uuid;
    update public.btp_passages
       set debut = (m ->> 'nouveau_debut')::date, fin = (m ->> 'nouveau_fin')::date
     where id = (m ->> 'passage_id')::uuid and statut = 'prevu';
    -- b6_34 : le sous-traitant déjà sollicité pour l'ancienne date est prévenu du décalage (il ne se déplace pas pour rien).
    if v_avant.id is not null and v_avant.statut = 'prevu' and v_avant.tiers_id is not null
       and v_avant.confirmation in ('demandee', 'confirmee') and v_avant.debut is distinct from (m ->> 'nouveau_debut')::date then
      select * into t from public.btp_tiers where id = v_avant.tiers_id;
      select * into c from public.btp_chantiers where id = v_avant.chantier_id;
      if t.id is not null and t.actif and (t.telephone is not null or t.email is not null) then
        perform private.publier_evenement(v_avant.client_id, 'daliro.passage_decale',
          jsonb_build_object('passage', v_avant.id, 'chantier', v_avant.chantier_id, 'chantier_nom', c.nom, 'tiers', t.id, 'tiers_nom', t.nom,
                             'canal', coalesce(t.canal, case when t.telephone is not null then 'whatsapp' else 'email' end),
                             'telephone', t.telephone, 'email', t.email, 'tache', v_avant.tache,
                             'ancien_debut', v_avant.debut, 'nouveau_debut', (m ->> 'nouveau_debut')::date, 'nouveau_fin', (m ->> 'nouveau_fin')::date,
                             'etait', v_avant.confirmation),
          'decale:' || v_avant.id::text || ':' || (m ->> 'nouveau_debut'));
      end if;
    end if;
  end loop;
  if jsonb_array_length(v_r -> 'deplaces') > 0 then
    perform private.journaliser(p.client_id, 'daliro.planning_recale', 'btp_chantiers', p.chantier_id::text,
      jsonb_build_object('passage', p.id, 'nouvelle_fin', p_nouvelle_fin, 'motif', p_motif, 'deplaces', v_r -> 'deplaces'), p.entite_id);
  end if;
  return v_r;
end $function$;

create or replace function private.btp_ouvrier(p_nombre integer default 20)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  t public.travaux;
  v_res jsonb;
  v_rang jsonb;
  v_lecture bigint;
  v_faits integer := 0;
  v_rendus integer := 0;
  v_ignores integer := 0;
begin
  for t in
    select * from private.prendre_travaux(array['daliro.confirmation', 'daliro.reception', 'daliro.decalage'], p_nombre, interval '5 minutes', 'daliro-base')
  loop
    begin
      v_rang := null;
      if t.genre = 'daliro.confirmation' then
        v_res := private.btp_envoyer_demande(t);
      elsif t.genre = 'daliro.decalage' then
        v_res := private.btp_envoyer_decalage(t);
      else
        v_res := case when (t.charge ->> 'reception') ~ '^[0-9]+$' and t.charge ->> 'en_reponse_a' is not null
                      then private.btp_lire_reponse((t.charge ->> 'reception')::bigint)
                      else jsonb_build_object('ignore', 'ne répond à aucun envoi') end;
        if (t.charge ->> 'reception') ~ '^[0-9]+$' then
          v_rang := private.btp_ranger_reception((t.charge ->> 'reception')::bigint);
          if v_rang ? 'message' then
            v_lecture := private.btp_demander_lecture((v_rang ->> 'message')::uuid);
            if v_lecture is not null then
              v_rang := v_rang || jsonb_build_object('lecture', v_lecture);
            end if;
          end if;
          v_res := v_res || jsonb_build_object('fil', v_rang);
        end if;
      end if;
      perform private.finir_travail(t.id, v_res);
      if v_res ? 'ignore' and not coalesce(v_rang ? 'message', false) then v_ignores := v_ignores + 1; else v_faits := v_faits + 1; end if;
    exception when others then
      perform private.echouer_travail(t.id, left(sqlstate || ' ' || sqlerrm, 300), true);
      v_rendus := v_rendus + 1;
    end;
  end loop;
  begin
    perform private.battre_ouvrier('daliro', array['daliro.confirmation', 'daliro.reception', 'daliro.decalage'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores);
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) : tout reste au serveur.
revoke execute on function private.btp_texte_decalage(uuid, jsonb) from public, anon, authenticated;
grant execute on function private.btp_texte_decalage(uuid, jsonb) to service_role;
revoke execute on function private.btp_envoyer_decalage(public.travaux) from public, anon, authenticated;
grant execute on function private.btp_envoyer_decalage(public.travaux) to service_role;
revoke execute on function private.btp_ouvrier(integer) from public, anon, authenticated;
grant execute on function private.btp_ouvrier(integer) to service_role;
