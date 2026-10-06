-- IDENTITÉ DES TIERS (B7), lot 3 — le balayage périodique : « vérifié le … » ne vieillit pas.
--
-- Ce que ce lot pose :
--   public.identite_balayer(p_jours = 90, p_max = 50) → int   porte : pour chaque fournisseur FILED actif ou à
--     confirmer qui porte un numéro de TVA de l'Union ou un SIREN à clé juste, si sa dernière réponse de registre
--     pour (client, registre, identifiant) a plus de p_jours (ou n'existe pas) et qu'aucune demande n'est ouverte,
--     ouvre une demande (→ déclencheur b7_01 → travail identite.verifier). Au plus p_max fournisseurs par appel,
--     les plus anciens d'abord : l'INSEE accorde 30 requêtes par minute, partagées avec les demandes à la volée.
-- L'ouvrier l'appelle à chaque passage, après identite_relancer. Même registre que filed_controles_identite (A4) :
-- VIES si le numéro de TVA a une forme de l'Union, Sirene sinon. Dépend de b7_01. Rejouable ; aucun DROP, aucun DELETE.

create or replace function public.identite_balayer(p_jours integer default 90, p_max integer default 50) returns integer
language plpgsql security definer set search_path to '' as $$
declare
  n integer := 0;
  r record;
begin
  for r in
    with cibles as (
      select f.id as fournisseur_id, f.client_id,
             case when a.valide then 'vies'
                  when private.identite_normaliser(f.siren) ~ '^[0-9]{9}$'
                    and private.filed_siren_valide(private.identite_normaliser(f.siren)) then 'sirene'
                  end as registre,
             case when a.valide then private.identite_normaliser(f.tva) else private.identite_normaliser(f.siren) end as identifiant
      from public.filed_fournisseurs f
      left join lateral private.filed_tva_intracom_analyser(f.tva) a on true
      where f.statut in ('actif', 'a_confirmer')
    ),
    datees as (
      select c.*,
             (select max(v.repondu_le) from public.filed_verifications_tiers v
               where v.client_id = c.client_id and v.registre = c.registre and v.identifiant = c.identifiant
                 and v.repondu_le is not null) as derniere
      from cibles c
      where c.registre is not null
    )
    select d.* from datees d
    where (d.derniere is null or d.derniere < now() - make_interval(days => greatest(p_jours, 1)))
      and not exists (select 1 from public.filed_verifications_tiers o
                      where o.client_id = d.client_id and o.registre = d.registre and o.identifiant = d.identifiant
                        and o.repondu_le is null)
    order by d.derniere nulls first, d.fournisseur_id
    limit greatest(least(p_max, 500), 0)
  loop
    insert into public.filed_verifications_tiers (client_id, fournisseur_id, registre, identifiant, preuve)
    values (r.client_id, r.fournisseur_id, r.registre, r.identifiant, '{"origine": "balayage"}'::jsonb);
    n := n + 1;
  end loop;
  return n;
end $$;
comment on function public.identite_balayer(integer, integer) is
  'Porte de l''ouvrier identite : ouvre une demande de vérification pour chaque fournisseur actif ou à confirmer dont la dernière réponse de registre a plus de p_jours (ou n''existe pas), p_max au plus par appel, les plus anciens d''abord. Réservée au service.';
revoke all on function public.identite_balayer(integer, integer) from public, anon, authenticated;
grant execute on function public.identite_balayer(integer, integer) to service_role;
