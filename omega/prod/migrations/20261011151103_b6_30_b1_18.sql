-- 20261011151103 b6_30_b1_18
-- Source : dépôt : cb55002 omega/modules/daliro/migrations/b6_30_point_mensuel.sql ; 357fcb2 omega/modules/varelo/migrations/b1_18_contexte.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b6_30_point_mensuel.sql @ cb55002, b1_18_contexte.sql @ 357fcb2 ; b6_26 cité comme test : ignoré ; b1_21 cité comme test : ignoré.
-- ═══ omega/modules/daliro/migrations/b6_30_point_mensuel.sql @ cb55002
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


-- ═══ omega/modules/varelo/migrations/b1_18_contexte.sql @ 357fcb2
-- b1_18 — VARELO : le contexte du groupe pour l'assistant, lu au périmètre de la personne (11/10/2026, B1)
--
-- CE QUE ÇA PRÉPARE (omega/CHIFFRAGE/varelo.md, lignes 1, 8, 18, 28 : « une seule IA pour tout le groupe »,
-- « l'IA raisonne sur les mêmes données dans toutes les filiales » ; ligne 33 : « chaque lecture est inscrite au
-- journal »). L'assistant de l'espace (app/api/assistant, hors de ce module) n'a aujourd'hui accès à aucune donnée.
-- Ce lot pose la moitié « données » : une porte qui rend, sous les droits de la personne (RLS, security invoker),
-- un résumé borné du groupe, et inscrit chaque lecture au journal. Le branchement comme outil de l'assistant
-- appartient au propriétaire de la route (proposition au coordinateur).
--
--   · public.grp_contexte(p_client, p_motif) → jsonb, au plus quelques kilo-octets : les sociétés (ventes, résultat,
--     trésorerie, écarts, plancher), le point du matin Varelo (grp_ce_matin), les décisions en attente, les clients
--     au-dessus de leur plafond, les contrats à dénoncer sous 90 jours, les réserves à émettre, les reportings en
--     retard, les caisses d'hier. Aucun IBAN, aucun montant de pièce, aucune donnée nominative de salarié.
--   · private.grp_noter_lecture(p_client, p_quoi, p_motif) : journal varelo.lecture.<quoi> (qui, quand, pourquoi).
--
-- Règles de pose : create or replace ; aucune suppression.

create or replace function private.grp_noter_lecture(p_client uuid, p_quoi text, p_motif text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if p_quoi !~ '^[a-z][a-z_]{1,39}$' then
    raise exception 'Lecture inconnue.' using errcode = '22023';
  end if;
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  perform private.grp_journal(p_client, 'varelo.lecture.' || p_quoi, 'clients', p_client::text,
    jsonb_build_object('motif', left(nullif(btrim(p_motif), ''), 300)));
end $function$;

create or replace function public.grp_contexte(p_client uuid, p_motif text default null::text)
 returns jsonb
 language plpgsql

 set search_path to ''
as $function$
declare
  v jsonb;
begin
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  v := jsonb_build_object(
    'jour', current_date,
    'societes', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                   'societe', g.societe, 'pole', g.pole, 'balance_au', g.arrete_le, 'ventes', g.ventes, 'resultat', g.resultat,
                   'tresorerie', g.tresorerie, 'ecart_n1_pct', g.ecart_n1_pct, 'ecart_objectif', g.ecart_objectif,
                   'sous_plancher', g.sous_plancher)) order by g.societe), '[]'::jsonb)
                 from (select * from public.grp_groupe_page x where x.client_id = p_client order by x.societe limit 50) g),
    'ce_matin', public.grp_ce_matin(p_client),
    'decisions_en_attente', (select coalesce(jsonb_agg(jsonb_build_object('genre', d.genre, 'resume', d.resume, 'calcul', d.calcul, 'avant_le', d.echeance)
                               order by d.echeance nulls last), '[]'::jsonb)
                             from (select * from public.grp_decisions x where x.client_id = p_client and x.statut = 'en_attente' order by x.echeance nulls last limit 20) d),
    'clients_au_dessus_du_plafond', (select coalesce(jsonb_agg(jsonb_build_object('client', e.nom_groupe, 'code', e.code_groupe, 'encours', e.total,
                                       'echu', e.echu, 'plafond', e.plafond, 'societes', e.societes) order by e.total desc), '[]'::jsonb)
                                     from (select * from public.grp_encours_groupe x where x.client_id = p_client and x.nature = 'client' and x.depasse
                                           order by x.total desc limit 20) e),
    'contrats_a_denoncer', (select coalesce(jsonb_agg(jsonb_build_object('contrat', c.intitule, 'tiers', c.tiers, 'societe', c.societe,
                              'date_limite', c.date_limite, 'montant_annuel', c.montant_annuel) order by c.date_limite), '[]'::jsonb)
                            from (select * from public.grp_contrats_echeancier x where x.client_id = p_client and x.statut = 'actif'
                                    and x.reconduction = 'tacite' and x.jours_restants between 0 and 90 order by x.date_limite limit 20) c),
    'reserves_a_emettre', (select coalesce(jsonb_agg(jsonb_build_object('transporteur', r.transporteur, 'societe', r.societe,
                             'livraison', r.date_reception, 'avant_le', r.echeance, 'prejudice', r.montant_estime) order by r.echeance), '[]'::jsonb)
                           from (select * from public.grp_reserves x where x.client_id = p_client and x.statut = 'a_examiner' order by x.echeance limit 20) r),
    'reportings_en_retard', (select coalesce(jsonb_agg(jsonb_build_object('reporting', d.intitule, 'destinataire', d.destinataire,
                               'societe', d.societe, 'echeance', d.echeance) order by d.echeance), '[]'::jsonb)
                             from (select * from public.grp_reportings_dus x where x.client_id = p_client and x.etat = 'en_retard' order by x.echeance limit 20) d),
    'caisses_hier', (select coalesce(jsonb_agg(jsonb_build_object('magasin', m.magasin, 'societe', m.societe, 'ttc', m.hier_ttc,
                       'meme_jour_semaine_derniere', m.semaine_derniere_ttc) order by m.societe, m.magasin), '[]'::jsonb)
                     from (select * from public.grp_ventes_magasins x where x.client_id = p_client order by x.societe, x.magasin limit 50) m));
  perform private.grp_noter_lecture(p_client, 'contexte', coalesce(p_motif, 'assistant'));
  return v;
end $function$;

revoke execute on function private.grp_noter_lecture(uuid, text, text) from public, anon;
grant execute on function private.grp_noter_lecture(uuid, text, text) to authenticated, service_role;
revoke execute on function public.grp_contexte(uuid, text) from public, anon;
grant execute on function public.grp_contexte(uuid, text) to authenticated, service_role;
