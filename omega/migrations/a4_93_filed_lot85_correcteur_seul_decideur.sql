-- a4_93 (FILED lot 85) : TMOD-11 — le seul décideur de l'organisation approuve la correction qu'il a faite pour une
-- reprise ; dès qu'un second décideur existe, celui qui corrige n'approuve pas.
--
-- Décision de Teo (26/10, transmise par le coordinateur ; même règle que Daliro DAL-19 / TMET-02) :
--   · s'il existe un autre décideur, celui qui corrige n'approuve pas (inchangé depuis a4_91) ;
--   · s'il est le SEUL décideur de l'organisation, il approuve sa correction, tracé « seul décideur » ;
--   · l'exception tombe dès qu'un second décideur existe.
-- a4_91 jugeait « un autre décideur » sur la demande (rôles autorisés, périmètre de la société) : un décideur hors du
-- périmètre ne comptait pas, et un valideur seul passait. a4_93 prend la définition du socle (lot 19af),
-- private.seul_decideur(client, personne) : la personne est gérante ou admin, et aucun autre compte actif de
-- l'organisation n'est gérant, admin ou valideur. Elle est relue au moment de la décision.
-- La trace : commentaire de l'approbation préfixé « [seul décideur] » et journal « filed.seul_decideur ».
-- Remplace les corps d'a4_91 (private.filed_reprise_separation, private.filed_correcteur_n_approuve_pas) ;
-- private.filed_autre_decideur n'est plus appelée. Rejouable ; aucune suppression.

create or replace function private.filed_reprise_separation(p_d public.demandes_validation, p_facture uuid, p_depuis timestamptz)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_corr uuid[] := private.filed_correcteurs(p_facture, p_depuis); v_saisi jsonb; v_seul boolean;
begin
  v_saisi := case when jsonb_typeof(p_d.payload -> 'saisi_par') = 'array' then p_d.payload -> 'saisi_par' else '[]'::jsonb end;
  if cardinality(v_corr) = 0 then
    return jsonb_build_object('corrige_par', '[]'::jsonb, 'saisi_par', v_saisi);
  end if;
  -- a4_93 : seul décideur au sens du socle (19af), pour l'unique correcteur.
  v_seul := cardinality(v_corr) = 1 and private.seul_decideur(p_d.client_id, v_corr[1]);
  if not v_seul then
    return jsonb_build_object('corrige_par', to_jsonb(v_corr), 'seul_decideur', false,
      'saisi_par', (select coalesce(jsonb_agg(distinct x), '[]'::jsonb)
                      from (select jsonb_array_elements_text(v_saisi) x union select u::text from unnest(v_corr) u) s));
  end if;
  return jsonb_build_object('corrige_par', to_jsonb(v_corr), 'seul_decideur', true, 'saisi_par', v_saisi);
end $$;

create or replace function private.filed_correcteur_n_approuve_pas()
returns trigger language plpgsql security definer set search_path to '' as $$
declare v_d public.demandes_validation; v_qui uuid := coalesce(new.au_nom_de, new.user_id); v_corr uuid[];
begin
  if new.decision <> 'approuve' then return new; end if;
  select * into v_d from public.demandes_validation d where d.id = new.demande_id;
  if v_d.module is distinct from 'filed' or jsonb_typeof(v_d.payload -> 'corrige_par') is distinct from 'array' then return new; end if;
  select coalesce(array_agg(x::uuid), '{}') into v_corr from jsonb_array_elements_text(v_d.payload -> 'corrige_par') x;
  if not (v_qui = any (v_corr) or new.user_id = any (v_corr)) then return new; end if;
  -- a4_93 : seul décideur de l'organisation (socle 19af), relu à l'instant de la décision, et en son nom propre.
  if new.au_nom_de is not null or not private.seul_decideur(v_d.client_id, new.user_id) then
    raise exception 'Vous avez corrigé cette facture pour sa reprise : une autre personne l''approuve.' using errcode = '42501';
  end if;
  if coalesce(new.commentaire, '') not like '[seul décideur]%' then
    new.commentaire := left('[seul décideur] ' || coalesce(new.commentaire, ''), 2000);
  end if;
  perform private.filed_journaliser(v_d.client_id, 'filed.seul_decideur', 'demande', v_d.id::text,
    jsonb_build_object('facture', v_d.objet_id, 'par', new.user_id,
                       'motif', 'Correction pour la reprise approuvée par le seul décideur de l''organisation.'), v_d.entite_id);
  return new;
end $$;

revoke all on function private.filed_reprise_separation(public.demandes_validation, uuid, timestamptz) from public, anon, authenticated;
revoke all on function private.filed_correcteur_n_approuve_pas() from public, anon, authenticated;
