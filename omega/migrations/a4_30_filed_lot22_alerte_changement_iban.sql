-- FILED, lot 22 (a4_30) — un changement de coordonnées bancaires chez un fournisseur connu déclenche une alerte.
--
-- Promesse du site (lib/produits/capacites/factures.ts, ligne 57). Avant ce lot, un nouvel IBAN sur la facture d'un
-- fournisseur connu bloquait la facture (contrôle iban.nouveau, a4_11) et ouvrait la validation de l'IBAN (socle F1),
-- mais aucune alerte ne partait : seul un IBAN déjà refusé en levait une. Or la fraude au changement de RIB vise
-- justement un fournisseur connu dont on paie les factures sans y penser.
--
-- Ce lot pose deux déclencheurs sur filed_fournisseurs_ibans, quelle que soit la voie (facture lue, saisie, import,
-- reproposition d'un IBAN écarté) :
--   · un IBAN « proposé » pour un fournisseur qui a déjà un IBAN VALIDÉ (autre que lui) = un changement : alerte
--     critique, adressée au client (pas seulement à Omega), avec l'ancien et le nouvel IBAN masqués, le fournisseur et
--     la pièce d'origine ; journal opposable (filed.iban.changement) ; historique du fournisseur. Un premier IBAN
--     n'est pas un changement : la validation ordinaire suffit.
--   · quand cet IBAN quitte « proposé » (validé ou refusé par une personne), l'alerte est acquittée et la décision
--     historisée.
-- Migration idempotente ; aucune suppression.

create or replace function private.filed_iban_changement()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_ancien public.filed_fournisseurs_ibans; v_four public.filed_fournisseurs; v_doc text;
begin
  if new.statut <> 'propose' or (tg_op = 'UPDATE' and old.statut = 'propose') then return null; end if;
  select * into v_ancien from public.filed_fournisseurs_ibans
   where fournisseur_id = new.fournisseur_id and id <> new.id and statut = 'valide'
   order by decide_le desc nulls last limit 1;
  if v_ancien.id is null then return null; end if;   -- premier IBAN : pas un changement
  select * into v_four from public.filed_fournisseurs where id = new.fournisseur_id;
  select d.reference into v_doc from public.filed_documents d where d.id = new.document_id;
  perform private.lever_alerte_module(new.client_id, 'filed', 'critique',
    left(format('Changement d''IBAN demandé pour %s : %s → %s. Ne rien payer avant de l''avoir confirmé auprès du fournisseur, par un contact connu.',
                coalesce(v_four.nom, 'un fournisseur'), v_ancien.iban_masque, new.iban_masque), 200),
    jsonb_build_object('fournisseur', new.fournisseur_id, 'iban_propose', new.id, 'nouveau', new.iban_masque,
                       'ancien', v_ancien.iban_masque, 'ancien_id', v_ancien.id, 'document', new.document_id, 'reference', v_doc,
                       'source', new.source, 'action', 'valider_ou_refuser_iban'),
    'iban_changement:' || new.id::text, true, null);
  perform private.filed_journaliser(new.client_id, 'filed.iban.changement', 'filed_fournisseur', new.fournisseur_id::text,
    jsonb_build_object('iban_propose', new.id, 'nouveau', new.iban_masque, 'ancien', v_ancien.iban_masque, 'document', new.document_id,
                       'source', new.source));
  perform private.filed_historiser(new.client_id, new.document_id, 'filed_fournisseur', new.fournisseur_id::text, 'iban_changement',
    format('Changement d''IBAN demandé : %s remplacerait %s%s. Alerte levée ; aucun paiement vers le nouvel IBAN avant sa validation.',
           new.iban_masque, v_ancien.iban_masque, coalesce(' (pièce ' || v_doc || ')', '')),
    jsonb_build_object('iban_propose', new.id, 'ancien_id', v_ancien.id));
  return null;
end $$;
revoke all on function private.filed_iban_changement() from public, anon, authenticated;

create or replace trigger filed_fournisseurs_ibans_changement
  after insert or update of statut on public.filed_fournisseurs_ibans
  for each row execute function private.filed_iban_changement();

create or replace function private.filed_iban_changement_decide()
returns trigger language plpgsql security definer set search_path to '' as $$
declare n integer;
begin
  if old.statut <> 'propose' or new.statut = 'propose' then return null; end if;
  update public.alertes set acquittee_le = now()
   where client_id = new.client_id and cle_regroupement = 'filed:iban_changement:' || new.id::text and acquittee_le is null;
  get diagnostics n = row_count;
  if n > 0 then
    perform private.filed_historiser(new.client_id, new.document_id, 'filed_fournisseur', new.fournisseur_id::text, 'iban_changement_decide',
      format('Changement d''IBAN %s : %s.', new.iban_masque,
             case new.statut when 'valide' then 'confirmé par une personne, le nouvel IBAN sert désormais'
                             when 'refuse' then 'refusé, l''ancien IBAN reste le seul valable'
                             else new.statut end),
      jsonb_build_object('iban', new.id, 'statut', new.statut, 'par', new.decide_par));
  end if;
  return null;
end $$;
revoke all on function private.filed_iban_changement_decide() from public, anon, authenticated;

create or replace trigger filed_fournisseurs_ibans_changement_decide
  after update of statut on public.filed_fournisseurs_ibans
  for each row execute function private.filed_iban_changement_decide();
