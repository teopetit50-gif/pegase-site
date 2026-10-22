-- 20261018171839 b1_20_page_presidence
-- Source : dépôt : 38fe581 omega/modules/varelo/migrations/b1_20_page_presidence.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b1_20_page_presidence.sql @ 38fe581 ; fichiers de tests ignorés : omega/tests/varelo/b1_23_page_presidence.sql.
-- ═══ omega/modules/varelo/migrations/b1_20_page_presidence.sql @ 38fe581
-- b1_20 — VARELO : la page du groupe dans le point du matin de la présidence (18/10/2026, B1, chantier 3)
-- Après b1_17 (remplace private.grp_lignes_groupe ; même signature, mêmes droits).
--
-- CE QUE ÇA CORRIGE. /secteurs/groupes promet à 7 h « Le groupe sur une page » : « ventes, trésorerie et écarts
-- de chaque société, sur une seule page ». La section « Le groupe ce matin » ne disait que les alertes (trésorerie
-- sous le plancher, ventes sous l'objectif, caisses en baisse) et les balances anciennes « à redéposer » : sur les
-- trois groupes aux comptes publiés (omega/banc/varelo_groupes_publics.sql), la présidence n'aurait lu que
-- « à redéposer », jamais un chiffre.
--
-- CE QUI EST POSÉ. private.grp_lignes_groupe(p_client) rend, dans cet ordre et au plus 15 lignes :
--   1. le total du groupe : ventes et résultat cumulés, nombre de sociétés, trésorerie (ou « non publiée ») ;
--   2. les alertes, inchangées (trésorerie sous le plancher, ventes sous l'objectif à date, caisses en baisse,
--      magasin muet) : elles passent avant le reste et ne sont jamais coupées par lui ;
--   3. une ligne par société : ventes à date, écart sur l'an dernier, résultat, trésorerie ;
--   4. les balances anciennes de plus de 35 jours « à redéposer », sauf celles tirées des comptes annuels publiés
--      (source « Comptes annuels publiés… ») : leur date est celle de l'exercice clos, dite dans la ligne 3 ;
--   5. le total des caisses d'hier.
-- La trésorerie d'une balance aux comptes publiés est « non publiée » (le jeu ouvert ne la donne pas), jamais 0 €.
-- Idempotent (create or replace). Rien n'est supprimé.

create or replace function private.grp_lignes_groupe(p_client uuid)
 returns jsonb
 language plpgsql
 stable
 set search_path to ''
as $function$
declare
  r record;
  v_alertes jsonb := '[]'::jsonb;
  v_societes jsonb := '[]'::jsonb;
  v_anciennes jsonb := '[]'::jsonb;
  v_total jsonb;
  v_caisses jsonb;
  v jsonb := '[]'::jsonb;
  e jsonb;
  v_publie boolean;
  n_soc integer := 0;
  n_publies integer := 0;
  t_ventes numeric := 0;
  t_resultat numeric := 0;
  t_treso numeric := 0;
begin
  for r in select g.* from public.grp_groupe_page g where g.client_id = p_client order by g.societe loop
    v_publie := coalesce(r.source, '') ~ '^Comptes annuels publiés';
    n_soc := n_soc + 1;
    t_ventes := t_ventes + r.ventes;
    t_resultat := t_resultat + r.resultat;
    if v_publie then
      n_publies := n_publies + 1;
    else
      t_treso := t_treso + r.tresorerie;
    end if;
    if r.sous_plancher then
      v_alertes := v_alertes || jsonb_build_object('texte', left(format('%s : trésorerie de %s €, sous son plancher de %s € (balance au %s)', r.societe,
               private.grp_euros(r.tresorerie), private.grp_euros(r.tresorerie_plancher), to_char(r.arrete_le, 'DD/MM')), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
    end if;
    if r.objectif_a_date is not null and r.objectif_a_date > 0 and r.ecart_objectif < -0.10 * r.objectif_a_date then
      v_alertes := v_alertes || jsonb_build_object('texte', left(format('%s : ventes de %s € au %s, %s € sous l''objectif à date', r.societe,
               private.grp_euros(r.ventes), to_char(r.arrete_le, 'DD/MM'), private.grp_euros(-r.ecart_objectif)), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
    end if;
    v_societes := v_societes || jsonb_build_object('texte', left(format('%s : ventes %s € %s%s ; résultat %s € ; trésorerie %s', r.societe,
             private.grp_euros(r.ventes),
             case when v_publie then format('(exercice clos le %s, derniers comptes publiés)', to_char(r.arrete_le, 'DD/MM/YYYY'))
                  else format('au %s', to_char(r.arrete_le, 'DD/MM')) end,
             case when r.ecart_n1_pct is not null
                  then format(', %s%s %% sur l''an dernier', case when r.ecart_n1_pct >= 0 then '+' else '' end, replace(r.ecart_n1_pct::text, '.', ','))
                  else '' end,
             private.grp_euros(r.resultat),
             case when v_publie then 'non publiée' else private.grp_euros(r.tresorerie) || ' €' end), 300),
           'gravite', 'info', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
    if r.age_jours > 35 and not v_publie then
      v_anciennes := v_anciennes || jsonb_build_object('texte', left(format('La balance générale de %s date du %s (%s jours) : à redéposer', r.societe,
               to_char(r.arrete_le, 'DD/MM'), r.age_jours), 300),
             'gravite', 'info', 'lien', '/espace/varelo', 'objet_type', 'grp_balances_depots', 'objet_id', r.depot_id::text);
    end if;
  end loop;
  -- b1_17 : les caisses d'hier
  for r in
    select m.entite_id, m.societe, sum(m.hier_ttc) as hier, sum(m.semaine_derniere_ttc) as avant,
           count(*) filter (where m.hier_ttc is not null) as magasins
    from public.grp_ventes_magasins m where m.client_id = p_client
    group by m.entite_id, m.societe order by m.societe
  loop
    if r.avant is not null and r.avant > 0 and coalesce(r.hier, 0) < 0.8 * r.avant then
      v_alertes := v_alertes || jsonb_build_object('texte', left(format('%s : caisses d''hier à %s € TTC, %s %% sous le même jour de la semaine dernière (%s €)', r.societe,
               private.grp_euros(coalesce(r.hier, 0)), round(100 * (1 - coalesce(r.hier, 0) / r.avant)), private.grp_euros(r.avant)), 300),
             'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
    end if;
  end loop;
  for r in
    select m.* from public.grp_ventes_magasins m
    where m.client_id = p_client and m.hier_ttc is null and coalesce(m.semaine_derniere_ttc, 0) > 0
    order by m.societe, m.magasin
  loop
    v_alertes := v_alertes || jsonb_build_object('texte', left(format('%s (%s) : aucune vente remontée hier, alors qu''il vendait %s € le même jour la semaine dernière',
             r.magasin, r.societe, private.grp_euros(r.semaine_derniere_ttc)), 300),
           'gravite', 'attention', 'lien', '/espace/varelo', 'objet_type', 'grp_societes', 'objet_id', r.entite_id::text);
  end loop;
  select jsonb_build_object('texte', format('Caisses d''hier : %s € TTC pour le groupe, %s magasin%s', private.grp_euros(sum(m.hier_ttc)),
           count(*), case when count(*) > 1 then 's' else '' end), 'gravite', 'info', 'lien', '/espace/varelo')
    into v_caisses from public.grp_ventes_magasins m where m.client_id = p_client and m.hier_ttc is not null having count(*) > 0;

  if n_soc > 0 then
    v_total := jsonb_build_object('texte', left(format('Le groupe : ventes %s €, résultat %s €, %s société%s ; trésorerie %s', private.grp_euros(t_ventes),
             private.grp_euros(t_resultat), n_soc, case when n_soc > 1 then 's' else '' end,
             case when n_publies = n_soc then 'non publiée (comptes annuels publiés)'
                  when n_publies > 0 then format('%s € hors %s société%s aux comptes publiés', private.grp_euros(t_treso), n_publies, case when n_publies > 1 then 's' else '' end)
                  else private.grp_euros(t_treso) || ' €' end), 300),
           'gravite', 'info', 'lien', '/espace/varelo');
    v := v || v_total;
  end if;
  -- les alertes d'abord, puis le reste tant qu'il y a de la place
  for e in select x from jsonb_array_elements(v_alertes || v_societes || v_anciennes || coalesce(v_caisses, '[]'::jsonb)) with ordinality as t(x, i) order by i loop
    exit when jsonb_array_length(v) >= 15;
    v := v || e;
  end loop;
  return v;
end $function$;

revoke execute on function private.grp_lignes_groupe(uuid) from public, anon;
grant execute on function private.grp_lignes_groupe(uuid) to authenticated, service_role;
