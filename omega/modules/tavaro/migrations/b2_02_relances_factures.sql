-- b2_02 — Relance des factures impayées (session B2, 06/10/2026).
--
-- CE QUE ÇA CORRIGE : la vitrine (facturation des retours, recouvrement) et le cahier de B2 promettent
-- la relance d'une facture non réglée ; le socle photographié le 05/10 n'en avait aucune (ni cron, ni
-- porte, ni trace). Ici :
--   · deux colonnes de suivi sur loc_factures (relances, relance_le), hors du tuple immuable que
--     loc_garder_facture protège (seuls le règlement, le litige et les pièces avancent — et ces deux-là) ;
--   · private.loc_relancer_facture(client, facture, origine, maintenant) : une relance = un courriel au
--     locataire par private.preparer_envoi (verrous et réglages d'envoi du socle), clé idempotente
--     tavaro:relance:<facture>:<n>, journal tavaro.facture_relancee, battement ; jamais sur une facture
--     en litige, réglée, créditée, ni sans courriel (alerte « relancez-la vous-même ») ;
--   · private.loc_relancer_factures(maintenant) : le passage quotidien — échéance dépassée de 7 jours,
--     puis toutes les deux semaines, trois relances au plus ; à la troisième, alerte « attention » à
--     l'agence : la facture passe au recouvrement humain ;
--   · public.loc_relancer_facture(facture) : la relance à la main par l'agence (rôle et périmètre
--     contrôlés par loc_facture_de_l_agence), même quand l'échéance n'est pas dépassée de 7 jours ;
--   · le cron tavaro-relances à 9 h 15 UTC.

alter table public.loc_factures add column if not exists relances smallint not null default 0;
alter table public.loc_factures add column if not exists relance_le timestamp with time zone;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'loc_factures_relances_check') then
    alter table public.loc_factures add constraint loc_factures_relances_check check (relances >= 0 and relances <= 9);
  end if;
end $$;
comment on column public.loc_factures.relances is 'b2_02 : nombre de relances envoyées (cron ou agence)';
comment on column public.loc_factures.relance_le is 'b2_02 : date de la dernière relance';

CREATE OR REPLACE FUNCTION private.loc_relancer_facture(p_client uuid, p_facture uuid, p_origine text DEFAULT 'cron'::text, p_maintenant timestamp with time zone DEFAULT now())
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures;
  c public.loc_contrats;
  l public.loc_locataires;
  v_credite numeric;
  v_reste numeric;
  v_nom_loueur text;
  v_client_nom text;
  v_pro boolean;
  v_agence text;
  v_fuseau text;
  v_n integer;
  v_sujet text;
  v_corps text;
  v_envoi uuid;
  v_statut text;
  v_verrou text;
  v_erreur text;
begin
  select * into f from public.loc_factures where client_id = p_client and id = p_facture for update;
  if not found then
    raise exception 'Facture introuvable.' using errcode = 'P0002';
  end if;
  if f.statut not in ('emise', 'envoyee') then
    raise exception 'Cette facture ne se relance pas (%s) : seule une facture émise ou envoyée, ni réglée, ni en litige, ni annulée.', f.statut using errcode = '23514';
  end if;
  select coalesce(sum(a.montant_ttc), 0) into v_credite from public.loc_avoirs a where a.client_id = p_client and a.facture_id = f.id and a.statut = 'emis';
  v_reste := f.total_ttc - v_credite;
  if v_reste <= 0 then
    raise exception 'Cette facture est entièrement créditée : rien à relancer.' using errcode = '23514';
  end if;
  if f.relances >= 3 and p_origine = 'cron' then
    return jsonb_build_object('statut', 'plafond', 'relances', f.relances);
  end if;
  if p_origine not in ('cron', 'agence') then
    raise exception 'Origine de relance inconnue : %.', coalesce(p_origine, 'vide') using errcode = '22023';
  end if;

  select * into c from public.loc_contrats where client_id = p_client and id = f.contrat_id;
  select e.nom, e.fuseau into v_agence, v_fuseau from public.entites e where e.client_id = p_client and e.id = f.entite_id;
  v_nom_loueur := f.emetteur ->> 'nom';
  v_pro := f.destinataire ->> 'type' = 'professionnel';
  v_client_nom := coalesce(f.destinataire ->> 'raison_sociale', f.destinataire ->> 'nom');
  v_n := f.relances + 1;

  if (private.reglages_envois_effectifs(p_client, 'tavaro') ->> 'mode') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('La relance de la facture %s (contrat %s) n''est pas partie : l''envoi par courriel n''est pas réglé pour votre organisation. Relancez-la vous-même.', f.reference, f.contrat_numero),
      jsonb_build_object('facture', f.id, 'reference', f.reference, 'contrat', f.contrat_numero, 'reste_du', v_reste), 'facture:relance_non_regle:' || f.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_relance_non_regle', 'loc_factures', f.id::text,
      jsonb_build_object('reference', f.reference, 'contrat', f.contrat_numero, 'relance', v_n, 'origine', p_origine), f.entite_id);
    return jsonb_build_object('statut', 'non_regle', 'relance', v_n);
  end if;
  if c.locataire_id is not null then
    select * into l from public.loc_locataires x where x.client_id = p_client and x.id = c.locataire_id;
  end if;
  if l.id is null or l.anonymise_le is not null or nullif(btrim(l.email), '') is null then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('La relance de la facture %s (contrat %s) n''est pas partie : le locataire n''a pas d''adresse de courriel. Relancez-la vous-même.', f.reference, f.contrat_numero),
      jsonb_build_object('facture', f.id, 'reference', f.reference, 'contrat', f.contrat_numero, 'reste_du', v_reste), 'facture:relance_sans_adresse:' || f.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_relance_sans_adresse', 'loc_factures', f.id::text,
      jsonb_build_object('reference', f.reference, 'contrat', f.contrat_numero, 'relance', v_n, 'origine', p_origine), f.entite_id);
    return jsonb_build_object('statut', 'sans_adresse', 'relance', v_n);
  end if;

  v_sujet := format('%s : rappel, facture %s — location %s%s', v_nom_loueur, f.reference, f.contrat_numero,
                    case when v_n >= 3 then ' (dernier rappel avant recouvrement)' else '' end);
  v_corps := format(E'Bonjour %s,\n\nSauf erreur de notre part, la facture %s du %s, d''un montant de %s%s, reste impayée%s.\n\n',
                    v_client_nom, f.reference, to_char(f.date_facture, 'DD/MM/YYYY'), private.loc_eur(v_reste),
                    case when v_credite > 0 then ' (après avoir)' else '' end,
                    case when f.echeance_le < (p_maintenant at time zone coalesce(v_fuseau, 'UTC'))::date
                         then format(' depuis son échéance du %s', to_char(f.echeance_le, 'DD/MM/YYYY')) else '' end)
    || private.loc_texte_facture(f) || E'\n'
    || case when v_n >= 3
            then format(E'Sans règlement sous huit jours, le dossier sera confié au recouvrement. Pour toute question, écrivez à l''agence %s.\n\n', v_agence)
            else format(E'Si le règlement est déjà parti, merci de ne pas tenir compte de ce rappel. Pour toute question, écrivez à l''agence %s. Une contestation écrite adressée à l''agence suspend le recouvrement.\n\n', v_agence) end
    || coalesce(f.mentions ->> 'mandat', '') || E'\n'
    || v_nom_loueur
    || case when f.emetteur ->> 'siren' is not null then ' — SIREN ' || (f.emetteur ->> 'siren') else '' end
    || case when f.emetteur ->> 'adresse' is not null then ' — ' || (f.emetteur ->> 'adresse') else '' end || E'\n';

  begin
    v_envoi := private.preparer_envoi(p_client, 'tavaro', 'loc_factures', f.id::text, 'email',
      jsonb_build_object('adresse', l.email, 'nom', v_client_nom, 'ref', l.id::text, 'professionnel', v_pro, 'langue', 'fr'),
      null, '{}'::jsonb, v_sujet, v_corps, null::uuid[], 'tavaro:relance:' || f.id::text || ':' || v_n, f.entite_id, true, false, null::timestamptz,
      jsonb_build_object('relance', v_n, 'origine', p_origine, 'reste_du', v_reste));
  exception when others then
    v_erreur := left(sqlstate || ' ' || sqlerrm, 500);
    perform private.lever_alerte_module(p_client, 'tavaro', 'critique',
      format('La relance de la facture %s (contrat %s) n''a pas pu être préparée. Relancez-la vous-même.', f.reference, f.contrat_numero),
      jsonb_build_object('facture', f.id, 'reference', f.reference, 'erreur', v_erreur), 'facture:relance_echec:' || f.id::text, true, null);
    perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_relance_echec', 'loc_factures', f.id::text,
      jsonb_build_object('reference', f.reference, 'erreur', v_erreur, 'relance', v_n), f.entite_id);
    return jsonb_build_object('statut', 'echec', 'erreur', v_erreur, 'relance', v_n);
  end;

  update public.loc_factures set relances = v_n, relance_le = p_maintenant where id = f.id;
  select e.statut, e.verrou into v_statut, v_verrou from public.envois e where e.id = v_envoi;
  perform private.journaliser_module(p_client, 'tavaro', 'tavaro.facture_relancee', 'loc_factures', f.id::text,
    jsonb_build_object('reference', f.reference, 'contrat', f.contrat_numero, 'relance', v_n, 'origine', p_origine, 'reste_du', v_reste,
                       'envoi', v_envoi, 'statut', v_statut, 'verrou', v_verrou), f.entite_id);
  if v_n >= 3 then
    perform private.lever_alerte_module(p_client, 'tavaro', 'attention',
      format('Facture %s (contrat %s) : troisième relance envoyée, %s restent dus. Le dossier passe au recouvrement.', f.reference, f.contrat_numero, private.loc_eur(v_reste)),
      jsonb_build_object('facture', f.id, 'reference', f.reference, 'contrat', f.contrat_numero, 'reste_du', v_reste, 'relances', v_n),
      'facture:recouvrement:' || f.id::text, true, null);
  end if;
  perform private.battre(p_client, 'tavaro_relances', jsonb_build_object('facture', f.id, 'relance', v_n), interval '1 day');
  return jsonb_build_object('statut', 'prepare', 'relance', v_n, 'envoi', v_envoi, 'envoi_statut', v_statut, 'verrou', v_verrou, 'reste_du', v_reste);
end $function$;

CREATE OR REPLACE FUNCTION private.loc_relancer_factures(p_maintenant timestamp with time zone DEFAULT now())
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  r record;
  v_res jsonb;
  n integer := 0;
begin
  for r in
    select f.client_id, f.id, f.entite_id
    from public.loc_factures f
    join public.entites e on e.client_id = f.client_id and e.id = f.entite_id
    where f.statut in ('emise', 'envoyee')
      and f.relances < 3
      and f.echeance_le + 7 <= (p_maintenant at time zone coalesce(e.fuseau, 'UTC'))::date
      and (f.relance_le is null or f.relance_le + interval '14 days' <= p_maintenant)
      and f.total_ttc > coalesce((select sum(a.montant_ttc) from public.loc_avoirs a where a.client_id = f.client_id and a.facture_id = f.id and a.statut = 'emis'), 0)
    order by f.client_id, f.echeance_le, f.numero
  loop
    begin
      v_res := private.loc_relancer_facture(r.client_id, r.id, 'cron', p_maintenant);
      if v_res ->> 'statut' = 'prepare' then
        n := n + 1;
      end if;
    exception when others then
      perform private.lever_alerte_module(r.client_id, 'tavaro', 'attention',
        'Une relance de facture n''a pas pu être faite.',
        jsonb_build_object('facture', r.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'facture:relance_erreur:' || r.id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

CREATE OR REPLACE FUNCTION public.loc_relancer_facture(p_facture uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  f public.loc_factures := private.loc_facture_de_l_agence(p_facture);
begin
  return private.loc_relancer_facture(f.client_id, f.id, 'agence', now());
end $function$;

revoke all on function public.loc_relancer_facture(uuid) from public, anon;
grant execute on function public.loc_relancer_facture(uuid) to authenticated, service_role;
grant execute on function private.loc_relancer_facture(uuid, uuid, text, timestamp with time zone) to service_role;
grant execute on function private.loc_relancer_factures(timestamp with time zone) to service_role;

do $$ begin
  if not exists (select 1 from cron.job where jobname = 'tavaro-relances') then
    perform cron.schedule('tavaro-relances', '15 9 * * *', 'select private.loc_relancer_factures()');
  end if;
end $$;
