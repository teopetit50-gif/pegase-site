-- facturx_reel_controle — les contrôles de facturx_reel.mjs, en lecture seule, pour execute_sql (session A1, 06/10/2026).
-- La pièce : le vrai Factur-X EN16931_Einfach.pdf (sha256 05b5a382…ed1d0) déposé comme pièce FILED du banc.
-- Rien n'est écrit. execute_sql ne rend que la dernière requête : jouer chaque bloc séparément.

-- ═══ 1. La pièce, son travail lecteur.lire, la consommation IA du jour
select p.id, p.statut, p.type_piece, p.methode, p.nb_pages, p.motif, p.version_lecteur, p.recue_le, p.lue_le,
       t.id as travail, t.etat, t.essais, t.resultat ->> 'appels_ia' as appels_ia, t.resultat ->> 'modele' as modele,
       t.resultat ->> 'cout_eur' as cout_eur, public.consommation_ia_jour(p.client_id) as ia_du_jour_eur
from public.pieces p
left join public.travaux t on t.genre = 'lecteur.lire' and t.charge ->> 'piece' = p.id::text
where p.client_id = 'cccccccc-0000-4000-8000-00000000000c' and p.module = 'filed'
  and p.sha256 = '05b5a382db8fdc60d1e9ec31fef7fb09c91d68413b9187f7ca116aed116ed1d0'
order by p.recue_le, t.id;
-- → attendu : lue, facture, xml, nb_pages 2, motif vide ; travail fait, appels_ia 0, modele vide, cout_eur 0.

-- ═══ 2. Les valeurs : source xml, confiance 1, une ligne par champ, TTC page 2 avec boîte
select v.champ, left(v.valeur::text, 60) as valeur, v.page, v.boite is not null as boite, v.source, v.confiance, v.verifiee,
       left(v.controle, 90) as controle, count(*) over (partition by v.champ) as lignes_du_champ
from public.pieces_valeurs v
join public.pieces p on p.id = v.piece_id
where p.client_id = 'cccccccc-0000-4000-8000-00000000000c'
  and p.sha256 = '05b5a382db8fdc60d1e9ec31fef7fb09c91d68413b9187f7ca116aed116ed1d0'
order by v.champ;
-- → attendu : toutes en xml / 1 / vérifiées, lignes_du_champ = 1 partout ; numero 471102 ; montant_ht 473, montant_tva 56.87,
--   montant_ttc 529.87 page 2 boîte « … ; concorde avec le PDF page 2 » ; lignes et tva.ventilation en tableaux (2 éléments).

-- ═══ 3. Côté FILED (A4) : le document et son état après intégration
select d.reference, d.etat, d.motif, d.recu_le
from public.filed_documents d
join public.pieces p on p.id = d.piece_id
where p.client_id = 'cccccccc-0000-4000-8000-00000000000c'
  and p.sha256 = '05b5a382db8fdc60d1e9ec31fef7fb09c91d68413b9187f7ca116aed116ed1d0';
