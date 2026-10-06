-- b6_05 — DALIRO : le compte « à ranger » de l'import du planning (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. private.btp_importer_passages comptait « à ranger » toute ligne du
-- relevé sans équipe ni tiers après rapprochement, y compris une ligne SANS nom
-- d'intervenant dont le lot a un exécutant : or le déclencheur btp_preparer_passage
-- confie justement ce passage à qui exécute le lot (il n'a rien à ranger). Le résultat
-- rendu à l'écran et au journal (daliro.planning_releve) disait « 2 à ranger » pour un
-- seul passage réellement inconnu (relevé par le test b6_01, étape 11 : 153/154).
-- Le reste de la fonction est strictement celui du socle (photographie du 05/10).
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE.

create or replace function private.btp_importer_passages(p_chantier uuid, p_source text, p_lignes jsonb, p_complet boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_client uuid;
  v_entite uuid;
  l jsonb;
  v_ref text;
  v_lot uuid;
  v_lot_tiers uuid;
  v_lot_equipe uuid;
  v_choix record;
  v_equipe uuid;
  v_tiers uuid;
  v_rapprochement text;
  v_id uuid;
  v_version_avant integer;
  v_version_apres integer;
  v_refs text[] := '{}';
  v_crees integer := 0;
  v_mis_a_jour integer := 0;
  v_inchanges integer := 0;
  v_annules integer := 0;
  v_a_ranger integer := 0;
  v_sans_lot integer := 0;
begin
  if p_source not in ('tableur', 'alobees', 'api') then
    raise exception 'Source d''import inconnue : %.', coalesce(p_source, 'vide') using errcode = '22023';
  end if;
  if jsonb_typeof(p_lignes) <> 'array' then
    raise exception 'Les lignes du planning forment un tableau.' using errcode = '22023';
  end if;
  select c.client_id, c.entite_id into v_client, v_entite from public.btp_chantiers c where c.id = p_chantier;
  if v_client is null then
    raise exception 'Chantier introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_planning(v_client, v_entite);

  for l in select * from jsonb_array_elements(p_lignes) loop
    v_ref := nullif(btrim(l ->> 'ref'), '');
    if v_ref is null then
      raise exception 'Chaque ligne du planning porte une ref, celle de la source.' using errcode = '22023';
    end if;
    v_refs := v_refs || v_ref;
    select lo.id, lo.tiers_id, lo.equipe_id into v_lot, v_lot_tiers, v_lot_equipe from public.btp_lots lo
    where lo.chantier_id = p_chantier and lo.code = btrim(l ->> 'lot');
    if v_lot is null then
      v_sans_lot := v_sans_lot + 1;
    end if;
    v_equipe := (l ->> 'equipe_id')::uuid;
    v_tiers := (l ->> 'tiers_id')::uuid;
    v_rapprochement := case when v_equipe is not null or v_tiers is not null then 'manuel' end;
    if v_equipe is null and v_tiers is null and nullif(btrim(l ->> 'intervenant'), '') is not null then
      select * into v_choix from private.btp_choisir_intervenant(v_client, l ->> 'intervenant');
      if v_choix.genre = 'equipe' then v_equipe := v_choix.id; end if;
      if v_choix.genre = 'tiers' then v_tiers := v_choix.id; end if;
      v_rapprochement := v_choix.mode;
    end if;
    -- Sans intervenant ni nom lu, le déclencheur confie le passage à qui exécute le lot (btp_preparer_passage) :
    -- il n'est « à ranger » que si personne n'exécute le lot. Avec un nom lu que personne ne porte : à ranger.
    if v_equipe is null and v_tiers is null
       and not (nullif(btrim(l ->> 'intervenant'), '') is null and (v_lot_tiers is not null or v_lot_equipe is not null)) then
      v_a_ranger := v_a_ranger + 1;
    end if;

    select p.id, p.version into v_id, v_version_avant from public.btp_passages p
    where p.client_id = v_client and p.source = p_source and p.source_ref = v_ref;
    if v_id is null then
      insert into public.btp_passages (client_id, chantier_id, lot_id, equipe_id, tiers_id, intervenant_lu, rapprochement,
                                       tache, debut, fin, exterieur, source, source_ref)
      values (v_client, p_chantier, v_lot, v_equipe, v_tiers, l ->> 'intervenant', v_rapprochement,
              l ->> 'tache', (l ->> 'debut')::date, (l ->> 'fin')::date, (l ->> 'exterieur')::boolean, p_source, v_ref);
      v_crees := v_crees + 1;
    else
      update public.btp_passages p
      set lot_id = coalesce(v_lot, p.lot_id),
          equipe_id = coalesce(v_equipe, case when v_tiers is null then p.equipe_id end),
          tiers_id = coalesce(v_tiers, case when v_equipe is null then p.tiers_id end),
          intervenant_lu = coalesce(l ->> 'intervenant', p.intervenant_lu),
          rapprochement = coalesce(v_rapprochement, p.rapprochement),
          tache = coalesce(l ->> 'tache', p.tache),
          debut = (l ->> 'debut')::date, fin = (l ->> 'fin')::date,
          exterieur = coalesce((l ->> 'exterieur')::boolean, p.exterieur),
          statut = case when p.statut = 'annule' then 'prevu' else p.statut end
      where p.id = v_id
      returning p.version into v_version_apres;
      if v_version_apres > v_version_avant then
        v_mis_a_jour := v_mis_a_jour + 1;
      else
        v_inchanges := v_inchanges + 1;
      end if;
    end if;
  end loop;

  if p_complet then
    update public.btp_passages p set statut = 'annule'
    where p.client_id = v_client and p.chantier_id = p_chantier and p.source = p_source
      and p.source_ref is not null and not (p.source_ref = any (v_refs))
      and p.statut = 'prevu' and p.fin >= current_date;
    get diagnostics v_annules = row_count;
  end if;

  perform private.journaliser(v_client, 'daliro.planning_releve', 'btp_chantiers', p_chantier::text,
    jsonb_build_object('source', p_source, 'lignes', jsonb_array_length(p_lignes), 'crees', v_crees,
                       'mis_a_jour', v_mis_a_jour, 'inchanges', v_inchanges, 'annules', v_annules,
                       'a_ranger', v_a_ranger, 'sans_lot', v_sans_lot), v_entite);
  if v_crees + v_mis_a_jour + v_annules > 0 then
    perform private.publier_evenement(v_client, 'daliro.planning_releve',
      jsonb_build_object('chantier', p_chantier, 'source', p_source, 'crees', v_crees, 'mis_a_jour', v_mis_a_jour,
                         'annules', v_annules),
      'planning:' || p_chantier::text || ':' || to_char(clock_timestamp(), 'YYYYMMDDHH24MISSUS'));
  end if;
  return jsonb_build_object('crees', v_crees, 'mis_a_jour', v_mis_a_jour, 'inchanges', v_inchanges,
                            'annules', v_annules, 'a_ranger', v_a_ranger, 'sans_lot', v_sans_lot);
end $function$

