-- banc_a2_pa_statut — Étape 5 du parcours PA du bac à sable : une décision FILED sur la facture reçue BAC-0001
-- (filed_factures 5aab2a3b-…, client du banc cccccccc-0000-4000-8000-00000000000c) → statut de cycle de vie
-- « à émettre » → travail pa.statut → echange-pa fabrique le CDAR et le dépose au bac → accusé « Ok » relevé →
-- filed_cycle_vie « emis ». Session A2, 06/10/2026.
-- PAS un test : rien n'est annulé, rien n'est effacé, aucun DROP. Rejouable : chaque étape vérifie si elle est faite.
-- À jouer en plusieurs appels, dans l'ordre (execute_sql ne rend que la dernière requête de chaque appel).
--
-- Pourquoi un litige (207) et pas un refus (210) : dans FILED (a4_07), une facture n'est refusée QUE par la file de
-- validation (demande « a_valider », approbation « rejete » d'un décideur). BAC-0001 est « bloquee » (fournisseur
-- inconnu) : elle n'a pas de demande, le refus est impossible sans d'abord confirmer le fournisseur (circuit d'A4).
-- Le litige (public.filed_ouvrir_litige, a4_06) dépose 207 « En litige » avec un motif codé (TX_TVA_ERR, admis pour
-- 207) : même chemin pa.statut → CDAR → accusé, et le motif est obligatoire dans le CDAR. Le bloc C fait le 210
-- si la facture est un jour « a_valider ».
-- Bonus : à l'intégration de la facture, FILED a déjà déposé 204 « Prise en charge » (a4_16) ; si la facture était
-- déjà reçue par la plateforme à ce moment, ce 204 est « a_emettre » et echange-pa l'a peut-être déjà émis (bloc A).

-- ═══ A. État de départ : la facture, son cycle de vie, les travaux pa.statut
select f.id, f.numero, f.statut, f.version, f.provenance, f.document_id,
       (select x.etat from public.filed_pa_flux x where x.document_id = f.document_id and x.sens = 'entrant' order by x.id desc limit 1) as flux_entrant
from public.filed_factures f
where f.client_id = 'cccccccc-0000-4000-8000-00000000000c' and f.id::text like '5aab2a3b%';
select c.id, c.code, c.sens, c.etat, c.motif_code, c.suivi, c.flux_pa, c.emis_le, c.essais, c.erreur, c.cle
from public.filed_cycle_vie c join public.filed_factures f on f.id = c.facture_id
where f.client_id = 'cccccccc-0000-4000-8000-00000000000c' and f.id::text like '5aab2a3b%' order by c.id;
-- → attendu : un 204 (cle f:<facture>:204), « emis » si echange-pa est déjà passé, sinon « a_emettre » / « en_cours ».

-- ═══ B. Le gérant du banc ouvre un litige codé (207, motif TX_TVA_ERR)
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
  v_facture uuid := (select f.id from public.filed_factures f where f.client_id = 'cccccccc-0000-4000-8000-00000000000c'
                     and f.id::text like '5aab2a3b%' limit 1);
  v_litige uuid;
begin
  if v_facture is null then
    raise exception 'Facture 5aab2a3b… introuvable sur le banc : rien n''est fait.';
  end if;
  if exists (select 1 from public.filed_litiges l where l.facture_id = v_facture and l.clos_le is null) then
    raise notice 'litige déjà ouvert sur la facture : rien de neuf';
    return;
  end if;
  begin
    perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
    v_litige := public.filed_ouvrir_litige(v_facture, 'TX_TVA_ERR : taux de TVA erroné (essai banc A2, parcours PA)');
    perform tests.redevenir_admin();
    raise notice 'litige % ouvert par le gérant', v_litige;
  exception when insufficient_privilege then
    -- le gérant n'a pas EXECUTE sur la porte (droits a5_01) : Omega l'ouvre en serveur, même porte
    perform tests.redevenir_admin();
    v_litige := public.filed_ouvrir_litige(v_facture, 'TX_TVA_ERR : taux de TVA erroné (essai banc A2, parcours PA)');
    raise notice 'litige % ouvert par le serveur (le gérant : %)', v_litige, sqlerrm;
  end;
end $$;
select c.id, c.code, c.etat, c.motif_code, c.motif, c.suivi
from public.filed_cycle_vie c join public.filed_factures f on f.id = c.facture_id
where f.id::text like '5aab2a3b%' and c.code = 207;
-- → attendu : 207, « a_emettre », motif_code TX_TVA_ERR. (« sans_objet » voudrait dire que FILED ne voit pas la
--   facture comme reçue par la plateforme : filed_recue_par_pa(document) faux.)

-- ═══ C. (Facultatif) Le refus 210, seulement si la facture est « a_valider » avec une demande en attente
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_daf uuid := (select id from auth.users where email = 'daf@banc-varelo.test');
  v_demande uuid := (select d.id from public.demandes_validation d join public.filed_factures f on d.objet_id = f.id::text
                     where f.id::text like '5aab2a3b%' and f.statut = 'a_valider' and d.statut = 'en_attente'
                     order by d.cree_le desc limit 1);
begin
  if v_demande is null then
    raise notice 'pas de refus 210 : la facture n''est pas « a_valider » avec une demande en attente (bloquee ?)';
    return;
  end if;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (v_demande, v_client, v_daf, 'rejete', 'Taux de TVA erroné (essai banc A2, parcours PA).');
  perform tests.redevenir_admin();
  raise notice 'refus déposé sur la demande % : FILED l''exécute (filed_executer_decision), puis 210 « a_emettre »', v_demande;
end $$;

-- ═══ D. Contrôles, une à deux minutes plus tard (cron omega-echange-pa)
-- D1. Le cycle de vie de la facture : 207 (et 204, et 210 le cas échéant) « emis », flux_pa rempli.
select c.code, c.etat, c.motif_code, c.flux_pa, c.emis_le, c.essais, c.erreur, c.suivi
from public.filed_cycle_vie c join public.filed_factures f on f.id = c.facture_id
where f.id::text like '5aab2a3b%' order by c.id;
-- → attendu : 207 « emis », flux_pa = un flowId du bac, erreur null.
-- D2. Les travaux pa.statut de ces statuts (genre, état, résultat de l'ouvrier).
select t.id, t.genre, t.etat, t.essais, t.resultat, t.erreur, t.fini_le
from public.travaux t
where t.genre = 'pa.statut'
  and t.charge ->> 'statut' in (select c.suivi::text from public.filed_cycle_vie c join public.filed_factures f on f.id = c.facture_id
                                where f.id::text like '5aab2a3b%')
order by t.id;
-- → attendu : « fait », resultat {flux, depose_le, pa: "afnor", note: true}.
-- D3. L'accusé relevé par echange-pa (flux sortant, suivi = le statut).
select x.id, x.flux, x.sens, x.type, x.syntaxe, x.accuse, x.etat, x.cycle_vie_id, x.maj_le
from public.filed_pa_flux x
where x.sens = 'sortant'
  and x.suivi in (select c.suivi::text from public.filed_cycle_vie c join public.filed_factures f on f.id = c.facture_id
                  where f.id::text like '5aab2a3b%')
order by x.id;
-- → attendu : type CustomerInvoiceLC, syntaxe CDAR, accuse ok, etat note.
-- D4. Le battement de l'ouvrier (module echange_pa, sans tiret, depuis le redéploiement d'echange-pa au SHA de ce fichier ; le socle ne bat que pour un
--     client qui a eu un travail pa.* dans la journée : le banc, une fois le 204 ou le 207 déposé).
select b.client_id, b.module, b.dernier_le, b.detail ->> 'pa_branchee' as pa_branchee, b.detail ->> 'statuts' as statuts,
       b.detail ->> 'releves' as releves, b.detail ->> 'erreur_releve' as erreur_releve
from public.battements b where b.module in ('echange_pa', 'echange-pa') order by b.dernier_le desc;
