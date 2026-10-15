-- b1_03_proposer_nom_unique — VARELO : un seul nom proposé à la fois pour un objet du groupe
-- Session B1, 06/10/2026. Pose : coordinateur, recette ygwbgpowzlbdaajlsqkn, puis production. Après b1_02.
--
-- CE QUE ÇA CORRIGE (test b1_05, 4e assertion, rouge le 06/10) :
--   private.grp_proposer refuse une seconde proposition sur un CODE qui en attend déjà une, et une seconde
--   fusion d'un même objet ; mais « renommer » ne porte aucun code (v_bougent vide) : deux personnes pouvaient
--   ouvrir deux demandes renommer_objet sur le même objet, le référent décidait deux fois et la dernière
--   exécutée écrasait l'autre sans que personne le voie. Même règle que pour les codes : tant qu'un nom
--   proposé attend sa décision, un autre nom pour le même objet est refusé (23514, même message).
-- Le corps est celui de la recette (photographie du 05/10, omega/SOCLE-EXTRAITS-VARELO.sql), une condition
-- ajoutée dans le test d'unicité, rien d'autre. Même signature, même retour, pas de DROP.

CREATE OR REPLACE FUNCTION private.grp_proposer(p_genre text, p_code uuid, p_codes uuid[], p_source uuid, p_cible uuid, p_nom text, p_raison text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  c public.grp_ref_codes;
  o public.grp_ref_objets;
  oc public.grp_ref_objets;
  v_client uuid;
  v_nature text;
  v_entite uuid;
  v_source uuid := p_source;
  v_cible uuid := p_cible;
  v_bougent uuid[] := '{}';
  v_type text;
  v_cle text;
  v_prop uuid;
  v_d uuid;
  v_resume text;
begin
  if v_uid is null then
    raise exception 'Une correction du référentiel est proposée par une personne connectée.' using errcode = '42501';
  end if;
  if p_genre in ('deplacer', 'detacher') then
    select * into c from public.grp_ref_codes k where k.id = p_code;
    if not found then
      raise exception 'Code introuvable.' using errcode = 'P0002';
    end if;
    v_client := c.client_id;
    v_nature := c.nature;
    v_entite := c.entite_id;
    v_bougent := array[c.id];
    if p_genre = 'detacher' then v_cible := c.objet_id; else v_source := c.objet_id; end if;
  else
    select * into o from public.grp_ref_objets k where k.id = coalesce(v_source, v_cible);
    if not found then
      raise exception 'Objet introuvable.' using errcode = 'P0002';
    end if;
    v_client := o.client_id;
    v_nature := o.nature;
    if p_genre = 'fusionner' then
      select coalesce(array_agg(y.id), '{}') into v_bougent from public.grp_ref_codes y where y.objet_id = v_source;
    elsif p_genre = 'scinder' then
      v_bougent := coalesce(p_codes, '{}');
    end if;
  end if;
  if not exists (select 1 from public.comptes k where k.user_id = v_uid and k.client_id = v_client
                 and k.role in ('gerant', 'admin', 'valideur', 'collaborateur')) then
    raise exception 'Seul un membre qui agit (gérant, administrateur, valideur, collaborateur) propose une correction.'
      using errcode = '42501';
  end if;
  if exists (select 1 from public.grp_ref_codes y where y.id = any (v_bougent)
             and not private.voit_entite(y.client_id, y.entite_id)) then
    raise exception 'Un des codes concernés est hors de votre périmètre.' using errcode = '42501';
  end if;
  select * into oc from public.grp_ref_objets k where k.id = v_cible and k.client_id = v_client and k.nature = v_nature;
  if not found or oc.statut <> 'actif' then
    raise exception 'L''objet d''arrivée n''est pas un objet actif du même référentiel.' using errcode = '23514';
  end if;
  if p_genre = 'deplacer' then
    if c.etat not in ('nouveau', 'confirme') then
      raise exception 'Ce code attend déjà la validation de son rattachement.' using errcode = '23514';
    end if;
    if c.objet_id = v_cible then
      raise exception 'Ce code est déjà rattaché à cet objet.' using errcode = '23514';
    end if;
    if not private.grp_code_compatible(c.id, v_cible) then
      raise exception 'Deux identifiants se contredisent (SIREN, TVA ou GTIN) : ce code n''entre pas dans cet objet.' using errcode = '23514';
    end if;
  elsif p_genre = 'fusionner' then
    if v_source = v_cible or o.statut <> 'actif' then
      raise exception 'On fusionne deux objets actifs et distincts.' using errcode = '23514';
    end if;
    if exists (select 1 from public.grp_ref_codes y where y.objet_id = v_source and y.etat = 'propose') then
      raise exception 'L''objet a des rattachements qui attendent leur validation.' using errcode = '23514';
    end if;
    if not private.grp_objets_compatibles(v_source, v_cible) then
      raise exception 'Deux identifiants se contredisent (SIREN, TVA ou GTIN) : ces objets ne fusionnent pas.' using errcode = '23514';
    end if;
  elsif p_genre = 'detacher' then
    if not exists (select 1 from public.grp_ref_codes y where y.objet_id = v_cible and y.id <> c.id) then
      raise exception 'On ne détache pas le dernier code d''un objet.' using errcode = '23514';
    end if;
  elsif p_genre = 'scinder' then
    if cardinality(v_bougent) = 0
       or exists (select 1 from unnest(v_bougent) as k(id) left join public.grp_ref_codes y on y.id = k.id
                  where y.objet_id is distinct from v_cible) then
      raise exception 'Les codes à scinder appartiennent à l''objet.' using errcode = '23514';
    end if;
    if not exists (select 1 from public.grp_ref_codes y where y.objet_id = v_cible and not (y.id = any (v_bougent))) then
      raise exception 'Une scission laisse au moins un code à l''objet.' using errcode = '23514';
    end if;
    if exists (select 1 from public.grp_ref_codes y where y.id = any (v_bougent) and y.etat = 'propose') then
      raise exception 'Un des codes attend encore sa validation.' using errcode = '23514';
    end if;
  elsif p_genre = 'renommer' then
    if nullif(btrim(p_nom), '') is null or char_length(btrim(p_nom)) > 200 then
      raise exception 'Un nom du groupe tient en 1 à 200 caractères.' using errcode = '22023';
    end if;
  else
    raise exception 'Correction inconnue : %.', coalesce(p_genre, 'vide') using errcode = '22023';
  end if;
  if exists (select 1 from public.grp_ref_propositions q
             where q.client_id = v_client and q.statut = 'a_valider'
               and ((q.code_id is not null and q.code_id = any (v_bougent))
                 or (q.genre = 'fusionner' and q.objet_source = v_source)
                 -- b1_03 (06/10/2026) : un nom proposé attend sa décision avant qu'un autre le remplace
                 or (p_genre = 'renommer' and q.genre = 'renommer' and q.objet_cible = v_cible))) then
    raise exception 'Une proposition attend déjà une décision pour ce code ou cet objet.' using errcode = '23514';
  end if;
  v_type := case p_genre when 'detacher' then 'detacher_code' when 'scinder' then 'scinder_objet'
                         when 'renommer' then 'renommer_objet' else 'fusionner_objets' end;
  if p_genre in ('deplacer', 'fusionner') and v_nature = 'fournisseur' and private.grp_iban_differents(v_source, v_cible) then
    v_type := 'rattacher_iban_different';
  end if;
  v_cle := case p_genre
    when 'deplacer' then 'c:' || c.id::text || '>' || v_cible::text
    when 'fusionner' then 'o:' || least(v_source, v_cible)::text || '|' || greatest(v_source, v_cible)::text
    when 'detacher' then 'd:' || c.id::text || '<' || v_cible::text
    when 'scinder' then 's:' || v_cible::text
    else 'n:' || v_cible::text end;
  insert into public.grp_ref_propositions (client_id, nature, genre, preuve, type_action, code_id, codes, objet_source, objet_cible,
                                           nom, regle, raisons, cle_paire, empreinte)
  values (v_client, v_nature, p_genre, 'humaine', v_type, case when p_genre in ('deplacer', 'detacher') then c.id end,
          case when p_genre = 'scinder' then v_bougent end, case when p_genre in ('deplacer', 'fusionner') then v_source end,
          v_cible, case when p_genre = 'renommer' then btrim(p_nom) end, 'humain',
          jsonb_build_array(jsonb_build_object('critere', 'humain', 'raison', left(coalesce(p_raison, ''), 500))),
          v_cle, private.grp_empreinte_codes(v_cle, v_bougent))
  returning id into v_prop;
  v_resume := case p_genre
    when 'deplacer' then format('Référentiel : rattacher un code de la société à %s.', oc.code_groupe)
    when 'fusionner' then format('Référentiel : fusionner %s dans %s.', o.code_groupe, oc.code_groupe)
    when 'detacher' then format('Référentiel : détacher un code de %s.', oc.code_groupe)
    when 'scinder' then format('Référentiel : scinder %s, %s code(s) sous un nouveau code du groupe.', oc.code_groupe, cardinality(v_bougent))
    else format('Référentiel : renommer %s.', oc.code_groupe) end;
  insert into public.demandes_validation (client_id, entite_id, module, type_action, objet_type, objet_id, resume, payload, cle_idempotence)
  values (v_client, case when p_genre in ('deplacer', 'detacher') then v_entite end, 'varelo', v_type, 'grp_referentiel', v_prop::text,
          v_resume, jsonb_build_object('proposition', v_prop, 'genre', p_genre, 'raison', left(coalesce(p_raison, ''), 500)),
          'varelo:' || v_type || ':' || v_prop::text)
  returning id into v_d;
  update public.grp_ref_propositions set demande_id = v_d where id = v_prop;
  return v_d;
end $function$;
