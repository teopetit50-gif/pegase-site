-- b1_18 — VARELO : le contexte du groupe pour l'assistant, lu au périmètre de la personne (11/10/2026, B1)
--
-- CE QUE ÇA PRÉPARE (omega/CHIFFRAGE/varelo.md, lignes 1, 8, 18, 28 : « une seule IA pour tout le groupe »,
-- « l'IA raisonne sur les mêmes données dans toutes les filiales » ; ligne 33 : « chaque lecture est inscrite au
-- journal »). L'assistant de l'espace (app/api/assistant, hors de ce module) n'a aujourd'hui accès à aucune donnée.
-- Ce lot pose la moitié « données » : une porte qui rend, sous les droits de la personne (RLS, security invoker),
-- un résumé borné du groupe, et inscrit chaque lecture au journal. Le branchement comme outil de l'assistant
-- appartient au propriétaire de la route (proposition au coordinateur).
--
--   · public.grp_contexte(p_client, p_motif) → jsonb, au plus quelques kilo-octets : les sociétés (ventes, résultat,
--     trésorerie, écarts, plancher), le point du matin Varelo (grp_ce_matin), les décisions en attente, les clients
--     au-dessus de leur plafond, les contrats à dénoncer sous 90 jours, les réserves à émettre, les reportings en
--     retard, les caisses d'hier. Aucun IBAN, aucun montant de pièce, aucune donnée nominative de salarié.
--   · private.grp_noter_lecture(p_client, p_quoi, p_motif) : journal varelo.lecture.<quoi> (qui, quand, pourquoi).
--
-- Règles de pose : create or replace ; aucune suppression.

create or replace function private.grp_noter_lecture(p_client uuid, p_quoi text, p_motif text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
begin
  if p_quoi !~ '^[a-z][a-z_]{1,39}$' then
    raise exception 'Lecture inconnue.' using errcode = '22023';
  end if;
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  perform private.grp_journal(p_client, 'varelo.lecture.' || p_quoi, 'clients', p_client::text,
    jsonb_build_object('motif', left(nullif(btrim(p_motif), ''), 300)));
end $function$;

create or replace function public.grp_contexte(p_client uuid, p_motif text default null::text)
 returns jsonb
 language plpgsql

 set search_path to ''
as $function$
declare
  v jsonb;
begin
  if (select auth.uid()) is not null and p_client not in (select private.mes_clients()) then
    raise exception 'Organisation introuvable.' using errcode = 'P0002';
  end if;
  v := jsonb_build_object(
    'jour', current_date,
    'societes', (select coalesce(jsonb_agg(jsonb_strip_nulls(jsonb_build_object(
                   'societe', g.societe, 'pole', g.pole, 'balance_au', g.arrete_le, 'ventes', g.ventes, 'resultat', g.resultat,
                   'tresorerie', g.tresorerie, 'ecart_n1_pct', g.ecart_n1_pct, 'ecart_objectif', g.ecart_objectif,
                   'sous_plancher', g.sous_plancher)) order by g.societe), '[]'::jsonb)
                 from (select * from public.grp_groupe_page x where x.client_id = p_client order by x.societe limit 50) g),
    'ce_matin', public.grp_ce_matin(p_client),
    'decisions_en_attente', (select coalesce(jsonb_agg(jsonb_build_object('genre', d.genre, 'resume', d.resume, 'calcul', d.calcul, 'avant_le', d.echeance)
                               order by d.echeance nulls last), '[]'::jsonb)
                             from (select * from public.grp_decisions x where x.client_id = p_client and x.statut = 'en_attente' order by x.echeance nulls last limit 20) d),
    'clients_au_dessus_du_plafond', (select coalesce(jsonb_agg(jsonb_build_object('client', e.nom_groupe, 'code', e.code_groupe, 'encours', e.total,
                                       'echu', e.echu, 'plafond', e.plafond, 'societes', e.societes) order by e.total desc), '[]'::jsonb)
                                     from (select * from public.grp_encours_groupe x where x.client_id = p_client and x.nature = 'client' and x.depasse
                                           order by x.total desc limit 20) e),
    'contrats_a_denoncer', (select coalesce(jsonb_agg(jsonb_build_object('contrat', c.intitule, 'tiers', c.tiers, 'societe', c.societe,
                              'date_limite', c.date_limite, 'montant_annuel', c.montant_annuel) order by c.date_limite), '[]'::jsonb)
                            from (select * from public.grp_contrats_echeancier x where x.client_id = p_client and x.statut = 'actif'
                                    and x.reconduction = 'tacite' and x.jours_restants between 0 and 90 order by x.date_limite limit 20) c),
    'reserves_a_emettre', (select coalesce(jsonb_agg(jsonb_build_object('transporteur', r.transporteur, 'societe', r.societe,
                             'livraison', r.date_reception, 'avant_le', r.echeance, 'prejudice', r.montant_estime) order by r.echeance), '[]'::jsonb)
                           from (select * from public.grp_reserves x where x.client_id = p_client and x.statut = 'a_examiner' order by x.echeance limit 20) r),
    'reportings_en_retard', (select coalesce(jsonb_agg(jsonb_build_object('reporting', d.intitule, 'destinataire', d.destinataire,
                               'societe', d.societe, 'echeance', d.echeance) order by d.echeance), '[]'::jsonb)
                             from (select * from public.grp_reportings_dus x where x.client_id = p_client and x.etat = 'en_retard' order by x.echeance limit 20) d),
    'caisses_hier', (select coalesce(jsonb_agg(jsonb_build_object('magasin', m.magasin, 'societe', m.societe, 'ttc', m.hier_ttc,
                       'meme_jour_semaine_derniere', m.semaine_derniere_ttc) order by m.societe, m.magasin), '[]'::jsonb)
                     from (select * from public.grp_ventes_magasins x where x.client_id = p_client order by x.societe, x.magasin limit 50) m));
  perform private.grp_noter_lecture(p_client, 'contexte', coalesce(p_motif, 'assistant'));
  return v;
end $function$;

revoke execute on function private.grp_noter_lecture(uuid, text, text) from public, anon;
grant execute on function private.grp_noter_lecture(uuid, text, text) to authenticated, service_role;
revoke execute on function public.grp_contexte(uuid, text) from public, anon;
grant execute on function public.grp_contexte(uuid, text) to authenticated, service_role;
