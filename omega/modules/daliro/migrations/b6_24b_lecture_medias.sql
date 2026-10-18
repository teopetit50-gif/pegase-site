-- b6_24b — DALIRO : correction de l'ouvrier (b6_24) et lecture des photos et vocaux par le lecteur (session B6, 06/10/2026)
--
-- 1. CORRECTION. b6_24 retirait la clé « ignore » du résultat du travail daliro.reception dès que le message était
--    rangé : test_b6_03 n° 20 attend « ne répond à aucun envoi » pour une réception qui ne répond à aucun envoi.
--    La lecture J-2 garde désormais son résultat tel quel ; le rangement est rendu à côté, sous « fil ». Seul le
--    compteur de l'ouvrier compte comme fait un message rangé.
-- 2. LECTURE (contrat d'A1, omega/CONTRAT-MEDIA.md, lecteur v29). Un message rangé (ou à ranger) qui porte des
--    photos ou des vocaux dépose un travail lecteur.media (module daliro, clé media:<réception>, six médias au plus),
--    avec pour contexte le chantier et ses passages en cours. Le lecteur transcrit les vocaux (si la transcription est
--    branchée), regarde les photos, et rend la lecture à public.daliro_media_lu(p_reception, p_lecture), réservée au
--    serveur :
--      · la lecture est gardée sur le message (btp_messages.lecture) : le fil montre transcription, résumé, demandes ;
--      · chaque demande « travail_supplementaire » VÉRIFIÉE (extrait retrouvé mot pour mot dans le texte ou la
--        transcription) d'un message rangé ouvre un avenant BROUILLON (origine : canal vocal/photo, auteur, date,
--        extrait, message) ; une demande tirée d'une photo, non vérifiée, reste « à confirmer » dans le fil et
--        s'ouvre à la main (btp_avenant_depuis_message). Rien n'est chiffré ni signé sans une personne ;
--      · une demande « probleme » vérifiée lève une alerte au conducteur du chantier.
--
-- Règles de pose : alter … add column if not exists / create or replace ; rien n'est retiré ni effacé.

alter table public.btp_messages add column if not exists lecture jsonb;
alter table public.btp_messages add column if not exists lu_le timestamptz;
alter table public.btp_messages add column if not exists avenants uuid[] not null default '{}';

-- ─────────────────────────────────────────────────────────────────────────
-- Demander la lecture d'un message
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_demander_lecture(p_message uuid)
 returns bigint
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_messages;
  v_pieces jsonb;
  v_contexte text;
begin
  select * into m from public.btp_messages where id = p_message;
  if not found then
    return null;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('chemin', x ->> 'chemin', 'mime', x ->> 'mime', 'nom', x ->> 'nom',
                                               'vocal', coalesce((x ->> 'vocal')::boolean, false)) order by o), '[]'::jsonb)
    into v_pieces
  from (select x, o from jsonb_array_elements(m.pieces) with ordinality t(x, o)
        where coalesce(x ->> 'mime', '') like 'image/%' or coalesce(x ->> 'mime', '') like 'audio/%'
        order by o limit 6) s;
  if jsonb_array_length(v_pieces) = 0 then
    return null;
  end if;
  if m.chantier_id is not null then
    select left(format('chantier %s (%s)%s', c.nom, c.commune,
                       coalesce(' ; en cours : ' || (select string_agg(coalesce(p.tache, 'passage') || coalesce(' (lot ' || l.code || ' ' || l.libelle || ')', ''), ', ')
                                                     from public.btp_passages p left join public.btp_lots l on l.id = p.lot_id
                                                     where p.chantier_id = c.id and p.statut = 'prevu'
                                                       and (m.recu_le at time zone 'Europe/Paris')::date between p.debut - 3 and p.fin + 3), '')), 2000)
      into v_contexte
    from public.btp_chantiers c where c.id = m.chantier_id;
  end if;
  return private.deposer_travail(m.client_id, 'daliro', 'lecteur.media',
    jsonb_build_object('reception', m.reception_id, 'pieces', v_pieces, 'texte', m.texte, 'de_nom', m.de_nom,
                       'contexte', v_contexte, 'retour', 'daliro_media_lu'),
    'media:' || m.reception_id::text, 0::smallint);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- L'ouvrier : la réponse J-2 (b6_07, résultat inchangé), le rangement (b6_24), la lecture (b6_24b)
-- ─────────────────────────────────────────────────────────────────────────
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
    select * from private.prendre_travaux(array['daliro.confirmation', 'daliro.reception'], p_nombre, interval '5 minutes', 'daliro-base')
  loop
    begin
      v_rang := null;
      if t.genre = 'daliro.confirmation' then
        v_res := private.btp_envoyer_demande(t);
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
    perform private.battre_ouvrier('daliro', array['daliro.confirmation', 'daliro.reception'],
      jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores), interval '15 minutes');
  exception when others then
    raise notice 'battre_ouvrier : %', sqlerrm;
  end;
  return jsonb_build_object('faits', v_faits, 'rendus', v_rendus, 'ignores', v_ignores);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- La porte de retour du lecteur
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.daliro_media_lu(p_reception bigint, p_lecture jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  m public.btp_messages;
  c public.btp_chantiers;
  d jsonb;
  v_avenant uuid;
  v_avenants uuid[] := '{}';
  v_alertes integer := 0;
  v_canal text;
  v_objet text;
  v_refus text[] := '{}';
begin
  if not private.btp_est_serveur() then
    raise exception 'Réservé au lecteur d''Omega.' using errcode = '42501';
  end if;
  if p_lecture is null or jsonb_typeof(p_lecture) <> 'object' then
    raise exception 'Lecture absente ou illisible.' using errcode = '22023';
  end if;
  select * into m from public.btp_messages where reception_id = p_reception for update;
  if not found then
    return jsonb_build_object('ignore', 'aucun message de chantier pour cette réception');
  end if;
  if m.lu_le is not null then
    return jsonb_build_object('ignore', 'déjà lue', 'message', m.id);
  end if;
  update public.btp_messages set lecture = p_lecture - 'cout_eur' - 'appels_ia', lu_le = now(), maj_le = now() where id = m.id;
  select * into c from public.btp_chantiers where id = m.chantier_id;

  if m.statut = 'range' and c.id is not null then
    for d in select x from jsonb_array_elements(coalesce(p_lecture -> 'demandes', '[]'::jsonb)) x loop
      continue when coalesce((d ->> 'verifiee')::boolean, false) is not true;
      if d ->> 'nature' = 'travail_supplementaire' then
        v_canal := case when coalesce((d -> 'source' ->> 'media')::integer, 0) = 0 then m.canal
                        when exists (select 1 from jsonb_array_elements(coalesce(p_lecture -> 'medias', '[]'::jsonb)) y
                                     where (y ->> 'n')::integer = (d -> 'source' ->> 'media')::integer and y ->> 'nature' = 'vocal') then 'vocal'
                        else 'photo' end;
        v_objet := left(btrim(coalesce(d ->> 'texte', '')
                              || coalesce(' — ' || nullif(translate(regexp_replace(d ->> 'quantite', '\.0+$', ''), '.', ','), '') || coalesce(' ' || nullif(d ->> 'unite', ''), ''), '')
                              || coalesce(' (' || nullif(d ->> 'lieu', '') || ')', '')), 500);
        continue when v_objet = '';
        begin
          v_avenant := private.btp_ouvrir_avenant(c.id, v_objet,
            jsonb_build_object('canal', v_canal, 'auteur', m.de_nom, 'date', (m.recu_le at time zone 'Europe/Paris')::date,
                               'texte', left(d -> 'source' ->> 'extrait', 1000), 'message', m.id, 'reception', m.reception_id,
                               'lecteur', true, 'quantite', d -> 'quantite', 'unite', d -> 'unite'));
          v_avenants := v_avenants || v_avenant;
        exception when others then
          v_refus := v_refus || left(sqlerrm, 200);
        end;
      elsif d ->> 'nature' = 'probleme' then
        begin
          perform private.lever_alerte_module(m.client_id, 'daliro_terrain', 'attention',
            left(format('%s : %s (signalé par %s)', c.nom, d ->> 'texte', coalesce(m.de_nom, 'le terrain')), 150),
            jsonb_build_object('chantier', c.id, 'message', m.id, 'extrait', d -> 'source' ->> 'extrait'),
            'probleme:' || m.id::text || ':' || md5(coalesce(d ->> 'texte', '')), true, c.conducteur_id);
          v_alertes := v_alertes + 1;
        exception when others then
          v_refus := v_refus || left(sqlerrm, 200);
        end;
      end if;
    end loop;
    if cardinality(v_avenants) > 0 then
      update public.btp_messages set avenants = avenants || v_avenants, avenant_id = coalesce(avenant_id, v_avenants[1]), maj_le = now()
      where id = m.id;
    end if;
  end if;
  perform private.journaliser(m.client_id, 'daliro.media_lu', 'btp_messages', m.id::text,
    jsonb_build_object('reception', p_reception, 'avenants', to_jsonb(v_avenants), 'alertes', v_alertes,
                       'demandes', jsonb_array_length(coalesce(p_lecture -> 'demandes', '[]'::jsonb)), 'refus', to_jsonb(v_refus)), m.entite_id);
  return jsonb_build_object('message', m.id, 'avenants', to_jsonb(v_avenants), 'alertes', v_alertes, 'refus', to_jsonb(v_refus));
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.btp_demander_lecture(uuid) from public, anon, authenticated;
revoke execute on function private.btp_ouvrier(integer) from public, anon, authenticated;
grant execute on function private.btp_demander_lecture(uuid) to service_role;
grant execute on function private.btp_ouvrier(integer) to service_role;
revoke execute on function public.daliro_media_lu(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.daliro_media_lu(bigint, jsonb) to service_role;
