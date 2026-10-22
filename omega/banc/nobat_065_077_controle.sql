-- nobat_065_077_controle — lecture des 13 pièces NOBAT R2026-000065 → R2026-000077 (A1, 22/10/2026), recette seulement.
-- Lecture seule : rien n'est écrit ici. La relecture (pièce remise « recue », travail lecteur.lire déposé) se fait par
-- la voie du coordinateur, celle de R2026-000045 et 000047, UNE pièce à la fois : on attend que son travail soit
-- « fait » ou « echec » et on joue les blocs 2 à 4 pour cette pièce avant de lancer la suivante.
-- execute_sql ne rend que la dernière requête : jouer chaque bloc séparément. Remplacer R2026-0000xx par la pièce.
-- Lecteur attendu : version_lecteur qui contient fd2da4bd (ou plus récent).

-- ═══ 1. L'inventaire des 13 : état FILED, pièce, dernier travail lecteur.lire
select d.reference, d.etat, left(d.motif, 80) as motif_filed, p.id as piece, p.statut, p.type_piece, p.mime, p.nb_pages,
       p.methode, left(p.motif, 80) as motif_lecture, p.version_lecteur, t.id as travail, t.etat as etat_travail,
       t.essais, t.resultat ->> 'cout_eur' as cout_eur, left(t.erreur, 120) as erreur
from public.filed_documents d
join public.pieces p on p.id = d.piece_id
left join lateral (select * from public.travaux t where t.genre = 'lecteur.lire' and t.charge ->> 'piece' = p.id::text
                   order by t.id desc limit 1) t on true
where d.reference between 'R2026-000065' and 'R2026-000077'
order by d.reference;

-- ═══ 2. Une pièce : ses valeurs (une ligne par champ), vérifiées ou non, avec leur contrôle
select v.champ, left(v.valeur::text, 90) as valeur, v.page, v.source, v.verifiee, left(v.controle, 110) as controle,
       count(*) over (partition by v.champ) as lignes_du_champ
from public.pieces_valeurs v
join public.filed_documents d on d.piece_id = v.piece_id
where d.reference = 'R2026-0000xx'
order by v.champ;
-- → à regarder : type_piece (bloc 1) juste ; montants de tête ; tva.ventilation (tableau des taux, Exo en E) ;
--   taxes.autres (OMR, OMRI) ; mention.exoneration ; fournisseur.siren (RCS, « SIRET » à 9 chiffres) ;
--   fournisseur.iban (masqué → verifiee false, « partiellement masqué : à compléter ») ; lignes ;
--   pour un document de chantier : reserves / dispositions ; pour un relevé d'heures : lignes et total_heures.
--   lignes_du_champ = 1 partout (sinon : doublon côté enregistrement, me le dire).

-- ═══ 3. Une pièce : le texte lu par page (pour comparer à l'œil, et me rapporter l'extrait qui casse)
select pp.n, pp.methode, pp.confiance, left(pp.texte, 1500) as texte
from public.pieces_pages pp
join public.filed_documents d on d.piece_id = pp.piece_id
where d.reference = 'R2026-0000xx'
order by pp.n;

-- ═══ 4. Une pièce : les repères FILED après intégration (A4)
select c.code, c.gravite, c.resultat, left(c.message, 140) as message
from public.filed_controles c
join public.filed_documents d on d.id = c.document_id
where d.reference = 'R2026-0000xx'
order by c.gravite, c.code;
-- → une anomalie qui vient de la lecture (identite.siren, iban.absent, tva.*) : me rapporter le code et le bloc 2.

-- ═══ 5. Le coût du jour (plafond 5 € par client sur la recette)
select public.consommation_ia_jour(p.client_id) as ia_du_jour_eur
from public.filed_documents d join public.pieces p on p.id = d.piece_id
where d.reference = 'R2026-000065';
