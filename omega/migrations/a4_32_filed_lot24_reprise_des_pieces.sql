-- FILED, lot 24 (a4_32) — la reprise des pièces passées : une facture déjà comptabilisée dans l'ancien logiciel est
-- écartée d'elle-même, archivée et liée à son écriture d'origine.
--
-- Suite de la reprise de plusieurs exercices (a4_24, ligne 35 de factures.ts). À l'installation, la société dépose aussi
-- les PDF de ses factures des exercices repris. Avant ce lot, chacune était lue, puis bloquée par doublon.historique
-- (a4_24), et attendait un geste humain, pièce par pièce. Désormais, après chaque contrôle (filed_apres_controle,
-- texte d'a4_08) :
--   · une facture dont le contrôle doublon.historique a trouvé l'écriture d'origine (même fournisseur, même numéro de
--     pièce, a4_24) ET dont la date d'émission tombe dans un exercice repris (filed_reprises, société de la facture)
--     passe en « ecartee » : jamais validée, jamais écrite, jamais payée. L'exercice repris doit être CLOS. Elle est archivée à valeur probante
--     (filed_archiver), historisée (« reprise_historique », avec l'écriture d'origine) et journalisée
--     (filed.reprise_piece) une fois ;
--   · une pièce historique sans écriture correspondante reste bloquée : une personne regarde ;
--   · chaque écart est réversible par une personne : public.filed_retablir_historique(facture, motif) (gérant, admin)
--     remet la pièce dans le circuit, recontrôlée (elle y reste bloquée sur doublon.historique jusqu'à décision), ne
--     l'écarte plus d'office, et l'inscrit au journal (filed.reprise_retablie) ; l'archive déjà inscrite demeure ;
--   · public.filed_etat_reprise(p_client, p_entite) : par fichier repris, les pièces de la période, celles rapprochées
--     de leur écriture, celles rétablies par une personne, celles à regarder, et les écritures d'achat du FEC dont la
--     pièce n'a pas été déposée.
-- Pas de nouveau statut (« ecartee » existe) ; migration idempotente ; aucune suppression.

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Écarter une pièce de l'historique
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_ecarter_historique(p_facture uuid)
returns boolean language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_c public.filed_controles; v_rp public.filed_reprises; v_deja boolean;
begin
  select * into v_f from public.filed_factures where id = p_facture;
  if not found or v_f.statut not in ('a_completer', 'bloquee', 'a_valider', 'ecartee') or v_f.date_emission is null then return false; end if;
  select * into v_c from public.filed_controles where facture_id = v_f.id and code = 'doublon.historique' and resultat = 'anomalie';
  if v_c.id is null then return false; end if;
  select rp.* into v_rp from public.filed_reprises rp
    join public.filed_exercices e on e.id = rp.exercice_id and e.statut = 'cloture'
   where rp.client_id = v_f.client_id and rp.entite_id = v_f.entite_id and v_f.date_emission between rp.debut and rp.fin
   order by rp.fin desc limit 1;
  if v_rp.id is null then return false; end if;   -- un doublon hors des exercices repris clos reste bloqué
  -- Une personne a rétabli cette pièce dans le circuit : on ne l'écarte plus d'office.
  if exists (select 1 from public.filed_historique h where h.objet_type = 'filed_facture' and h.objet_id = v_f.id::text
              and h.etape = 'reprise_retablie') then
    return false;
  end if;

  v_deja := exists (select 1 from public.filed_historique h where h.objet_type = 'filed_facture' and h.objet_id = v_f.id::text
                     and h.etape = 'reprise_historique');
  update public.filed_factures set statut = 'ecartee', maj_le = now() where id = v_f.id and statut <> 'ecartee';
  perform private.filed_annuler_validations(v_f.id, 'annulee');
  if not v_deja then
    perform private.filed_archiver(v_f.id);
    perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'reprise_historique',
      left(format('Pièce de l''historique repris : déjà comptabilisée dans l''ancien logiciel (écriture %s %s du %s, %s). Écartée du circuit, archivée ; ni validation, ni écriture, ni paiement.',
                  v_c.preuve ->> 'journal', v_c.preuve ->> 'ecriture', to_char((v_c.preuve ->> 'date')::date, 'DD/MM/YYYY'), v_rp.nom_fichier), 500),
      jsonb_build_object('reprise', v_rp.id, 'fichier', v_rp.nom_fichier, 'ecriture', v_c.preuve));
    perform private.filed_journaliser(v_f.client_id, 'filed.reprise_piece', 'filed_facture', v_f.id::text,
      jsonb_build_object('reprise', v_rp.id, 'ecriture', v_c.preuve, 'numero', v_f.numero), v_f.entite_id);
  end if;
  return true;
end $$;
comment on function private.filed_ecarter_historique(uuid) is
  'Lot 24 (a4_32) : une facture de l''historique repris, retrouvée dans le FEC, est écartée du circuit, archivée et liée à son écriture d''origine.';
revoke all on function private.filed_ecarter_historique(uuid) from public, anon, authenticated;

-- Rétablir dans le circuit une pièce écartée d'office : une personne, un motif, au journal.
create or replace function private.filed_retablir_historique(p_facture uuid, p_motif text)
returns text language plpgsql security definer set search_path to '' as $$
declare v_f public.filed_factures; v_uid uuid; v_statut text;
begin
  select * into v_f from public.filed_factures where id = p_facture for update;
  if not found then raise exception 'Facture introuvable.' using errcode = 'P0002'; end if;
  v_uid := private.filed_exiger_acteur(v_f.client_id, array['gerant', 'admin'], v_f.entite_id);
  if v_f.statut <> 'ecartee' or not exists (select 1 from public.filed_historique h where h.objet_type = 'filed_facture'
                                              and h.objet_id = v_f.id::text and h.etape = 'reprise_historique') then
    raise exception 'Seule une pièce écartée d''office comme historique se rétablit.' using errcode = '55000';
  end if;
  if exists (select 1 from public.filed_historique h where h.objet_type = 'filed_facture' and h.objet_id = v_f.id::text
              and h.etape = 'reprise_retablie') then
    raise exception 'Cette pièce a déjà été rétablie.' using errcode = '55000';
  end if;
  if nullif(btrim(p_motif), '') is null or char_length(btrim(p_motif)) < 3 then
    raise exception 'Un rétablissement dit pourquoi.' using errcode = '22023';
  end if;
  perform private.filed_historiser(v_f.client_id, v_f.document_id, 'filed_facture', v_f.id::text, 'reprise_retablie',
    left('Rétablie dans le circuit par une personne : ' || btrim(p_motif), 500), jsonb_build_object('par', v_uid));
  perform private.filed_journaliser(v_f.client_id, 'filed.reprise_retablie', 'filed_facture', v_f.id::text,
    jsonb_build_object('par', v_uid, 'motif', left(btrim(p_motif), 500), 'numero', v_f.numero), v_f.entite_id);
  update public.filed_factures set statut = 'a_completer', maj_le = now() where id = v_f.id;
  v_statut := private.filed_controler_facture(v_f.id);
  return v_statut;
end $$;
revoke all on function private.filed_retablir_historique(uuid, text) from public, anon;
grant execute on function private.filed_retablir_historique(uuid, text) to authenticated, service_role;
create or replace function public.filed_retablir_historique(p_facture uuid, p_motif text)
returns text language sql set search_path to '' as $$ select private.filed_retablir_historique(p_facture, p_motif) $$;
comment on function public.filed_retablir_historique(uuid, text) is
  'Rétablit dans le circuit une pièce de l''historique écartée d''office (a4_32), avec un motif, au journal ; elle n''est plus écartée d''office. Gérant ou admin.';
revoke all on function public.filed_retablir_historique(uuid, text) from public, anon;
grant execute on function public.filed_retablir_historique(uuid, text) to authenticated, service_role;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Après le contrôle (texte d'a4_08 + l'écart de l'historique en tête)
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_apres_controle(p_facture uuid, p_statut text)
returns void language plpgsql security definer set search_path to '' as $$
begin
  -- a4_32 : une pièce de l'historique repris, retrouvée dans le FEC, sort du circuit.
  if p_statut in ('a_completer', 'bloquee', 'a_valider') and private.filed_ecarter_historique(p_facture) then return; end if;
  if p_statut = 'a_valider' then
    -- La charge récurrente reconnue propose son imputation ; sinon, ce que le fournisseur a appris.
    perform private.filed_reconnaitre_charge(p_facture);
    perform private.filed_proposer_imputation(p_facture, 'apprise');
    perform private.filed_deposer_validation(p_facture, 1);
  elsif p_statut in ('a_completer', 'bloquee', 'ecartee') then
    perform private.filed_annuler_validations(p_facture, 'annulee');
    if p_statut = 'ecartee' then
      perform private.filed_reconnaitre_charge(p_facture);
    end if;
  end if;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. L'état de la reprise des pièces
-- ───────────────────────────────────────────────────────────────────────────
create or replace function private.filed_etat_reprise(p_client uuid, p_entite uuid default null)
returns jsonb language plpgsql security definer set search_path to '' as $$
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur'], p_entite);
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'fichier', rp.nom_fichier, 'entite', rp.entite_id, 'debut', rp.debut, 'fin', rp.fin, 'ecritures', rp.ecritures,
      'pieces', (select count(*) from public.filed_factures f where f.client_id = rp.client_id and f.entite_id = rp.entite_id
                   and f.date_emission between rp.debut and rp.fin),
      'rapprochees', (select count(*) from public.filed_factures f where f.client_id = rp.client_id and f.entite_id = rp.entite_id
                        and f.date_emission between rp.debut and rp.fin and f.statut = 'ecartee'
                        and exists (select 1 from public.filed_historique h where h.objet_type = 'filed_facture' and h.objet_id = f.id::text
                                     and h.etape = 'reprise_historique')),
      'retablies', (select count(*) from public.filed_factures f where f.client_id = rp.client_id and f.entite_id = rp.entite_id
                      and f.date_emission between rp.debut and rp.fin
                      and exists (select 1 from public.filed_historique h where h.objet_type = 'filed_facture' and h.objet_id = f.id::text
                                   and h.etape = 'reprise_retablie')),
      'a_regarder', (select count(*) from public.filed_factures f where f.client_id = rp.client_id and f.entite_id = rp.entite_id
                       and f.date_emission between rp.debut and rp.fin and f.statut in ('a_completer', 'bloquee', 'a_valider')),
      'achats_sans_piece', (select count(distinct (e.journal_code, e.ecriture_num)) from public.filed_reprise_ecritures e
                              join public.filed_reprise_tiers t on t.client_id = e.client_id and t.entite_id = e.entite_id and t.comp_aux_num = e.comp_aux_num
                             where e.reprise_id = rp.id and e.compte_num like '40%' and e.credit > e.debit
                               and not exists (select 1 from public.filed_factures f
                                                where f.client_id = rp.client_id and f.fournisseur_id = t.fournisseur_id
                                                  and upper(regexp_replace(coalesce(f.numero_normalise, f.numero, ''), '[^A-Za-z0-9]', '', 'g')) = e.piece_ref_normalise)))
      order by rp.entite_id, rp.fin)
      from public.filed_reprises rp
     where rp.client_id = p_client and (p_entite is null or rp.entite_id = p_entite)), '[]'::jsonb);
end $$;
revoke all on function private.filed_etat_reprise(uuid, uuid) from public, anon;
grant execute on function private.filed_etat_reprise(uuid, uuid) to authenticated, service_role;
create or replace function public.filed_etat_reprise(p_client uuid, p_entite uuid default null)
returns jsonb language sql set search_path to '' as $$ select private.filed_etat_reprise(p_client, p_entite) $$;
comment on function public.filed_etat_reprise(uuid, uuid) is
  'Par fichier repris : pièces de la période, rapprochées de leur écriture, à regarder, et écritures d''achat dont la pièce manque. Gérant, admin ou valideur.';
revoke all on function public.filed_etat_reprise(uuid, uuid) from public, anon;
grant execute on function public.filed_etat_reprise(uuid, uuid) to authenticated, service_role;
