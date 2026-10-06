-- decoupage_reel_controle — les contrôles de decoupage_reel.mjs en lecture seule, pour execute_sql (A1, 06/10/2026).
-- La pièce : omega/banc/trois_factures.pdf (sha256 8bc0581b…a07fe), trois factures fictives. Rien n'est écrit.
-- execute_sql ne rend que la dernière requête : jouer chaque bloc séparément.

-- ═══ 1. La mère, ses filles, leurs travaux lecteur.lire
select p.id, p.piece_mere_id is null as mere, p.nom_fichier, p.statut, p.type_piece, p.nb_pages, p.motif,
       (select v.valeur #>> '{}' from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'numero') as numero,
       (select v.valeur #>> '{}' from public.pieces_valeurs v where v.piece_id = p.id and v.champ = 'montant_ttc') as ttc,
       t.etat as travail, t.resultat -> 'filles' as filles, t.resultat ->> 'cout_eur' as cout_eur
from public.pieces p
left join public.travaux t on t.genre = 'lecteur.lire' and t.charge ->> 'piece' = p.id::text
where p.client_id = 'cccccccc-0000-4000-8000-00000000000c'
  and (p.sha256 = '8bc0581b83a2697269ac5c505762aec71bf0f3549300e7d60de125c12b7a07fe'
       or p.piece_mere_id in (select m.id from public.pieces m where m.sha256 = '8bc0581b83a2697269ac5c505762aec71bf0f3549300e7d60de125c12b7a07fe'))
order by p.piece_mere_id nulls first, p.nom_fichier, t.id;
-- → attendu : mère lue, BAN-2026-0101, filles = 2 pièces ; deux filles lues : BAN-2026-0102 (300), BAN-2026-0103 (96).

-- ═══ 2. Les documents FILED des trois
select d.reference, d.etat, p.nom_fichier, p.piece_mere_id is null as mere
from public.filed_documents d
join public.pieces p on p.id = d.piece_id
where p.sha256 = '8bc0581b83a2697269ac5c505762aec71bf0f3549300e7d60de125c12b7a07fe'
   or p.piece_mere_id in (select m.id from public.pieces m where m.sha256 = '8bc0581b83a2697269ac5c505762aec71bf0f3549300e7d60de125c12b7a07fe')
order by d.reference;
