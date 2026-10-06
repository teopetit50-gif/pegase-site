-- IDENTITÉ DES TIERS (B7), lot 5 — un « indisponible » ne cache pas une réponse du registre.
--
-- private.filed_verification_recente (A4, a4_04 puis a4_10) rend la DERNIÈRE réponse de moins de p_jours pour
-- (client, registre, identifiant) ; un « indisponible » n'y compte que deux heures (a4_10). Depuis b7_04, un refus
-- douteux est écrit « indisponible » (preuve.doute), et une panne de VIES aussi : pendant ces deux heures, une facture
-- contrôlée lisait « VIES n'a pas répondu » alors qu'une réponse valide (ou invalide) récente existait.
--
-- Ce lot remplace la fonction, même signature, même forme de retour (texte d'a4_10 plus une condition) :
--   un « indisponible » (doute compris) est ignoré dès qu'une réponse du registre (valide ou invalide) de moins de
--   p_jours existe pour le même (client, registre, identifiant) ; sans elle, la règle d'a4_10 tient (deux heures).
-- Accord à obtenir d'A4 : la fonction est la sienne ; s'il repose a4_10, il doit reprendre cette condition.
-- Dépend d'a4_04 (table) et d'a4_10 (règle des deux heures, reprise ici). Rejouable ; rien n'est supprimé.

create or replace function private.filed_verification_recente(p_client uuid, p_registre text, p_identifiant text, p_jours int default 90)
returns public.filed_verifications_tiers
language sql stable set search_path to '' as $$
  select v from public.filed_verifications_tiers v
  where v.client_id = p_client and v.registre = p_registre
    and v.identifiant = upper(regexp_replace(coalesce(p_identifiant, ''), '[^A-Za-z0-9]', '', 'g'))
    and v.repondu_le is not null and v.repondu_le >= now() - make_interval(days => p_jours)
    and (v.resultat <> 'indisponible'
         or (v.repondu_le >= now() - interval '2 hours'
             and not exists (select 1 from public.filed_verifications_tiers w
                              where w.client_id = v.client_id and w.registre = v.registre and w.identifiant = v.identifiant
                                and w.resultat in ('valide', 'invalide')
                                and w.repondu_le >= now() - make_interval(days => p_jours))))
  order by v.repondu_le desc limit 1
$$;
comment on function private.filed_verification_recente(uuid, text, text, integer) is
  'La réponse de registre qui vaut pour (client, registre, identifiant) : la dernière de moins de p_jours ; un « indisponible » (doute compris) ne compte que deux heures, et jamais quand une réponse valide ou invalide de moins de p_jours existe (A4 a4_10, B7 b7_05).';
