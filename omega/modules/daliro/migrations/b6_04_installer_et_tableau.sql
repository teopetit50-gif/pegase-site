-- b6_04 — DALIRO : l'installation gardée, la liste et le tableau d'un chantier en un appel (session B6, 05/10/2026)
--
-- CE QUE ÇA CORRIGE.
--   1. private.btp_installer n'exige rien : la façade publique installe (ou
--      change) la formule de N'IMPORTE QUELLE organisation pour qui l'appelle.
--      Elle est désormais réservée au serveur d'Omega ou au gérant de
--      l'organisation, et s'inscrit au journal (daliro.installe).
--   2. L'écran /espace/daliro aurait douze requêtes à faire pour montrer un
--      chantier (chantier, étape, lots, marchés et lignes, contrôles, passages
--      et confirmations, dépendances, acceptations, avenants, factures,
--      déboursé). Deux fonctions de LECTURE, SECURITY INVOKER (la RLS du
--      lecteur s'applique, les prix restent cachés sans voir_prix) :
--        · public.btp_liste_chantiers() → jsonb : mes chantiers avec leur
--          étape, leurs contrôles bloquants / à voir et leur prochain passage ;
--        · public.btp_tableau_chantier(p_chantier) → jsonb : tout le chantier.
--
-- Règles de pose : create or replace ; jamais de DROP ni de DELETE.

create or replace function private.btp_installer(p_client uuid, p_formule text, p_quota_chantiers integer default null, p_quota_comptes integer default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_id uuid;
  v_avant record;
begin
  if not private.btp_est_serveur() then
    if (select auth.uid()) is null or not private.a_un_role(p_client, array['gerant']) then
      raise exception 'Daliro s''installe par Omega ou par le gérant de l''organisation.' using errcode = '42501';
    end if;
  end if;
  if not exists (select 1 from public.clients where id = p_client) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  select r.formule, r.quota_chantiers, r.quota_comptes_bureau into v_avant from public.btp_reglages r where r.client_id = p_client;
  insert into public.btp_reglages (client_id, formule, quota_chantiers, quota_comptes_bureau)
  values (p_client, p_formule, p_quota_chantiers, p_quota_comptes)
  on conflict (client_id) do update
    set formule = excluded.formule,
        quota_chantiers = excluded.quota_chantiers,
        quota_comptes_bureau = excluded.quota_comptes_bureau
  returning id into v_id;
  perform private.journaliser(p_client, 'daliro.installe', 'btp_reglages', v_id::text,
    jsonb_build_object('formule', p_formule, 'quota_chantiers', p_quota_chantiers, 'quota_comptes', p_quota_comptes,
                       'avant', case when v_avant.formule is null then null
                                     else jsonb_build_object('formule', v_avant.formule, 'quota_chantiers', v_avant.quota_chantiers,
                                                             'quota_comptes', v_avant.quota_comptes_bureau) end), null);
  return v_id;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Mes chantiers, en un appel (RLS du lecteur)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_liste_chantiers()
 returns jsonb
 language sql
 stable security invoker
 set search_path to ''
as $function$
  select coalesce(jsonb_agg(x order by (x ->> 'statut') = 'ouvert' desc, (x ->> 'statut') = 'preparation' desc, x ->> 'nom'), '[]'::jsonb)
  from (
    select to_jsonb(c)
        || jsonb_build_object(
             'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id),
             'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
             'nb_lots', (select count(*) from public.btp_lots l where l.chantier_id = c.id),
             'nb_bloquants', (select count(*) from public.btp_controle k where k.chantier_id = c.id and k.gravite = 'bloquant'),
             'nb_attention', (select count(*) from public.btp_controle k where k.chantier_id = c.id and k.gravite = 'attention'),
             'marche_verifie', exists (select 1 from public.btp_marches m where m.chantier_id = c.id and m.statut = 'verifie'),
             'prochain_passage', (select to_jsonb(p) from (
                 select p.id, p.debut, p.fin, p.tache, p.confirmation, p.intervenant_type,
                        coalesce(e.nom, t.nom, p.intervenant_lu) as intervenant_nom
                 from public.btp_passages p
                 left join public.btp_equipes e on e.id = p.equipe_id
                 left join public.btp_tiers t on t.id = p.tiers_id
                 where p.chantier_id = c.id and p.statut = 'prevu' and p.fin >= current_date
                 order by p.debut, p.id limit 1) p),
             'nb_avenants_en_cours', (select count(*) from public.btp_avenants a where a.chantier_id = c.id and a.statut in ('brouillon', 'soumis')),
             'nb_avenants_signes', (select count(*) from public.btp_avenants a where a.chantier_id = c.id and a.statut = 'signe'))
    from public.btp_chantiers c
  ) s(x)
$function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le tableau complet d'un chantier (RLS du lecteur ; null s'il ne le voit pas)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_tableau_chantier(p_chantier uuid)
 returns jsonb
 language plpgsql
 stable security invoker
 set search_path to ''
as $function$
declare
  c public.btp_chantiers;
  v jsonb;
begin
  select * into c from public.btp_chantiers where id = p_chantier;
  if not found then
    return null;
  end if;
  v := jsonb_build_object(
    'chantier', to_jsonb(c) || jsonb_build_object(
        'maitre_ouvrage_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_ouvrage_id),
        'maitre_oeuvre_nom', (select t.nom from public.btp_tiers t where t.id = c.maitre_oeuvre_id),
        'donneur_ordre_nom', (select t.nom from public.btp_tiers t where t.id = c.donneur_ordre_id),
        'etape', (select to_jsonb(e) from public.btp_chantiers_etape e where e.chantier_id = c.id)),
    'reglages', (select to_jsonb(r) from public.btp_reglages r where r.client_id = c.client_id),
    'voit_prix', public.btp_voit_prix(c.client_id),
    'lots', (select coalesce(jsonb_agg(to_jsonb(l) || jsonb_build_object(
        'tiers_nom', (select t.nom from public.btp_tiers t where t.id = l.tiers_id),
        'equipe_nom', (select e.nom from public.btp_equipes e where e.id = l.equipe_id),
        'corps_etat_libelle', (select ce.libelle from public.btp_corps_etat ce where ce.code = l.corps_etat),
        'acceptation', (select a.statut from public.btp_acceptations a where a.chantier_id = l.chantier_id and a.tiers_id = l.tiers_id order by a.maj_le desc limit 1))
        order by l.rang, l.code collate "C"), '[]'::jsonb)
      from public.btp_lots l where l.chantier_id = c.id),
    'marches', (select coalesce(jsonb_agg(to_jsonb(m) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_lignes_marche_chiffrees li where li.marche_id = m.id),
        'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by k.ordre nulls last), '[]'::jsonb) from public.btp_controle_marches k where k.marche_id = m.id))
        order by m.statut = 'verifie' desc, m.verifie_le desc nulls last, m.id), '[]'::jsonb)
      from public.btp_marches_chiffres m where m.chantier_id = c.id),
    'controles', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.chantier_id = c.id),
    'controles_organisation', (select coalesce(jsonb_agg(to_jsonb(k) order by case k.gravite when 'bloquant' then 0 when 'attention' then 1 else 2 end, k.code), '[]'::jsonb)
      from public.btp_controle k where k.client_id = c.client_id and k.chantier_id is null),
    'passages', (select coalesce(jsonb_agg(to_jsonb(p) || jsonb_build_object(
        'lot_code', (select l.code from public.btp_lots l where l.id = p.lot_id),
        'lot_libelle', (select l.libelle from public.btp_lots l where l.id = p.lot_id),
        'intervenant_nom', coalesce((select e.nom from public.btp_equipes e where e.id = p.equipe_id), (select t.nom from public.btp_tiers t where t.id = p.tiers_id), p.intervenant_lu),
        'confirmations', (select coalesce(jsonb_agg(to_jsonb(x) order by x.survenu_le), '[]'::jsonb) from public.btp_confirmations x where x.passage_id = p.id))
        order by p.debut, p.fin, p.id), '[]'::jsonb)
      from public.btp_passages p where p.chantier_id = c.id and p.statut <> 'annule' and p.fin >= current_date - 14),
    'dependances', (select coalesce(jsonb_agg(to_jsonb(d) || jsonb_build_object(
        'amont_tache', (select coalesce(a.tache, a.intervenant_lu) from public.btp_passages a where a.id = d.amont_id),
        'aval_tache', (select coalesce(b.tache, b.intervenant_lu) from public.btp_passages b where b.id = d.aval_id))
        order by d.cree_le), '[]'::jsonb)
      from public.btp_dependances d where d.chantier_id = c.id),
    'acceptations', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object('tiers_nom', (select t.nom from public.btp_tiers t where t.id = a.tiers_id)) order by a.cree_le), '[]'::jsonb)
      from public.btp_acceptations a where a.chantier_id = c.id),
    'avenants', (select coalesce(jsonb_agg(to_jsonb(a) || jsonb_build_object(
        'lignes', (select coalesce(jsonb_agg(to_jsonb(li) order by li.ordre), '[]'::jsonb) from public.btp_avenants_lignes_chiffrees li where li.avenant_id = a.id),
        'demande_statut', (select d.statut from public.demandes_validation d where d.id = a.demande_id))
        order by a.numero), '[]'::jsonb)
      from public.btp_avenants_chiffres a where a.chantier_id = c.id),
    'factures', (select coalesce(jsonb_agg(to_jsonb(f) order by f.date_emission desc nulls last, f.cree_le desc), '[]'::jsonb)
      from public.btp_factures_chantier_detail f where f.chantier_id = c.id and f.statut = 'rattachee'),
    'debourse', (select coalesce(jsonb_agg(to_jsonb(d) order by d.code collate "C"), '[]'::jsonb)
      from public.btp_debourse_lots d where d.chantier_id = c.id),
    'tiers', (select coalesce(jsonb_agg(to_jsonb(t) || jsonb_build_object('vigilance', public.btp_etat_vigilance(t.roles, t.vigilance_attestation_le, t.vigilance_verifiee_le)) order by t.nom collate "C"), '[]'::jsonb)
      from public.btp_tiers t where t.client_id = c.client_id and t.actif),
    'equipes', (select coalesce(jsonb_agg(to_jsonb(e) order by e.nom collate "C"), '[]'::jsonb) from public.btp_equipes e where e.client_id = c.client_id and e.actif),
    'bibliotheque', (select coalesce(jsonb_agg(to_jsonb(b) order by b.designation collate "C"), '[]'::jsonb)
      from public.btp_bibliotheque_chiffree b where b.client_id = c.client_id and b.statut in ('valide', 'propose')));
  return v;
end $function$;

revoke execute on function public.btp_liste_chantiers() from public, anon;
revoke execute on function public.btp_tableau_chantier(uuid) from public, anon;
grant execute on function public.btp_liste_chantiers() to authenticated, service_role;
grant execute on function public.btp_tableau_chantier(uuid) to authenticated, service_role;
