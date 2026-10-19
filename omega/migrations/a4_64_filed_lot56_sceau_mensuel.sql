-- a4_64 (FILED lot 56) : l'envoi mensuel du sceau de l'historique.
--
-- Décision du bureau, par délégation de Teo (19/10/2026, 16 h 14 Z), point 2 : courriel interne au gérant,
-- gabarit fermé, sans pièce jointe, avec un lien vers l'export dans l'espace.
--
--   · Le premier balayage de chaque mois (private.filed_produire_exports, par repère) scelle le mois écoulé de
--     chaque organisation qui a un historique FILED chaîné (a4_46) : le dernier rang du mois, son empreinte, et la
--     vérification de toute la chaîne (private.filed_verifier_historique).
--   · Le sceau est rangé dans public.filed_sceaux (un par organisation et par mois : rejouable), et son export dans
--     public.filed_exports (tableau « sceau_historique », un CSV d'une ligne, avec son empreinte).
--   · Un courriel par gérant (destinataire : le membre ; transactionnel), préparé par private.preparer_envoi, au texte
--     FERMÉ : sujet et corps sont écrits ici (private.filed_gabarit_sceau), aucune saisie n'y entre ; aucune pièce
--     jointe ; le lien mène à l'export dans l'espace (réglage espace_url du socle, /filed/comptabilite?export=<id>).
--     Règle du socle : l'envoi d'un moteur attend la validation d'une personne, sauf accord permanent du gérant
--     couvrant « envoi.email » de FILED ; le sceau ne la contourne pas.
--   · Si l'envoi n'existe pas, échoue ou est verrouillé, rien n'est perdu : le sceau et l'export restent, et une
--     alerte interne le dit au gérant. Une chaîne rompue lève aussi une alerte critique.
-- Rejouable ; aucune suppression.

create table if not exists public.filed_sceaux (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  mois date not null check (mois = date_trunc('month', mois)::date),
  rang bigint,
  empreinte text,
  chaine_intacte boolean,
  verification jsonb not null default '{}',
  export_id uuid references public.filed_exports(id) on delete set null,
  envois jsonb not null default '[]',
  statut text not null default 'scelle' check (statut in ('scelle', 'envoye', 'non_envoye')),
  motif text check (char_length(motif) <= 500),
  cree_le timestamptz not null default now(),
  unique (client_id, mois)
);
comment on table public.filed_sceaux is
  'Lot 56 (a4_64) : le sceau mensuel de l''historique FILED (dernier rang du mois, empreinte, vérification de la chaîne), son export et ses courriels au gérant.';
alter table public.filed_sceaux enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'filed_sceaux' and policyname = 'filed_sceaux_lecture') then
    create policy filed_sceaux_lecture on public.filed_sceaux for select to authenticated
      using (client_id in (select private.mes_clients()));
  end if;
end $$;
revoke all on public.filed_sceaux from anon, authenticated;
grant select on public.filed_sceaux to authenticated;
grant all on public.filed_sceaux to service_role;
insert into private.tables_locataires (nom, ordre_effacement, note)
select 'filed_sceaux', 1, 'FILED, lot 56' where not exists (select 1 from private.tables_locataires where nom = 'filed_sceaux');
insert into private.tables_objets (nom, objet_type, colonne, ordre_effacement)
select 'filed_sceaux', 'filed_sceau', 'id', 90 where not exists (select 1 from private.tables_objets where nom = 'filed_sceaux');

-- ─── Le gabarit fermé : sujet et corps, sans aucune saisie ───────────────────
create or replace function private.filed_mois_texte(p_mois date)
returns text language sql immutable set search_path to '' as $$
  select (array['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'])
         [extract(month from p_mois)::int] || ' ' || extract(year from p_mois)::int
$$;
create or replace function private.filed_gabarit_sceau(p_organisation text, p_mois date, p_rang bigint, p_empreinte text,
                                                       p_intacte boolean, p_rompue_au bigint, p_lien text)
returns jsonb language sql stable set search_path to '' as $$
  select jsonb_build_object(
    'sujet', format('FILED — sceau de l''historique, %s', private.filed_mois_texte(p_mois)),
    'corps', format(E'Bonjour,\n\nVoici le sceau mensuel de l''historique FILED de %s pour %s.\n\n'
                    'Dernier rang : %s\nEmpreinte : %s\nChaîne vérifiée le %s : %s\n\n'
                    'Conservez ce courriel hors d''Omega : une vérification ultérieure qui retrouve cette empreinte prouve '
                    'qu''aucune ligne antérieure n''a été réécrite.\n\nL''export du sceau, dans votre espace : %s\n\n'
                    'Ce message part automatiquement au gérant, une fois par mois. Il ne contient aucune pièce jointe.',
                    coalesce(p_organisation, 'votre organisation'), private.filed_mois_texte(p_mois),
                    coalesce(p_rang::text, 'aucune ligne chaînée'), coalesce(p_empreinte, '—'),
                    to_char(now() at time zone 'Europe/Paris', 'DD/MM/YYYY'),
                    case when p_intacte then 'intacte' else format('ROMPUE au rang %s, voyez l''alerte dans votre espace', coalesce(p_rompue_au::text, '?')) end,
                    p_lien))
$$;
revoke all on function private.filed_gabarit_sceau(text, date, bigint, text, boolean, bigint, text), private.filed_mois_texte(date)
  from public, anon, authenticated;
grant execute on function private.filed_gabarit_sceau(text, date, bigint, text, boolean, bigint, text), private.filed_mois_texte(date) to service_role;

-- ─── Sceller un mois d'une organisation ───────────────────────────────────
create or replace function private.filed_sceller_mois(p_client uuid, p_mois date)
returns uuid language plpgsql security definer set search_path to '' as $$
declare
  v_mois date := date_trunc('month', p_mois)::date;
  v_id uuid;
  v_h public.filed_historique;
  v_verif jsonb;
  v_nb integer;
  v_csv text;
  v_export uuid;
  v_lien text;
  v_org text;
  v_g jsonb;
  v_envois jsonb := '[]';
  v_envoi uuid;
  v_estatut text; v_everrou text; v_emotif text;
  v_motifs text[] := '{}';
  r record;
begin
  if exists (select 1 from public.filed_sceaux s where s.client_id = p_client and s.mois = v_mois) then
    return (select s.id from public.filed_sceaux s where s.client_id = p_client and s.mois = v_mois);
  end if;
  select * into v_h from public.filed_historique h
   where h.client_id = p_client and h.rang is not null and h.survenu_le < (v_mois + interval '1 month')
   order by h.rang desc limit 1;
  if v_h.id is null then
    return null;   -- rien de chaîné à la fin de ce mois : pas de sceau
  end if;
  v_verif := private.filed_verifier_historique(p_client);
  select count(*) into v_nb from public.filed_historique h
   where h.client_id = p_client and h.rang is not null and h.survenu_le >= v_mois and h.survenu_le < (v_mois + interval '1 month');
  select c.nom into v_org from public.clients c where c.id = p_client;

  insert into public.filed_sceaux (client_id, mois, rang, empreinte, chaine_intacte, verification)
  values (p_client, v_mois, v_h.rang, v_h.empreinte, coalesce((v_verif ->> 'intacte')::boolean, false), v_verif)
  returning id into v_id;

  v_csv := E'mois;dernier_rang;empreinte;lignes_du_mois;chaine;verifie_le\n'
        || format(E'%s;%s;%s;%s;%s;%s\n', to_char(v_mois, 'YYYY-MM'), v_h.rang, v_h.empreinte, v_nb,
                  case when (v_verif ->> 'intacte')::boolean then 'intacte' else 'rompue au rang ' || coalesce(v_verif ->> 'rompue_au_rang', '?') end,
                  to_char(now() at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'));
  insert into public.filed_exports (client_id, tableau, du, au, nb_lignes, sha256, contenu)
  values (p_client, 'sceau_historique', v_mois, (v_mois + interval '1 month' - interval '1 day')::date, 1,
          encode(sha256(convert_to(v_csv, 'UTF8')), 'hex'), v_csv)
  returning id into v_export;
  v_lien := rtrim(coalesce((select g.valeur from private.reglages g where g.cle = 'espace_url'), 'https://app.omegaai.fr/espace'), '/')
            || '/filed/comptabilite?export=' || v_export::text;
  v_g := private.filed_gabarit_sceau(v_org, v_mois, v_h.rang, v_h.empreinte, coalesce((v_verif ->> 'intacte')::boolean, false),
                                     (v_verif ->> 'rompue_au_rang')::bigint, v_lien);

  -- Un courriel par gérant, au texte fermé, sans pièce jointe. Le destinataire est le membre (le socle prend son
  -- adresse) ; le message est transactionnel. Comme tout envoi d'un moteur, le socle le soumet à une personne, sauf
  -- accord permanent du gérant couvrant « envoi.email » de FILED.
  for r in select c.user_id from public.comptes c where c.client_id = p_client and c.role = 'gerant' order by c.user_id loop
    v_envoi := null; v_estatut := null; v_everrou := null; v_emotif := null;
    if to_regprocedure('private.preparer_envoi(uuid,text,text,text,text,jsonb,text,jsonb,text,text,uuid[],text,uuid,boolean,boolean,timestamp with time zone,jsonb)') is null then
      v_motifs := v_motifs || 'l''envoi par courriel n''existe pas sur cette base'::text;
    else
      begin
        execute 'select private.preparer_envoi($1, ''filed'', ''filed_sceau'', $2, ''email'', $3, null, ''{}''::jsonb, $4, $5, null::uuid[], $6, null, true, false, $7, ''{}''::jsonb)'
          into v_envoi
          using p_client, v_id::text, jsonb_build_object('membre', r.user_id),
                v_g ->> 'sujet', v_g ->> 'corps', 'filed:sceau:' || v_id::text || ':' || r.user_id::text, now() + interval '7 days';
        execute 'select statut, verrou, motif from public.envois where id = $1' into v_estatut, v_everrou, v_emotif using v_envoi;
        if v_estatut = 'bloque' then
          v_motifs := v_motifs || format('courriel verrouillé (%s%s)', coalesce(v_everrou, 'bloqué'), coalesce(' : ' || v_emotif, ''));
        end if;
      exception when others then
        v_motifs := v_motifs || left('courriel non préparé : ' || sqlerrm, 200);
      end;
    end if;
    v_envois := v_envois || jsonb_build_object('gerant', r.user_id, 'envoi', v_envoi, 'statut', v_estatut);
  end loop;
  if jsonb_array_length(v_envois) = 0 then
    v_motifs := v_motifs || 'aucun gérant avec une adresse'::text;
  end if;

  update public.filed_sceaux
     set export_id = v_export, envois = v_envois,
         statut = case when cardinality(v_motifs) = 0 then 'envoye' else 'non_envoye' end,
         motif = case when cardinality(v_motifs) > 0 then left(array_to_string(v_motifs, ' ; '), 500) end
   where id = v_id;
  perform private.filed_historiser(p_client, null, 'filed_sceau', v_id::text, 'sceau',
    format('Sceau de %s : rang %s, chaîne %s.', private.filed_mois_texte(v_mois), v_h.rang,
           case when (v_verif ->> 'intacte')::boolean then 'intacte' else 'ROMPUE' end),
    jsonb_build_object('sceau', v_id, 'export', v_export, 'envois', v_envois));
  if cardinality(v_motifs) > 0 then
    perform private.lever_alerte_module(p_client, 'filed', 'attention',
      left(format('Le sceau de %s n''a pas pu vous être envoyé (%s). Il est rangé dans vos exports.', private.filed_mois_texte(v_mois),
                  array_to_string(v_motifs, ' ; ')), 200),
      jsonb_build_object('sceau', v_id, 'export', v_export, 'lien', v_lien), 'sceau:' || v_id::text, true, null);
  end if;
  if not coalesce((v_verif ->> 'intacte')::boolean, false) then
    perform private.lever_alerte_module(p_client, 'filed', 'critique',
      left(format('Historique FILED : chaîne rompue au rang %s (sceau de %s).', coalesce(v_verif ->> 'rompue_au_rang', '?'),
                  private.filed_mois_texte(v_mois)), 200),
      jsonb_build_object('sceau', v_id, 'verification', v_verif), 'sceau:rompue:' || p_client::text, true, null);
  end if;
  return v_id;
end $$;
revoke all on function private.filed_sceller_mois(uuid, date) from public, anon, authenticated;
grant execute on function private.filed_sceller_mois(uuid, date) to service_role;

-- Le mois écoulé de chaque organisation, au premier balayage du mois (rejouable : un sceau par mois).
create or replace function private.filed_sceller_mois_ecoule(p_aujourdhui date default current_date)
returns integer language plpgsql security definer set search_path to '' as $$
declare r record; n integer := 0; v_mois date := (date_trunc('month', p_aujourdhui) - interval '1 month')::date;
begin
  for r in select distinct h.client_id from public.filed_historique h
            where h.rang is not null and h.survenu_le < date_trunc('month', p_aujourdhui)
              and not exists (select 1 from public.filed_sceaux s where s.client_id = h.client_id and s.mois = v_mois) loop
    begin
      if private.filed_sceller_mois(r.client_id, v_mois) is not null then n := n + 1; end if;
    exception when others then
      raise warning 'FILED : sceau de % non fait pour % (%)', v_mois, r.client_id, sqlerrm;
    end;
  end loop;
  return n;
end $$;
revoke all on function private.filed_sceller_mois_ecoule(date) from public, anon, authenticated;
grant execute on function private.filed_sceller_mois_ecoule(date) to service_role;

-- ─── Branchement dans le balayage quotidien, avant la purge du dépôt légal ───
do $do$
declare
  v_def text;
  v_repere constant text := E'  -- Le dépôt légal échu (a4_41)';
  v_n int;
begin
  v_def := pg_get_functiondef('private.filed_produire_exports(date)'::regprocedure);
  if position('filed_sceller_mois_ecoule' in v_def) > 0 then
    return;
  end if;
  v_n := (length(v_def) - length(replace(v_def, v_repere, ''))) / length(v_repere);
  if v_n <> 1 then
    raise exception 'a4_64 : repère de filed_produire_exports trouvé % fois (1 attendu)', v_n;
  end if;
  execute replace(v_def, v_repere,
    E'  -- a4_64 : le sceau du mois écoulé, envoyé au gérant ; un échec n''empêche pas les exports.\n'
    || E'  begin\n    perform private.filed_sceller_mois_ecoule(p_aujourdhui);\n'
    || E'  exception when others then\n    raise warning ''FILED : sceau mensuel non fait (%)'', sqlerrm;\n  end;\n'
    || v_repere);
end $do$;
