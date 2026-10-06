-- DALIRO — la source météo : MET Norway Locationforecast 2.0 (décision du coordinateur, 06/10/2026 18 h 25 Z ; b6_21b).
-- Gratuite y compris en usage commercial ; données CC BY 4.0, attribution « Données météo : MET Norway » sur l'écran.
-- User-Agent obligatoire, qui identifie l'application et un contact (conditions : api.met.no/doc/TermsOfService).
-- Rejouable : met à jour si la clé existe, l'insère sinon. Rien n'est retiré.

update private.reglages set valeur = 'https://api.met.no/weatherapi/locationforecast/2.0/compact' where cle = 'daliro_meteo_url';
insert into private.reglages (cle, valeur)
select 'daliro_meteo_url', 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
where not exists (select 1 from private.reglages where cle = 'daliro_meteo_url');

update private.reglages set valeur = 'OmegaAI/1.0 contact@omegaai.fr' where cle = 'daliro_meteo_user_agent';
insert into private.reglages (cle, valeur)
select 'daliro_meteo_user_agent', 'OmegaAI/1.0 contact@omegaai.fr'
where not exists (select 1 from private.reglages where cle = 'daliro_meteo_user_agent');

select cle, valeur from private.reglages where cle in ('daliro_meteo_url', 'daliro_meteo_user_agent') order by cle;
