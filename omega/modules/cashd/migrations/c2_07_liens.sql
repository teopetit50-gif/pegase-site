-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_07 : les liens vers le nouvel espace (11/10/2026, session C2)
-- ═══════════════════════════════════════════════════════════════════════════
-- Décision de Teo (11/10) : plus aucun lien vers l'ancien dessin (/espace sans le 2). Les alertes, le point du matin et
-- les demandes de CASHD pointaient vers /espace/cashd ; ils pointent maintenant vers /espace2/cashd/suivi (l'écran
-- des débiteurs et des relances) et /espace2/validations. Seules changent ces adresses : chaque fonction est la copie
-- exacte de sa dernière définition (c2_01 → c2_06), signature comprise. Rejouable ; aucun DROP, aucun DELETE.

-- Fonctions redéfinies : private.cashd_point_lignes.

-- private.cashd_point_lignes (dernière définition : c2_04_textes.sql)
create or replace function private.cashd_point_lignes(p_client uuid, p_jour date)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  v_items jsonb := '[]'::jsonb;
  r record;
  n integer := 0;
  v_a_valider integer;
  v_med integer;
  v_dernier timestamptz;
begin
  -- 1. Ce qui attend la validation ce matin.
  select count(*), count(*) filter (where x.palier = 'mise_en_demeure') into v_a_valider, v_med
  from public.cashd_relances x
  where x.client_id = p_client and x.statut in ('a_valider', 'non_reglee')
    and (x.demande_id is null or exists (select 1 from public.demandes_validation d where d.id = x.demande_id and d.statut = 'en_attente'));
  if v_a_valider > 0 then
    v_items := v_items || jsonb_build_object('texte', format('%s relance%s écrite%s attend%s votre validation%s', v_a_valider,
        case when v_a_valider > 1 then 's' else '' end, case when v_a_valider > 1 then 's' else '' end, case when v_a_valider > 1 then 'ent' else '' end,
        case when v_med > 0 then format(', dont %s mise%s en demeure', v_med, case when v_med > 1 then 's' else '' end) else '' end),
      'gravite', case when v_med > 0 then 'attention' else 'info' end, 'lien', '/espace2/cashd/suivi');
  end if;
  -- 2. Le facturier relu ce matin ?
  select max(f.vue_le) into v_dernier from public.cashd_factures f where f.client_id = p_client and f.source in ('export', 'import');
  if exists (select 1 from public.branchements b where b.client_id = p_client and b.module = 'cashd' and b.statut = 'actif')
     and (v_dernier is null or (v_dernier at time zone 'Europe/Paris')::date < p_jour) then
    v_items := v_items || jsonb_build_object('texte', format('Le facturier n''a pas été relu ce matin%s : les relances partent de l''état connu',
        case when v_dernier is not null then ' (dernier export lu le ' || to_char(v_dernier at time zone 'Europe/Paris', 'DD/MM/YYYY') || ')' else '' end),
      'gravite', 'attention', 'lien', '/espace2/cashd/suivi');
  end if;
  -- 3. Qui doit quoi, où en est la relance (les comptes les plus en retard d'abord).
  for r in
    select b.*, (select s.palier_atteint from public.cashd_suivi s where s.compte_id = b.compte_id and s.palier_atteint is not null
                 order by s.palier_atteint_le desc nulls last limit 1) as palier,
                (select min(s.palier_suivant_le) from public.cashd_suivi s where s.compte_id = b.compte_id and s.palier_suivant is not null) as prochain
    from public.cashd_balance_agee b
    where b.client_id = p_client and b.echu > 0
    order by b.echu_plus_90 + b.echu_61_90 desc, b.echu desc
    limit 10
  loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s doit %s échus (retard le plus ancien : %s jours)%s%s', r.nom, private.cashd_eur(r.echu),
        r.retard_max_jours,
        case when r.statut <> 'actif' then ' — compte ' || replace(r.statut, '_', ' ') else
          case when r.palier is not null then ' — dernier palier : ' || replace(r.palier, '_', ' ') else ' — pas encore relancé' end
          || case when r.prochain is not null then ', suivant le ' || to_char(r.prochain, 'DD/MM') else '' end end,
        case when r.plafond_encours is not null and r.encours > r.plafond_encours then ' ; plafond d''encours dépassé' else '' end), 300),
      'gravite', case when r.retard_max_jours > 60 then 'critique' when r.retard_max_jours > 30 then 'attention' else 'info' end,
      'lien', '/espace2/cashd/suivi', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
    n := n + 1;
  end loop;
  -- 4. Les règlements à lettrer.
  for r in
    select count(*) as n, sum(e.a_imputer) as montant from public.cashd_reglements_etat e where e.client_id = p_client and e.a_imputer > 0 having count(*) > 0
  loop
    v_items := v_items || jsonb_build_object('texte', format('%s règlement%s à rapprocher (%s) : la relance des comptes concernés attend', r.n,
        case when r.n > 1 then 's' else '' end, private.cashd_eur(r.montant)), 'gravite', 'attention', 'lien', '/espace2/cashd/suivi');
  end loop;
  -- 5. Les comptes au-dessus de leur plafond.
  for r in select b.nom, b.encours, b.plafond_encours, b.compte_id from public.cashd_balance_agee b
           where b.client_id = p_client and b.plafond_encours is not null and b.encours > b.plafond_encours order by b.encours - b.plafond_encours desc limit 5 loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s : encours %s pour un plafond de %s — à voir avant toute nouvelle commande', r.nom,
        private.cashd_eur(r.encours), private.cashd_eur(r.plafond_encours)), 300),
      'gravite', 'attention', 'lien', '/espace2/cashd/suivi', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 6. Les comptes qui se dégradent (c2_03).
  for r in select d.nom, d.compte_id, d.delai_recent_jours, d.delai_moyen_jours, d.retard_actuel_jours, d.retard_moyen_jours
           from public.cashd_delais_reglement d where d.client_id = p_client and d.se_degrade order by d.retard_actuel_jours desc limit 5 loop
    v_items := v_items || jsonb_build_object('texte', left(format('%s se dégrade : %s', r.nom,
        case when r.delai_recent_jours > r.delai_moyen_jours + 10 then format('il paie en %s jours ces trois derniers mois, contre %s jours d''habitude', round(r.delai_recent_jours), round(r.delai_moyen_jours))
             else format('%s jours de retard aujourd''hui, contre %s jours en moyenne', r.retard_actuel_jours, round(coalesce(r.retard_moyen_jours, 0))) end), 300),
      'gravite', 'attention', 'lien', '/espace2/cashd/suivi', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 7. Les devis acceptés de vive voix qui ne sont pas encore facturés (c2_04) : l'accord consigné ouvre ce suivi.
  for r in
    select d.id, d.numero, d.accord_oral_le, d.montant_ttc, c.nom, c.id as compte_id
    from public.cashd_factures d
    join public.cashd_comptes c on c.id = d.compte_id
    join public.cashd_reglages g on g.client_id = d.client_id
    where d.client_id = p_client and d.nature = 'devis' and d.accord_oral_le is not null
      and d.accord_oral_le <= p_jour - g.suivi_facturation_jours
      and not exists (select 1 from public.cashd_factures f where f.compte_id = d.compte_id and f.nature in ('facture', 'acompte')
                      and f.date_emission >= d.accord_oral_le)
    order by d.accord_oral_le limit 5
  loop
    v_items := v_items || jsonb_build_object('texte', left(format('Devis %s de %s (%s), accepté de vive voix le %s : rien n''est encore facturé',
        r.numero, r.nom, private.cashd_eur(r.montant_ttc), to_char(r.accord_oral_le, 'DD/MM/YYYY')), 300),
      'gravite', 'attention', 'lien', '/espace2/cashd/suivi', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  -- 8. Les factures qui attendent un bon de commande (c2_04) : le retard continue de courir.
  for r in
    select f.numero, f.attente_commande_le, f.attente_commande_nom, f.attente_commande_email, c.nom, c.id as compte_id,
           greatest(p_jour - f.echeance, 0) as retard
    from public.cashd_factures f join public.cashd_comptes c on c.id = f.compte_id
    where f.client_id = p_client and f.attente_commande_le is not null and f.statut = 'ouverte'
    order by f.attente_commande_le limit 5
  loop
    v_items := v_items || jsonb_build_object('texte', left(format('Facture %s de %s : attend un bon de commande depuis le %s (%s) ; %s jour%s de retard',
        r.numero, r.nom, to_char(r.attente_commande_le, 'DD/MM/YYYY'), coalesce(r.attente_commande_nom, r.attente_commande_email),
        r.retard, case when r.retard > 1 then 's' else '' end), 300),
      'gravite', 'info', 'lien', '/espace2/cashd/suivi', 'objet_type', 'cashd_comptes', 'objet_id', r.compte_id::text);
  end loop;
  return v_items;
end $function$;
