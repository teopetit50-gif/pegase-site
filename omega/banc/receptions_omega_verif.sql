-- Les boîtes de réception Omega en « suspendu » reçoivent-elles ? — A2, 18/10/2026. À JOUER PAR LE COORDINATEUR.
-- D'après le socle (SOCLE-EXTRAITS-COMMUN.sql de main) : resoudre_boite(canal, boîte) cherche la ligne
-- expediteurs par identité SANS filtre de statut (« order by statut = 'actif' desc » ne fait que trier) ;
-- deposer_reception l'appelle sans plus de contrôle. Une boîte suspendue REÇOIT donc ; « suspendu » empêche
-- seulement qu'un envoi la prenne. C'est le même réglage que banc@recu.omegaai.fr (a3630f13).
-- Ce script le vérifie sur la recette (le code en base peut différer des extraits) ; il ne change rien
-- si la vérification passe.

-- 1. La définition en base : aucune condition sur statut attendue dans le where.
select pg_get_functiondef('private.resoudre_boite(text,text)'::regprocedure) ~* 'statut\s*(=|<>|in)\s*' as filtre_statut_present;
-- Attendu : false (seul « order by (e.statut = 'actif') desc » contient statut, sans opérateur de filtre dans le where :
-- si true, lire la définition et en parler à A2 avant la partie 2).

-- 2. L'épreuve : en rôle service (resoudre_boite exige l'ouvrier).
set local role service_role;
select 'omega@' as boite, public.resoudre_boite('email', 'omega@recu.omegaai.fr') as resultat
union all
select 'factures-omega@', public.resoudre_boite('email', 'factures-omega@recu.omegaai.fr');
reset role;
-- Attendu : deux objets client_id 633470bc-…, module reput puis filed. Si null : la recette filtre le statut ;
-- alors seulement, la partie 3.

-- 3. (SEULEMENT si la partie 2 rend null) Réception sans envoi possible : statut « actif » et fournisseur « inbound »,
--    qui n'existe pas dans private.fournisseurs_envoi : confier_envoi ne peut ni le choisir ni l'envoyer (aucun genre
--    envois.inbound, aucun ouvrier), et les reglages_envois restent essai/coupe.
-- update public.expediteurs set statut = 'actif', fournisseur = 'inbound'
--  where client_id = '633470bc-0ccd-4b4a-934c-692024c3a419' and canal = 'email'
--    and lower(identite) in ('omega@recu.omegaai.fr', 'factures-omega@recu.omegaai.fr');
-- select fournisseur from private.fournisseurs_envoi where fournisseur = 'inbound';   -- attendu : aucune ligne
