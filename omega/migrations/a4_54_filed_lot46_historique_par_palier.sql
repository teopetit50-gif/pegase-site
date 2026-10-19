-- FILED, lot 46 (a4_54) — la durée d'historique consultable par palier (Teo, 18/10, n° 7 du chantier ; chiffrage n° 26).
--
-- Le site promettait « trois mois / douze mois / historique complet ». Décision de Teo du 17/10 : historique complet
-- pour tous. Ce lot en fait un réglage technique, sans rien retirer :
--   · filed_paliers.historique_mois (a4_50) : nul = complet ; c'est la valeur des trois paliers, conformément au 17/10 ;
--     l'opérateur peut la régler (filed_regler_palier) ;
--   · public.filed_fenetre_historique(organisation) : la date à partir de laquelle l'écran montre les pièces de
--     l'organisation, selon son palier (nulle : tout) ;
--   · ce que la fenêtre ne touche JAMAIS : la conservation légale (registre, archives, écritures, FEC : dix ans),
--     le dossier de sortie (toujours complet, a4_33, a4_49), l'échéancier (une facture ancienne non réglée reste due),
--     les contrôles et la piste d'audit. Rien n'est effacé ni masqué en base : c'est une borne d'affichage.
-- Migration idempotente ; aucun DROP, aucune suppression ; aucun envoi.

create or replace function private.filed_fenetre_historique(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_p public.filed_paliers; v_depuis date;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur', 'collaborateur']);
  v_p := private.filed_palier_du(p_client, current_date);
  if v_p.historique_mois is not null then
    v_depuis := (date_trunc('month', (now() at time zone 'Europe/Paris')) - make_interval(months => v_p.historique_mois - 1))::date;
  end if;
  return jsonb_build_object('palier', v_p.code, 'historique_mois', v_p.historique_mois, 'depuis', v_depuis,
    'complet', v_depuis is null,
    'texte', case when v_depuis is null then 'Historique complet.'
                  else format('Historique des %s derniers mois (depuis le %s) ; tout reste conservé et exportable.', v_p.historique_mois, to_char(v_depuis, 'DD/MM/YYYY')) end);
end $$;
revoke all on function private.filed_fenetre_historique(uuid) from public, anon;
grant execute on function private.filed_fenetre_historique(uuid) to authenticated, service_role;

create or replace function public.filed_fenetre_historique(p_client uuid)
returns jsonb language sql stable set search_path to '' as $$ select private.filed_fenetre_historique(p_client) $$;
comment on function public.filed_fenetre_historique(uuid) is
  'Lot 46 (a4_54) : la borne d''affichage de l''historique selon le palier (nulle : complet, la règle du 17/10). Ne masque ni n''efface rien en base. Membres de l''organisation.';
revoke all on function public.filed_fenetre_historique(uuid) from public, anon;
grant execute on function public.filed_fenetre_historique(uuid) to authenticated, service_role;
