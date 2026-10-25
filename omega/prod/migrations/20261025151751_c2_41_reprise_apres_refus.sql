-- 20261025151751 c2_41_reprise_apres_refus
-- Source : dépôt : b996c405a5343f7b98fc6c61716e830da7684e43 omega/modules/cashd/migrations/c2_41_reprise_apres_refus.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : c2_41_reprise_apres_refus.sql @ b996c405a5343f7b98fc6c61716e830da7684e43 ; fichiers de tests ignorés : omega/tests/cashd/c2_41_reprise_apres_refus.sql.
-- ═══ omega/modules/cashd/migrations/c2_41_reprise_apres_refus.sql @ b996c405a5343f7b98fc6c61716e830da7684e43
-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_41 : la reprise après refus, côté CASHD (25/10/2026, session C2 — décision de Teo du 23/10, socle 19az)
-- ═══════════════════════════════════════════════════════════════════════════
-- Quand une relance est refusée dans la file de validation, le socle (19az) dépose une consigne (motif, commentaire).
-- CASHD la traite, au plus tard dans la minute (cron cashd-reprises) :
--   · il réécrit la relance sur les données du jour — règlements et avoirs imputés depuis, adresse du compte, textes et
--     réglages de l'organisation — et compare au texte refusé ;
--   · si quelque chose change (montant, objet, corps, destinataire), il propose UNE demande liée à la refusée
--     (private.proposer_reprise, au nom du moteur) avec la liste des corrections ; la relance passe sur cette demande,
--     à valider de nouveau (un nouvel envoi lui est adossé si elle en avait un) ;
--   · sinon — même résultat qu'avant, doublon, pièce soldée ou compte arrêté —, pas de demande : « reprise impossible »
--     avec le motif, au journal de la refusée et en avis au client.
-- Rien ne part sans une nouvelle validation humaine ; une reprise refusée ne relance rien (socle). Sans le lot 19az,
-- rien n'est fait (rejouer c2_41 après 19az pour poser le cron).
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Traiter une reprise : rend 'proposee', 'impossible' ou null (pas une relance CASHD).
create or replace function private.cashd_reprendre_refus(p_refusee uuid, p_consigne jsonb)
 returns text language plpgsql security definer set search_path to ''
as $function$
declare
  d public.demandes_validation;
  r public.cashd_relances;
  c public.cashd_comptes;
  v_t jsonb;
  v_corr jsonb := '[]'::jsonb;
  v_motif text := p_consigne ->> 'motif';
  v_nouvelle uuid;
  v_envoi uuid;
  v_adresse text;
begin
  select * into d from public.demandes_validation where id = p_refusee;
  if d.id is null or d.module <> 'cashd' or d.objet_type is distinct from 'cashd_relances' then
    return null;
  end if;
  select * into r from public.cashd_relances where id = d.objet_id::uuid;
  if r.id is null then
    perform private.reprise_impossible(p_refusee, 'la relance refusée n''existe plus');
    return 'impossible';
  end if;
  select * into c from public.cashd_comptes where id = r.compte_id;
  if v_motif = 'Doublon' then
    perform private.reprise_impossible(p_refusee, 'refusée comme doublon : CASHD ne repropose pas cette relance');
    return 'impossible';
  end if;
  if c.statut <> 'actif' or not exists (select 1 from public.cashd_relances_pieces p join public.cashd_factures f on f.id = p.facture_id
                                         where p.relance_id = r.id and not p.annulee and f.statut in ('ouverte', 'en_attente')
                                           and (f.nature = 'devis' or private.cashd_reste(f.id) > 0.005)) then
    perform private.reprise_impossible(p_refusee, 'plus rien à relancer : pièces soldées ou compte arrêté (' || replace(c.statut, '_', ' ') || ')');
    return 'impossible';
  end if;
  -- la relance sur les données du jour : les restes dus des pièces, puis le texte
  update public.cashd_relances_pieces p set reste_du = case when f.nature = 'devis' then f.montant_ttc else e.reste_relancable end
    from public.cashd_factures f join public.cashd_factures_etat e on e.id = f.id
   where p.relance_id = r.id and not p.annulee and f.id = p.facture_id;
  v_t := private.cashd_ecrire_texte(r.id);
  v_adresse := c.contact_facturation_email;
  if (v_t ->> 'montant')::numeric is distinct from (d.payload ->> 'montant')::numeric and (v_t ->> 'montant')::numeric is distinct from d.montant then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'montant', 'avant', d.montant, 'apres', (v_t ->> 'montant')::numeric));
  end if;
  if (v_t ->> 'sujet') is distinct from (d.payload ->> 'sujet') then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'sujet', 'avant', d.payload ->> 'sujet', 'apres', v_t ->> 'sujet'));
  end if;
  if (v_t ->> 'corps') is distinct from (d.payload ->> 'corps') then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'corps', 'avant', d.payload ->> 'corps', 'apres', v_t ->> 'corps'));
  end if;
  if v_adresse is distinct from (d.payload #>> '{destinataire,adresse}') then
    v_corr := v_corr || jsonb_build_array(jsonb_build_object('champ', 'destinataire', 'avant', d.payload #>> '{destinataire,adresse}', 'apres', v_adresse));
  end if;
  if jsonb_array_length(v_corr) = 0 then
    perform private.reprise_impossible(p_refusee, 'même résultat qu''avant : relue sur les données du jour, la relance est identique'
      || coalesce(' — consigne : ' || nullif(concat_ws(' · ', v_motif, p_consigne ->> 'commentaire'), ''), '')
      || '. Corrigez la fiche du compte, ses pièces ou vos textes : la relance suivante en tiendra compte.');
    return 'impossible';
  end if;
  v_nouvelle := private.proposer_reprise(p_refusee,
    'Relance ' || c.nom || ', ' || private.cashd_eur((v_t ->> 'montant')::numeric),
    d.payload || jsonb_build_object('sujet', v_t ->> 'sujet', 'corps', v_t ->> 'corps', 'montant', (v_t ->> 'montant')::numeric,
                                    'destinataire', jsonb_build_object('nom', coalesce(c.contact_facturation_nom, c.nom), 'adresse', v_adresse)),
    v_corr, (v_t ->> 'montant')::numeric);
  update public.cashd_relances set demande_id = v_nouvelle, statut = 'a_valider', motif = 'reprise après refus, à valider de nouveau',
         sujet = v_t ->> 'sujet', corps = v_t ->> 'corps', montant = (v_t ->> 'montant')::numeric, destinataire_adresse = v_adresse, maj_le = now()
   where id = r.id;
  -- un envoi adossé à la nouvelle demande, quand la relance en avait un
  if r.envoi_id is not null and to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,uuid,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamptz,jsonb)') is not null then
    v_envoi := private.preparer_envoi(r.client_id, 'cashd', 'cashd_relances', r.id::text, r.canal,
      jsonb_build_object('adresse', v_adresse, 'nom', coalesce(c.contact_facturation_nom, c.nom), 'ref', c.reference,
                         'professionnel', not c.particulier, 'langue', c.langue),
      null, '{}'::jsonb, v_t ->> 'sujet', v_t ->> 'corps', null::uuid[], 'cashd:relance:' || r.id::text || ':reprise', r.entite_id, true, false,
      null::timestamptz, jsonb_build_object('demande', v_nouvelle));
    update public.cashd_relances set envoi_id = v_envoi where id = r.id;
  end if;
  perform private.journaliser_module(r.client_id, 'cashd', 'cashd.relance_reprise', 'cashd_relances', r.id::text,
    jsonb_build_object('refusee', p_refusee, 'reprise', v_nouvelle, 'corrections', jsonb_array_length(v_corr)), r.entite_id);
  return 'proposee';
end $function$;

-- Le passage du cron : toutes les reprises CASHD à faire.
create or replace function private.cashd_traiter_reprises()
 returns integer language plpgsql security definer set search_path to ''
as $function$
declare x record; n integer := 0;
begin
  if to_regprocedure('private.reprises_a_faire(text)') is null then
    return 0;
  end if;
  for x in select * from private.reprises_a_faire('cashd') loop
    begin
      if private.cashd_reprendre_refus(x.demande_id, x.consigne) is not null then
        n := n + 1;
      end if;
    exception when others then
      perform private.lever_alerte_module(x.client_id, 'cashd', 'attention', 'Une relance refusée n''a pas pu être reprise : elle reste refusée.',
        jsonb_build_object('demande', x.demande_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'reprise:echec:' || x.demande_id::text, true, null);
    end;
  end loop;
  return n;
end $function$;

revoke execute on function private.cashd_reprendre_refus(uuid, jsonb) from public, anon, authenticated;
revoke execute on function private.cashd_traiter_reprises() from public, anon, authenticated;

-- Le cron, chaque minute, quand le lot 19az et pg_cron sont là.
do $cron$
begin
  if to_regprocedure('private.reprises_a_faire(text)') is null then
    raise notice 'c2_41 : le lot socle 19az n''est pas posé — cron non posé. Rejouer c2_41 après 19az.';
    return;
  end if;
  if to_regnamespace('cron') is null then
    raise notice 'c2_41 : pg_cron absent — cron non posé.';
    return;
  end if;
  perform cron.schedule('cashd-reprises', '* * * * *', 'select private.cashd_traiter_reprises()');
end $cron$;
