-- b6_30 — DALIRO : le point mensuel, travaux repérés → signés → facturés (session B6, 11/10/2026)
--
-- LA PROMESSE (/secteurs/btp, formules Chantiers et Entreprise) : « Point mensuel — Chaque mois, nous rapprochons
-- les travaux repérés des travaux facturés. » Les données existaient (avenants, situations) ; aucun relevé.
--
-- CE QUI EST POSÉ.
--   · public.btp_point_mensuel(client, mois) : pour chaque chantier qui a bougé dans le mois (ouvert, suspendu ou
--     réceptionné), et au total :
--       reperes     : avenants ouverts dans le mois depuis une photo ou un vocal (origine.lecteur), nombre et montant ;
--       saisis      : avenants ouverts dans le mois par le bureau ;
--       signes      : avenants signés dans le mois, nombre et montant ;
--       a_relancer  : avenants en préparation ou soumis depuis plus de 14 jours (à la fin du mois), nombre et montant ;
--       perdus      : avenants refusés ou abandonnés dans le mois ;
--       signe_total / facture_total : tout ce qui est signé sur le chantier, et ce qu'en portent les situations
--                     validées (cumul des lignes d'avenant de la dernière situation validée) ; reste_a_facturer.
--     Les montants sont ceux de btp_prix_avenant (HT, lignes non retirées).
--   · Droits : le gérant, l'admin ou le valideur qui voit les prix ; fonction « point_mensuel » de la formule
--     (Chantiers, Entreprise : private.btp_exiger_fonction, b6_27).
--
-- Règles de pose : create or replace ; rien n'est retiré ni effacé.

create or replace function public.btp_point_mensuel(p_client uuid, p_mois date default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_debut date := date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date))::date;
  v_fin date := (date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date)) + interval '1 month - 1 day')::date;
  v_chantiers jsonb;
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant', 'admin', 'valideur'])
       or not private.btp_voit_prix(p_client) then
      raise exception 'Le point mensuel est réservé au bureau qui voit les prix.' using errcode = '42501';
    end if;
  end if;
  perform private.btp_exiger_fonction(p_client, 'point_mensuel');

  with av as (
    select a.*, coalesce(private.btp_prix_avenant(a.id), 0) as montant,
           (a.cree_le at time zone 'Europe/Paris')::date as cree_jour,
           coalesce((a.origine ->> 'lecteur')::boolean, false) as lu
    from public.btp_avenants a
    where a.client_id = p_client
  ),
  fact as (
    select s.chantier_id, sum(sl.cumule_ht) as facture
    from public.btp_situations s
    join public.btp_situations_lignes sl on sl.situation_id = s.id and sl.origine = 'avenant'
    where s.client_id = p_client and s.statut = 'validee'
      and s.numero = (select max(x.numero) from public.btp_situations x where x.chantier_id = s.chantier_id and x.statut = 'validee')
    group by s.chantier_id
  ),
  par as (
    select c.id, c.nom, c.statut,
      count(*) filter (where av.lu and av.cree_jour between v_debut and v_fin) as reperes_n,
      coalesce(sum(av.montant) filter (where av.lu and av.cree_jour between v_debut and v_fin), 0) as reperes_ht,
      count(*) filter (where not av.lu and av.cree_jour between v_debut and v_fin) as saisis_n,
      count(*) filter (where av.statut = 'signe' and av.signe_le between v_debut and v_fin) as signes_n,
      coalesce(sum(av.montant) filter (where av.statut = 'signe' and av.signe_le between v_debut and v_fin), 0) as signes_ht,
      count(*) filter (where av.statut in ('brouillon', 'soumis') and av.cree_jour <= v_fin - 14) as relance_n,
      coalesce(sum(av.montant) filter (where av.statut in ('brouillon', 'soumis') and av.cree_jour <= v_fin - 14), 0) as relance_ht,
      count(*) filter (where av.statut in ('refuse', 'abandonne') and (av.maj_le at time zone 'Europe/Paris')::date between v_debut and v_fin) as perdus_n,
      coalesce(sum(av.montant) filter (where av.statut = 'signe' and av.signe_le <= v_fin), 0) as signe_total,
      coalesce(max(f.facture), 0) as facture_total
    from public.btp_chantiers c
    left join av on av.chantier_id = c.id
    left join fact f on f.chantier_id = c.id
    where c.client_id = p_client and c.statut in ('ouvert', 'suspendu', 'receptionne')
    group by c.id, c.nom, c.statut
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'chantier', p.id, 'nom', p.nom, 'statut', p.statut,
           'reperes', jsonb_build_object('nombre', p.reperes_n, 'montant_ht', p.reperes_ht),
           'saisis', p.saisis_n,
           'signes', jsonb_build_object('nombre', p.signes_n, 'montant_ht', p.signes_ht),
           'a_relancer', jsonb_build_object('nombre', p.relance_n, 'montant_ht', p.relance_ht),
           'perdus', p.perdus_n,
           'signe_total', p.signe_total, 'facture_total', p.facture_total,
           'reste_a_facturer', greatest(p.signe_total - p.facture_total, 0))
         order by p.nom), '[]'::jsonb)
    into v_chantiers
  from par p
  where p.reperes_n + p.saisis_n + p.signes_n + p.relance_n + p.perdus_n > 0 or p.signe_total > p.facture_total;

  return jsonb_build_object(
    'mois', to_char(v_debut, 'YYYY-MM'), 'du', v_debut, 'au', v_fin, 'chantiers', v_chantiers,
    'totaux', jsonb_build_object(
      'reperes', (select coalesce(sum((x -> 'reperes' ->> 'nombre')::int), 0) from jsonb_array_elements(v_chantiers) x),
      'reperes_ht', (select coalesce(sum((x -> 'reperes' ->> 'montant_ht')::numeric), 0) from jsonb_array_elements(v_chantiers) x),
      'signes', (select coalesce(sum((x -> 'signes' ->> 'nombre')::int), 0) from jsonb_array_elements(v_chantiers) x),
      'signes_ht', (select coalesce(sum((x -> 'signes' ->> 'montant_ht')::numeric), 0) from jsonb_array_elements(v_chantiers) x),
      'a_relancer', (select coalesce(sum((x -> 'a_relancer' ->> 'nombre')::int), 0) from jsonb_array_elements(v_chantiers) x),
      'a_relancer_ht', (select coalesce(sum((x -> 'a_relancer' ->> 'montant_ht')::numeric), 0) from jsonb_array_elements(v_chantiers) x),
      'reste_a_facturer', (select coalesce(sum((x ->> 'reste_a_facturer')::numeric), 0) from jsonb_array_elements(v_chantiers) x)));
end $function$;

-- Droits (à inscrire dans omega/a5_01_liste_figee.txt).
revoke execute on function public.btp_point_mensuel(uuid, date) from public, anon;
grant execute on function public.btp_point_mensuel(uuid, date) to authenticated, service_role;
