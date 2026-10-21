-- c4_29 — OFFLOAD : un cycle par compte et par trimestre, un rappel, la reprise forcée (décision du bureau, 21/10/2026 ;
-- TOFFLOAD-03 ; session C4)
--
-- Décision (bureau, par délégation de Teo, 21/10, 23 h Z) : « au plus UN nouveau cycle de reprise par compte et par
-- trimestre. Dans un cycle, un seul rappel, donc deux messages en tout. Une commande ou une réponse clôt le cycle, sans
-- rouvrir le droit avant le trimestre suivant. Le gérant peut forcer une reprise manuelle avec un motif, jamais sur un
-- compte en litige CASHD. »
-- Écarts de c4 corrigés ici :
--   · un rappel : la relance écrite (c4_16, éteinte par défaut) est allumée par défaut ; elle est rallumée partout où
--     personne ne l'a éteinte explicitement (aucun offload_regler portant « relance_ecrite » au journal) ;
--   · la reprise ouverte à la main suit désormais les mêmes règles que la vague (trimestre, contact noté récent,
--     exclusions, compte à vérifier, litige) : O6 est refusé, avec la raison ;
--   · public.offload_forcer_reprise(p_compte, p_motif) : le gérant ou un administrateur force la reprise, motif
--     obligatoire, au journal (« offload.reprise_forcee ») ; le forçage passe le trimestre et les écarts, JAMAIS un compte
--     en litige ou en recouvrement CASHD (c4_23), ni un compte retiré à sa demande, ni OFFLOAD suspendu ou hors essai.
-- Inchangés et déjà conformes : la quarantaine (90 jours) court depuis la clôture du cycle ; une commande (c4_25) ou une
-- réponse clôt le cycle ; un cycle n'envoie jamais plus de deux messages (rangs 1 et 2).
--
-- Règles de pose : alter … set default, update ciblé et rejouable, create or replace. Aucun DROP, aucun DELETE.

alter table public.offload_reglages alter column relance_ecrite set default true;
update public.offload_reglages g set relance_ecrite = true, maj_le = now()
 where not g.relance_ecrite
   and not exists (select 1 from public.journal_opposable j
                   where j.client_id = g.client_id and j.action = 'offload.reglages'
                     and coalesce(j.donnees -> 'demande', '{}'::jsonb) ? 'relance_ecrite');

-- L'ouverture : le trimestre ne cède qu'au forçage du gérant (c4_29) ; le litige CASHD ne cède jamais (c4_23).
create or replace function private.offload_ouvrir(p_compte uuid, p_par text, p_jour date default null)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  g public.offload_reglages;
  s public.offload_signaux;
  v_jour date := coalesce(p_jour, (now() at time zone 'Europe/Paris')::date);
  v_id uuid;
  v_envoi uuid;
  e public.envois;
  v_statut text;
  v_motif text;
  v_dernier public.offload_achats;
  v_detail text;
  v_echeance date;
begin
  select * into c from public.offload_comptes where id = p_compte for update;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  select * into g from public.offload_reglages where client_id = c.client_id;
  if c.statut <> 'suivi' then
    raise exception 'Ce compte est % : il ne reçoit aucune reprise.', case c.statut when 'exclu' then 'suivi en direct' else 'retiré à sa demande' end
      using errcode = '55000';
  end if;
  -- Un compte en litige ou en recouvrement chez CASHD ne reçoit aucune reprise commerciale, même ouverte à la main (c4_23).
  v_motif := private.offload_impaye(c.id);
  if v_motif is not null then
    raise exception '% : pas de reprise commerciale tant que CASHD suit ce compte.', v_motif using errcode = '55000';
  end if;
  select x.id into v_id from public.offload_reprises x
  where x.compte_id = c.id and x.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee');
  if v_id is not null then
    return v_id;
  end if;
  if coalesce(current_setting('offload.forcer', true), '') <> 'oui'
     and exists (select 1 from public.offload_reprises x where x.compte_id = c.id
             and coalesce(x.close_le, x.repondu_le, x.cree_le) > now() - make_interval(days => g.quarantaine_jours)) then
    raise exception 'Ce compte a déjà eu une reprise il y a moins de % jours.', g.quarantaine_jours using errcode = '55000';
  end if;

  if private.offload_suspendu(c.client_id) then
    raise exception 'OFFLOAD est suspendu (%) : rien n''est préparé tant qu''un gérant ne l''a pas relancé.',
      (select z.suspendu_motif from public.offload_reglages z where z.client_id = c.client_id) using errcode = '55000';
  end if;
  if private.offload_essai_contre_reel(c.client_id) then
    raise exception 'OFFLOAD est en mode essai et les envois du module ne sont pas réglés en essai : rien n''est préparé (aucun message ne naît en réel).' using errcode = '55000';
  end if;
  select * into s from public.offload_signaux where compte_id = c.id;
  insert into public.offload_reprises (client_id, entite_id, compte_id, statut, ouverte_par, ouverte_par_user, niveau, score, raisons)
  values (c.client_id, c.entite_id, c.id, 'appel', p_par, (select auth.uid()), s.niveau, s.score, coalesce(s.raisons, '[]'::jsonb))
  returning id into v_id;

  -- La tâche d'appel du commercial, avant la clôture (ou sous trois jours si la clôture est loin) : posée seulement si
  -- le message ne part pas (un seul canal à la fois, c4_12).
  select * into v_dernier from public.offload_achats x
  where x.compte_id = c.id and x.annule_le is null and x.nature <> 'avoir' order by x.date_achat desc limit 1;
  v_echeance := least(coalesce(s.cloture_le, v_jour + 3), v_jour + 3);
  v_detail := concat_ws(E'\n',
    (select string_agg('• ' || (x ->> 'phrase'), E'\n') from jsonb_array_elements(coalesce(s.raisons, '[]'::jsonb)) x),
    case when v_dernier.id is not null then format('Dernière commande : %s, %s HT%s.', private.offload_le(v_dernier.date_achat),
                                                   private.offload_euros(v_dernier.montant_ht), coalesce(', réf. ' || v_dernier.reference, '')) end,
    case when c.telephone is not null then 'Téléphone : ' || c.telephone end,
    case when c.contact is not null then 'Contact : ' || c.contact end);

  -- Le message : en validation, ou rien si le compte n'a pas de courriel, ou bloqué par un verrou du socle.
  v_envoi := private.offload_preparer_message(v_id, 1);
  if v_envoi is null then
    v_statut := 'appel';
    v_motif := coalesce((select x.motif from public.offload_reprises x where x.id = v_id),
                        'Pas de courriel connu : la reprise passe par l''appel du commercial.');
  else
    select * into e from public.envois where id = v_envoi;
    if e.statut = 'bloque' then
      v_statut := 'appel';
      v_motif := left(format('Message retenu par le socle (%s) : %s', e.verrou, coalesce(e.motif, '')), 500);
    else
      v_statut := 'a_valider';
    end if;
  end if;
  update public.offload_reprises set statut = v_statut, envoi1_id = v_envoi, motif = v_motif, maj_le = now() where id = v_id;
  if v_statut = 'appel' then
    insert into public.offload_taches (client_id, entite_id, compte_id, reprise_id, type, titre, detail, commercial, echeance)
    values (c.client_id, c.entite_id, c.id, v_id, 'appel', left('Appeler ' || c.nom, 200), left(v_detail, 4000), c.commercial, v_echeance);
  end if;
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reprise_ouverte', 'offload_reprises', v_id::text,
    jsonb_build_object('compte', c.id, 'par', p_par, 'niveau', s.niveau, 'score', s.score, 'statut', v_statut, 'envoi', v_envoi,
                       'motif', v_motif), c.entite_id);
  return v_id;
end $function$;

-- La reprise ouverte à la main : les règles de la vague.
create or replace function private.offload_ouvrir_reprise(p_compte uuid)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_ecart text;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin', 'valideur', 'collaborateur'], 'ouvrir une reprise');
  -- À la main, les mêmes règles que la vague (c4_29) ; seul le gérant force, avec un motif (offload_forcer_reprise).
  v_ecart := private.offload_ecarte(c.id);
  if v_ecart is not null and not exists (select 1 from public.offload_reprises x where x.compte_id = c.id
                                           and x.statut in ('a_valider', 'appel', 'envoyee', 'relance_a_valider', 'relancee')) then
    raise exception '% Le gérant peut forcer la reprise, avec un motif.', v_ecart using errcode = '55000';
  end if;
  return private.offload_ouvrir(c.id, 'manuel', null);
end $function$;

-- Le forçage : le gérant ou un administrateur, un motif, jamais un compte en litige CASHD.
create or replace function private.offload_forcer_reprise(p_compte uuid, p_motif text)
 returns uuid
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  c public.offload_comptes;
  v_motif text := private.offload_texte(p_motif, 500);
  v_id uuid;
begin
  select * into c from public.offload_comptes where id = p_compte;
  if not found then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  if (select auth.uid()) is null or not private.a_un_role(c.client_id, array['gerant', 'admin']) then
    raise exception 'Seul le gérant ou un administrateur force une reprise.' using errcode = '42501';
  end if;
  perform private.offload_exiger(c.client_id, c.entite_id, array['gerant', 'admin'], 'forcer une reprise');
  if v_motif is null then
    raise exception 'Forcer une reprise demande un motif.' using errcode = '22023';
  end if;
  perform set_config('offload.forcer', 'oui', true);
  begin
    v_id := private.offload_ouvrir(c.id, 'manuel', null);
  exception when others then
    perform set_config('offload.forcer', '', true);
    raise;
  end;
  perform set_config('offload.forcer', '', true);
  perform private.journaliser_module(c.client_id, 'offload', 'offload.reprise_forcee', 'offload_reprises', v_id::text,
    jsonb_build_object('compte', c.id, 'motif', v_motif), c.entite_id);
  return v_id;
end $function$;

create or replace function public.offload_forcer_reprise(p_compte uuid, p_motif text)
 returns uuid
 language sql
 set search_path to ''
as $function$ select private.offload_forcer_reprise(p_compte, p_motif) $function$;

revoke execute on function private.offload_ouvrir(uuid, text, date) from public, anon, authenticated;
grant execute on function private.offload_ouvrir(uuid, text, date) to service_role;
revoke execute on function private.offload_ouvrir_reprise(uuid) from public, anon;
grant execute on function private.offload_ouvrir_reprise(uuid) to authenticated, service_role;
revoke execute on function private.offload_forcer_reprise(uuid, text) from public, anon;
grant execute on function private.offload_forcer_reprise(uuid, text) to authenticated;
revoke execute on function public.offload_forcer_reprise(uuid, text) from public, anon;
grant execute on function public.offload_forcer_reprise(uuid, text) to authenticated;
