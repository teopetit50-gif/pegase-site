-- DALIRO — l'adresse du service météo (b6_21), décision du coordinateur du 06/10/2026 : Open-Meteo, sans clé.
-- RAPPEL : l'API gratuite d'Open-Meteo est réservée à l'usage non commercial (open-meteo.com/en/terms). Avant un
-- client payant : l'adresse d'abonnement (https://customer-api.open-meteo.com/v1/forecast) et la clé dans le vault
-- (secret « daliro_meteo_cle »), ou une autre source.
-- Rejouable : met à jour si la clé existe, l'insère sinon. Rien n'est retiré.

update private.reglages set valeur = 'https://api.open-meteo.com/v1/forecast' where cle = 'daliro_meteo_url';
insert into private.reglages (cle, valeur)
select 'daliro_meteo_url', 'https://api.open-meteo.com/v1/forecast'
where not exists (select 1 from private.reglages where cle = 'daliro_meteo_url');

select cle, valeur from private.reglages where cle = 'daliro_meteo_url';
