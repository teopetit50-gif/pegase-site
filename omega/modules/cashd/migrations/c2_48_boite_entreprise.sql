-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_48 : les relances depuis la boîte de l'entreprise (27/10/2026, session C2 — G4, côté CASHD)
-- ═══════════════════════════════════════════════════════════════════════════
-- C13 : « Les relances partent par courriel, depuis la boîte de votre entreprise. » Le branchement de la boîte est au
-- socle (19al, A2) : une boîte Gmail connectée devient l'expéditeur de l'organisation (expediteurs.module null : tous les
-- modules), l'ouvrier y DÉPOSE le message en brouillon (envois.statut « brouillon_depose », envoye_le posé) ou l'envoie
-- quand la boîte en a le droit, et relève les réponses (reception.nouvelle, déjà lu par CASHD, c2_05). Ce lot fait la
-- part de CASHD, comme OFFLOAD l'a faite (c4_22) :
--   · l'abonnement à « envoi.brouillon_depose.cashd » ;
--   · un brouillon déposé compte comme parti (déjà vrai : CASHD lit envoye_le, c2_19 → c2_46) ; la relance le dit —
--     « déposée en brouillon dans <boîte> le … : envoyez-la depuis votre messagerie » — et le journal porte
--     « cashd.brouillon_depose » ;
--   · public.cashd_messagerie(p_client) : par quelle boîte partent les relances (brouillon ou envoi direct, selon les
--     droits accordés à la boîte), dans quel mode (essai : rien ne part pour de vrai), pour l'écran.
-- Microsoft 365 et la vérification d'application Google / Microsoft restent à A2 et aux tiers. Aucun mode d'envoi
-- n'est changé ici, aucun secret n'est lu (ni jeton, ni portée sensible : seulement adresse, fournisseur et état).
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

insert into private.abonnements (evenement, module, genre)
select 'envoi.brouillon_depose.cashd', 'cashd', 'cashd.envoi'
where not exists (select 1 from private.abonnements a where a.evenement = 'envoi.brouillon_depose.cashd' and a.module = 'cashd' and a.genre = 'cashd.envoi');

-- Le suivi d'un envoi (c2_04) : un brouillon déposé est dit sur la relance ; un message non remis suspend le compte.
create or replace function private.cashd_suivre_envoi(p_charge jsonb)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare
  e public.envois;
  r public.cashd_relances;
  c public.cashd_comptes;
  v_id uuid;
  v_boite text;
begin
  begin
    v_id := coalesce(p_charge ->> 'envoi', p_charge ->> 'id', p_charge #>> '{envoi,id}')::uuid;
  exception when others then
    return jsonb_build_object('ignore', 'charge sans envoi');
  end;
  select * into e from public.envois where id = v_id;
  if not found or e.module <> 'cashd' or e.objet_type <> 'cashd_relances' then
    return jsonb_build_object('ignore', 'envoi étranger aux relances');
  end if;
  select * into r from public.cashd_relances where id = e.objet_id::uuid;
  if not found then
    return jsonb_build_object('ignore', 'relance introuvable');
  end if;
  -- c2_48 : déposée en brouillon dans la boîte de l'entreprise
  if e.statut = 'brouillon_depose' then
    if r.envoi_id is distinct from e.id then
      return jsonb_build_object('ignore', 'brouillon d''un message remplacé');
    end if;
    select coalesce(x.identite, m.adresse) into v_boite from public.expediteurs x
      left join public.messageries m on m.expediteur_id = x.id
     where x.id = e.expediteur_id;
    update public.cashd_relances
       set motif = left(format('déposée en brouillon dans %s le %s : envoyez-la depuis votre messagerie%s',
                               coalesce(v_boite, 'votre boîte'), to_char(coalesce(e.envoye_le, now()) at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24:MI'),
                               case when e.mode = 'essai' then ' (mode essai : à l''adresse d''essai)' else '' end), 500),
           maj_le = now()
     where id = r.id;
    perform private.journaliser_module(r.client_id, 'cashd', 'cashd.brouillon_depose', 'cashd_relances', r.id::text,
      jsonb_build_object('envoi', e.id, 'boite', v_boite, 'mode', e.mode), r.entite_id);
    return jsonb_build_object('relance', r.id, 'statut', 'brouillon_depose');
  end if;
  if not (e.remise in ('rebond', 'refuse') or e.statut in ('echec', 'refuse')) then
    return jsonb_build_object('ignore', 'envoi remis ou en cours', 'statut', e.statut, 'remise', e.remise);
  end if;
  select * into c from public.cashd_comptes where id = r.compte_id for update;
  if c.statut = 'actif' then
    update public.cashd_comptes set statut = 'attente_contact',
      statut_motif = left(format('la relance du %s n''a pas été remise à %s (%s) : désignez le nouvel interlocuteur', to_char(r.jour, 'DD/MM/YYYY'),
                                 coalesce(e.destinataire_adresse, 'l''adresse connue'), coalesce(e.remise, e.statut)), 500),
      statut_le = now(), maj_le = now() where id = c.id;
    perform private.journaliser_module(c.client_id, 'cashd', 'cashd.compte_statut', 'cashd_comptes', c.id::text,
      jsonb_build_object('avant', c.statut, 'apres', 'attente_contact', 'motif', 'relance non remise', 'envoi', e.id, 'remise', e.remise), c.entite_id);
  end if;
  perform private.cashd_alerter_commercial(c.id, 'attention',
    format('La relance de %s n''a pas été remise (%s) : le compte attend un nouvel interlocuteur.', c.nom, coalesce(e.remise, e.statut)),
    jsonb_build_object('relance', r.id, 'envoi', e.id), 'adresse:' || c.id::text);
  return jsonb_build_object('compte', c.id, 'statut', 'attente_contact');
end $function$;

-- Par où partent les relances : la boîte connectée (brouillon ou envoi direct), ou l'expéditeur partagé ; le mode.
create or replace function public.cashd_messagerie(p_client uuid)
 returns jsonb language plpgsql stable security definer set search_path to ''
as $function$
declare
  v_mode text;
begin
  if not exists (select 1 from public.comptes k where k.user_id = (select auth.uid()) and k.client_id = p_client) then
    raise exception 'Cette organisation n''est pas la vôtre.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.cashd_reglages g where g.client_id = p_client) then
    raise exception 'CASHD n''est pas installé pour cette organisation.' using errcode = 'P0002';
  end if;
  begin
    v_mode := private.reglages_envois_effectifs(p_client, 'cashd') ->> 'mode';
  exception when others then
    v_mode := null;
  end;
  return jsonb_build_object(
    'mode', v_mode,
    'boites', (select coalesce(jsonb_agg(jsonb_build_object(
                 'adresse', m.adresse, 'fournisseur', m.fournisseur, 'etat', m.etat, 'releve_le', m.releve_le,
                 'depot', case when exists (select 1 from unnest(m.portees) p where p ~ '(gmail\.send|mail\.google\.com|Mail\.Send)') then 'envoi'
                               else 'brouillon' end) order by m.connecte_le), '[]'::jsonb)
               from public.messageries m join public.expediteurs x on x.id = m.expediteur_id
               where m.client_id = p_client and m.etat in ('active', 'a_reconnecter') and x.canal = 'email'
                 and (x.module is null or x.module = 'cashd') and x.statut = 'actif'),
    'phrase', case when v_mode is null then 'L''envoi des relances n''est pas encore réglé : elles sont écrites et validables, rien ne part.'
                   when v_mode = 'essai' then 'Mode essai : aucune relance ne part chez vos clients ; les essais vont à l''adresse d''essai.'
                   when exists (select 1 from public.messageries m join public.expediteurs x on x.id = m.expediteur_id
                                where m.client_id = p_client and m.etat = 'active' and x.canal = 'email' and (x.module is null or x.module = 'cashd') and x.statut = 'actif')
                     then 'Vos relances partent de votre boîte connectée.'
                   else 'Vos relances partent de l''expéditeur partagé d''Omega.' end);
end $function$;

revoke execute on function private.cashd_suivre_envoi(jsonb) from public, anon, authenticated;
grant execute on function private.cashd_suivre_envoi(jsonb) to service_role;
revoke execute on function public.cashd_messagerie(uuid) from public, anon;
grant execute on function public.cashd_messagerie(uuid) to authenticated, service_role;
