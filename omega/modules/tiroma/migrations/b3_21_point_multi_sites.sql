-- b3_21 — Le point du matin multi-sites (audit des promesses, § 2 Tiroma, n° 7).
--
-- CE QUE ÇA CORRIGE : la page /secteurs/dentaire promet « Un point du matin par centre » et « Quand plusieurs sites
-- dépendent d'une même direction, chaque centre reçoit son point du matin ». Le dépôt de b3_06 servait chaque
-- cabinet à part, mais :
--   · une personne présente dans deux centres (un titulaire de deux cabinets, une assistante partagée) recevait deux
--     sections « Créneaux à sauver » sans dire de quel centre chacune parlait ;
--   · une direction posée sur l'entité de tête (le groupe) ne recevait rien : seul un profil posé sur l'entité même
--     du cabinet était servi, alors que la synthèse de la semaine (b3_15) suit déjà la hiérarchie des entités.
--
-- CE QUE ÇA POSE : private.tiroma_deposer_points(p_maintenant) remplacé, même signature, même cron (tiroma-matin) :
--   · un membre servi dans plus d'un cabinet actif voit le nom du centre au bout de chaque titre (« Créneaux à
--     sauver — Les Abymes ») ; la variante de titre qui ne vaut plus est retirée, dans un sens comme dans l'autre ;
--     un membre d'un seul centre garde les titres de b3_06 ;
--   · la direction d'une entité parente reçoit, pour chaque centre qui en dépend, la section de compteurs sans nom
--     « Cabinet dentaire — <centre> », comme la direction posée sur le centre lui-même ;
--   · le reste ne change pas : sections, ordres, santé, retraits des sections vides, battement, alerte.
-- Idempotent (create or replace).

create or replace function private.tiroma_deposer_points(p_maintenant timestamp with time zone default now())
 returns integer
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  k record;
  m record;
  s record;
  v_jour date;
  v_items jsonb;
  v_du timestamptz;
  v_multi boolean;
  v_suffixe text;
  v_titre text;
  v_autre text;
  n integer := 0;
begin
  for k in
    select c.id as cabinet_id, c.client_id, c.entite_id, e.fuseau, e.nom as entite_nom, c.dernier_releve_ok_le
    from public.tiroma_cabinets c
    join public.entites e on e.client_id = c.client_id and e.id = c.entite_id
    where c.statut = 'actif'
    order by c.client_id, c.entite_id
  loop
    continue when (p_maintenant at time zone k.fuseau)::time < time '05:00';
    v_jour := (p_maintenant at time zone k.fuseau)::date;
    v_du := k.dernier_releve_ok_le;
    v_suffixe := ' — ' || left(btrim(k.entite_nom), 60);
    begin
      for m in
        with recursive parents as (
          select e.parent_id as id, 1 as profondeur from public.entites e
          where e.client_id = k.client_id and e.id = k.entite_id and e.parent_id is not null
          union all
          select e.parent_id, p.profondeur + 1 from public.entites e join parents p on e.id = p.id
          where e.client_id = k.client_id and e.parent_id is not null and p.profondeur < 20
        )
        select distinct on (p.user_id, p.profil) p.user_id, p.profil, p.praticien_id
        from public.tiroma_profils p
        join public.comptes c on c.user_id = p.user_id and c.client_id = p.client_id
        where p.client_id = k.client_id
          and (p.entite_id = k.entite_id or (p.profil = 'direction' and p.entite_id in (select id from parents)))
        order by p.user_id, p.profil, (p.entite_id = k.entite_id) desc
      loop
        if m.profil = 'direction' then
          v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, 'compteurs', true, null);
          perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, 'Cabinet dentaire — ' || left(k.entite_nom, 90),
                                          v_items, k.entite_id, null, false, v_du, v_du is null, 30);
          continue;
        end if;
        -- Servi dans plus d'un cabinet actif : le nom du centre au bout des titres.
        v_multi := (select count(distinct p2.entite_id) from public.tiroma_profils p2
                    join public.tiroma_cabinets c2 on c2.client_id = p2.client_id and c2.entite_id = p2.entite_id and c2.statut = 'actif'
                    where p2.client_id = k.client_id and p2.user_id = m.user_id and p2.profil <> 'direction') > 1;
        for s in
          select x.quoi, x.titre, x.sante, x.ordre from (values
            ('creneaux', 'Créneaux à sauver', true, 10),
            ('plans', 'Plans sans rendez-vous', true, 20),
            ('avant', 'Avant les rendez-vous', true, 25),
            ('charge', 'Charge des fauteuils', false, 28)) x(quoi, titre, sante, ordre)
          where x.quoi <> 'charge' or m.profil = 'titulaire'
        loop
          v_titre := s.titre || case when v_multi then v_suffixe else '' end;
          v_autre := s.titre || case when v_multi then '' else v_suffixe end;
          perform private.retirer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, v_autre, k.entite_id, null);
          if s.quoi = 'charge' then
            v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, 'charge', true, null);
          else
            v_items := private.tiroma_section_lignes(k.client_id, k.entite_id, s.quoi, m.profil in ('titulaire', 'assistante'), m.praticien_id);
          end if;
          if jsonb_array_length(v_items) = 0 then
            perform private.retirer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, v_titre, k.entite_id, null);
          else
            perform private.deposer_section(k.client_id, 'tiroma', v_jour, m.user_id, null, v_titre, v_items,
                                            k.entite_id, null, s.sante, v_du, case when s.quoi = 'charge' then false else v_du is null end, s.ordre);
          end if;
        end loop;
        n := n + 1;
      end loop;
      perform private.battre(k.client_id, 'tiroma_matin', jsonb_build_object('jour', v_jour, 'cabinet', k.cabinet_id), interval '1 day');
    exception when others then
      perform private.lever_alerte_module(k.client_id, 'tiroma', 'attention',
        'Le point du matin du cabinet n''a pas pu être déposé.',
        jsonb_build_object('cabinet', k.cabinet_id, 'erreur', left(sqlstate || ' ' || sqlerrm, 300)), 'point:depot:' || k.cabinet_id::text, false, null);
    end;
  end loop;
  return n;
end $function$;

-- Les droits de b3_06 sont gardés tels quels (create or replace ne les touche pas).

select 'b3_21 point du matin multi-sites posé' as resultat;
