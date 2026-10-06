-- banc_a2_coquille_webhooks — Prouver le chemin utile de la coquille webhooks-brevo v10 (87a1112), session A2, 06/10/2026.
-- PAS un test : rien n'est annulé, rien n'est effacé, aucun DROP. Client du banc cccccccc-0000-4000-8000-00000000000c.
-- MODE ESSAI seulement : module tavaro du banc (reglages_envois tavaro en essai, adresse d'essai de Teo, plages 00:00–23:59).
-- Le seul destinataire est fictif (coquille@banc-a2.test) : en essai, le socle remet le message à l'adresse d'essai de Teo.
-- Chaîne prouvée : preparer_envoi (moteur) → demande envoi.email → la DAF approuve → tache_envois confie → l'expéditeur
-- (cron chaque minute) remet à Brevo → Brevo rappelle webhooks-brevo avec « delivered » → noter_remise écrit
-- envois_evenements type 'remis', clé brevo:email:<message-id>:delivered:<horodatage>.
-- Rejouable : la clé d'idempotence rend le même envoi, l'approbation n'est posée que si la demande attend encore.
-- À jouer en plusieurs appels, dans l'ordre (execute_sql ne rend que la dernière requête de chaque appel).

-- ═══ A. Garde-fou : le module tavaro du banc est bien en essai, avec une adresse d'essai. Sinon on s'arrête.
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
begin
  if not exists (select 1 from public.reglages_envois r
                 where r.client_id = v_client and r.module = 'tavaro' and r.mode = 'essai' and r.essai_adresse is not null) then
    raise exception 'reglages_envois tavaro du banc pas en essai (ou sans adresse d''essai) : rien n''est préparé.';
  end if;
end $$;
select r.module, r.mode, r.essai_adresse is not null as adresse_essai, r.canaux, r.plages
from public.reglages_envois r where r.client_id = 'cccccccc-0000-4000-8000-00000000000c' and r.module = 'tavaro';
-- → attendu : tavaro, essai, true.

-- ═══ B. Le moteur prépare UN envoi e-mail d'essai (même forme que le test socle 19ab, cas « ordinaire »)
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_entite uuid := (select e.id from public.entites e where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.principale limit 1);
  v_envoi uuid;
begin
  perform tests.redevenir_admin();
  v_envoi := private.preparer_envoi(v_client, 'tavaro', null, null, 'email',
    jsonb_build_object('adresse', 'coquille@banc-a2.test', 'nom', 'Essai coquille (banc A2)', 'professionnel', true, 'langue', 'fr'),
    null, '{}'::jsonb,
    'Essai coquille webhooks-brevo',
    'Message d''essai envoyé par le banc A2 pour prouver que la coquille webhooks-brevo v10 reçoit et note la remise Brevo. Rien à faire.',
    null, 'banc:a2:coquille-webhooks:1', v_entite, true, false, null, '{}'::jsonb);
  raise notice 'envoi : %', v_envoi;
end $$;
select e.id as envoi, e.canal, e.mode, e.statut, e.verrou, e.motif, e.demande_id, d.statut as demande_statut, e.sujet
from public.envois e left join public.demandes_validation d on d.id = e.demande_id
where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.cle_idempotence = 'banc:a2:coquille-webhooks:1';
-- → attendu : email, essai, a_valider, demande envoi.email en_attente (ou déjà approuvee si un accord permanent la couvre).

-- ═══ C. La DAF approuve (le moteur a préparé : personne n'est juge et partie), puis on confie sans attendre le cron
do $$
declare
  v_client uuid := 'cccccccc-0000-4000-8000-00000000000c';
  v_daf uuid := (select id from auth.users where email = 'daf@banc-varelo.test');
  v_demande uuid := (select e.demande_id from public.envois e join public.demandes_validation d on d.id = e.demande_id
                     where e.client_id = v_client and e.cle_idempotence = 'banc:a2:coquille-webhooks:1'
                       and d.statut = 'en_attente');
begin
  if v_demande is null then
    raise notice 'aucune demande à approuver (déjà décidée, ou couverte par un accord permanent)';
    return;
  end if;
  perform tests.endosser(v_daf, 'daf@banc-varelo.test');
  insert into public.approbations (demande_id, client_id, user_id, decision, commentaire)
  values (v_demande, v_client, v_daf, 'approuve', 'Essai coquille webhooks-brevo (banc A2).');
  perform tests.redevenir_admin();
end $$;
select private.tache_envois(now());
select e.id as envoi, e.statut, e.verrou, e.motif, e.fournisseur, e.pret_le, e.envoye_le, e.reference_externe, e.essais
from public.envois e
where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.cle_idempotence = 'banc:a2:coquille-webhooks:1';
-- → attendu : pret, fournisseur brevo ; puis, l'expéditeur passé (≤ 1 min) : envoye, reference_externe <…@smtp-relay.mailin.fr>.

-- ═══ D. Le travail de l'expéditeur (à relire une minute plus tard)
select t.id, t.genre, t.etat, t.essais, t.resultat, t.erreur, t.fini_le
from public.travaux t
where t.genre in ('envois.brevo', 'envois.confirmer')
  and t.charge ->> 'envoi' = (select e.id::text from public.envois e
                              where e.client_id = 'cccccccc-0000-4000-8000-00000000000c'
                                and e.cle_idempotence = 'banc:a2:coquille-webhooks:1')
order by t.id;
-- → attendu : envois.brevo fini, resultat {fournisseur_id, remis_a}.

-- ═══ E. CONTRÔLE — la remise notée par la coquille webhooks-brevo (à relire 1 à 2 min après l'envoi)
select ev.id, ev.type, ev.cle, ev.survenu_le, ev.recu_le, ev.detail,
       e.envoye_le, e.reference_externe,
       (ev.cle like 'brevo:email:%:delivered:%') as cle_brevo,
       (ev.recu_le > e.envoye_le) as recu_apres_envoi,
       (ev.cle like 'brevo:email:' || e.reference_externe || ':%') as meme_message
from public.envois e
join public.envois_evenements ev on ev.envoi_id = e.id
where e.client_id = 'cccccccc-0000-4000-8000-00000000000c' and e.cle_idempotence = 'banc:a2:coquille-webhooks:1'
order by ev.id;
-- → attendu : une ligne type 'remis', cle_brevo, recu_apres_envoi et meme_message vrais.
--   Aucune ligne après 5 min : la coquille ne reçoit pas (journal de la fonction webhooks-brevo : 401 « jeton invalide »
--   = jeton Brevo ≠ BREVO_WEBHOOK_JETON ; 500 = noter_remise tombe ; aucun appel = webhook Brevo non déclenché).
