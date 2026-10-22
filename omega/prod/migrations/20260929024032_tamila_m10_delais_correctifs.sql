-- 20260929024032 tamila_m10_delais_correctifs
-- Source : statements de la recette.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : aucune.
create or replace function private.tamila_calculer_delai(p_regle text, p_depart date, p_territoire text, p_residence text)
returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  p public.tamila_regles_procedure;
  g public.regles_delais;
  v_base jsonb;
  v_aug record;
  v_mois integer := 0;
  v_motif text;
  v_incertain text;
  v_brute date;
  v_un_bloc date;
  v_echeance date;
  v_raisons text[] := '{}';
  v_autres jsonb := '[]'::jsonb;
  v_art text;
  v_detail text;
  v_source text;
  e jsonb;
begin
  select * into p from public.tamila_regles_procedure where code = p_regle;
  if not found then
    raise exception 'Règle de procédure inconnue : %.', coalesce(p_regle, 'vide') using errcode = '22023';
  end if;
  if p_territoire in ('nouvelle-caledonie', 'polynesie-francaise', 'wallis-et-futuna') then
    raise exception 'Cette juridiction applique la procédure civile locale : Tamila n''y calcule pas les délais.'
      using errcode = '22023', hint = 'Saisir la date fixée (tamila_poser_date).';
  end if;
  if p_territoire is null or p_territoire not in ('metropole', 'alsace-moselle', 'guadeloupe', 'martinique', 'guyane',
       'la-reunion', 'mayotte', 'saint-barthelemy', 'saint-martin', 'saint-pierre-et-miquelon') then
    raise exception 'Territoire inconnu : %.', coalesce(p_territoire, 'vide') using errcode = '22023';
  end if;
  if p_depart is null then
    raise exception 'Le départ du délai est nécessaire.' using errcode = '22023';
  end if;
  select * into v_aug from private.tamila_augmentation(p_territoire, p_residence);

  -- B5 : la version en vigueur au départ, la date brute et sa prorogation.
  v_base := public.echeance_de(p_regle, p_depart, p_territoire);
  select * into g from public.regles_delais where code = p_regle and version = (v_base ->> 'version')::smallint;
  v_art := case p.regime when 'cpc' then 'art. 915-4' else 'art. 911-2 ancien' end;
  if p.augmentable then
    v_mois := coalesce(v_aug.mois, 0);
    v_motif := v_aug.motif;
    v_incertain := v_aug.incertain;
    if v_incertain is not null then
      v_raisons := array[v_incertain];
    end if;
  else
    v_motif := 'non_augmentable';
  end if;

  select b.brute, b.d_un_bloc into v_brute, v_un_bloc
  from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, v_mois) b;
  v_echeance := public.proroger(v_brute, p_territoire);
  if v_mois = 0 and (v_brute <> (v_base ->> 'brute')::date or v_echeance <> (v_base ->> 'echeance')::date) then
    raise exception 'Le calcul de Tamila et celui de B5 divergent pour % au %.', p_regle, p_depart using errcode = 'XX000';
  end if;

  -- Les autres dates possibles, montrées avec la date retenue (la plus proche).
  if v_un_bloc <> v_brute then
    v_un_bloc := public.proroger(v_un_bloc, p_territoire);
    if v_un_bloc <> v_echeance then
      v_raisons := v_raisons || 'fin_de_mois_augmentation'::text;
      v_autres := v_autres || jsonb_build_object('motif', 'd_un_bloc', 'echeance', v_un_bloc);
    end if;
  end if;
  if v_incertain = 'domicile_inconnu' then
    v_autres := v_autres
      || jsonb_build_object('motif', 'un_mois_de_plus', 'echeance', public.proroger(
           (select b.brute from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, 1) b), p_territoire))
      || jsonb_build_object('motif', 'deux_mois_de_plus', 'echeance', public.proroger(
           (select b.brute from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, 2) b), p_territoire));
  elsif v_incertain = 'etranger_devant_outre_mer' then
    v_autres := v_autres
      || jsonb_build_object('motif', 'deux_mois_de_plus', 'echeance', public.proroger(
           (select b.brute from private.tamila_brute_augmentee(g.quantite, g.unite, p_depart, 2) b), p_territoire));
  end if;
  v_autres := coalesce((select jsonb_agg(x order by (x ->> 'motif') collate "C") from jsonb_array_elements(v_autres) x),
                       '[]'::jsonb);
  v_raisons := array(select r from unnest(v_raisons) r order by r collate "C");

  v_source := case when v_mois > 0 then
    'Augmentation ' || case v_mois when 1 then 'd''un mois' else 'de deux mois' end || ' (' || v_art || ' : '
    || case v_motif
         when 'outre_mer_devant_metropole' then 'partie demeurant outre-mer devant une juridiction de métropole'
         when 'hors_collectivite' then 'partie qui ne demeure pas dans la collectivité de la juridiction'
         when 'etranger' then 'partie demeurant à l''étranger'
         else 'partie demeurant à l''étranger devant une juridiction d''outre-mer, à confirmer' end || ').' end;

  v_detail := g.quantite::text || case g.unite when 'mois' then ' mois' else case when g.quantite > 1 then ' jours' else ' jour' end end
    || ' à compter du ' || private.jour_en_toutes_lettres(p_depart) || ' (CPC, art. ' || p.article
    || case when p.regime = 'cpc2017' then ', dans sa rédaction antérieure au 01/09/2024' else '' end || ')'
    || case v_motif
         when 'outre_mer_devant_metropole' then ', augmentés d''un mois (partie demeurant outre-mer devant une juridiction de métropole, ' || v_art || ')'
         when 'hors_collectivite' then ', augmentés d''un mois (partie qui ne demeure pas dans la collectivité de la juridiction, ' || v_art || ')'
         when 'etranger' then ', augmentés de deux mois (partie demeurant à l''étranger, ' || v_art || ')'
         when 'etranger_devant_outre_mer' then ', augmentés d''un mois (partie demeurant à l''étranger devant une juridiction d''outre-mer, ' || v_art || ')'
         when 'domicile_inconnu' then ', sans augmentation retenue : domicile de la partie à préciser (' || v_art || ')'
         when 'non_augmentable' then ', délai que l''' || v_art || ' n''augmente pas'
         else '' end
    || case when g.unite = 'jours' and v_mois > 0 then ', les mois d''abord, puis les jours (art. 641, al. 3)' else '' end
    || ' : ' || private.jour_en_toutes_lettres(v_brute)
    || case when v_echeance <> v_brute then ', prorogé au ' || private.jour_en_toutes_lettres(v_echeance) || ' (art. 642)' else '' end
    || '.'
    || case when 'domicile_inconnu' = any (v_raisons)
            then ' À confirmer : le domicile de la partie est inconnu ; la date la plus proche est retenue.' else '' end
    || case when 'etranger_devant_outre_mer' = any (v_raisons)
            then ' À confirmer : devant une juridiction d''outre-mer, une partie à l''étranger a un mois (hors de la collectivité) ou deux (à l''étranger) ; un mois est retenu.' else '' end
    || case when 'fin_de_mois_augmentation' = any (v_raisons)
            then ' À confirmer : fin de mois ; calculé d''un bloc, le délai finirait plus tard ; la date la plus proche est retenue.' else '' end;
  for e in select * from jsonb_array_elements(v_autres) loop
    v_detail := v_detail || ' ' || case e ->> 'motif' when 'd_un_bloc' then 'Calculé d''un bloc'
                                                       when 'un_mois_de_plus' then 'Avec un mois de plus'
                                                       else 'Avec deux mois de plus' end
                || ' : ' || private.jour_en_toutes_lettres((e ->> 'echeance')::date) || '.';
  end loop;

  return jsonb_build_object(
    'echeance', v_echeance, 'brute', v_brute, 'base', (v_base ->> 'echeance')::date,
    'regle', p.code, 'version', g.version, 'regime', p.regime, 'article', p.article, 'acte', p.acte, 'sanction', p.sanction,
    'libelle', g.libelle, 'source', g.source_texte, 'source_url', g.source_url,
    'territoire', p_territoire, 'residence', p_residence, 'depart', p_depart,
    'augmentation_mois', v_mois, 'motif_augmentation', v_motif, 'source_augmentation', v_source,
    'raisons', to_jsonb(v_raisons), 'alternatives', v_autres, 'detail', v_detail);
end $$;

create or replace function private.tamila_poser(
  p_dossier public.tamila_dossiers, p_appel public.tamila_appels, p_regle text, p_depart date, p_residence text,
  p_avis uuid, p_raisons text[], p_uid uuid
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  p public.tamila_regles_procedure;
  v_calcul jsonb;
  v_echeance date;
  v_b5 uuid;
  v_id uuid;
begin
  select * into p from public.tamila_regles_procedure where code = p_regle;
  if not found then
    raise exception 'Règle de procédure inconnue : %.', coalesce(p_regle, 'vide') using errcode = '22023';
  end if;
  if p.regime <> p_appel.regime then
    raise exception 'La règle % est celle des appels introduits %, l''appel du dossier a été introduit le % (décret n° 2023-1391, art. 16).',
      p_regle, case p.regime when 'cpc' then 'depuis le 01/09/2024' else 'avant le 01/09/2024' end,
      to_char(p_appel.introduit_le, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if not (p_appel.procedure = any (p.procedures)) then
    raise exception 'La règle % vaut pour la procédure %, l''appel est en procédure « % » : déclarez d''abord son orientation.',
      p_regle, array_to_string(p.procedures, ' ou '), p_appel.procedure using errcode = '22023';
  end if;
  if p_depart is null or p_depart < p_appel.introduit_le then
    raise exception 'Un délai de l''appel ne part pas avant la déclaration d''appel (%).', to_char(p_appel.introduit_le, 'DD/MM/YYYY')
      using errcode = '22023';
  end if;
  v_calcul := private.tamila_calculer_delai(p_regle, p_depart, p_appel.territoire, p_residence);
  v_echeance := (v_calcul ->> 'echeance')::date;

  -- Le délai de B5 : la règle, son calcul et ses rappels ; l'augmentation y entre
  -- comme une date notifiée, avec sa source (les deux dates restent visibles).
  v_b5 := private.poser_delai(p_dossier.client_id, 'tamila', 'tamila_dossier', p_dossier.id::text,
    p.libelle_court || ' (CPC, art. ' || p.article || ')', p_regle, p_depart, p_appel.territoire, '{7,2,0}',
    p_dossier.responsable_id, private.tamila_libelle(p.acte),
    'tamila:' || p_dossier.id::text || ':' || p_regle || ':' || p_depart::text);
  select t.id into v_id from public.tamila_delais t where t.delai_id = v_b5;
  if v_id is not null then
    return v_id;
  end if;
  if (select d.echeance from public.delais d where d.id = v_b5) <> v_echeance then
    perform private.notifier_delai(v_b5, v_echeance, 'Tamila : ' || (v_calcul ->> 'source_augmentation'));
  end if;

  insert into public.tamila_delais (client_id, dossier_id, appel_id, avis_id, delai_id, nature, regle_code, regle_version, acte,
    depart, territoire, residence, augmentation_mois, motif_augmentation, echeance_calculee, echeance_retenue, raisons, calcul,
    statut, responsable_id, cree_par)
  values (p_dossier.client_id, p_dossier.id, p_appel.id, p_avis, v_b5, 'regle', p_regle, (v_calcul ->> 'version')::smallint,
    p.acte, p_depart, p_appel.territoire, p_residence, (v_calcul ->> 'augmentation_mois')::smallint,
    v_calcul ->> 'motif_augmentation', v_echeance, v_echeance,
    array(select r from (select distinct r from unnest(array(select jsonb_array_elements_text(v_calcul -> 'raisons'))
                                                        || coalesce(p_raisons, '{}')) r) x
          order by r collate "C"),
    v_calcul, 'a_confirmer', p_dossier.responsable_id, p_uid)
  returning id into v_id;
  perform private.tamila_deposer_confirmation(v_id);
  return v_id;
end $$;

create or replace function private.tamila_orienter(p_appel uuid, p_procedure text) returns void
language plpgsql volatile security definer set search_path = '' as $$
begin
  if p_procedure is null or p_procedure not in ('a_orienter', 'mise_en_etat', 'bref_delai') then
    raise exception 'Procédure inconnue : %.', coalesce(p_procedure, 'vide') using errcode = '22023';
  end if;
  update public.tamila_appels set procedure = p_procedure, maj_le = now() where id = p_appel and procedure <> p_procedure;
  update public.tamila_delais t
     set raisons = array(select r from (select distinct r from unnest(t.raisons || 'procedure_changee'::text) r) x
                         order by r collate "C")
    from public.tamila_regles_procedure p
   where t.appel_id = p_appel and t.regle_code = p.code and not (p_procedure = any (p.procedures))
     and t.statut in ('a_confirmer', 'confirme', 'rejete') and not ('procedure_changee' = any (t.raisons));
end $$;

create or replace function private.tamila_interrompre(p_delai uuid, p_motif text, p_depuis date) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  t public.tamila_delais;
begin
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'confirme', 'rejete') then
    raise exception 'Ce délai ne court pas : il ne s''interrompt pas.' using errcode = '55000';
  end if;
  if t.nature <> 'regle' or not exists (select 1 from public.tamila_regles_procedure p
                                        where p.code = t.regle_code and p.interruptible) then
    raise exception 'Seuls les délais pour conclure s''interrompent (art. 915-3 ; ancien art. 910-2).' using errcode = '22023';
  end if;
  if p_motif is null or p_motif not in ('mediation', 'conciliation', 'procedure_participative', 'mise_en_etat_simplifiee',
                                        'audience_reglement_amiable', 'a_preciser') then
    raise exception 'Cause d''interruption inconnue : %.', coalesce(p_motif, 'vide') using errcode = '22023';
  end if;
  if p_depuis is null or p_depuis > greatest(private.tamila_aujourdhui(t.territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'L''interruption part d''une date passée ou du jour.' using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais set statut = 'interrompu', interrompu_le = p_depuis, motif_interruption = p_motif where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    perform private.clore_delai(t.delai_id, 'annule',
      'Interrompu (CPC, art. 915-3) : ' || private.tamila_libelle(p_motif) || ' ; l''avocat saisit la nouvelle échéance.');
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.interrompu', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', p_motif, 'depuis', p_depuis));
end $$;

create or replace function private.tamila_declarer_appel(
  p_dossier uuid, p_introduit_le date, p_role text, p_procedure text default 'a_orienter', p_territoire text default null
) returns uuid
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_d public.tamila_dossiers;
  v_a public.tamila_appels;
  v_territoire text;
  v_nouveau boolean := false;
begin
  v_d := private.tamila_dossier_ecrit(p_dossier, false);
  if p_role is null or p_role not in ('appelant', 'intime', 'intervenant_force', 'intervenant_volontaire') then
    raise exception 'Rôle du client inconnu : %.', coalesce(p_role, 'vide') using errcode = '22023';
  end if;
  if p_procedure is null or p_procedure not in ('a_orienter', 'mise_en_etat', 'bref_delai') then
    raise exception 'Procédure inconnue : %.', coalesce(p_procedure, 'vide') using errcode = '22023';
  end if;
  v_territoire := coalesce(p_territoire, v_d.territoire);
  if v_territoire in ('nouvelle-caledonie', 'polynesie-francaise', 'wallis-et-futuna') then
    raise exception 'Cette cour applique la procédure civile locale : Tamila n''y calcule pas les délais ; saisissez les dates fixées.'
      using errcode = '22023';
  end if;
  if v_territoire is null or v_territoire not in ('metropole', 'alsace-moselle', 'guadeloupe', 'martinique', 'guyane',
       'la-reunion', 'mayotte', 'saint-barthelemy', 'saint-martin', 'saint-pierre-et-miquelon') then
    raise exception 'Précisez le siège de la cour d''appel : son calendrier proroge les délais.' using errcode = '22023';
  end if;
  if p_introduit_le is null or p_introduit_le < date '2017-09-01' then
    raise exception 'Tamila calcule les délais des appels introduits depuis le 01/09/2017 ; pour un appel plus ancien, saisissez les dates.'
      using errcode = '22023';
  end if;
  if p_introduit_le > greatest(private.tamila_aujourdhui(v_territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'Un appel ne s''introduit pas dans le futur.' using errcode = '22023';
  end if;

  select * into v_a from public.tamila_appels where dossier_id = p_dossier for update;
  if found then
    if v_a.introduit_le <> p_introduit_le and exists (
         select 1 from public.tamila_delais t where t.appel_id = v_a.id and t.nature = 'regle' and t.statut <> 'annule') then
      raise exception 'Des délais sont posés sur cet appel : annulez-les avant de changer sa date.' using errcode = '55000';
    end if;
    update public.tamila_appels
       set introduit_le = p_introduit_le, role_client = p_role, territoire = v_territoire, maj_le = now()
     where id = v_a.id;
    perform private.tamila_orienter(v_a.id, p_procedure);
  else
    insert into public.tamila_appels (client_id, dossier_id, introduit_le, procedure, role_client, territoire, cree_par)
    values (v_d.client_id, p_dossier, p_introduit_le, p_procedure, p_role, v_territoire, v_uid)
    returning * into v_a;
    v_nouveau := true;
  end if;
  select * into v_a from public.tamila_appels where dossier_id = p_dossier;
  -- La déclaration d'appel fait courir ses délais (908 pour l'appelant), sauf ceux déjà échus.
  if v_nouveau then
    perform private.tamila_appliquer_evenement(v_d, v_a, 'declaration_appel', p_introduit_le, null, '{}', v_uid, true);
  end if;
  perform private.tamila_rejouer_avis(p_dossier, v_uid);
  return v_a.id;
end $$;

create or replace function private.tamila_declarer_acte(p_delai uuid, p_depose_le date, p_piece uuid default null) returns void
language plpgsql volatile security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  t public.tamila_delais;
  v_d public.tamila_dossiers;
begin
  select * into t from public.tamila_delais where id = p_delai;
  if not found then
    raise exception 'Délai introuvable.' using errcode = '42501';
  end if;
  if v_uid is null and p_piece is null then
    raise exception 'Le serveur clôt un délai sur un accusé de dépôt seulement.' using errcode = '42501';
  end if;
  v_d := private.tamila_dossier_ecrit(t.dossier_id, p_piece is null);
  select * into t from public.tamila_delais where id = p_delai for update;
  if t.statut not in ('a_confirmer', 'confirme', 'rejete', 'interrompu') then
    raise exception 'Ce délai est déjà clos ou annulé.' using errcode = '55000';
  end if;
  if p_depose_le is null or p_depose_le < date '2017-09-01'
     or p_depose_le > greatest(private.tamila_aujourdhui(t.territoire), private.tamila_aujourdhui('metropole')) then
    raise exception 'La date du dépôt est un jour passé, ou aujourd''hui.' using errcode = '22023';
  end if;
  if p_piece is not null and not exists (
       select 1 from public.pieces pc
       where pc.id = p_piece and pc.client_id = t.client_id and pc.objet_type = 'tamila_dossier' and pc.objet_id = t.dossier_id::text) then
    raise exception 'Cette pièce n''est pas dans le dossier du délai.' using errcode = '22023';
  end if;
  perform private.tamila_annuler_confirmation(t.id);
  update public.tamila_delais
     set statut = 'clos', acte_depose_le = p_depose_le, motif_cloture = case when p_piece is null then 'declaration' else 'accuse_rpva' end,
         preuve_piece_id = p_piece, clos_par = v_uid, clos_le = now()
   where id = t.id;
  if (select d.statut from public.delais d where d.id = t.delai_id) in ('ouvert', 'depasse') then
    perform private.clore_delai(t.delai_id, 'tenu', null);
  end if;
  if p_piece is not null then
    update public.tamila_avis set statut = 'applique', effet = 'delai_clos' where piece_id = p_piece and statut = 'a_rattacher';
  end if;
  if p_depose_le > t.echeance_retenue then
    perform private.lever_alerte_module(t.client_id, 'tamila', 'critique', 'Acte déposé après l''échéance du délai',
      jsonb_build_object('delai', t.id, 'dossier', t.dossier_id, 'echeance', t.echeance_retenue, 'depose_le', p_depose_le),
      'delai_hors_delai:' || t.id::text, true, t.responsable_id);
  end if;
  perform private.journaliser_module(t.client_id, 'tamila', 'tamila.delai.clos', 'tamila_dossier', t.dossier_id::text,
    jsonb_build_object('delai', t.id, 'motif', case when p_piece is null then 'declaration' else 'accuse_rpva' end,
                       'depose_le', p_depose_le, 'piece', p_piece));
end $$;

revoke all on table public.tamila_regles_procedure from service_role;
grant select on table public.tamila_regles_procedure to authenticated, service_role;
