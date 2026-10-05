-- pgTAP — FILED lot 4d : TVA intracommunautaire et SIREN vérifiés avant classement.
-- Ligne du site : « Le numéro de TVA intracommunautaire et le SIREN sont vérifiés avant classement. »
-- Données d'exemple seulement : des numéros fabriqués pour tomber juste (ou faux) à la clé.
begin;
select plan(22);

-- Format et clé, pays par pays
select is((select valide from private.filed_tva_intracom_analyser('FR11123456782')), true,  'FR : clé numérique juste');
select is((select valide from private.filed_tva_intracom_analyser('FR 12 123 456 782')), false, 'FR : clé fausse → invalide');
select is((select motif from private.filed_tva_intracom_analyser('FR12123456782')), 'Clé de contrôle fausse pour FR', 'FR : le motif dit la clé');
select is((select valide from private.filed_tva_intracom_analyser('BE0123456749')), true,  'BE : clé mod 97 juste');
select is((select valide from private.filed_tva_intracom_analyser('BE0123456748')), false, 'BE : clé fausse');
select is((select valide from private.filed_tva_intracom_analyser('DE123456788')), true,  'DE : ISO 7064 mod 11,10 juste');
select is((select valide from private.filed_tva_intracom_analyser('DE123456789')), false, 'DE : clé fausse');
select is((select valide from private.filed_tva_intracom_analyser('IT01234567897')), true,  'IT : Luhn juste');
select is((select valide from private.filed_tva_intracom_analyser('LU12345613')), true,  'LU : mod 89 juste');
select is((select valide from private.filed_tva_intracom_analyser('NL100000009B01')), true,  'NL : mod 11 juste');
select is((select valide from private.filed_tva_intracom_analyser('PT500000000')), true,  'PT : mod 11 juste');
select is((select valide from private.filed_tva_intracom_analyser('SE123456789701')), true,  'SE : Luhn + 01 juste');
select is((select valide from private.filed_tva_intracom_analyser('ATU12345675')), true,  'AT : clé juste');
select is((select cle_verifiee from private.filed_tva_intracom_analyser('ESB12345674')), null::boolean, 'ES : format seul, pas de clé publique');
select is((select valide from private.filed_tva_intracom_analyser('ESB12345674')), true, 'ES : format correct → valide');
select is((select valide from private.filed_tva_intracom_analyser('US123456789')), false, 'Hors Union → invalide');
select is((select format_ok from private.filed_tva_intracom_analyser('DE12')), false, 'Trop court → format faux');
select is((select valide from private.filed_tva_intracom_analyser(null)), false, 'Nul → invalide');

-- Le SIREN porté par la TVA française
select is(private.filed_siren_de_tva_fr('FR11 123 456 782'), '123456782', 'SIREN extrait du numéro FR');
select is(private.filed_siren_de_tva_fr('DE123456788'), null, 'Pas de SIREN hors FR');

-- La table des vérifications demandées aux registres
select has_table('public', 'filed_verifications_tiers', 'filed_verifications_tiers existe');
select ok((select relrowsecurity from pg_class where oid = 'public.filed_verifications_tiers'::regclass), 'RLS activée sur filed_verifications_tiers');

select * from finish();
rollback;
