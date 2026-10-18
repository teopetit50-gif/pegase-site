-- omega/banc/lecture_coffre_reel.sql — la première lecture longue Tamila sur un dossier dont la clé est au VRAI coffre
-- Scaleway (session B4, 18/10/2026). Recette seulement, pièces fictives, bloc par bloc (pg_net est asynchrone : chaque
-- appel rend un identifiant, sa réponse se lit au bloc suivant). Rien n'est retiré ni effacé ; aucune clé n'est lue.
--
-- Prérequis (dans cet ordre) :
--   · b4_20_tamila_cle_analyse.sql posé (+ test 29) : sans lui, la lecture longue d'un dossier au coffre échoue à la
--     clé (la porte du lecteur refusait les pièces déjà lues) ;
--   · tamila-coffre redéployée depuis worker-b4 (≥ ce commit : actions banc_semer et banc_lire) ;
--   · secret de la fonction tamila-coffre : TAMILA_BANC_CLIENT = cccccccc-0000-4000-8000-00000000000c (RECETTE
--     seulement : sans lui, banc_semer et banc_lire répondent 404) ;
--   · coffre du banc activé (coffre_reel.sql, 18/10 : bascule, clé maître 9bb47abb-…) ; lecteur v38+, lecteur_analyses = 'oui'.
-- <GERANT> : l'user_id du gérant du banc (bloc 0 de coffre_reel.sql).
--
-- Le chemin est celui de l'écran, sans navigateur : le gérant demande la nouvelle clé par la porte normale ; le coffre
-- tire la clé, l'enveloppe chez Scaleway, chiffre la référence, l'intitulé et quatre PDF fictifs et les dépose au
-- bucket (banc_semer) ; le gérant ouvre le dossier et dépose les pièces par les portes normales ; le lecteur les lit
-- (clé par le coffre) ; l'avocat demande la chronologie et les pièces citées ; le lecteur les rend chiffrées ; le
-- gérant reçoit la clé par sa porte (tamila_coffre_pour_membre) et banc_lire déchiffre le résultat pour relecture.

-- ═══ 1. La nouvelle clé : demandée par le gérant (porte normale), semée par le coffre ═══
-- La porte écrit la demande au journal du coffre ; COMMIT obligatoire. Rend <ID_SEMER>.
begin;
select set_config('request.jwt.claims', json_build_object('sub', '<GERANT>', 'role', 'authenticated')::text, true);
select net.http_post(
  url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/tamila-coffre',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
  body := jsonb_build_object('action', 'banc_semer', 'client', 'cccccccc-0000-4000-8000-00000000000c',
            'nouvelle', public.tamila_coffre_pour_nouvelle_cle('cccccccc-0000-4000-8000-00000000000c'),
            'reference', 'BANC-COFFRE-1', 'intitule', 'SCI du Moulin c/ Bati-Sud (fictif, coffre réel)', 'numero_rg', '26/09999'),
  timeout_milliseconds := 60000) as id_semer
  from vault.decrypted_secrets s where s.name = 'cle_service';
commit;

-- ═══ 2. La réponse du coffre ═══
-- Attendu : 200, {dossier, cle_fournisseur: "scaleway", cle_reference: "scaleway:fr-par:9bb47abb-…", cle_enveloppe: "\x…",
-- reference / intitule / numero_rg: "\x01…", pieces: [4 × {nom, mime, octets, sha256, chemin}]} — jamais de clé.
select id, status_code, content::jsonb as corps, error_msg from net._http_response where id = <ID_SEMER>;

-- ═══ 3. Le gérant ouvre le dossier et dépose les quatre pièces, par les portes normales ═══
begin;
select set_config('request.jwt.claims', json_build_object('sub', '<GERANT>', 'role', 'authenticated')::text, true);
with c as (select content::jsonb as j from net._http_response where id = <ID_SEMER> and status_code = 200),
     d as (select public.tamila_creer_dossier(
             'cccccccc-0000-4000-8000-00000000000c'::uuid, (j ->> 'dossier')::uuid,
             (j ->> 'reference')::bytea, (j ->> 'intitule')::bytea, 'scaleway', j ->> 'cle_reference', (j ->> 'cle_enveloppe')::bytea,
             (j ->> 'numero_rg')::bytea, 'construction', 'Cour d''appel de Paris', 'metropole', 'contentieux', false, null, null, null) as dossier, j
           from c)
select d.dossier,
       (select jsonb_agg(public.tamila_deposer_piece(d.dossier, p ->> 'nom', p ->> 'mime', (p ->> 'octets')::bigint, p ->> 'sha256', p ->> 'chemin', null))
          from jsonb_array_elements(d.j -> 'pieces') p) as depots
  from d;
commit;
-- Noter <DOSSIER>.

-- ═══ 4. Quelques minutes : le lecteur lit les pièces chiffrées (clé par le coffre) ═══
-- Attendu : 4 pièces « lue » (ou « a_verifier »), nb_pages = 1 ; au journal du coffre, 4 remises « lecteur » déballées.
select p.nom_fichier, p.statut, p.nb_pages, p.motif, p.chiffrement
  from public.pieces p where p.objet_type = 'tamila_dossier' and p.objet_id = '<DOSSIER>' order by p.nom_fichier;
select pour, issue, count(*) from public.tamila_coffre_journal where dossier_id = '<DOSSIER>' group by 1, 2 order by 1, 2;
select t.id, t.genre, t.etat, t.essais, t.erreur from public.travaux t
 where t.genre like 'lecteur.%' and t.client_id = 'cccccccc-0000-4000-8000-00000000000c' order by t.id desc limit 8;

-- ═══ 5. L'avocat (ici le gérant) demande la chronologie et les pièces citées ═══
begin;
select set_config('request.jwt.claims', json_build_object('sub', '<GERANT>', 'role', 'authenticated')::text, true);
select public.tamila_demander_analyse('<DOSSIER>'::uuid, 'chronologie') as chronologie,
       public.tamila_demander_analyse('<DOSSIER>'::uuid, 'pieces_citees') as pieces_citees;
commit;
-- Noter <ANALYSE_CHRONO> et <ANALYSE_CITEES>.

-- ═══ 6. Une à trois minutes : l'état des lectures longues (en clair : type, statut, comptes, coût — jamais le texte) ═══
-- Attendu : finie, resultat_chiffre présent, resultat NULL ; au journal du coffre, des remises « lecteur » avec l'analyse.
select a.id, a.type, a.statut, a.comptes, a.sans_source, a.pieces_lues, cardinality(a.pieces) as perimetre, a.cout_eur, a.motif,
       a.resultat is null as sans_clair, a.resultat_chiffre is not null as chiffre, a.demandee_le, a.finie_le
  from public.analyses a where a.objet_id = '<DOSSIER>' order by a.demandee_le;
select t.id, t.etat, t.essais, t.erreur from public.travaux t
 where t.genre = 'lecteur.analyser' and t.charge ->> 'analyse' in ('<ANALYSE_CHRONO>', '<ANALYSE_CITEES>') order by t.id;

-- ═══ 7. Relire les résultats : la clé par la porte du gérant, le déchiffrement par le coffre ═══
-- Rend <ID_LIRE_1> et <ID_LIRE_2>. La porte tamila_coffre_pour_membre journalise chaque remise (COMMIT).
begin;
select set_config('request.jwt.claims', json_build_object('sub', '<GERANT>', 'role', 'authenticated')::text, true);
select a.id as analyse, net.http_post(
  url := 'https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/tamila-coffre',
  headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || s.decrypted_secret),
  body := jsonb_build_object('action', 'banc_lire', 'client', 'cccccccc-0000-4000-8000-00000000000c', 'analyse', a.id,
            'remise', public.tamila_coffre_pour_membre('<DOSSIER>'::uuid, null)),
  timeout_milliseconds := 30000) as id_lire
  from public.analyses a, vault.decrypted_secrets s
 where a.id in ('<ANALYSE_CHRONO>', '<ANALYSE_CITEES>') and s.name = 'cle_service';
commit;

-- ═══ 8. Les résultats en clair (pièces fictives) ═══
-- Attendu : la chronologie (bail 14/06/2019, infiltrations février puis mars 2023, avis 20/04/2023, jugement
-- 03/03/2026 ; la contradiction de dates), chaque constat cité pièce / page / extrait, vérifié ; les pièces citées
-- (n° 4, 7, 12 dans les conclusions adverses).
select id, status_code, content::jsonb -> 'statut' as statut, content::jsonb -> 'type' as type,
       jsonb_array_length(content::jsonb -> 'resultat' -> 'constats') as constats,
       content::jsonb -> 'resultat' -> 'resume' as resume, error_msg
  from net._http_response where id in (<ID_LIRE_1>, <ID_LIRE_2>);
select r.id, c ->> 'code' as code, c ->> 'titre' as titre, c -> 'donnees' as donnees,
       c -> 'citations' -> 0 ->> 'extrait' as extrait, c -> 'citations' -> 0 ->> 'page' as page, c -> 'citations' -> 0 ->> 'verifiee' as verifiee
  from net._http_response r, jsonb_array_elements(r.content::jsonb -> 'resultat' -> 'constats') c
 where r.id in (<ID_LIRE_1>, <ID_LIRE_2>);

-- ═══ 9. Le journal du coffre de ce dossier, pour la preuve ═══
select pour, issue, count(*), min(demande_le), max(conclu_le) from public.tamila_coffre_journal
 where dossier_id = '<DOSSIER>' group by 1, 2 order by 1, 2;
