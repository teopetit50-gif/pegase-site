-- b6_18 — DALIRO : la relance des avenants non signés au point du matin (session B6, 06/10/2026)
--
-- CE QUE ÇA AJOUTE. La section « Chantiers : réceptions et retenues » du point du matin (b6_15, b6_16) porte
-- désormais, juste après les situations impayées, les avenants qui attendent :
--   · validé (demande approuvée) mais pas signé : « faites-le signer par le maître d'ouvrage avant d'exécuter »,
--     avec le montant HT — attention, critique 14 jours après la soumission. Sans accord écrit, le supplément d'un
--     marché à forfait n'est pas dû (Code civil, art. 1793) ;
--   · soumis, en attente de validation depuis 2 jours ou plus : « décidez dans À valider » — info, attention à 7 jours ;
--   · en préparation depuis 7 jours ou plus : « chiffrez-le et soumettez-le, ou abandonnez-le » — info.
-- Seulement les chantiers en préparation, ouverts ou suspendus. Rien d'autre ne change (le reste de la fonction est
-- celui de b6_16, à l'identique) ; le cron daliro-matin la reprend au prochain passage.
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function private.btp_point_matin_lignes(p_client uuid, p_jour date)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  r record;
  v_items jsonb := '[]'::jsonb;
  v_n integer := 0;
  v_total numeric;
  v_facture numeric;
  v_ouvertes integer;
begin
  -- 0. Les situations en retard de paiement (b6_16) : relancez.
  for r in
    select s.id, s.numero, s.chantier_id, c.nom as chantier_nom, private.btp_encaissement(s.id, p_jour) as e
    from public.btp_situations s join public.btp_chantiers c on c.id = s.chantier_id
    where s.client_id = p_client and s.statut = 'validee' and s.echeance < p_jour
    order by s.echeance, c.nom, s.numero
  loop
    continue when r.e ->> 'etat' <> 'en_retard';
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : situation n° %s impayée depuis %s jour%s, reste dû %s € (indemnité de 40 € due) : relancez', r.chantier_nom, r.numero,
                           r.e ->> 'retard_jours', case when (r.e ->> 'retard_jours')::int > 1 then 's' else '' end,
                           translate(to_char((r.e ->> 'reste_du')::numeric, 'FM999,999,990.00'), ',.', ' ,')), 300),
      'gravite', case when (r.e ->> 'retard_jours')::int >= 30 then 'critique' else 'attention' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 0 bis. Les avenants pas encore signés (b6_18) : un travail supplémentaire exécuté sans accord écrit risque de
  -- ne pas être payé (marché à forfait : Code civil, art. 1793).
  for r in
    select a.id, a.numero, a.objet, a.statut, a.chantier_id, c.nom as chantier_nom,
           (a.cree_le at time zone 'Europe/Paris')::date as cree_jour,
           (a.soumis_le at time zone 'Europe/Paris')::date as soumis_jour,
           d.statut as demande_statut,
           (select coalesce(sum(l.montant_ht), 0) from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree) as montant
    from public.btp_avenants a
    join public.btp_chantiers c on c.id = a.chantier_id
    left join public.demandes_validation d on d.id = a.demande_id
    where a.client_id = p_client and a.statut in ('brouillon', 'soumis') and c.statut in ('preparation', 'ouvert', 'suspendu')
    order by a.soumis_le nulls last, a.cree_le, c.nom, a.numero
  loop
    exit when v_n >= 50;
    if r.statut = 'soumis' and r.demande_statut = 'approuvee' then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » (%s € HT) validé, pas encore signé : faites-le signer par le maître d''ouvrage avant d''exécuter (C. civ. art. 1793)',
                             r.chantier_nom, r.numero, left(r.objet, 60), translate(to_char(r.montant, 'FM999,999,990.00'), ',.', ' ,')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 14 then 'critique' else 'attention' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'soumis' and r.demande_statut = 'en_attente' and r.soumis_jour <= p_jour - 2 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en attente de validation depuis le %s : décidez dans « À valider »',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.soumis_jour, 'DD/MM/YYYY')), 300),
        'gravite', case when r.soumis_jour <= p_jour - 7 then 'attention' else 'info' end,
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    elsif r.statut = 'brouillon' and r.cree_jour <= p_jour - 7 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : avenant n° %s « %s » en préparation depuis le %s : chiffrez-le et soumettez-le, ou abandonnez-le',
                             r.chantier_nom, r.numero, left(r.objet, 60), to_char(r.cree_jour, 'DD/MM/YYYY')), 300),
        'gravite', 'info',
        'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
      v_n := v_n + 1;
    end if;
  end loop;

  -- 1. Les retenues : dues (à réclamer), puis dues dans les 30 jours.
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.retenue_statut = 'bloquee' and (x.retenue_montant > 0 or x.retenue_caution)
      and x.retenue_due_le <= p_jour + 30
    order by x.retenue_due_le, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s %s le %s%s', r.chantier_nom,
                           case when r.retenue_caution then 'caution de retenue de garantie' else 'retenue de garantie de ' || translate(to_char(r.retenue_montant, 'FM999,999,990.00'), ',.', ' ,') || ' €' end,
                           case when r.retenue_due_le <= p_jour then 'due depuis' else 'due' end,
                           to_char(r.retenue_due_le, 'DD/MM/YYYY'),
                           case when r.retenue_due_le <= p_jour then ' : réclamez-la' else '' end), 300),
      'gravite', case when r.retenue_due_le <= p_jour then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 2. Les décomptes finals à envoyer (45 jours après la réception).
  for r in
    select x.*, c.nom as chantier_nom from public.btp_receptions x join public.btp_chantiers c on c.id = x.chantier_id
    where x.client_id = p_client and x.decompte_statut in ('a_preparer', 'projet')
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : décompte final à envoyer %s le %s', r.chantier_nom,
                           case when p_jour > r.date_reception + 45 then 'depuis' else 'avant' end,
                           to_char(r.date_reception + 45, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 30 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 3. Les réserves encore ouvertes.
  for r in
    select x.chantier_id, x.date_reception, c.nom as chantier_nom, count(v.id) as ouvertes
    from public.btp_receptions x
    join public.btp_chantiers c on c.id = x.chantier_id
    join public.btp_reserves v on v.reception_id = x.id and v.statut = 'ouverte'
    where x.client_id = p_client
    group by x.chantier_id, x.date_reception, c.nom
    order by x.date_reception, c.nom
  loop
    exit when v_n >= 50;
    v_items := v_items || jsonb_build_object(
      'texte', left(format('%s : %s réserve%s encore ouverte%s depuis la réception du %s', r.chantier_nom, r.ouvertes,
                           case when r.ouvertes > 1 then 's' else '' end, case when r.ouvertes > 1 then 's' else '' end,
                           to_char(r.date_reception, 'DD/MM/YYYY')), 300),
      'gravite', case when p_jour >= r.date_reception + 60 then 'attention' else 'info' end,
      'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.chantier_id::text);
    v_n := v_n + 1;
  end loop;

  -- 4. Les réceptions à prononcer.
  for r in
    select c.* from public.btp_chantiers c
    where c.client_id = p_client and c.statut in ('ouvert', 'suspendu')
      and not exists (select 1 from public.btp_receptions x where x.chantier_id = c.id)
    order by c.nom
  loop
    exit when v_n >= 50;
    select coalesce(sum(l.montant_ht), 0) into v_total
    from public.btp_lignes_marche l
    where l.nature <> 'option'
      and l.marche_id = (select m.id from public.btp_marches m where m.chantier_id = r.id and m.statut = 'verifie' order by m.verifie_le desc nulls last limit 1);
    v_total := v_total + coalesce((select sum(l.montant_ht) from public.btp_avenants_lignes l join public.btp_avenants a on a.id = l.avenant_id
                                   where a.chantier_id = r.id and a.statut = 'signe' and not l.retiree), 0);
    select s.cumul_ht into v_facture from public.btp_situations s where s.chantier_id = r.id and s.statut = 'validee' order by s.numero desc limit 1;
    if v_total > 0 and coalesce(v_facture, 0) >= v_total * 0.995 then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : travaux facturés à 100 %% par les situations — prononcez la réception', r.nom), 300),
        'gravite', 'attention', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    elsif r.date_fin_prevue is not null and r.date_fin_prevue < p_jour then
      v_items := v_items || jsonb_build_object(
        'texte', left(format('%s : fin prévue le %s dépassée — réception à prononcer ou planning à recaler', r.nom,
                             to_char(r.date_fin_prevue, 'DD/MM/YYYY')), 300),
        'gravite', 'info', 'lien', '/espace/daliro', 'objet_type', 'btp_chantiers', 'objet_id', r.id::text);
      v_n := v_n + 1;
    end if;
  end loop;
  return v_items;
end $function$;

revoke execute on function private.btp_point_matin_lignes(uuid, date) from public, anon, authenticated;
grant execute on function private.btp_point_matin_lignes(uuid, date) to service_role;
