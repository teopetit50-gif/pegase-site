-- 20261011135221 b6_26_chiffrage_lu
-- Source : dépôt : e21dfec omega/modules/daliro/migrations/b6_26_chiffrage_lu.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_26_chiffrage_lu.sql @ e21dfec ; b6_22 cité comme test : ignoré.
-- ═══ omega/modules/daliro/migrations/b6_26_chiffrage_lu.sql @ e21dfec
-- b6_26 — DALIRO : le travail repéré, comparé au marché et chiffré sur vos prix validés (session B6, 11/10/2026)
--
-- LA PROMESSE (/secteurs/btp) : « Daliro repère ces travaux dans les photos et les vocaux de vos équipes, les chiffre
-- sur vos prix unitaires et prépare l'avenant ». b6_24b ouvrait l'avenant brouillon (objet, quantité) SANS prix, et
-- le lecteur ne connaissait pas le marché : il ne pouvait pas dire ce qui était « en plus ».
--
-- CE QUI EST POSÉ.
--   · private.btp_mots_cles(texte) : les mots de 4 lettres ou plus, sans accents, moins les mots vides du terrain
--     (pour, avec, dans, faire, refaire…).
--   · private.btp_prix_pour(client, chantier, texte, unité) : parmi les prix VALIDÉS de la bibliothèque, de la même
--     unité, celui dont la désignation partage le plus de mots-clés avec l'ouvrage lu ; à égalité, celui qui a le
--     moins de mots en trop, puis celui qui vient du marché de CE chantier, puis le plus récent. Deux prix différents à égalité parfaite : « ambigu », rien n'est
--     chiffré, les candidats sont gardés. Rend aussi la ligne du marché vérifié qui partage au moins deux mots-clés
--     avec l'ouvrage, même unité (« proche_du_marche ») : peut-être pas un travail en plus, à vérifier.
--   · btp_demander_lecture : le contexte du lecteur porte les lignes du marché vérifié (désignation et unité, sans
--     prix), dans les 2 000 caractères du contrat d'A1 : le lecteur juge « en plus du marché » sur pièce.
--   · daliro_media_lu : l'avenant brouillon garde le résultat dans origine.chiffrage ; si un prix est trouvé et la
--     quantité lue, la ligne est chiffrée par private.btp_chiffrer_ligne_avenant (prix de bibliothèque, b6_01).
--     L'avenant reste un brouillon : une personne le relit, le soumet, le fait signer. Un refus de chiffrage garde
--     l'avenant (« refus » au journal).
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function private.btp_mots_cles(p text)
 returns text[]
 language sql
 immutable
 set search_path to ''
as $function$
  select coalesce(array_agg(w), '{}')
  from unnest(private.btp_mots_ouvrage(p)) w
  where w <> all (array['pour', 'avec', 'dans', 'sous', 'sans', 'plus', 'moins', 'entre', 'faire', 'refaire', 'fait',
                        'faut', 'etre', 'avoir', 'aussi', 'encore', 'toute', 'tout', 'tous', 'cette', 'celle', 'client',
                        'demande', 'veut', 'voudrait', 'prevu', 'prevue', 'chantier', 'travaux', 'travail'])
$function$;

create or replace function private.btp_prix_pour(p_client uuid, p_chantier uuid, p_texte text, p_unite text)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_unite text := private.btp_unite(p_unite);
  v_mots text[] := private.btp_mots_cles(p_texte);
  v_candidats jsonb;
  v_proche jsonb;
  a jsonb;
  b jsonb;
begin
  if cardinality(v_mots) = 0 then
    return jsonb_build_object('etat', 'sans_mot', 'unite', v_unite);
  end if;
  select jsonb_build_object('ligne', l.id, 'designation', l.designation, 'unite', l.unite) into v_proche
  from public.btp_lignes_marche l join public.btp_marches m on m.id = l.marche_id
  where m.chantier_id = p_chantier and m.statut = 'verifie' and (v_unite is null or l.unite = v_unite)
    and cardinality(array(select unnest(private.btp_mots_cles(l.designation)) intersect select unnest(v_mots))) >= 2
  order by cardinality(array(select unnest(private.btp_mots_cles(l.designation)) intersect select unnest(v_mots))) desc, l.ordre
  limit 1;
  if v_unite is null then
    return jsonb_build_object('etat', 'sans_unite', 'proche_du_marche', v_proche);
  end if;
  select coalesce(jsonb_agg(x order by (x ->> 'score')::int desc, (x ->> 'reste')::int, (x ->> 'local')::boolean desc, x ->> 'date_prix' desc), '[]'::jsonb)
    into v_candidats
  from (select jsonb_build_object('prix', b.id, 'designation', b.designation, 'unite', b.unite, 'prix_unitaire_ht', b.prix_unitaire_ht,
                                  'score', cardinality(array(select unnest(private.btp_mots_cles(b.designation)) intersect select unnest(v_mots))),
                                  'reste', cardinality(array(select unnest(private.btp_mots_cles(b.designation)) except select unnest(v_mots))),
                                  'local', exists (select 1 from public.btp_lignes_marche l where l.id = b.ligne_marche_id and l.chantier_id = p_chantier),
                                  'date_prix', b.date_prix) x
        from public.btp_bibliotheque_prix b
        where b.client_id = p_client and b.statut = 'valide' and b.unite = v_unite) s
  where (x ->> 'score')::int >= 1;
  if jsonb_array_length(v_candidats) = 0 then
    return jsonb_build_object('etat', 'sans_prix', 'unite', v_unite, 'proche_du_marche', v_proche);
  end if;
  a := v_candidats -> 0;
  b := v_candidats -> 1;
  if b is not null and b ->> 'score' = a ->> 'score' and b ->> 'reste' = a ->> 'reste' and b ->> 'local' = a ->> 'local'
     and (b ->> 'prix_unitaire_ht')::numeric <> (a ->> 'prix_unitaire_ht')::numeric then
    return jsonb_build_object('etat', 'ambigu', 'unite', v_unite, 'candidats', jsonb_path_query_array(v_candidats, '$[0 to 2]'),
                              'proche_du_marche', v_proche);
  end if;
  return jsonb_build_object('etat', 'trouve', 'unite', v_unite, 'prix', a -> 'prix', 'designation', a -> 'designation',
                            'prix_unitaire_ht', a -> 'prix_unitaire_ht', 'score', a -> 'score', 'proche_du_marche', v_proche);
end $function$;

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
                                                       and (m.recu_le at time zone 'Europe/Paris')::date between p.debut - 3 and p.fin + 3), '')
                       || coalesce(' ; au marché : ' || (select string_agg(l.designation || coalesce(' (' || l.unite || ')', ''), ' ; ' order by l.ordre)
                                                        from public.btp_lignes_marche l join public.btp_marches mm on mm.id = l.marche_id
                                                        where mm.chantier_id = c.id and mm.statut = 'verifie' and l.nature in ('ouvrage', 'fourniture', 'forfait')), '')), 2000)
      into v_contexte
    from public.btp_chantiers c where c.id = m.chantier_id;
  end if;
  return private.deposer_travail(m.client_id, 'daliro', 'lecteur.media',
    jsonb_build_object('reception', m.reception_id, 'pieces', v_pieces, 'texte', m.texte, 'de_nom', m.de_nom,
                       'contexte', v_contexte, 'retour', 'daliro_media_lu'),
    'media:' || m.reception_id::text, 0::smallint);
end $function$;

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
  v_chiffrage jsonb;
  v_quantite numeric;
  v_lot uuid;
  v_chiffrees integer := 0;
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
        -- b6_26 : le prix validé de la bibliothèque qui correspond à l'ouvrage lu, et la ligne du marché qui lui ressemble.
        v_quantite := case when d ->> 'quantite' ~ '^[0-9]+(\.[0-9]+)?$' then (d ->> 'quantite')::numeric end;
        select l.id into v_lot from public.btp_lots l where l.chantier_id = c.id and l.code = d ->> 'lot_code';
        v_chiffrage := private.btp_prix_pour(c.client_id, c.id, coalesce(d ->> 'texte', v_objet), d ->> 'unite');
        begin
          v_avenant := private.btp_ouvrir_avenant(c.id, v_objet,
            jsonb_build_object('canal', v_canal, 'auteur', m.de_nom, 'date', (m.recu_le at time zone 'Europe/Paris')::date,
                               'texte', left(d -> 'source' ->> 'extrait', 1000), 'message', m.id, 'reception', m.reception_id,
                               'lecteur', true, 'quantite', d -> 'quantite', 'unite', d -> 'unite', 'chiffrage', v_chiffrage));
          v_avenants := v_avenants || v_avenant;
        exception when others then
          v_refus := v_refus || left(sqlerrm, 200);
          continue;
        end;
        if v_chiffrage ->> 'etat' = 'trouve' and v_quantite > 0 then
          begin
            perform private.btp_chiffrer_ligne_avenant(v_avenant, v_quantite, (v_chiffrage ->> 'prix')::uuid, v_lot);
            v_chiffrees := v_chiffrees + 1;
          exception when others then
            v_refus := v_refus || left('chiffrage : ' || sqlerrm, 200);
          end;
        end if;
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
    jsonb_build_object('reception', p_reception, 'avenants', to_jsonb(v_avenants), 'chiffrees', v_chiffrees, 'alertes', v_alertes,
                       'demandes', jsonb_array_length(coalesce(p_lecture -> 'demandes', '[]'::jsonb)), 'refus', to_jsonb(v_refus)), m.entite_id);
  return jsonb_build_object('message', m.id, 'avenants', to_jsonb(v_avenants), 'chiffrees', v_chiffrees, 'alertes', v_alertes, 'refus', to_jsonb(v_refus));
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt) : les deux nouvelles fonctions restent au serveur.
revoke execute on function private.btp_mots_cles(text) from public, anon, authenticated;
grant execute on function private.btp_mots_cles(text) to service_role;
revoke execute on function private.btp_prix_pour(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function private.btp_prix_pour(uuid, uuid, text, text) to service_role;
revoke execute on function private.btp_demander_lecture(uuid) from public, anon, authenticated;
grant execute on function private.btp_demander_lecture(uuid) to service_role;
revoke execute on function public.daliro_media_lu(bigint, jsonb) from public, anon, authenticated;
grant execute on function public.daliro_media_lu(bigint, jsonb) to service_role;
