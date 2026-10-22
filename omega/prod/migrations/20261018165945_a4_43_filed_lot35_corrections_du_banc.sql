-- 20261018165945 a4_43_filed_lot35_corrections_du_banc
-- Source : dépôt : f2034de omega/migrations/a4_43_filed_lot35_corrections_du_banc.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a4_43_filed_lot35_corrections_du_banc.sql @ f2034de ; fichiers de tests ignorés : omega/tests/filed/a4_31_corrections_banc.sql.
-- ═══ omega/migrations/a4_43_filed_lot35_corrections_du_banc.sql @ f2034de
-- FILED, lot 35 (a4_43) — trois défauts vus au banc (chantier 3, 18/10 : les exemples de la norme Factur-X / ZUGFeRD 2
-- lus par FILED sur le client du banc ; voir omega/NOTES-A4.md, « Banc, chantier 3 »).
--
--   1. identite.siren (private.filed_controles_identite, a4_39) : « Aucun SIREN » était levé contre un fournisseur
--      allemand. Un fournisseur établi hors de France (préfixe de TVA autre que FR, ou pays hors France et DROM) n'a pas
--      de SIREN : le contrôle passe, et le dit.
--   2. doublon.exact (private.filed_controler_facture, a4_11) : la recherche prenait la PREMIÈRE pièce du même numéro
--      et ne comparait qu'elle ; un vrai doublon (même date, même montant) d'une pièce plus récente du même numéro restait
--      « bloquée » au lieu d'« écartée ». La pièce de même date et même montant passe désormais devant.
--   3. Le nom du fournisseur créé d'une pièce (private.filed_creer_fournisseur) a ses blancs repliés : le XML de la
--      norme porte des sauts de ligne dans le nom. Les noms déjà posés avec des blancs multiples sont repliés de même.
--
-- Pose « par repère » : chaque corps est repris tel qu'il est en base (pg_get_functiondef) et seul le fragment visé est
-- remplacé ; un fragment déjà remplacé n'est pas retouché (idempotent) ; un fragment introuvable arrête la migration.
-- Droits et propriétaire inchangés (create or replace). Aucun DROP, aucune suppression.

do $do$
declare
  r record; v_def text; v_new text;
begin
  for r in select * from (values
    ('private.filed_controles_identite(uuid)',
$o1$  -- identite.siren
  if v_siren is null then
$o1$,
$n1$  -- identite.siren (a4_43 : aucun SIREN n'est attendu d'un fournisseur établi hors de France)
  if v_siren is null and ((v_tva is not null and upper(left(v_tva, 2)) <> 'FR')
                          or coalesce(v_four.pays, 'FR') not in ('FR', 'GP', 'MQ', 'GF', 'RE', 'YT', 'PM', 'BL', 'MF')) then
    perform private.filed_poser_resultat(v_f, 'identite.siren', 'attention', false,
      'Fournisseur établi hors de France : aucun SIREN attendu.', 'EMMET_INC',
      jsonb_build_object('siren', null, 'pays', coalesce(v_pays, v_four.pays, upper(left(v_tva, 2)))), 'hors_france');
  elsif v_siren is null then
$n1$),
    ('private.filed_controler_facture(uuid)',
$o2$      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    order by d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      if v_autre.montant_ttc is not distinct from v_f.montant_ttc and v_autre.date_emission = v_f.date_emission then
$o2$,
$n2$      and (d.annee_reception, d.numero_reception) < (v_doc.annee_reception, v_doc.numero_reception)
    -- a4_43 : la pièce de même date et même montant d'abord (le doublon exact), puis la plus ancienne.
    order by (e.montant_ttc is not distinct from v_f.montant_ttc and e.date_emission = v_f.date_emission) desc,
             d.annee_reception, d.numero_reception
    limit 1;
    if v_autre.id is not null then
      select d.reference into v_autre_ref from public.filed_documents d where d.id = v_autre.document_id;
      if v_autre.montant_ttc is not distinct from v_f.montant_ttc and v_autre.date_emission = v_f.date_emission then
$n2$),
    ('private.filed_creer_fournisseur(uuid, jsonb, text, uuid)',
$o3$  v_nom := coalesce(nullif(btrim(p_identite ->> 'nom'), ''),
$o3$,
$n3$  v_nom := coalesce(nullif(btrim(regexp_replace(p_identite ->> 'nom', '\s+', ' ', 'g')), ''), -- a4_43 : blancs repliés
$n3$)) t(fonction, ancien, nouveau)
  loop
    v_def := pg_get_functiondef(r.fonction::regprocedure);
    if position(r.nouveau in v_def) > 0 then
      raise notice 'a4_43 : % déjà corrigée.', r.fonction;
      continue;
    end if;
    if (length(v_def) - length(replace(v_def, r.ancien, ''))) / length(r.ancien) <> 1 then
      raise exception 'a4_43 : le repère attendu n''est pas une fois et une seule dans %. Rien n''est posé.', r.fonction;
    end if;
    v_new := replace(v_def, r.ancien, r.nouveau);
    execute v_new;
    raise notice 'a4_43 : % corrigée.', r.fonction;
  end loop;
end $do$;

-- Les noms de fournisseurs déjà posés avec des sauts de ligne ou des blancs multiples.
update public.filed_fournisseurs
   set nom = btrim(regexp_replace(nom, '\s+', ' ', 'g')),
       nom_normalise = private.filed_normaliser_nom(btrim(regexp_replace(nom, '\s+', ' ', 'g')))
 where nom ~ '[\r\n\t]|\s{2,}|^\s|\s$';
