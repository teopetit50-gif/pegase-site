-- b3t_01 — Véhicules inactifs, réservations à risque, montée en gamme (renfort B3 sur Tavaro, 06/10/2026).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/location promet trois modules d'analyse qui n'avaient aucun code :
--   n° 10 « Véhicules inactifs » — « La probabilité qu'un véhicule reste trois jours au parking est calculée chaque
--     matin, avec l'action qui permet de l'éviter. » ;
--   n° 07 « Réservations à risque » — « Les réservations exposées à une non-présentation sont repérées, avec la
--     confirmation, l'acompte ou la relance à proposer avant le départ. » ;
--   n° 08 « Montée en gamme » — « La montée en gamme est proposée au comptoir lorsqu'un véhicule supérieur est libre
--     et que le profil du client s'y prête. »
--
-- LA BASE COMMUNE : l'offre et la demande sur 72 heures, par agence et par catégorie (private.loc_b3t_flux) :
--   · au parc : véhicule actif, d'une catégorie, sans contrat ouvert ; il est à l'agence où son dernier contrat l'a
--     rendu (sinon à son agence de rattachement) ;
--   · retours : contrats ouverts dont le retour est prévu avant la fin de la fenêtre (en retard compris), à l'agence
--     de retour ;
--   · demande : réservations en option ou confirmées dont le départ tombe dans la fenêtre.
--   Excédent d'une catégorie à une agence = au parc + retours − demande (s'il est positif).
--
-- LES RÈGLES, lisibles, chacune avec sa raison :
--   · Véhicules inactifs : un véhicule au parc et sans réservation à lui sur 72 h a pour probabilité de rester trois
--     jours au parking la part de l'excédent dans les véhicules de sa catégorie au parc (min(excédent, au parc) / au
--     parc). « Fort » à partir de 2/3 (0,66), « moyen » à partir de 1/3. L'action : transférer vers l'agence où la catégorie
--     manque sur 72 h ; sinon le proposer en montée en gamme aux départs d'une catégorie inférieure qui manque ; sinon
--     placer l'entretien dans ce creux ou ajuster le tarif.
--   · Réservations à risque (départ dans p_heures) : +3 le client a déjà fait faux bond (non-présentation),
--     +2 option non confirmée, +2 ni prépayée ni acompte, +1 nouveau client, +1 canal dont le taux de non-présentation
--     sur un an dépasse une fois et demie celui du réseau (au moins 10 réservations), +1 réservée plus de 60 jours avant.
--     « Fort » à partir de 4, « moyen » à 2. Action : confirmer (option), demander un acompte, ou relancer la veille.
--     Un numéro de vol est rappelé : l'arrivée se suit.
--   · Montée en gamme (départs dans p_heures) : la catégorie immédiatement supérieure (rang, même famille utilitaire
--     ou non) qui a un excédent à l'agence ; le profil s'y prête (+2 a déjà loué plus haut, +1 professionnel, +1 trois
--     jours ou plus, +1 au moins deux contrats passés ; au moins 1 point) ; jamais pour un client qui a une facture
--     échue impayée, en litige, ou une non-présentation.
--
-- QUI LIT : gérant, admin, valideur, collaborateur, lecteur du client — et seulement les agences de son périmètre
-- (private.voit_entite ; le point du matin, déposé par le serveur, passe p_regarder = false et adresse chaque section
-- à son agence). Rien n'est écrit : ce sont des lectures, pour l'écran et pour le point du matin (b3t_04).
-- Idempotent (create or replace, grant). Aucune table, aucune fonction de B2 n'est modifiée.

create or replace function private.loc_b3t_regard(p_client uuid, p_roles text[])
 returns void
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  if (select auth.uid()) is null then
    raise exception 'Cette lecture se fait par une personne connectée.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.comptes k where k.user_id = (select auth.uid()) and k.client_id = p_client)
     or not private.a_un_role(p_client, p_roles) then
    raise exception 'Ce réseau n''est pas dans votre périmètre.' using errcode = '42501';
  end if;
end $function$;

-- Où est un véhicule : à l'agence de retour de son dernier contrat, sinon à son agence de rattachement.
create or replace function private.loc_b3t_position(p_client uuid, p_vehicule uuid, p_rattachement uuid)
 returns uuid
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select coalesce((select coalesce(c.entite_retour_id, c.entite_id) from public.loc_contrats c
                   where c.client_id = p_client and c.vehicule_id = p_vehicule and c.disparu_le is null and c.statut <> 'annule'
                   order by c.depart_le desc limit 1), p_rattachement)
$function$;

create or replace function private.loc_b3t_flux(p_client uuid, p_debut timestamp with time zone, p_fin timestamp with time zone)
 returns table(entite_id uuid, categorie_id uuid, au_parc integer, retours integer, demande integer)
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  with parc as (
    select private.loc_b3t_position(v.client_id, v.id, v.entite_id) as entite_id, v.categorie_id
    from public.loc_vehicules v
    where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null and v.categorie_id is not null
      and not exists (select 1 from public.loc_contrats c where c.client_id = v.client_id and c.vehicule_id = v.id
                        and c.statut = 'ouvert' and c.retour_reel_le is null and c.disparu_le is null)
  ),
  retours as (
    select coalesce(c.entite_retour_id, c.entite_id) as entite_id, coalesce(v.categorie_id, c.categorie_id) as categorie_id
    from public.loc_contrats c
    left join public.loc_vehicules v on v.client_id = c.client_id and v.id = c.vehicule_id
    where c.client_id = p_client and c.statut = 'ouvert' and c.retour_reel_le is null and c.disparu_le is null
      and c.retour_prevu_le < p_fin and coalesce(v.categorie_id, c.categorie_id) is not null
  ),
  demande as (
    select r.entite_id, r.categorie_id from public.loc_reservations r
    where r.client_id = p_client and r.statut in ('option', 'confirmee') and r.disparue_le is null
      and r.depart_prevu_le >= p_debut and r.depart_prevu_le < p_fin and r.categorie_id is not null
  ),
  cles as (
    select x.entite_id, x.categorie_id from parc x where x.entite_id is not null
    union select x.entite_id, x.categorie_id from retours x
    union select x.entite_id, x.categorie_id from demande x
  )
  select k.entite_id, k.categorie_id,
         (select count(*) from parc x where x.entite_id = k.entite_id and x.categorie_id = k.categorie_id)::integer,
         (select count(*) from retours x where x.entite_id = k.entite_id and x.categorie_id = k.categorie_id)::integer,
         (select count(*) from demande x where x.entite_id = k.entite_id and x.categorie_id = k.categorie_id)::integer
  from cles k
$function$;

-- Le nom à afficher d'un locataire (un client anonymisé ne se nomme plus).
create or replace function private.loc_b3t_nom(l public.loc_locataires)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$
  select case when l.id is null then 'Client inconnu'
              when l.anonymise_le is not null then 'Client anonymisé'
              else coalesce(nullif(btrim(l.raison_sociale), ''), nullif(btrim(coalesce(l.prenom || ' ', '') || coalesce(l.nom, '')), ''), 'Client sans nom') end
$function$;

-- ─────────────────────────── Véhicules inactifs ───────────────────────────

create or replace function private.loc_vehicules_inactifs_lire(p_client uuid, p_entite uuid default null, p_maintenant timestamp with time zone default now(),
                                                                p_regarder boolean default true)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_fin timestamptz := p_maintenant + interval '72 hours';
  v_res jsonb;
begin
  with flux as (select * from private.loc_b3t_flux(p_client, p_maintenant, v_fin)),
  au_parc as (
    select v.id, v.immatriculation, v.modele, v.categorie_id, k.code as categorie, k.libelle as categorie_libelle, k.rang, k.utilitaire,
           private.loc_b3t_position(v.client_id, v.id, v.entite_id) as entite_id,
           coalesce((select max(c.retour_reel_le) from public.loc_contrats c where c.client_id = v.client_id and c.vehicule_id = v.id
                       and c.disparu_le is null and c.retour_reel_le is not null), v.cree_le) as au_parking_depuis
    from public.loc_vehicules v
    join public.loc_categories k on k.client_id = v.client_id and k.id = v.categorie_id
    where v.client_id = p_client and v.statut = 'actif' and v.disparu_le is null
      and not exists (select 1 from public.loc_contrats c where c.client_id = v.client_id and c.vehicule_id = v.id
                        and c.statut = 'ouvert' and c.retour_reel_le is null and c.disparu_le is null)
      and not exists (select 1 from public.loc_reservations r where r.client_id = v.client_id and r.vehicule_id = v.id
                        and r.statut in ('option', 'confirmee') and r.disparue_le is null
                        and r.depart_prevu_le >= p_maintenant and r.depart_prevu_le < v_fin)
  ),
  notes as (
    select p.*, f.au_parc as n_parc, f.retours, f.demande,
           greatest(f.au_parc + f.retours - f.demande, 0) as excedent,
           case when f.au_parc > 0 then least(greatest(f.au_parc + f.retours - f.demande, 0), f.au_parc)::numeric / f.au_parc else 0 end as probabilite
    from au_parc p
    join flux f on f.entite_id = p.entite_id and f.categorie_id = p.categorie_id
    where p.entite_id is not null and (p_entite is null or p.entite_id = p_entite) and (not p_regarder or private.voit_entite(p_client, p.entite_id))
  ),
  actions as (
    select n.*,
           (select jsonb_build_object('type', 'transfert', 'vers_entite', f2.entite_id, 'vers', a2.code,
                                      'libelle', format('Transférer vers %s : %s départ(s) de cette catégorie sans véhicule sur 72 h',
                                                        a2.code, f2.demande - f2.au_parc - f2.retours))
              from flux f2
              join public.loc_agences a2 on a2.client_id = p_client and a2.entite_id = f2.entite_id and a2.actif
              where f2.categorie_id = n.categorie_id and f2.entite_id <> n.entite_id and f2.demande > f2.au_parc + f2.retours
              order by f2.demande - f2.au_parc - f2.retours desc, a2.code limit 1) as transfert,
           (select jsonb_build_object('type', 'montee_en_gamme', 'categorie', k2.code,
                                      'libelle', format('Le proposer en montée en gamme aux départs de la catégorie %s, qui manque de %s véhicule(s)',
                                                        k2.code, f3.demande - f3.au_parc - f3.retours))
              from public.loc_categories k2
              join flux f3 on f3.entite_id = n.entite_id and f3.categorie_id = k2.id
              where k2.client_id = p_client and k2.statut = 'active' and n.rang is not null and k2.rang is not null and k2.rang < n.rang
                and k2.utilitaire = n.utilitaire and f3.demande > f3.au_parc + f3.retours
              order by k2.rang desc limit 1) as montee
    from notes n
    where n.probabilite > 0
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'vehicule_id', x.id, 'immatriculation', x.immatriculation, 'modele', x.modele,
           'categorie', x.categorie, 'categorie_libelle', x.categorie_libelle,
           'entite_id', x.entite_id, 'agence', (select a.code from public.loc_agences a where a.client_id = p_client and a.entite_id = x.entite_id),
           'au_parking_depuis', x.au_parking_depuis,
           'jours_parking', greatest(0, extract(day from p_maintenant - x.au_parking_depuis))::integer,
           'probabilite', round(x.probabilite, 2),
           'niveau', case when x.probabilite >= 0.66 then 'fort' when x.probabilite >= 0.34 then 'moyen' else 'faible' end,
           'raison', format('%s véhicule(s) %s au parc, %s retour(s) et %s départ(s) prévus sur 72 h : %s de trop',
                            x.n_parc, x.categorie, x.retours, x.demande, x.excedent),
           'action', coalesce(x.transfert, x.montee,
                              jsonb_build_object('type', 'creux', 'libelle', 'Placer l''entretien ou le nettoyage dans ce creux, ou ajuster le tarif sur 72 h')))
         order by x.probabilite desc, x.au_parking_depuis, x.immatriculation), '[]'::jsonb)
    into v_res
  from actions x;
  return jsonb_build_object('calcule_le', p_maintenant, 'horizon_heures', 72, 'vehicules', v_res,
    'a_risque', (select count(*) from jsonb_array_elements(v_res) e where e ->> 'niveau' in ('fort', 'moyen')));
end $function$;

create or replace function public.loc_vehicules_inactifs(p_client uuid, p_entite uuid default null)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.loc_b3t_regard(p_client, array['gerant', 'admin', 'valideur', 'collaborateur', 'lecteur']);
  return private.loc_vehicules_inactifs_lire(p_client, p_entite, now());
end $function$;

-- ─────────────────────────── Réservations à risque ───────────────────────────

create or replace function private.loc_reservations_a_risque_lire(p_client uuid, p_entite uuid default null, p_heures integer default 72,
                                                                   p_maintenant timestamp with time zone default now(), p_regarder boolean default true)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_taux_reseau numeric;
  v_res jsonb;
begin
  select case when count(*) = 0 then null else count(*) filter (where r.statut = 'no_show')::numeric / count(*) end
    into v_taux_reseau
  from public.loc_reservations r
  where r.client_id = p_client and r.disparue_le is null and r.depart_prevu_le >= p_maintenant - interval '365 days'
    and r.depart_prevu_le < p_maintenant and r.statut in ('convertie', 'no_show');

  with a_venir as (
    select r.*, l as loc, l.id as loc_id
    from public.loc_reservations r
    left join public.loc_locataires l on l.client_id = r.client_id and l.id = r.locataire_id
    where r.client_id = p_client and r.statut in ('option', 'confirmee') and r.disparue_le is null
      and r.depart_prevu_le >= p_maintenant and r.depart_prevu_le < p_maintenant + make_interval(hours => p_heures)
      and (p_entite is null or r.entite_id = p_entite) and (not p_regarder or private.voit_entite(p_client, r.entite_id))
  ),
  canaux as (
    select r.canal, count(*) as n, count(*) filter (where r.statut = 'no_show') as ns
    from public.loc_reservations r
    where r.client_id = p_client and r.disparue_le is null and r.canal is not null
      and r.depart_prevu_le >= p_maintenant - interval '365 days' and r.depart_prevu_le < p_maintenant
      and r.statut in ('convertie', 'no_show')
    group by r.canal
  ),
  faits as (
    select a.*,
           (a.loc_id is not null and exists (select 1 from public.loc_reservations h where h.client_id = p_client and h.locataire_id = a.loc_id
                                              and h.statut = 'no_show' and h.id <> a.id)) as deja_absent,
           (a.statut = 'option') as option,
           (not coalesce(a.prepaye, false) and coalesce(a.acompte_eur, 0) = 0) as sans_garantie,
           (a.loc_id is null or not exists (select 1 from public.loc_contrats c where c.client_id = p_client and c.locataire_id = a.loc_id
                                              and c.disparu_le is null and c.statut <> 'annule' and c.depart_le < p_maintenant)) as nouveau,
           coalesce((select c.n >= 10 and v_taux_reseau is not null and v_taux_reseau > 0 and c.ns::numeric / c.n >= 1.5 * v_taux_reseau
                     from canaux c where c.canal = a.canal), false) as canal_risque,
           (a.depart_prevu_le - a.cree_le >= interval '60 days') as prise_tot
    from a_venir a
  ),
  notes as (
    select f.*,
           (case when f.deja_absent then 3 else 0 end + case when f.option then 2 else 0 end + case when f.sans_garantie then 2 else 0 end
            + case when f.nouveau then 1 else 0 end + case when f.canal_risque then 1 else 0 end + case when f.prise_tot then 1 else 0 end) as score,
           array_remove(array[
             case when f.deja_absent then 'a déjà fait faux bond' end,
             case when f.option then 'option non confirmée' end,
             case when f.sans_garantie then 'ni prépayée ni acompte' end,
             case when f.nouveau then 'nouveau client' end,
             case when f.canal_risque then format('canal « %s » souvent sans présentation', f.canal) end,
             case when f.prise_tot then format('réservée %s jours avant', extract(day from f.depart_prevu_le - f.cree_le)::integer) end,
             case when f.vol is not null then format('arrive par le vol %s : suivre l''arrivée', f.vol) end], null) as raisons
    from faits f
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'reservation_id', n.id, 'ref', n.ref_source, 'depart_prevu_le', n.depart_prevu_le, 'entite_id', n.entite_id,
           'agence', (select a.code from public.loc_agences a where a.client_id = p_client and a.entite_id = n.entite_id),
           'categorie', (select k.code from public.loc_categories k where k.client_id = p_client and k.id = n.categorie_id),
           'client', private.loc_b3t_nom(n.loc), 'canal', n.canal, 'vol', n.vol,
           'score', n.score, 'niveau', case when n.score >= 4 then 'fort' else 'moyen' end, 'raisons', to_jsonb(n.raisons),
           'action', case when n.option then 'Confirmer la réservation (elle n''est qu''en option)'
                          when n.sans_garantie and n.deja_absent then 'Demander un acompte et une confirmation écrite'
                          when n.sans_garantie then 'Demander un acompte'
                          else 'Relancer le client la veille du départ' end)
         order by n.score desc, n.depart_prevu_le), '[]'::jsonb)
    into v_res
  from notes n
  where n.score >= 2;
  return jsonb_build_object('calcule_le', p_maintenant, 'horizon_heures', p_heures, 'taux_reseau', round(v_taux_reseau, 3), 'reservations', v_res);
end $function$;

create or replace function public.loc_reservations_a_risque(p_client uuid, p_entite uuid default null, p_heures integer default 72)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.loc_b3t_regard(p_client, array['gerant', 'admin', 'valideur', 'collaborateur', 'lecteur']);
  if p_heures is null or p_heures not between 1 and 336 then
    raise exception 'L''horizon va de 1 à 336 heures.' using errcode = '22023';
  end if;
  return private.loc_reservations_a_risque_lire(p_client, p_entite, p_heures, now());
end $function$;

-- ─────────────────────────── Montée en gamme ───────────────────────────

create or replace function private.loc_montee_en_gamme_lire(p_client uuid, p_entite uuid default null, p_heures integer default 48,
                                                             p_maintenant timestamp with time zone default now(), p_regarder boolean default true)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  v_res jsonb;
begin
  with flux as (select * from private.loc_b3t_flux(p_client, p_maintenant, p_maintenant + interval '72 hours')),
  departs as (
    select r.*, l as loc, l.id as loc_id, l.type as loc_type, k.rang, k.utilitaire, k.code as categorie
    from public.loc_reservations r
    join public.loc_categories k on k.client_id = r.client_id and k.id = r.categorie_id
    left join public.loc_locataires l on l.client_id = r.client_id and l.id = r.locataire_id
    where r.client_id = p_client and r.statut in ('option', 'confirmee') and r.disparue_le is null and k.rang is not null
      and r.depart_prevu_le >= p_maintenant and r.depart_prevu_le < p_maintenant + make_interval(hours => p_heures)
      and (p_entite is null or r.entite_id = p_entite) and (not p_regarder or private.voit_entite(p_client, r.entite_id))
  ),
  offres as (
    select d.*,
           (select jsonb_build_object('categorie_id', k2.id, 'categorie', k2.code, 'libelle', k2.libelle,
                                      'libres', f.au_parc + f.retours - f.demande)
              from public.loc_categories k2
              join flux f on f.entite_id = d.entite_id and f.categorie_id = k2.id
              where k2.client_id = p_client and k2.statut = 'active' and k2.rang is not null and k2.rang > d.rang
                and k2.utilitaire = d.utilitaire and f.au_parc > 0 and f.au_parc + f.retours - f.demande > 0
              order by k2.rang limit 1) as offre,
           (d.loc_id is not null and exists (select 1 from public.loc_contrats c join public.loc_categories k3 on k3.client_id = c.client_id and k3.id = c.categorie_id
                                              where c.client_id = p_client and c.locataire_id = d.loc_id and c.disparu_le is null
                                                and c.statut <> 'annule' and k3.rang > d.rang)) as deja_plus_haut,
           (d.loc_type = 'professionnel') as pro,
           (d.retour_prevu_le - d.depart_prevu_le >= interval '3 days') as long,
           (d.loc_id is not null and (select count(*) from public.loc_contrats c where c.client_id = p_client and c.locataire_id = d.loc_id
                                         and c.disparu_le is null and c.statut <> 'annule') >= 2) as fidele,
           (d.loc_id is not null and (
              exists (select 1 from public.loc_reservations h where h.client_id = p_client and h.locataire_id = d.loc_id and h.statut = 'no_show')
              or exists (select 1 from public.loc_factures fa join public.loc_contrats c on c.client_id = fa.client_id and c.id = fa.contrat_id
                         where fa.client_id = p_client and c.locataire_id = d.loc_id
                           and (fa.statut = 'litige' or (fa.statut in ('emise', 'envoyee') and fa.echeance_le < (p_maintenant)::date))))) as exclu
    from departs d
  ),
  profils as (
    select o.*,
           (case when o.deja_plus_haut then 2 else 0 end + case when o.pro then 1 else 0 end
            + case when o.long then 1 else 0 end + case when o.fidele then 1 else 0 end) as score,
           array_remove(array[
             case when o.deja_plus_haut then 'a déjà loué une catégorie supérieure' end,
             case when o.pro then 'client professionnel' end,
             case when o.long then format('%s jours de location', ceil(extract(epoch from o.retour_prevu_le - o.depart_prevu_le) / 86400)::integer) end,
             case when o.fidele then 'client fidèle' end], null) as raisons
    from offres o
    where o.offre is not null and not o.exclu
  )
  select coalesce(jsonb_agg(jsonb_build_object(
           'reservation_id', p.id, 'ref', p.ref_source, 'depart_prevu_le', p.depart_prevu_le, 'entite_id', p.entite_id,
           'agence', (select a.code from public.loc_agences a where a.client_id = p_client and a.entite_id = p.entite_id),
           'client', private.loc_b3t_nom(p.loc), 'categorie', p.categorie, 'offre', p.offre,
           'score', p.score, 'raisons', to_jsonb(p.raisons))
         order by p.depart_prevu_le, p.score desc), '[]'::jsonb)
    into v_res
  from profils p
  where p.score >= 1;
  return jsonb_build_object('calcule_le', p_maintenant, 'horizon_heures', p_heures, 'offres', v_res);
end $function$;

create or replace function public.loc_montee_en_gamme(p_client uuid, p_entite uuid default null, p_heures integer default 48)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
begin
  perform private.loc_b3t_regard(p_client, array['gerant', 'admin', 'valideur', 'collaborateur', 'lecteur']);
  if p_heures is null or p_heures not between 1 and 168 then
    raise exception 'L''horizon va de 1 à 168 heures.' using errcode = '22023';
  end if;
  return private.loc_montee_en_gamme_lire(p_client, p_entite, p_heures, now());
end $function$;

-- ─────────────────────────── Droits ───────────────────────────

revoke all on function public.loc_vehicules_inactifs(uuid, uuid) from public, anon;
grant execute on function public.loc_vehicules_inactifs(uuid, uuid) to authenticated, service_role;
revoke all on function public.loc_reservations_a_risque(uuid, uuid, integer) from public, anon;
grant execute on function public.loc_reservations_a_risque(uuid, uuid, integer) to authenticated, service_role;
revoke all on function public.loc_montee_en_gamme(uuid, uuid, integer) from public, anon;
grant execute on function public.loc_montee_en_gamme(uuid, uuid, integer) to authenticated, service_role;

revoke all on function private.loc_b3t_regard(uuid, text[]) from public, anon, authenticated;
grant execute on function private.loc_b3t_regard(uuid, text[]) to service_role;
revoke all on function private.loc_b3t_position(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function private.loc_b3t_position(uuid, uuid, uuid) to service_role;
revoke all on function private.loc_b3t_flux(uuid, timestamp with time zone, timestamp with time zone) from public, anon, authenticated;
grant execute on function private.loc_b3t_flux(uuid, timestamp with time zone, timestamp with time zone) to service_role;
revoke all on function private.loc_b3t_nom(public.loc_locataires) from public, anon, authenticated;
grant execute on function private.loc_b3t_nom(public.loc_locataires) to service_role;
revoke all on function private.loc_vehicules_inactifs_lire(uuid, uuid, timestamp with time zone, boolean) from public, anon, authenticated;
grant execute on function private.loc_vehicules_inactifs_lire(uuid, uuid, timestamp with time zone, boolean) to service_role;
revoke all on function private.loc_reservations_a_risque_lire(uuid, uuid, integer, timestamp with time zone, boolean) from public, anon, authenticated;
grant execute on function private.loc_reservations_a_risque_lire(uuid, uuid, integer, timestamp with time zone, boolean) to service_role;
revoke all on function private.loc_montee_en_gamme_lire(uuid, uuid, integer, timestamp with time zone, boolean) from public, anon, authenticated;
grant execute on function private.loc_montee_en_gamme_lire(uuid, uuid, integer, timestamp with time zone, boolean) to service_role;

select 'b3t_01 véhicules inactifs, réservations à risque, montée en gamme posés' as resultat;
