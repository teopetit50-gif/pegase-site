-- Première lecture longue réelle EN CLAIR (lecteur.analyser), sur la recette — A1, 17/10/2026. À jouer par le
-- coordinateur, bloc par bloc. Décision de Teo (17/10) : pièces fictives, coffre en repli local. Une analyse Tamila
-- est toujours chiffrée (contrainte de B4) et le coffre local ne donne pas la clé au serveur : la preuve de la chaîne
-- (socle → lecteur → modèle → citations vérifiées → résultat) se fait donc avec le module « essai », mêmes analyses
-- (essai.chronologie, essai.pieces_citees…), sur des pièces DÉJÀ LUES du banc. Rien n'est supprimé ; seul effet : une
-- analyse « essai » et son travail. Prérequis : lecteur sur bddd8eb ou plus récent, lecteur_analyses = 'oui'.

-- 1. Les pièces lues du banc, en clair (les plus récentes d'abord).
select p.id, p.module, p.nom_fichier, p.type_piece, p.nb_pages, p.statut, p.recue_le
  from public.pieces p
 where p.client_id = 'cccccccc-0000-4000-8000-00000000000c' and p.chiffrement is null
   and p.statut in ('lue', 'a_verifier')
 order by p.recue_le desc
 limit 20;

-- 2. Dépôt : une chronologie sur les dix pièces lues les plus récentes du banc.
select private.demander_analyse(
         'cccccccc-0000-4000-8000-00000000000c', 'essai', null, null, 'essai.chronologie',
         (select array_agg(id) from (select p.id from public.pieces p
            where p.client_id = 'cccccccc-0000-4000-8000-00000000000c' and p.chiffrement is null
              and p.statut in ('lue', 'a_verifier')
            order by p.recue_le desc limit 10) x),
         null, null) as analyse;

-- 3. Une à trois minutes plus tard : la preuve (statut, coût, constats sourcés, rien sans source).
select a.id, a.type, a.statut, a.paliers, a.comptes, a.sans_source, a.pieces_lues, cardinality(a.pieces) as perimetre,
       a.cout_eur, a.appels_ia, a.modele, a.version, a.motif,
       jsonb_array_length(a.resultat -> 'constats') as constats,
       a.resultat ->> 'resume' as resume,
       (select count(*) from jsonb_array_elements(a.resultat -> 'constats') c
         where exists (select 1 from jsonb_array_elements(c -> 'citations') k where (k ->> 'verifiee')::boolean)) as constats_sources,
       a.demandee_le, a.finie_le
  from public.analyses a
 where a.module = 'essai'
 order by a.demandee_le desc
 limit 3;

-- 4. Les trois premiers constats, pour relire à l'œil (date, événement, extrait cité, page, vérifiée).
select c -> 'donnees' ->> 'date' as date, c ->> 'titre' as titre,
       c -> 'citations' -> 0 ->> 'extrait' as extrait, c -> 'citations' -> 0 ->> 'page' as page,
       c -> 'citations' -> 0 ->> 'verifiee' as verifiee
  from public.analyses a, jsonb_array_elements(a.resultat -> 'constats') c
 where a.id = (select id from public.analyses where module = 'essai' order by demandee_le desc limit 1)
 limit 3;

-- 5. Le travail lecteur.analyser et ce que le lecteur en a dit.
select t.id, t.cle, t.etat, t.essais, t.resultat, t.erreur
  from public.travaux t
 where t.genre = 'lecteur.analyser'
 order by t.id desc
 limit 3;
