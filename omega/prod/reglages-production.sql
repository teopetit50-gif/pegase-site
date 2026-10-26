-- omega/prod/reglages-production.sql — réglages globaux (private.reglages) posés à la main sur la recette, à reposer
-- avec leur valeur de PRODUCTION (RUNBOOK § 6). Préparé le 26/10/2026 ; posé par Teo après P6. Aucun secret ici.
--
-- Hors de ce fichier :
--   environnement = production        → posé par le dernier fichier de l'export (20261025180657_environnement_production) ;
--   export_origines_recette            → propre à la recette, NE PAS poser ;
--   alertes_secret_resend              → un secret : Teo le pose lui-même s'il garde Resend (sinon rien) ;
--   espace_url                         → https://omegaai.fr/espace2 (décision de Teo du 26/10), posé ci-dessous.

insert into private.reglages (cle, valeur, note)
values ('reput_reponse_url', 'https://noepmkkplxshjbmqqxft.supabase.co/functions/v1/reput-reponse',
        'URL de la fonction Edge reput-reponse (production), posée avec la mise en production')
on conflict (cle) do update set valeur = excluded.valeur, note = excluded.note;

-- espace_url : décision de Teo du 26/10 (l'espace client est /espace2).
insert into private.reglages (cle, valeur, note)
values ('espace_url', 'https://omegaai.fr/espace2', 'Adresse de l''espace client (décision de Teo, 26/10/2026)')
on conflict (cle) do update set valeur = excluded.valeur, note = excluded.note;

select cle, valeur from private.reglages where valeur ~ '(ygwbgpowzlbdaajlsqkn|localhost|recette)';   -- attendu : 0 ligne
