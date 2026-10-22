-- 20261021190318 a4_70_devis_nom_approche
-- Source : dépôt : 4ea9a975 omega/migrations/a4_70_filed_lot62_devis_nom_approche.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_70_filed_lot62_devis_nom_approche.sql @ 4ea9a975 ; a4_58 cité comme test : ignoré.
-- ═══ omega/migrations/a4_70_filed_lot62_devis_nom_approche.sql @ 4ea9a975
-- a4_70 (FILED lot 62) : un devis rattaché à son fournisseur par un nom approché, quand il n'a pas de SIREN.
--
-- Demande du coordinateur (21/10/2026, 19 h Z), relevé 19 du banc : NOBAT-DOSSIER1-FACTURE, rapprochement.devis vide ;
-- les fiches filed_devis du banc ont fournisseur_id nul : le devis TOP PRO ne porte que « TOPPRO MOTEUR », sans SIREN,
-- quand la facture est rattachée à TOP PRO MOTEURS (SIREN 901434340).
--
--   · private.filed_cle_nom : le nom normalisé (filed_normaliser_nom), sans la forme sociale (SARL, SAS, EURL…), chaque
--     mot sans son « s » ou son « x » final (matériaux = matériau), les espaces ôtés : « TOPPRO MOTEUR » et « TOP PRO MOTEURS » donnent « toppromoteur ».
--   · private.filed_lire_devis : sans SIREN ni nom identique, le fournisseur dont la clé de nom est celle du devis,
--     s'il est seul à l'avoir (filed_devis.fournisseur_par = 'nom_approche').
--   · private.filed_rapprocher_devis : relit aussi une fiche restée sans fournisseur ; propose aussi les devis sans
--     fournisseur dont la clé de nom est celle du fournisseur de la facture (plusieurs fournisseurs au même nom
--     approché). Le message le dit : « devis rattaché par son nom (« TOPPRO MOTEUR »), à vérifier ».
-- Toujours une proposition qu'une personne confirme ou écarte (a4_66) : rien n'est rapproché seul.
-- Les deux fonctions sont celles d'a4_66, reprises en entier (fonctions d'A4) avec ces changements. Rejouable.

alter table public.filed_devis add column if not exists fournisseur_par text check (fournisseur_par in ('siren', 'nom', 'nom_approche', 'humain'));
comment on column public.filed_devis.fournisseur_par is
  'Lot 62 (a4_70) : comment le fournisseur du devis a été trouvé : SIREN, nom identique, nom approché (à vérifier), ou une personne.';

create or replace function private.filed_cle_nom(p text)
returns text language sql immutable set search_path to '' as $$
  select nullif(string_agg(case when char_length(m) > 3 and (m like '%s' or m like '%x') then left(m, -1) else m end, '' order by n), '')
  from regexp_split_to_table(coalesce(private.filed_normaliser_nom(p), ''), ' ') with ordinality as t(m, n)
  where m <> '' and m not in ('sarl', 'sas', 'sasu', 'eurl', 'sa', 'snc', 'sci', 'scop', 'selarl', 'ste', 'societe', 'ets', 'etablissements', 'et', 'cie')
$$;
revoke all on function private.filed_cle_nom(text) from public, anon, authenticated;
grant execute on function private.filed_cle_nom(text) to service_role;

create or replace function private.filed_lire_devis(p_document uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare d public.filed_documents; x public.filed_devis; v jsonb; v_id uuid; v_four uuid; v_nom text; v_siren text; v_lignes jsonb;
        v_par text; v_candidats uuid[];
begin
  select * into d from public.filed_documents where id = p_document;
  if not found or d.nature is distinct from 'devis' then return null; end if;
  select * into x from public.filed_devis where document_id = p_document;
  if x.id is not null and x.source = 'humain' then return x.id; end if;
  v := coalesce(private.filed_valeurs(d.piece_id), '{}'::jsonb);
  v_nom := left(nullif(btrim(coalesce(v -> 'fournisseur.nom' ->> 'valeur', '')), ''), 200);
  v_siren := nullif(regexp_replace(coalesce(v -> 'fournisseur.siren' ->> 'valeur', ''), '\D', '', 'g'), '');
  if v_siren is not null then
    select f.id into v_four from public.filed_fournisseurs f where f.client_id = d.client_id and f.siren = left(v_siren, 9) limit 1;
    if v_four is not null then v_par := 'siren'; end if;
  end if;
  if v_four is null and v_nom is not null then
    select f.id into v_four from public.filed_fournisseurs f
     where f.client_id = d.client_id
       and (f.nom_normalise = private.filed_normaliser_nom(v_nom) or private.filed_normaliser_nom(f.nom) = private.filed_normaliser_nom(v_nom))
     order by f.statut = 'actif' desc limit 1;
    if v_four is not null then v_par := 'nom'; end if;
  end if;
  -- a4_70 : sans SIREN ni nom identique, le nom approché (espaces, pluriel et forme sociale ignorés) — s'il ne désigne
  -- qu'un fournisseur. Le rapprochement reste une proposition, et il le dit.
  if v_four is null and private.filed_cle_nom(v_nom) is not null then
    select array_agg(f.id) into v_candidats from public.filed_fournisseurs f
     where f.client_id = d.client_id and f.statut <> 'refuse' and private.filed_cle_nom(f.nom) = private.filed_cle_nom(v_nom);
    if cardinality(v_candidats) = 1 then v_four := v_candidats[1]; v_par := 'nom_approche'; end if;
  end if;
  v_lignes := case when jsonb_typeof(v -> 'lignes' -> 'valeur') = 'array' then v -> 'lignes' -> 'valeur' else '[]'::jsonb end;
  insert into public.filed_devis (client_id, entite_id, document_id, fournisseur_id, fournisseur_par, emetteur, numero, date_devis, montant_ht, montant_ttc, lignes, source)
  values (d.client_id, d.entite_id, d.id, v_four, v_par, v_nom, left(nullif(btrim(coalesce(v -> 'numero' ->> 'valeur', '')), ''), 100),
          private.filed_date_lue(v -> 'date' ->> 'valeur'), private.filed_montant_lu(v -> 'montant_ht' ->> 'valeur'),
          private.filed_montant_lu(v -> 'montant_ttc' ->> 'valeur'), v_lignes, 'lecture')
  on conflict (document_id) do update
    set fournisseur_id = excluded.fournisseur_id, fournisseur_par = excluded.fournisseur_par, emetteur = excluded.emetteur, numero = excluded.numero, date_devis = excluded.date_devis,
        montant_ht = excluded.montant_ht, montant_ttc = excluded.montant_ttc, lignes = excluded.lignes, maj_le = now()
  returning id into v_id;
  return v_id;
end $$;
revoke all on function private.filed_lire_devis(uuid) from public, anon, authenticated;
grant execute on function private.filed_lire_devis(uuid) to service_role;

create or replace function private.filed_rapprocher_devis(p_facture uuid)
returns void language plpgsql security definer set search_path to '' as $$
declare
  v_f public.filed_factures;
  v_tol numeric;
  v_mots_facture text[];
  r record;
  c record;
  v_conf record;
  v_n integer := 0;
  v_txt text;
  v_cle_four text;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if v_f.id is null or v_f.nature <> 'facture' or v_f.fournisseur_id is null then return; end if;
  v_tol := coalesce((private.filed_reglage(v_f.client_id, v_f.entite_id)).tolerance_totaux, 0.05);
  v_cle_four := private.filed_cle_nom((select f.nom from public.filed_fournisseurs f where f.id = v_f.fournisseur_id));

  -- Les fiches des devis récents du client : lues si elles manquent ou si le lecteur a écrit depuis.
  for r in select d.id from public.filed_documents d
            where d.client_id = v_f.client_id and d.nature = 'devis' and d.recu_le > now() - interval '13 months'
              and not exists (select 1 from public.filed_devis x where x.document_id = d.id
                                  and (x.source = 'humain' or ((x.montant_ttc is not null or x.montant_ht is not null) and x.fournisseur_id is not null))) loop
    perform private.filed_lire_devis(r.id);
  end loop;

  -- Un devis confirmé par une personne : le contrôle le dit.
  select x.*, k.id as lien into v_conf from public.filed_devis_rapprochements k join public.filed_devis x on x.id = k.devis_id
   where k.facture_id = v_f.id and k.statut = 'confirme';
  if v_conf.lien is not null then
    v_txt := format('Rapprochée du devis %s%s, confirmé par une personne', coalesce(v_conf.numero, 'sans numéro'),
                    coalesce(' du ' || to_char(v_conf.date_devis, 'DD/MM/YYYY'), ''));
    perform private.filed_poser_resultat(v_f, 'rapprochement.devis', 'attention',
      v_conf.montant_ttc is not null and v_f.montant_ttc > v_conf.montant_ttc + v_tol,
      case when v_conf.montant_ttc is null then v_txt || '.'
           when v_f.montant_ttc > v_conf.montant_ttc + v_tol
             then format('%s : la facture (%s) dépasse le devis (%s).', v_txt, private.filed_montant_texte(v_f.montant_ttc), private.filed_montant_texte(v_conf.montant_ttc))
           when v_f.montant_ttc < v_conf.montant_ttc - v_tol
             then format('%s : reste à facturer %s sur le devis.', v_txt,
                         private.filed_montant_texte(v_conf.montant_ttc - coalesce((select sum(ff.montant_ttc) from public.filed_devis_rapprochements kk
                                                                                     join public.filed_factures ff on ff.id = kk.facture_id
                                                                                    where kk.devis_id = v_conf.id and kk.statut = 'confirme'), 0)))
           else v_txt || ', même montant.' end,
      null, jsonb_build_object('devis', v_conf.id, 'document', v_conf.document_id, 'montant_devis', v_conf.montant_ttc));
    return;
  end if;

  -- Sinon : les propositions (au plus trois), jamais un rapprochement d'office.
  select coalesce(array_agg(distinct m), '{}') into v_mots_facture
  from public.filed_factures_lignes l, unnest(private.filed_mots(l.designation)) m where l.facture_id = v_f.id;

  for c in
    select x.*, x.montant_ttc - v_f.montant_ttc as ecart,
           (select count(*) from jsonb_array_elements(x.lignes) e
             where private.filed_mots(coalesce(e ->> 'designation', e ->> 'libelle')) && v_mots_facture)::int as communs
    from public.filed_devis x
    where x.client_id = v_f.client_id
      and (x.fournisseur_id = v_f.fournisseur_id   -- a4_70 : ou un devis sans fournisseur au même nom approché
           or (x.fournisseur_id is null and v_cle_four is not null and private.filed_cle_nom(x.emetteur) = v_cle_four))
      and (x.date_devis is null or v_f.date_emission is null or x.date_devis between v_f.date_emission - 365 and v_f.date_emission)
      and not exists (select 1 from public.filed_devis_rapprochements k where k.devis_id = x.id and k.facture_id = v_f.id and k.statut = 'ecarte')
      -- pas déjà soldé par des factures confirmées
      and (x.montant_ttc is null or coalesce((select sum(ff.montant_ttc) from public.filed_devis_rapprochements kk join public.filed_factures ff on ff.id = kk.facture_id
                                               where kk.devis_id = x.id and kk.statut = 'confirme'), 0) < x.montant_ttc - v_tol)
    order by abs(coalesce(x.montant_ttc - v_f.montant_ttc, 1e9)), x.date_devis desc nulls last
    limit 3
  loop
    v_n := v_n + 1;
    insert into public.filed_devis_rapprochements (client_id, facture_id, devis_id, ecart, articles_communs, concordant)
    values (v_f.client_id, v_f.id, c.id, c.ecart, c.communs,
            c.montant_ttc is not null and abs(c.ecart) <= v_tol and (c.communs > 0 or jsonb_array_length(c.lignes) = 0 or cardinality(v_mots_facture) = 0))
    on conflict (facture_id, devis_id) do update
      set ecart = excluded.ecart, articles_communs = excluded.articles_communs, concordant = excluded.concordant
      where public.filed_devis_rapprochements.statut = 'propose';
  end loop;
  if v_n = 0 then return; end if;

  select x.numero, x.date_devis, x.montant_ttc, k.articles_communs, k.concordant, k.devis_id, x.document_id, x.emetteur,
         (x.fournisseur_id is null or x.fournisseur_par = 'nom_approche') as par_nom into c
  from public.filed_devis_rapprochements k join public.filed_devis x on x.id = k.devis_id
  where k.facture_id = v_f.id and k.statut = 'propose'
  order by k.concordant desc, abs(coalesce(k.ecart, 1e9)) limit 1;
  perform private.filed_poser_resultat(v_f, 'rapprochement.devis', case when c.concordant then 'info' else 'attention' end, true,
    left(format('Devis %s%s (%s) du même fournisseur proposé : %s%s%s. À confirmer ou écarter par une personne.',
                coalesce(c.numero, 'sans numéro'), coalesce(' du ' || to_char(c.date_devis, 'DD/MM/YYYY'), ''),
                coalesce(private.filed_montant_texte(c.montant_ttc), 'montant non lu'),
                case when c.articles_communs > 0 then c.articles_communs || ' article(s) en commun' else 'aucun article en commun' end,
                case when c.montant_ttc is null then ''
                     when abs(c.montant_ttc - v_f.montant_ttc) <= v_tol then ', même montant'
                     else ', écart de ' || private.filed_montant_texte(c.montant_ttc - v_f.montant_ttc) end,
                case when c.par_nom then format(' ; devis rattaché par son nom (« %s »), à vérifier', c.emetteur) else '' end), 500),
    null, jsonb_build_object('devis', c.devis_id, 'document', c.document_id, 'propositions', v_n, 'concordant', c.concordant, 'par_nom', c.par_nom));
end $$;
revoke all on function private.filed_rapprocher_devis(uuid) from public, anon, authenticated;
grant execute on function private.filed_rapprocher_devis(uuid) to service_role;
