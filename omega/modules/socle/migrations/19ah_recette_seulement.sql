-- 19ah_recette_seulement — la recette se déclare recette. B3 pour le coordinateur, 06/10/2026.
-- À POSER SUR LA RECETTE SEULEMENT (ygwbgpowzlbdaajlsqkn). A5 l'exclut de la séquence de production : en production,
-- le réglage « environnement » n'existe pas (ou vaut « production »), et le drapeau d'essai de 19ah ne peut jamais y valoir.
insert into private.reglages (cle, valeur)
select 'environnement', 'recette'
where not exists (select 1 from private.reglages g where g.cle = 'environnement');

select cle, valeur from private.reglages where cle = 'environnement';
