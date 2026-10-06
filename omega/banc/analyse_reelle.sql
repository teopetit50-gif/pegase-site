-- Première lecture longue réelle (lecteur.analyser) sur la recette — A1, 06/10/2026. À jouer par le coordinateur,
-- bloc par bloc, dans l'ordre. Rien n'est supprimé ; le seul effet est une analyse « tamila.prelecture » et son travail.
-- Prérequis : lecteur v28 (25c86f5), private.reglages lecteur_analyses = 'oui', un cabinet du banc à coffre serveur
-- (fournisseur scaleway) — sinon l'analyse finit en « echec » motivé « sans coffre serveur », ce qui prouve le chemin
-- mais pas la lecture.

-- 1. Repérage : les dossiers Tamila du banc qui ont des pièces chiffrées déjà lues.
select p.client_id, p.objet_id as dossier, count(*) as pieces_lues, sum(coalesce(p.nb_pages, 0)) as pages
  from public.pieces p
 where p.module = 'tamila' and p.objet_type = 'tamila_dossier' and p.chiffrement = 'dossier:v1'
   and p.statut in ('lue', 'a_verifier')
 group by 1, 2
 order by 3 desc
 limit 5;

-- 2. Dépôt : une pré-lecture du dossier le mieux fourni (60 pièces au plus, dans l'ordre d'arrivée).
--    Même chemin que tamila_demander_analyse (B4), sans la session d'un membre.
with d as (
  select p.client_id, p.objet_id, (array_agg(p.id order by p.recue_le))[1:60] as pieces
    from public.pieces p
   where p.module = 'tamila' and p.objet_type = 'tamila_dossier' and p.chiffrement = 'dossier:v1'
     and p.statut in ('lue', 'a_verifier')
   group by 1, 2
   order by count(*) desc
   limit 1)
select private.demander_analyse(d.client_id, 'tamila', 'tamila_dossier', d.objet_id, 'tamila.prelecture', d.pieces, 'dossier:v1', null) as analyse
  from d;

-- 3. Suivi, une à deux minutes plus tard (un passage du cron omega-lecteur ; un gros dossier peut prendre plusieurs
--    paliers, un par passage). La preuve : statut finie (ou partielle), coût, rien en clair.
select a.id, a.type, a.statut, a.paliers, a.comptes, a.sans_source, a.pieces_lues, cardinality(a.pieces) as perimetre,
       a.cout_eur, a.appels_ia, a.modele, a.version, a.motif,
       octet_length(a.resultat_chiffre) as octets_chiffres,
       (a.resultat is null and a.etat is null) as rien_en_clair,
       a.demandee_le, a.commencee_le, a.finie_le
  from public.analyses a
 order by a.demandee_le desc
 limit 3;

-- 4. Les travaux lecteur.analyser (clé analyse:<id>:<palier>) et ce que le lecteur en a dit.
select t.id, t.cle, t.etat, t.essais, t.resultat, t.erreur, t.cree_le, t.fini_le
  from public.travaux t
 where t.genre = 'lecteur.analyser'
 order by t.id desc
 limit 5;
