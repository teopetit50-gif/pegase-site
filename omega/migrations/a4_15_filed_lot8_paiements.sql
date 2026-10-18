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
