-- 20261006051221 filed_a4_15_paiements
-- Source : dépôt : 634fe24 omega/migrations/a4_15_filed_lot8_paiements.sql ; 634fe24 omega/migrations/a4_09_filed_lot4g_acquittement_alerte.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_15_filed_lot8_paiements.sql @ 634fe24, a4_09_filed_lot4g_acquittement_alerte.sql @ 634fe24.
-- ═══ omega/migrations/a4_15_filed_lot8_paiements.sql @ 634fe24
-- FILED, lot 8 (a4_15) — le suivi du paiement, pour la vue « À payer » d'A3.
--
-- Le socle FILED a déjà, depuis a4_06 : la table public.filed_reglements (facture, date, montant, mode, référence,
-- saisi_par) et la porte public.filed_marquer_reglee (gérant, admin, valideur ; facture validée ou comptabilisée ;
-- paiement partiel ; historisée « reglee » et journalisée « filed.reglement »). Ce lot ne crée pas de seconde table :
--   1. private.filed_marquer_reglee (texte d'a4_06) gagne trois gardes : pas de règlement au-delà du reste à payer,
--      pas de date future, et une même référence sur une même facture n'est notée qu'une fois (double clic).
--   2. public.filed_noter_paiement(p_facture, p_date, p_montant, p_moyen, p_reference) : la porte demandée, montant
--      positif ou nul (nul = le reste), moyen parmi ceux de filed_reglements.mode.
--   3. public.filed_etat_paiement(p_facture) : dû, réglé, reste, état (a_payer | partielle | payee), dernier règlement.
--      Lecture sous les droits de l'appelant (RLS de filed_factures et filed_reglements).
-- Pas de statut « payee » sur filed_factures : une facture payée reste « validee » ou « comptabilisee » ; l'état de
-- paiement se lit, il ne remplace pas l'état comptable.
-- Migration idempotente (create or replace function).

-- ── 1. La porte d'a4_06, avec ses gardes ──
create or replace function private.filed_marquer_reglee(p_facture uuid, p_regle_le date, p_montant numeric default null, p_mode text default null, p_reference text default null)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_id uuid; v_montant numeric; v_reste numeric; v_ref text := nullif(btrim(left(p_reference, 80)), '');
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin', 'valideur'], v_f.entite_id);
  if (select auth.uid()) is not null and not private.voit_objet(v_f.client_id, 'filed_document', v_f.document_id::text) then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if v_f.statut not in ('validee', 'comptabilisee') then
    raise exception 'Un règlement se note sur une facture validée ou comptabilisée (ici : %).', v_f.statut using errcode = '55000';
  end if;
  -- Lot 8 (a4_15) : une même référence n'est notée qu'une fois sur une facture (double clic, import rejoué).
  if v_ref is not null then
    select r.id into v_id from public.filed_reglements r where r.facture_id = v_f.id and r.reference = v_ref limit 1;
    if v_id is not null then return v_id; end if;
  end if;
  -- Lot 8 (a4_15) : pas de date future.
  if p_regle_le is not null and p_regle_le > current_date then
    raise exception 'La date du règlement (%) est dans le futur.', to_char(p_regle_le, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  v_reste := coalesce(v_f.net_a_payer, v_f.montant_ttc) - coalesce((select sum(r.montant) from public.filed_reglements r where r.facture_id = v_f.id), 0);
  v_montant := coalesce(p_montant, v_reste);
  if coalesce(v_montant, 0) = 0 then raise exception 'Rien à régler sur cette facture.' using errcode = '22023'; end if;
  -- Lot 8 (a4_15) : pas au-delà du reste à payer (au centime près), dans le sens de la pièce (un avoir se rembourse en négatif).
  if sign(v_montant) = sign(v_reste) and abs(v_montant) > abs(v_reste) + 0.005 then
    raise exception 'Le règlement (%) dépasse le reste à payer (%).', private.filed_montant_texte(v_montant), private.filed_montant_texte(v_reste)
      using errcode = '22023';
  end if;
  if sign(v_montant) <> sign(v_reste) and v_reste <> 0 then
    raise exception 'Le règlement (%) est de sens contraire au reste à payer (%).', private.filed_montant_texte(v_montant), private.filed_montant_texte(v_reste)
      using errcode = '22023';
  end if;
  if v_reste = 0 or abs(v_reste) < 0.005 then raise exception 'Cette facture est déjà réglée.' using errcode = '22023'; end if;
  insert into public.filed_reglements (client_id, facture_id, document_id, regle_le, montant, mode, reference, saisi_par)
  values (v_f.client_id, v_f.id, v_f.document_id, coalesce(p_regle_le, current_date), round(v_montant, 2), p_mode, v_ref, v_uid)
  returning id into v_id;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'reglee',
    format('Règlement noté : %s le %s%s.', round(v_montant, 2), to_char(coalesce(p_regle_le, current_date), 'DD/MM/YYYY'), coalesce(' (' || p_mode || ')', '')),
    jsonb_build_object('reglement', v_id, 'montant', round(v_montant, 2), 'regle_le', coalesce(p_regle_le, current_date)));
  perform private.filed_journaliser(v_f.client_id, 'filed.reglement', 'filed_facture', v_f.id::text,
    jsonb_build_object('reglement', v_id, 'regle_le', coalesce(p_regle_le, current_date)), v_f.entite_id);
  return v_id;
end $$;
-- Appelée par les portes publiques (enveloppes sous les droits de l'appelant) : authenticated garde l'exécution, le
-- contrôle des rôles est dans le corps (filed_exiger_acteur).
revoke all on function private.filed_marquer_reglee(uuid, date, numeric, text, text) from public, anon;
grant execute on function private.filed_marquer_reglee(uuid, date, numeric, text, text) to authenticated, service_role;

-- ── 2. La porte demandée par l'écran ──
create or replace function public.filed_noter_paiement(p_facture uuid, p_date date default null, p_montant numeric default null, p_moyen text default null, p_reference text default null)
returns uuid language plpgsql set search_path to '' as $$
begin
  if p_montant is not null and p_montant <= 0 then
    raise exception 'Le montant payé est positif (laisser vide pour le reste à payer).' using errcode = '22023';
  end if;
  if p_moyen is not null and p_moyen not in ('virement', 'prelevement', 'cheque', 'carte', 'especes', 'compensation', 'autre') then
    raise exception 'Moyen de paiement inconnu : %.', p_moyen using errcode = '22023';
  end if;
  return private.filed_marquer_reglee(p_facture, p_date, p_montant, p_moyen, p_reference);
end $$;
comment on function public.filed_noter_paiement(uuid, date, numeric, text, text) is
  'Note un paiement (total ou partiel) sur une facture validée ou comptabilisée : gérant, admin, valideur ; jamais au-delà du reste ; une référence n''est notée qu''une fois. Rend l''identifiant du règlement.';
revoke all on function public.filed_noter_paiement(uuid, date, numeric, text, text) from public, anon;
grant execute on function public.filed_noter_paiement(uuid, date, numeric, text, text) to authenticated, service_role;

-- ── 3. L'état de paiement d'une facture (lecture, droits de l'appelant) ──
create or replace function public.filed_etat_paiement(p_facture uuid)
returns table (facture_id uuid, du numeric, regle numeric, reste numeric, etat text, dernier_le date, nb_reglements integer)
language sql stable set search_path to '' as $$
  select f.id,
         coalesce(f.net_a_payer, f.montant_ttc) as du,
         coalesce(r.regle, 0) as regle,
         coalesce(f.net_a_payer, f.montant_ttc) - coalesce(r.regle, 0) as reste,
         case when coalesce(r.n, 0) = 0 then 'a_payer'
              when abs(coalesce(f.net_a_payer, f.montant_ttc) - coalesce(r.regle, 0)) < 0.005 then 'payee'
              else 'partielle' end as etat,
         r.dernier_le, coalesce(r.n, 0)::integer
    from public.filed_factures f
    left join lateral (select sum(x.montant) as regle, max(x.regle_le) as dernier_le, count(*) as n
                         from public.filed_reglements x where x.facture_id = f.id) r on true
   where f.id = p_facture
$$;
comment on function public.filed_etat_paiement(uuid) is
  'État de paiement d''une facture : dû (net à payer ou TTC), réglé, reste, état (a_payer, partielle, payee), dernier règlement. Lecture sous les droits de l''appelant.';
revoke all on function public.filed_etat_paiement(uuid) from public, anon;
grant execute on function public.filed_etat_paiement(uuid) to authenticated, service_role;


-- ═══ omega/migrations/a4_09_filed_lot4g_acquittement_alerte.sql @ 634fe24
-- FILED, lot 4g (correctif a4_09) — l'alerte « facture attendue absente » s'acquitte quand la facture arrive.
--
-- Remplace private.filed_reconnaitre_charge du lot 4c (a4_03) : même corps, plus l'acquittement de l'alerte
-- (public.alertes.acquittee_le) quand une écriture attendue passée en « manquante » est enfin servie.
-- Migration idempotente.

create or replace function private.filed_reconnaitre_charge(p_facture uuid)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_a record; v_imp uuid;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.nature <> 'facture' or v_f.fournisseur_id is null or v_f.montant_ht is null or v_f.date_emission is null then return null; end if;
  if v_f.statut in ('ecartee', 'refusee') then
    update public.filed_charges_attendues set statut = 'attendue', facture_id = null, recue_le = null where facture_id = v_f.id and statut = 'recue';
    return null;
  end if;
  select a.id into v_imp from public.filed_charges_attendues a where a.facture_id = v_f.id limit 1;
  if v_imp is not null then return v_imp; end if;

  select a.*, c.compte_id, c.centre_id, c.libelle as charge_libelle, c.tolerance_jours
    into v_a
    from public.filed_charges_attendues a
    join public.filed_charges_recurrentes c on c.id = a.charge_id
   where a.client_id = v_f.client_id and c.fournisseur_id = v_f.fournisseur_id
     and (c.entite_id is null or c.entite_id = v_f.entite_id)
     and a.statut in ('attendue', 'manquante')
     and abs(v_f.montant_ht - a.montant_ht) <= a.montant_ht * c.tolerance_pct / 100 + 0.005
     and v_f.date_emission between a.attendue_le - 15 and (a.periode + private.filed_pas_periodicite(c.periodicite))::date + 15
   order by abs(v_f.date_emission - a.attendue_le), abs(v_f.montant_ht - a.montant_ht)
   limit 1;
  if v_a.id is null then return null; end if;

  update public.filed_charges_attendues set statut = 'recue', facture_id = v_f.id, recue_le = now() where id = v_a.id;
  -- Lot 4g : la facture arrivée tard acquitte l'alerte « facture attendue absente » (clé du socle : module:cle).
  update public.alertes set acquittee_le = now()
   where client_id = v_f.client_id and cle_regroupement = 'filed:charge_manquante:' || v_a.id::text and acquittee_le is null;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'charge_reconnue',
    format('Facture reconnue comme la charge récurrente « %s », période %s.', v_a.charge_libelle, to_char(v_a.periode, 'MM/YYYY')),
    jsonb_build_object('charge', v_a.charge_id, 'attendue', v_a.id, 'periode', v_a.periode));
  perform private.filed_poser_resultat(v_f, 'recurrence.reconnue', 'info', false,
    format('Charge récurrente « %s » (%s).', v_a.charge_libelle, to_char(v_a.periode, 'MM/YYYY')), null,
    jsonb_build_object('charge', v_a.charge_id, 'attendue', v_a.id, 'periode', v_a.periode, 'montant_attendu', v_a.montant_ht), v_a.id::text);
  if v_f.statut = 'a_valider' then
    v_imp := private.filed_proposer_imputation(v_f.id, 'recurrente', v_a.compte_id, v_a.centre_id, v_a.charge_libelle);
    if v_imp is not null then update public.filed_charges_attendues set imputation_id = v_imp where id = v_a.id; end if;
  end if;
  return v_a.id;
end $$;
