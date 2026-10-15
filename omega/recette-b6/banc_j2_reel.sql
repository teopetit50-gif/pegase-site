-- banc_j2_reel — La confirmation J-2 RÉELLE sur le banc (cccccccc-0000-4000-8000-00000000000c), session B6, 06/10/2026.
-- PAS un test : rien n'est annulé. Ordre : A, A bis, B, C, D, E. Prérequis : b6_01 à b6_06 posés, schéma tests d'A5 (tests.endosser).
-- MODE ESSAI seulement : la ligne reglages_envois daliro reprend l'adresse d'essai de Teo (celle de la ligne
-- tavaro du banc, à défaut celle de la ligne organisation). Le seul destinataire est un tiers fictif
-- (j2@banc-daliro.test) : en essai, le socle remet le message à l'adresse d'essai, jamais au tiers.
-- Rejouable : chaque étape vérifie si elle est déjà faite. Rien n'est effacé.
-- À jouer en plusieurs appels, dans l'ordre (execute_sql ne rend que la dernière requête de chaque appel).

-- ═══ A. Réglage d'envoi du module daliro pour le banc : ESSAI, adresse de Teo
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_adresse text;
begin
  select coalesce(
           (select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module = 'tavaro'),
           (select r.essai_adresse from public.reglages_envois r where r.client_id = v_client and r.module is null))
    into v_adresse;
  if v_adresse is null then
    raise exception 'Aucune adresse d''essai sur le banc (lignes tavaro et organisation) : rien n''est posé.';
  end if;
  insert into public.reglages_envois (client_id, module, mode, essai_adresse, plages, canaux)
  select v_client, 'daliro', 'essai', v_adresse,
         (select r.plages from public.reglages_envois r where r.client_id = v_client and r.module = 'tavaro'),
         array['email']
  where not exists (select 1 from public.reglages_envois r where r.client_id = v_client and r.module = 'daliro');
  -- Une ligne déjà là qui ne serait pas en essai : on la remet en essai (jamais de réel depuis ce fichier).
  update public.reglages_envois set mode = 'essai', essai_adresse = coalesce(essai_adresse, v_adresse)
  where client_id = v_client and module = 'daliro' and mode is distinct from 'essai';
end $$;
select r.module, r.mode, r.essai_adresse is not null as adresse_essai, r.canaux, r.plages
from public.reglages_envois r where r.client_id = 'cccccccc-0000-4000-8000-00000000000c' and (r.module = 'daliro' or r.module is null);

-- ═══ A bis. Daliro installé sur le banc, formule Chantiers (porte b6_04 : public.btp_installer, gérant endossé)
-- Sans installation, private.btp_preparer_chantier refuse d'ouvrir un chantier (P0001). Ne fait rien si déjà installé.
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
begin
  if exists (select 1 from public.btp_reglages where client_id = v_client) then
    raise notice 'Daliro déjà installé sur le banc';
    return;
  end if;
  begin
    perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
    perform public.btp_installer(v_client, 'chantiers');
    perform tests.redevenir_admin();
    raise notice 'Daliro installé par le gérant';
  exception when insufficient_privilege then
    -- le gérant n'a pas EXECUTE sur la porte après a5_01 : Omega l'installe (même porte, en serveur)
    perform tests.redevenir_admin();
    perform public.btp_installer(v_client, 'chantiers');
    raise notice 'Daliro installé par le serveur (le gérant : %)', sqlerrm;
  end;
end $$;
select r.client_id, r.formule, r.quota_chantiers, r.quota_comptes_bureau
from public.btp_reglages r where r.client_id = 'cccccccc-0000-4000-8000-00000000000c';
-- → attendu : chantiers, 20, 5.

-- ═══ B. Le gérant pose un chantier ouvert avec un passage de sous-traitant dans deux jours ouvrés
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_gerant uuid := (select id from auth.users where email = 'gerant@banc-varelo.test');
  v_referent uuid := (select id from auth.users where email = 'referent@banc-varelo.test');
  -- lu AVANT d'endosser : authenticated n'exécute pas tout le socle
  v_debut date := coalesce(public.ajouter_jours(current_date, 2, 'ouvres', 'metropole'), current_date + 2);
  v_mo uuid; v_st uuid; v_ch uuid; v_lot uuid; v_j jsonb;
begin
  perform tests.endosser(v_gerant, 'gerant@banc-varelo.test');
  select id into v_mo from public.btp_tiers where client_id = v_client and nom = 'SCI Essai J-2 (banc)';
  if v_mo is null then
    insert into public.btp_tiers (client_id, roles, nom, email, canal)
    values (v_client, array['maitre_ouvrage'], 'SCI Essai J-2 (banc)', 'mo-j2@banc-daliro.test', 'email') returning id into v_mo;
  end if;
  select id into v_st from public.btp_tiers where client_id = v_client and nom = 'Serrurerie Essai J-2 (banc)';
  if v_st is null then
    insert into public.btp_tiers (client_id, roles, nom, siren, email, canal, code_postal, commune, departements,
                                  vigilance_attestation_le, vigilance_verifiee_le)
    values (v_client, array['sous_traitant'], 'Serrurerie Essai J-2 (banc)', '842100018', 'j2@banc-daliro.test', 'email',
            '69007', 'Lyon', array['69'], current_date - 5, now()) returning id into v_st;
  end if;
  select id into v_ch from public.btp_chantiers where client_id = v_client and reference = 'ESSAI-J2';
  if v_ch is null then
    insert into public.btp_chantiers (client_id, nom, reference, adresse, code_postal, commune, maitre_ouvrage_type, place_client,
                                      conducteur_id, date_debut, date_fin_prevue)
    values (v_client, 'Essai J-2 — banc', 'ESSAI-J2', '3 rue du Banc', '69007', 'Lyon', 'professionnel', 'titulaire',
            coalesce(v_referent, v_gerant), current_date, current_date + 60) returning id into v_ch;
  end if;
  select id into v_lot from public.btp_lots where chantier_id = v_ch and code = '01';
  if v_lot is null then
    insert into public.btp_lots (client_id, chantier_id, code, libelle, rang, execution, tiers_id)
    values (v_client, v_ch, '01', 'Garde-corps (essai J-2)', 1, 'sous_traitant', v_st) returning id into v_lot;
  end if;
  update public.btp_chantiers set maitre_ouvrage_id = v_mo, statut = 'ouvert'
  where id = v_ch and statut = 'preparation';
  v_j := public.btp_importer_passages(v_ch, 'tableur', jsonb_build_array(jsonb_build_object(
    'ref', 'J2-1', 'lot', '01', 'intervenant', 'Serrurerie Essai J-2 (banc)', 'tache', 'Pose des garde-corps (essai J-2)',
    'debut', v_debut, 'fin', v_debut)), false);
  raise notice 'import : %', v_j;
  perform tests.redevenir_admin();
end $$;
select c.id as chantier, c.statut, p.id as passage, p.debut, p.statut as passage_statut, p.confirmation, p.tiers_id is not null as tiers_rapproche, p.version
from public.btp_chantiers c join public.btp_passages p on p.chantier_id = c.id
where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and c.reference = 'ESSAI-J2';
-- → attendu : chantier ouvert, passage prevu, confirmation non_demandee, tiers rapproché (true).

-- ═══ C. Sans attendre le cron de 15 h UTC : la demande J-2, puis l'ouvrier daliro (en postgres)
select private.btp_demander_confirmations('cccccccc-0000-4000-8000-00000000000c', current_date);
select private.btp_ouvrier(20);
select e.id as envoi, e.canal, e.mode, e.statut, e.verrou, e.motif, e.demande_id, d.statut as demande_statut, e.sujet
from public.envois e left join public.demandes_validation d on d.id = e.demande_id
where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.module = 'daliro' order by e.cree_le desc limit 5;
-- → attendu : un envoi email, mode essai, statut a_valider (demande envoi.email en attente) — ou déjà validé
--   si un accord permanent du banc le couvre. Un verrou (HORS_HEURES…) dit pourquoi il attend.

-- ═══ D. La DAF valide l'envoi (le moteur l'a préparé : personne n'est juge et partie), puis on le confie
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_daf uuid := (select id from auth.users where email = 'daf@banc-varelo.test');
  v_demande uuid := (select e.demande_id from public.envois e join public.demandes_validation d on d.id = e.demande_id
                     where e.client_id = v_client and e.module = 'daliro' and e.cle_idempotence like 'daliro:j2:%'
                       and d.statut = 'en_attente' order by e.cree_le desc limit 1);
begin
  if v_demande is null then
    raise notice 'aucun envoi daliro à valider (pas encore préparé, ou déjà validé)';
    return;
  end if;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (v_demande, v_client, v_daf, 'approuve', 'Confirmation J-2 d''essai (banc B6).');
  perform tests.redevenir_admin();
end $$;
select private.tache_envois(now());
select e.id as envoi, e.statut, e.verrou, e.fournisseur, e.pret_le, e.envoye_le, e.remise, e.essais
from public.envois e where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.module = 'daliro' order by e.cree_le desc limit 5;
-- → attendu : pret puis, l'expéditeur passé (≈ 15 s), envoye avec la référence Brevo ; le courriel arrive à l'adresse d'essai.

-- ═══ E. Le fil du passage et le journal
select x.evenement, x.canal, x.cle, x.survenu_le from public.btp_confirmations x
join public.btp_chantiers c on c.id = x.chantier_id
where c.client_id = 'cccccccc-0000-4000-8000-00000000000c' and c.reference = 'ESSAI-J2' order by x.survenu_le;
select t.id, t.genre, t.etat, t.essais, t.resultat, t.erreur from public.travaux t
where t.client_id = 'cccccccc-0000-4000-8000-00000000000c' and t.genre = 'daliro.confirmation' order by t.id desc limit 5;
