-- FILED, lot 26 (a4_34b) — à poser à la main par le coordinateur, après a4_34 (version de 4e2a224 ou suivante).
--
-- La première pose d'a4_34 nommait la porte de décision filed_rapprocher_ligne(uuid, uuid). Ce nom est déjà celui du
-- moteur de rapprochement à trois voies d'a4_08 (private.filed_rapprocher_ligne(filed_factures, …)) : le contrôle des
-- droits (socle 44) ne peut pas les distinguer. La porte s'appelle désormais filed_regler_par_releve(uuid, uuid) ; on
-- retire l'ancienne paire, et seulement elle (la signature uuid, uuid ; le moteur d'a4_08 reste).
drop function if exists public.filed_rapprocher_ligne(uuid, uuid);
drop function if exists private.filed_rapprocher_ligne(uuid, uuid);
