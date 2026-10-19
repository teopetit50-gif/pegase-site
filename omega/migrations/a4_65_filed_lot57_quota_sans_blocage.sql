-- a4_65 (FILED lot 57) : le quota, sans blocage. Reprise d'a4_50 (lot 42).
--
-- Décision du bureau, par délégation de Teo (19/10/2026, 16 h 14 Z), point 3 : aucun blocage ; alerte au gérant à
-- 80 % et à 100 % ; la lecture continue ; compteur « au-delà » visible ; aucun prix.
--
-- Ce qui change par rapport à a4_50 :
--   · deux alertes par mois, au gérant (à chacun s'il y en a plusieurs ; à l'organisation s'il n'y en a pas) : au seuil
--     du palier (80 % par défaut), puis à 100 % — quand le quota est ATTEINT, et non plus quand il est dépassé ;
--     elles disent que la lecture continue. Le dépassement est noté (depasse_le), sans alerte de plus ;
--   · le compteur « au-delà » : colonne filed_compteurs_pieces.au_dela, et clé « au_dela » de filed_compteur (avec
--     l'état « atteint » à 100 % tout juste) ;
--   · aucun prix : plus un mot de facturation dans les messages, et le réglage « facturer » n'est plus accepté par
--     filed_regler_palier ; les paliers qui le portaient reviennent à « prevenir ».
-- Rien ne bloque une pièce : le compteur ne refuse rien, et une erreur du compteur n'empêche jamais la pièce d'arriver.
-- Rejouable ; aucune suppression.

alter table public.filed_compteurs_pieces add column if not exists atteint_le timestamptz;
alter table public.filed_compteurs_pieces add column if not exists au_dela integer
  generated always as (case when quota is null then 0 else greatest(pieces - quota, 0) end) stored;
comment on column public.filed_compteurs_pieces.au_dela is
  'Lot 57 (a4_65) : les pièces reçues au-delà du quota du mois. Elles sont lues comme les autres ; aucun prix.';

update public.filed_paliers set depassement = 'prevenir' where depassement <> 'prevenir';

-- Une alerte du quota, au gérant (à chacun) ; à l'organisation si elle n'a pas de gérant.
create or replace function private.filed_alerter_quota(p_client uuid, p_titre text, p_detail jsonb, p_cle text)
returns integer language plpgsql security definer set search_path to '' as $$
declare r record; n integer := 0;
begin
  for r in select c.user_id from public.comptes c where c.client_id = p_client and c.role = 'gerant' order by c.user_id loop
    perform private.lever_alerte_module(p_client, 'filed', 'attention', left(p_titre, 200), p_detail, p_cle || ':' || r.user_id::text, true, r.user_id);
    n := n + 1;
  end loop;
  if n = 0 then
    perform private.lever_alerte_module(p_client, 'filed', 'attention', left(p_titre, 200), p_detail, p_cle, true, null);
  end if;
  return n;
end $$;
revoke all on function private.filed_alerter_quota(uuid, text, jsonb, text) from public, anon, authenticated;
grant execute on function private.filed_alerter_quota(uuid, text, jsonb, text) to service_role;

-- Le déclencheur (texte d'a4_50, repris en entier : c'est une fonction d'A4).
create or replace function private.filed_compter_piece()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_mois date := date_trunc('month', (new.recu_le at time zone 'Europe/Paris'))::date; v_p public.filed_paliers; c public.filed_compteurs_pieces;
        v_detail jsonb;
begin
  v_p := private.filed_palier_du(new.client_id, v_mois);
  insert into public.filed_compteurs_pieces as k (client_id, mois, pieces, doublons, palier, quota)
  values (new.client_id, v_mois, case when new.doublon_de is null then 1 else 0 end, case when new.doublon_de is null then 0 else 1 end,
          v_p.code, v_p.pieces_mois)
  on conflict (client_id, mois) do update
    set pieces = k.pieces + case when new.doublon_de is null then 1 else 0 end,
        doublons = k.doublons + case when new.doublon_de is null then 0 else 1 end,
        palier = coalesce(v_p.code, k.palier), quota = v_p.pieces_mois, maj_le = now()
  returning * into c;
  if c.quota is not null then
    v_detail := jsonb_build_object('mois', c.mois, 'pieces', c.pieces, 'quota', c.quota, 'palier', c.palier, 'au_dela', greatest(c.pieces - c.quota, 0));
    -- Au seuil du palier (80 % par défaut), tant que le quota n'est pas atteint : une fois.
    if c.alerte_le is null and c.pieces >= ceil(c.quota * v_p.alerte_pct / 100.0) and c.pieces < c.quota then
      update public.filed_compteurs_pieces set alerte_le = now() where client_id = c.client_id and mois = c.mois;
      perform private.filed_alerter_quota(c.client_id,
        format('FILED : %s %% du quota — %s pièces reçues ce mois sur %s au palier %s. La lecture continue.',
               v_p.alerte_pct, c.pieces, c.quota, v_p.libelle),
        v_detail || jsonb_build_object('seuil', v_p.alerte_pct), 'filed:quota:alerte:' || to_char(c.mois, 'YYYY-MM'));
    end if;
    -- À 100 % : une fois. Au-delà, les pièces sont lues comme les autres et comptées à part.
    if c.atteint_le is null and c.pieces >= c.quota then
      update public.filed_compteurs_pieces set atteint_le = now() where client_id = c.client_id and mois = c.mois;
      perform private.filed_alerter_quota(c.client_id,
        format('FILED : quota du palier %s atteint (%s pièces ce mois). La lecture continue ; les pièces au-delà sont comptées à part.',
               v_p.libelle, c.quota),
        v_detail || jsonb_build_object('seuil', 100), 'filed:quota:atteint:' || to_char(c.mois, 'YYYY-MM'));
    end if;
    if c.depasse_le is null and c.pieces > c.quota then
      update public.filed_compteurs_pieces set depasse_le = now() where client_id = c.client_id and mois = c.mois;
    end if;
  end if;
  return null;
exception when others then
  -- Le compteur ne doit jamais empêcher une pièce d'arriver.
  raise warning 'FILED : compteur non tenu pour le document % (%)', new.id, sqlerrm;
  return null;
end $$;
revoke all on function private.filed_compter_piece() from public, anon, authenticated;
grant execute on function private.filed_compter_piece() to service_role;

-- La porte du compteur : « au_dela » et l'état « atteint » en plus (hors_quota reste, pour qui le lit déjà).
create or replace function private.filed_compteur(p_client uuid, p_mois date default null)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_mois date := date_trunc('month', coalesce(p_mois, (now() at time zone 'Europe/Paris')::date))::date; c public.filed_compteurs_pieces;
        v_p public.filed_paliers; v_a public.filed_abonnements; v_au_dela integer;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin', 'valideur']);
  select * into c from public.filed_compteurs_pieces k where k.client_id = p_client and k.mois = v_mois;
  v_p := private.filed_palier_du(p_client, v_mois);
  select * into v_a from public.filed_abonnements a where a.client_id = p_client;
  v_au_dela := case when v_p.pieces_mois is not null then greatest(coalesce(c.pieces, 0) - v_p.pieces_mois, 0) else 0 end;
  return jsonb_build_object('mois', v_mois, 'pieces', coalesce(c.pieces, 0), 'doublons', coalesce(c.doublons, 0),
    'palier', v_p.code, 'libelle', v_p.libelle, 'quota', v_p.pieces_mois,
    'pourcentage', case when v_p.pieces_mois is not null then round(100.0 * coalesce(c.pieces, 0) / v_p.pieces_mois, 1) end,
    'au_dela', v_au_dela, 'hors_quota', v_au_dela, 'lecture', 'continue',
    'etat', case when v_p.pieces_mois is null then 'sans_quota'
                 when coalesce(c.pieces, 0) > v_p.pieces_mois then 'depasse'
                 when coalesce(c.pieces, 0) = v_p.pieces_mois then 'atteint'
                 when coalesce(c.pieces, 0) >= ceil(v_p.pieces_mois * v_p.alerte_pct / 100.0) then 'alerte'
                 else 'ok' end,
    'palier_suivant', v_a.palier_suivant, 'suivant_le', v_a.suivant_le);
end $$;
revoke all on function private.filed_compteur(uuid, date) from public, anon;
grant execute on function private.filed_compteur(uuid, date) to authenticated, service_role;
comment on function public.filed_compteur(uuid, date) is
  'Lots 42 et 57 (a4_50, a4_65) : les pièces du mois, le quota du palier, les pièces au-delà, l''état (ok, alerte, atteint, dépassé, sans quota). Jamais de blocage, aucun prix. Gérant, admin, valideur.';

-- Les seuils d'un palier : l'opérateur seulement ; plus de « facturer » (aucun prix).
create or replace function public.filed_regler_palier(p_code text, p_pieces_mois integer, p_boites integer, p_historique_mois integer,
                                                      p_alerte_pct integer default 80, p_depassement text default 'prevenir')
returns void language plpgsql security definer set search_path to '' as $$
begin
  if coalesce(p_depassement, 'prevenir') <> 'prevenir' then
    raise exception 'Au-delà du quota, FILED prévient et continue : aucun blocage, aucun prix (« prevenir » seulement).' using errcode = '22023';
  end if;
  update public.filed_paliers set pieces_mois = p_pieces_mois, boites = p_boites, historique_mois = p_historique_mois,
         alerte_pct = coalesce(p_alerte_pct, 80), depassement = 'prevenir'
   where code = upper(btrim(p_code));
  if not found then raise exception 'Palier inconnu : %.', p_code using errcode = '22023'; end if;
end $$;
comment on function public.filed_regler_palier(text, integer, integer, integer, integer, text) is
  'Lots 42 et 57 (a4_50, a4_65) : règle les seuils d''un palier (pièces par mois, boîtes, historique, seuil d''alerte). Au-delà : on prévient, on continue. Opérateur (service_role).';
revoke all on function public.filed_regler_palier(text, integer, integer, integer, integer, text) from public, anon, authenticated;
grant execute on function public.filed_regler_palier(text, integer, integer, integer, integer, text) to service_role;
