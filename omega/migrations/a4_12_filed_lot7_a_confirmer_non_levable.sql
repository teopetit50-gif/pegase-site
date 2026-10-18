-- FILED, lot 7 (correctif a4_12) — le contrôle « fournisseur.a_confirmer » ne se lève pas avec un motif.
--
-- Remontée d'A3 (relecture réelle) : le contrôle porte à l'écran « Lever avec un motif » comme tout contrôle. Or
-- private.filed_levable du socle ne l'exclut pas (seuls les « lecture.* » le sont) : le déposant de la pièce pouvait
-- lever ce bloquant et contourner la règle de filed_confirmer_fournisseur (« celui qui a déposé ne confirme pas »).
--
-- Choix : ce contrôle n'est levable par PERSONNE. Lever, c'est confirmer le fournisseur sans le journal de
-- confirmation, sans valider son IBAN, et pour une seule facture. La seule sortie est public.filed_confirmer_fournisseur
-- (gérant, admin, valideur ; jamais le déposant), qui recontrôle elle-même les factures. Rien n'est perdu pour une
-- personne habilitée.
--
-- Deux gardes, sans dépendre du corps de public.filed_lever_anomalie (absent des extraits) :
--   1. public.filed_levees : toute levée de « fournisseur.a_confirmer » est refusée (42501), quel que soit l'auteur.
--   2. public.filed_controles : une levée posée AVANT ce correctif ne vaut plus ; au prochain contrôle, le résultat
--      reste « anomalie » (le statut de la facture se compte sur filed_controles, cf. a4_11).
-- Migration idempotente (create or replace function, create or replace trigger).

create or replace function private.filed_refuser_levee_a_confirmer()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.code = 'fournisseur.a_confirmer' then
    raise exception 'Ce contrôle ne se lève pas : le fournisseur se confirme (Confirmer le fournisseur), par une autre personne que celle qui a déposé la pièce.'
      using errcode = '42501';
  end if;
  return new;
end $$;
comment on function private.filed_refuser_levee_a_confirmer() is
  'Lot 7 (a4_12) : refuse toute levée du contrôle fournisseur.a_confirmer ; la sortie est public.filed_confirmer_fournisseur.';
revoke all on function private.filed_refuser_levee_a_confirmer() from public, anon, authenticated;

create or replace trigger filed_levees_a_confirmer
  before insert or update on public.filed_levees
  for each row execute function private.filed_refuser_levee_a_confirmer();

create or replace function private.filed_ignorer_levee_a_confirmer()
returns trigger language plpgsql set search_path to '' as $$
begin
  if new.code = 'fournisseur.a_confirmer' and new.resultat = 'levee' then
    new.resultat := 'anomalie';
    new.levee_id := null;
  end if;
  return new;
end $$;
comment on function private.filed_ignorer_levee_a_confirmer() is
  'Lot 7 (a4_12) : une levée de fournisseur.a_confirmer antérieure au correctif ne vaut plus ; le contrôle reste en anomalie.';
revoke all on function private.filed_ignorer_levee_a_confirmer() from public, anon, authenticated;

create or replace trigger filed_controles_a_confirmer
  before insert or update on public.filed_controles
  for each row execute function private.filed_ignorer_levee_a_confirmer();
