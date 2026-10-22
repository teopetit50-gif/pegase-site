-- 20261011135327 b5_25_j10_questions_matin
-- Source : dépôt : 1499143 omega/modules/lorani/migrations/b5_25_j10_questions_matin.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : b5_25_j10_questions_matin.sql @ 1499143 ; b5_15 cité comme test : ignoré.
-- ═══ omega/modules/lorani/migrations/b5_25_j10_questions_matin.sql @ 1499143
-- LORANI, lot B5-25 — deux promesses de la page des architectes, au plus près du texte (11/10/2026).
--
--   · « La date butoir de chaque visa est calée sur le délai de commande de l'ouvrage : la fiche des menuiseries à dix
--     semaines est signalée à J-10 » (Questions.tsx:68). Le visa daté par la commande (b5_15) avait ses rappels à J-3,
--     J-1 et J ; il est désormais rappelé aussi à J-10. Sans date de commande, rien ne change (J-3, J-1, J). Une échéance
--     déjà ouverte garde ses rappels jusqu'à son prochain recalcul.
--   · « Chaque question posée garde sa date, et celle qui attend une réponse depuis plus de huit jours remonte le matin »
--     (Questions.tsx:68 ; FileDesPoints.tsx:77). Les questions des comptes rendus (b5_20, lorani_points nature
--     « question », statut « ouvert ») posées depuis huit jours ou plus forment une section du point du matin du socle,
--     « Questions sans réponse », pour le gérant, l'administrateur et les membres du projet, la plus ancienne d'abord.
--
-- Ce qui est posé :
--   · private.lorani_visa_suivre_delai : corps de b5_15, rappels [10, 3, 1, 0] quand la commande est datée.
--   · private.lorani_deposer_questions(client, jour) → nombre de sections déposées.
--   · private.lorani_deposer_point : corps du socle photographié le 05/10/2026 (omega/SOCLE-EXTRAITS-LORANI.sql),
--     inchangé, plus l'appel de lorani_deposer_questions ; le passage horaire du calendrier (lorani-calendrier) l'appelle
--     déjà chaque heure, la section du jour est remplacée à chaque fois.
-- Idempotent (create or replace) ; rien n'est retiré.

-- Le visa daté par la commande est aussi rappelé à J-10 (corps de b5_15, seul le tableau des rappels change).
CREATE OR REPLACE FUNCTION private.lorani_visa_suivre_delai()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  pr public.lorani_projets;
  v_ouvert boolean;
  v_date date;
begin
  select (d.statut in ('ouvert', 'depasse')), d.echeance into v_ouvert, v_date from public.delais d where d.id = new.delai_id;
  begin
    -- L'avis rendu tient l'échéance.
    if new.avis <> 'a_viser' then
      if coalesce(v_ouvert, false) then
        perform private.clore_delai(new.delai_id, 'tenu', null);
      end if;
      return new;
    end if;
    -- À viser : une échéance ouverte à la bonne date, sinon on la remplace.
    if coalesce(v_ouvert, false) and v_date = new.a_viser_avant then
      return new;
    end if;
    if coalesce(v_ouvert, false) then
      perform private.clore_delai(new.delai_id, 'annule',
        left(format('Date limite du visa recalculée : %s au lieu du %s.', to_char(new.a_viser_avant, 'DD/MM/YYYY'), to_char(v_date, 'DD/MM/YYYY')), 300));
    end if;
    select * into pr from public.lorani_projets where id = new.projet_id;
    if pr.territoire is null then
      new.delai_id := null;
      return new;
    end if;
    new.delai_id := private.poser_delai_date(new.client_id, 'lorani', 'lorani_projet', new.projet_id::text,
      left(format('Visa : %s (indice %s)', new.document, new.indice), 200), new.a_viser_avant,
      left(format('Document reçu le %s ; visa en %s jours (CCAG-Travaux, art. 29)%s.', to_char(new.recu_le, 'DD/MM/YYYY'), new.delai_visa_jours,
                  case when new.commande_le is not null then ', au plus tard la veille ouvrée de la commande de l''ouvrage le ' || to_char(new.commande_le, 'DD/MM/YYYY') else '' end), 300),
      pr.territoire, case when new.commande_le is not null then array[10, 3, 1, 0] else array[3, 1, 0] end, private.lorani_chef_de_projet(new.client_id, new.projet_id),
      'Rendre l''avis sur le document (visé, visé avec observations, refusé).',
      format('lorani:visa:%s:%s', new.id, new.a_viser_avant));
  exception when others then
    perform private.lever_alerte_module(new.client_id, 'lorani', 'info',
      left(format('Visa « %s » : l''échéance n''a pas pu être posée au registre des délais (%s).', left(new.document, 60), left(sqlerrm, 100)), 200),
      jsonb_build_object('projet', new.projet_id, 'visa', new.id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)),
      format('visa:%s:delai_refuse', new.id), true, null);
  end;
  return new;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_visa_suivre_delai() FROM PUBLIC;

-- Les questions qui attendent depuis huit jours ou plus, au point du matin.
CREATE OR REPLACE FUNCTION private.lorani_deposer_questions(p_client uuid, p_jour date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre constant text := 'Questions sans réponse';
  v_items jsonb;
  m record;
  n integer := 0;
begin
  for m in select c.user_id, c.role from public.comptes c where c.client_id = p_client order by c.user_id loop
    select coalesce(jsonb_agg(jsonb_build_object(
             'texte', left(format('« %s » : %s attend une réponse depuis %s jours — %s', left(pr.nom, 50),
                                  coalesce('la question à ' || i.organisme, 'une question'), p_jour - q.cree_le::date,
                                  left(regexp_replace(q.texte, '\s+', ' ', 'g'), 90)), 300),
             'lien', private.lorani_lien_projet(q.projet_id),
             'gravite', case when p_jour - q.cree_le::date > 15 then 'critique' else 'attention' end,
             'objet_type', 'lorani_point', 'objet_id', q.id::text) order by q.cree_le, q.id), '[]'::jsonb)
      into v_items
    from (select q.* from public.lorani_points q
          join public.lorani_projets pr0 on pr0.client_id = q.client_id and pr0.id = q.projet_id
          where q.client_id = p_client and q.nature = 'question' and q.statut = 'ouvert' and pr0.actif
            and q.cree_le::date <= p_jour - 8
            and (m.role in ('gerant', 'admin')
                 or exists (select 1 from public.lorani_membres_projet mp
                            where mp.client_id = p_client and mp.projet_id = q.projet_id and mp.user_id = m.user_id))
            and private.lorani_voit_projet_pour(m.user_id, p_client, q.entite_id, q.projet_id)
          order by q.cree_le, q.id
          limit 50) q
    join public.lorani_projets pr on pr.client_id = q.client_id and pr.id = q.projet_id
    left join public.lorani_intervenants i on i.client_id = q.client_id and i.id = q.intervenant_id;
    if jsonb_array_length(v_items) = 0 then
      perform private.retirer_section(p_client, 'lorani', p_jour, m.user_id, null, v_titre);
    else
      perform private.deposer_section(p_client, 'lorani', p_jour, m.user_id, null, v_titre, v_items,
                                      null, null, false, now(), false, 45);
      n := n + 1;
    end if;
  end loop;
  return n;
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_deposer_questions(uuid, date) FROM PUBLIC;

-- Le point du matin de Lorani (corps du socle du 05/10/2026, inchangé) dépose aussi les questions en attente.
CREATE OR REPLACE FUNCTION private.lorani_deposer_point(p_client uuid, p_jour date)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_titre constant text := 'Calendrier des permis';
  v_lignes jsonb;
  v_items jsonb;
  v_du timestamptz;
  m record;
  n integer := 0;
begin
  select coalesce(jsonb_agg(jsonb_build_object('projet', pr.id, 'entite', pr.entite_id, 'calcule_le', x.calcule_le,
                                               'ligne', l.ligne)), '[]'::jsonb)
    into v_lignes
  from public.lorani_permis x
  join public.lorani_projets pr on pr.client_id = x.client_id and pr.id = x.projet_id
  cross join lateral (select private.lorani_ligne_du_point(x, pr, p_jour) as ligne) l
  where x.client_id = p_client and l.ligne is not null;

  for m in select c.user_id, c.role from public.comptes c where c.client_id = p_client order by c.user_id loop
    select coalesce(jsonb_agg(s.ligne order by s.rang, s.jour nulls last, s.texte), '[]'::jsonb), min(s.calcule_le)
      into v_items, v_du
    from (
      select (e.value -> 'ligne') - '_rang' - '_date' as ligne, (e.value #>> '{ligne,_rang}')::integer as rang,
             (e.value #>> '{ligne,_date}')::date as jour, e.value #>> '{ligne,texte}' as texte,
             (e.value ->> 'calcule_le')::timestamptz as calcule_le
      from jsonb_array_elements(v_lignes) e
      where (m.role in ('gerant', 'admin')
             or exists (select 1 from public.lorani_membres_projet mp
                        where mp.client_id = p_client and mp.projet_id = (e.value ->> 'projet')::uuid and mp.user_id = m.user_id))
        and private.lorani_voit_projet_pour(m.user_id, p_client, (e.value ->> 'entite')::uuid, (e.value ->> 'projet')::uuid)
      order by 2, 3 nulls last, 4
      limit 50
    ) s;
    if jsonb_array_length(v_items) = 0 then
      perform private.retirer_section(p_client, 'lorani', p_jour, m.user_id, null, v_titre);
    else
      perform private.deposer_section(p_client, 'lorani', p_jour, m.user_id, null, v_titre, v_items,
                                      null, null, false, v_du, false, 40);
      n := n + 1;
    end if;
  end loop;
  return n + private.lorani_deposer_questions(p_client, p_jour);
end $function$;
REVOKE EXECUTE ON FUNCTION private.lorani_deposer_point(uuid, date) FROM PUBLIC;
