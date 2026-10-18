-- Tests A4 — TVA intracommunautaire et SIREN : format et clé de contrôle, pays par pays (fonctions pures).
-- Numéros fabriqués pour tomber juste (ou faux) à la clé : aucune donnée réelle. Exécutable tel quel.
begin;
do $$
declare r record;
begin
  select * into r from private.filed_tva_intracom_analyser('FR11123456782'); assert r.valide and r.cle_verifiee, 'FR : clé numérique juste';
  select * into r from private.filed_tva_intracom_analyser('FR 12 123 456 782'); assert not r.valide and r.motif = 'Clé de contrôle fausse pour FR', 'FR : clé fausse → invalide, motif explicite';
  select * into r from private.filed_tva_intracom_analyser('BE0123456749'); assert r.valide, 'BE : mod 97 juste';
  select * into r from private.filed_tva_intracom_analyser('BE0123456748'); assert not r.valide, 'BE : clé fausse';
  select * into r from private.filed_tva_intracom_analyser('DE123456788'); assert r.valide, 'DE : ISO 7064 mod 11,10 juste';
  select * into r from private.filed_tva_intracom_analyser('DE123456789'); assert not r.valide, 'DE : clé fausse';
  select * into r from private.filed_tva_intracom_analyser('IT01234567897'); assert r.valide, 'IT : Luhn juste';
  select * into r from private.filed_tva_intracom_analyser('LU12345613'); assert r.valide, 'LU : mod 89 juste';
  select * into r from private.filed_tva_intracom_analyser('NL100000009B01'); assert r.valide, 'NL : mod 11 juste';
  select * into r from private.filed_tva_intracom_analyser('PT500000000'); assert r.valide, 'PT : mod 11 juste';
  select * into r from private.filed_tva_intracom_analyser('SE123456789701'); assert r.valide, 'SE : Luhn + 01 juste';
  select * into r from private.filed_tva_intracom_analyser('ATU12345675'); assert r.valide, 'AT : clé juste';
  select * into r from private.filed_tva_intracom_analyser('ESB12345674'); assert r.valide and r.cle_verifiee is null, 'ES : format seul, pas de clé publique';
  select * into r from private.filed_tva_intracom_analyser('US123456789'); assert not r.valide and r.motif like 'Préfixe « US »%', 'hors Union → invalide';
  select * into r from private.filed_tva_intracom_analyser('DE12'); assert not r.format_ok and not r.valide, 'trop court → format faux';
  select * into r from private.filed_tva_intracom_analyser(null); assert not r.valide, 'nul → invalide';
  assert private.filed_siren_de_tva_fr('FR11 123 456 782') = '123456782', 'SIREN extrait du numéro FR';
  assert private.filed_siren_de_tva_fr('DE123456788') is null, 'pas de SIREN hors FR';
  assert private.filed_siren_valide('123456782') and not private.filed_siren_valide('123456789'), 'SIREN : clé de Luhn (socle)';
  raise notice 'IDENTITÉ TVA / SIREN : tous les contrôles passent.';
end $$;
rollback;
