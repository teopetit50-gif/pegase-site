-- DALIRO — taux des pénalités de retard, second semestre 2026 (session B6, 06/10/2026).
--
-- Règle (C. com. L441-10, II) : sauf stipulation contraire, taux d'intérêt appliqué par la BCE à son opération
-- de refinancement la plus récente, majoré de 10 points ; pour le second semestre, le taux en vigueur au 1er juillet.
-- Au 1er juillet 2026 : opérations principales de refinancement à 2,40 % depuis le 17 juin 2026
-- (BCE, « Key ECB interest rates », ecb.europa.eu). Donc 2,40 + 10 = 12,40 %, soit 0.1240 en fraction.
-- La hausse BCE du 16 septembre 2026 (2,65 %) ne compte qu'à partir du 1er janvier 2027 (→ 12,65 %).
--
-- À METTRE À JOUR au 1er janvier et au 1er juillet. Le taux est recopié sur chaque situation à sa validation
-- (private.btp_situation_echeance, b6_16) : changer le réglage ne touche pas les situations déjà validées.
--
-- Rejouable : met à jour si la clé existe, l'insère sinon. Rien n'est retiré.

update private.reglages set valeur = '0.1240' where cle = 'daliro_taux_penalites_retard';
insert into private.reglages (cle, valeur)
select 'daliro_taux_penalites_retard', '0.1240'
where not exists (select 1 from private.reglages where cle = 'daliro_taux_penalites_retard');

select cle, valeur from private.reglages where cle = 'daliro_taux_penalites_retard';
