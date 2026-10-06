-- b6_20 — DALIRO : la signature du client sur le téléphone du chef d'équipe (session B6, 06/10/2026)
--
-- CE QUE ÇA CORRIGE. La page /secteurs/btp promet « les travaux supplémentaires signés avant exécution ». Jusqu'ici
-- l'avenant validé se signait au bureau (btp_signer_avenant, avec la pièce signée scannée). Sur le chantier, le
-- maître d'ouvrage est là, le chef d'équipe a son téléphone : c'est là que l'accord doit se prendre.
--
-- CE QUI EST POSÉ.
--   · public.btp_signatures : une demande de signature d'un avenant validé. Le document (chantier, maître d'ouvrage,
--     lignes, total HT) est figé à la préparation, avec son empreinte SHA-256. Le lien porte un jeton aléatoire
--     (deux UUID v4, 244 bits) ; la base n'en garde que l'empreinte. Usage unique, 72 h par défaut (1 à 168 h).
--     À la signature : nom et qualité du signataire, mention « lu et approuvé », tracé de la signature (PNG),
--     horodatage du serveur, appareil (navigateur), empreinte du tracé et empreinte de preuve qui scelle le tout.
--   · public.btp_preparer_signature(avenant, heures) : le bureau (gérant, admin, valideur qui voit les prix) prépare
--     le lien ; un lien encore ouvert pour le même avenant est annulé. Le jeton n'est rendu qu'une fois.
--   · public.btp_lire_a_signer(jeton) et public.btp_signer_sur_place(jeton, …) : SANS COMPTE (anon) — c'est le
--     téléphone du chef d'équipe, tendu au client. Seul le jeton ouvre ; aucune autre donnée n'est lisible.
--     Avant de signer, la base recalcule l'empreinte de l'avenant : s'il a changé, le lien est annulé.
--     Signé : l'avenant passe « signé » comme par btp_signer_avenant (demande du socle exécutée, journal,
--     événement daliro.avenant_signe), signe_libelle « Signé sur place par … ».
--   · public.btp_annuler_signature(signature) ; public.btp_preuve_signature(avenant) : la trace complète, pour le bureau.
--
-- VALEUR. C'est une signature électronique simple (règlement eIDAS, art. 25 ; Code civil, art. 1366 et 1367) :
-- recevable comme preuve, sans la présomption de fiabilité réservée à la signature qualifiée (décret 2017-1416).
-- L'écrit qu'exige l'article 1793 du Code civil pour un supplément au forfait peut être électronique (art. 1366).
--
-- Règles de pose : create … if not exists / create or replace ; rien n'est retiré ni effacé.
-- EXCEPTION AUX DROITS, À VALIDER PAR LE COORDINATEUR : btp_lire_a_signer et btp_signer_sur_place sont exécutables
-- par anon (le seul secret est le jeton).

create table if not exists public.btp_signatures (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  chantier_id uuid not null,
  entite_id uuid not null,
  avenant_id uuid not null,
  document jsonb not null,
  empreinte text not null,
  jeton_empreinte text not null,
  statut text not null default 'ouverte',
  expire_le timestamptz not null,
  prepare_par uuid,
  prepare_le timestamptz not null default now(),
  signataire_nom text,
  signataire_qualite text,
  lu_approuve boolean,
  trace text,
  trace_empreinte text,
  appareil text,
  signee_le timestamptz,
  preuve_empreinte text,
  annulee_motif text,
  maj_le timestamptz not null default now(),
  constraint btp_signatures_client_id_id_key unique (client_id, id),
  constraint btp_signatures_jeton_key unique (jeton_empreinte),
  constraint btp_signatures_chantier_fkey foreign key (client_id, chantier_id) references public.btp_chantiers(client_id, id) on delete cascade,
  constraint btp_signatures_avenant_fkey foreign key (client_id, avenant_id) references public.btp_avenants(client_id, id) on delete cascade,
  constraint btp_signatures_statut_check check (statut in ('ouverte', 'signee', 'annulee')),
  constraint btp_signatures_signee_check check (statut <> 'signee' or (signee_le is not null and signataire_nom is not null and trace is not null and lu_approuve)),
  constraint btp_signatures_nom_check check (char_length(signataire_nom) <= 120),
  constraint btp_signatures_qualite_check check (char_length(signataire_qualite) <= 120),
  constraint btp_signatures_trace_check check (char_length(trace) <= 400000),
  constraint btp_signatures_appareil_check check (char_length(appareil) <= 300),
  constraint btp_signatures_motif_check check (char_length(annulee_motif) <= 300)
);
comment on table public.btp_signatures is 'DALIRO — signature sur place d''un avenant : document figé, empreintes, trace. Écrite par les portes seules.';
create index if not exists btp_signatures_avenant_idx on public.btp_signatures (avenant_id, statut);
alter table public.btp_signatures enable row level security;
do $do$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'btp_signatures' and policyname = 'qui voit les prix lit les signatures') then
    create policy "qui voit les prix lit les signatures" on public.btp_signatures
      for select to authenticated
      using (client_id in (select private.mes_clients()) and private.voit_entite(client_id, entite_id) and private.btp_voit_prix(client_id));
  end if;
end $do$;
revoke all on table public.btp_signatures from anon, authenticated;
grant select on table public.btp_signatures to authenticated;
do $do$ begin
  if to_regclass('private.tables_locataires') is not null then
    begin
      execute $q$insert into private.tables_locataires (nom) select x from unnest(array['btp_signatures']) x
               where not exists (select 1 from private.tables_locataires t where t.nom = x)$q$;
    exception when others then raise notice 'tables_locataires : % (à inscrire à la main)', sqlerrm; end;
  end if;
end $do$;

-- ─────────────────────────────────────────────────────────────────────────
-- Le document signé : ce que le client lit, figé, et son empreinte
-- ─────────────────────────────────────────────────────────────────────────
create or replace function private.btp_document_avenant(p_avenant uuid)
 returns jsonb
 language sql
 stable
 security definer
 set search_path to ''
as $function$
  select jsonb_build_object(
    'type', 'avenant',
    'entreprise', (select k.nom from public.clients k where k.id = a.client_id),
    'chantier', jsonb_build_object('nom', c.nom, 'adresse', c.adresse, 'code_postal', c.code_postal, 'commune', c.commune),
    'maitre_ouvrage', (select t.nom from public.btp_tiers t where t.id = coalesce(c.maitre_ouvrage_id, c.donneur_ordre_id)),
    'numero', a.numero,
    'objet', a.objet,
    'regime_tva', c.regime_tva,
    'lignes', coalesce((select jsonb_agg(jsonb_build_object('designation', l.designation, 'unite', l.unite, 'quantite', l.quantite,
                                                            'prix_unitaire_ht', l.prix_unitaire_ht, 'montant_ht', l.montant_ht)
                                         order by l.ordre, l.cree_le, l.id)
                        from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree), '[]'::jsonb),
    'total_ht', (select coalesce(sum(l.montant_ht), 0) from public.btp_avenants_lignes l where l.avenant_id = a.id and not l.retiree))
  from public.btp_avenants a join public.btp_chantiers c on c.id = a.chantier_id
  where a.id = p_avenant
$function$;

create or replace function private.btp_empreinte(p_texte text)
 returns text
 language sql
 immutable
 set search_path to ''
as $function$ select encode(sha256(convert_to(p_texte, 'UTF8')), 'hex') $function$;

-- Le lien encore valable derrière un jeton (null sinon). Verrouillé pour la signature.
create or replace function private.btp_signature_par_jeton(p_jeton text)
 returns public.btp_signatures
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_signatures;
begin
  if p_jeton is null or p_jeton !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  select * into s from public.btp_signatures where jeton_empreinte = private.btp_empreinte(p_jeton) for update;
  if not found or s.statut <> 'ouverte' or s.expire_le <= now() then
    return null;
  end if;
  return s;
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Préparer le lien (le bureau)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_preparer_signature(p_avenant uuid, p_heures integer default 72)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  a public.btp_avenants;
  v_demande text;
  v_doc jsonb;
  v_jeton text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  v_id uuid;
  v_expire timestamptz;
begin
  select * into a from public.btp_avenants where id = p_avenant for update;
  if not found then
    raise exception 'Avenant introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(a.client_id, a.entite_id);
  select d.statut into v_demande from public.demandes_validation d where d.id = a.demande_id;
  if a.statut <> 'soumis' or v_demande is distinct from 'approuvee' then
    raise exception 'Seul un avenant validé, pas encore signé, se fait signer sur place.' using errcode = '23514';
  end if;
  if p_heures is null or p_heures < 1 or p_heures > 168 then
    raise exception 'Un lien de signature vaut de 1 à 168 heures.' using errcode = '22023';
  end if;
  v_doc := private.btp_document_avenant(a.id);
  if (v_doc ->> 'total_ht')::numeric = 0 or jsonb_array_length(v_doc -> 'lignes') = 0 then
    raise exception 'L''avenant n''a aucune ligne chiffrée.' using errcode = '23514';
  end if;
  update public.btp_signatures set statut = 'annulee', annulee_motif = 'Remplacé par un nouveau lien', maj_le = now()
  where avenant_id = a.id and statut = 'ouverte';
  v_expire := now() + make_interval(hours => p_heures);
  insert into public.btp_signatures (client_id, chantier_id, entite_id, avenant_id, document, empreinte, jeton_empreinte, expire_le, prepare_par)
  values (a.client_id, a.chantier_id, a.entite_id, a.id, v_doc, private.btp_empreinte(v_doc::text), private.btp_empreinte(v_jeton),
          v_expire, (select auth.uid()))
  returning id into v_id;
  perform private.journaliser(a.client_id, 'daliro.signature_preparee', 'btp_avenants', a.id::text,
    jsonb_build_object('signature', v_id, 'expire_le', v_expire, 'empreinte', private.btp_empreinte(v_doc::text)), a.entite_id);
  return jsonb_build_object('signature_id', v_id, 'jeton', v_jeton, 'lien', '/signer/' || v_jeton, 'expire_le', v_expire,
                            'empreinte', private.btp_empreinte(v_doc::text));
end $function$;

create or replace function public.btp_annuler_signature(p_signature uuid, p_motif text default null)
 returns void
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_signatures;
begin
  select * into s from public.btp_signatures where id = p_signature for update;
  if not found then
    raise exception 'Lien de signature introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(s.client_id, s.entite_id);
  if s.statut <> 'ouverte' then
    raise exception 'Ce lien n''est plus ouvert.' using errcode = '23514';
  end if;
  update public.btp_signatures set statut = 'annulee', annulee_motif = left(coalesce(nullif(btrim(p_motif), ''), 'Annulé par le bureau'), 300), maj_le = now()
  where id = s.id;
  perform private.journaliser(s.client_id, 'daliro.signature_annulee', 'btp_avenants', s.avenant_id::text,
    jsonb_build_object('signature', s.id, 'motif', p_motif), s.entite_id);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Sur le téléphone : lire, puis signer (sans compte)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.btp_lire_a_signer(p_jeton text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_signatures;
begin
  s := private.btp_signature_par_jeton(p_jeton);
  if s.id is null then
    raise exception 'Ce lien de signature n''est plus valable : demandez-en un nouveau au bureau.' using errcode = 'P0002';
  end if;
  return jsonb_build_object('document', s.document, 'empreinte', s.empreinte, 'expire_le', s.expire_le);
end $function$;

create or replace function public.btp_signer_sur_place(p_jeton text, p_nom text, p_qualite text, p_trace text,
                                                       p_lu_approuve boolean, p_appareil text default null)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  s public.btp_signatures;
  a public.btp_avenants;
  d public.demandes_validation;
  v_nom text := btrim(coalesce(p_nom, ''));
  v_qualite text := left(nullif(btrim(coalesce(p_qualite, '')), ''), 120);
  v_maintenant timestamptz := now();
  v_trace_empreinte text;
  v_preuve text;
  v_libelle text;
begin
  s := private.btp_signature_par_jeton(p_jeton);
  if s.id is null then
    raise exception 'Ce lien de signature n''est plus valable : demandez-en un nouveau au bureau.' using errcode = 'P0002';
  end if;
  if char_length(v_nom) < 2 or char_length(v_nom) > 120 then
    raise exception 'Votre nom et prénom sont nécessaires.' using errcode = '22023';
  end if;
  if p_lu_approuve is not true then
    raise exception 'Cochez « Lu et approuvé » pour signer.' using errcode = '22023';
  end if;
  if p_trace is null or p_trace !~ '^data:image/png;base64,[A-Za-z0-9+/=]+$' or char_length(p_trace) < 200 or char_length(p_trace) > 400000 then
    raise exception 'La signature tracée est vide ou illisible : signez dans le cadre.' using errcode = '22023';
  end if;

  select * into a from public.btp_avenants where id = s.avenant_id for update;
  select * into d from public.demandes_validation where id = a.demande_id;
  if a.statut <> 'soumis' or d.statut is distinct from 'approuvee'
     or private.btp_empreinte(private.btp_document_avenant(a.id)::text) <> s.empreinte then
    update public.btp_signatures set statut = 'annulee', annulee_motif = 'L''avenant a changé depuis la préparation du lien', maj_le = now()
    where id = s.id;
    perform private.journaliser(s.client_id, 'daliro.signature_annulee', 'btp_avenants', a.id::text,
      jsonb_build_object('signature', s.id, 'motif', 'avenant changé'), s.entite_id);
    return jsonb_build_object('signee', false, 'message', 'L''avenant a changé depuis la préparation du lien : rien n''est signé. Demandez un nouveau lien au bureau.');
  end if;

  v_trace_empreinte := private.btp_empreinte(p_trace);
  v_preuve := private.btp_empreinte(s.empreinte || '|' || v_nom || '|' || coalesce(v_qualite, '') || '|'
                                     || to_char(v_maintenant at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || v_trace_empreinte);
  update public.btp_signatures
     set statut = 'signee', signataire_nom = v_nom, signataire_qualite = v_qualite, lu_approuve = true,
         trace = p_trace, trace_empreinte = v_trace_empreinte, appareil = left(nullif(btrim(p_appareil), ''), 300),
         signee_le = v_maintenant, preuve_empreinte = v_preuve, maj_le = now()
   where id = s.id;

  -- L'avenant est signé, comme par btp_signer_avenant.
  v_libelle := left('Signé sur place par ' || v_nom || coalesce(' (' || v_qualite || ')', ''), 200);
  perform set_config('daliro.porte', 'signer', true);
  update public.btp_avenants
     set statut = 'signe', signe_le = (v_maintenant at time zone 'Europe/Paris')::date, signe_par = null, signe_libelle = v_libelle
   where id = a.id;
  perform set_config('daliro.porte', '', true);
  update public.demandes_validation set statut = 'executee' where id = d.id and statut = 'approuvee';
  perform private.journaliser(a.client_id, 'daliro.avenant_signe', 'btp_avenants', a.id::text,
    jsonb_build_object('demande', d.id, 'signe_le', (v_maintenant at time zone 'Europe/Paris')::date, 'total_ht', s.document -> 'total_ht',
                       'sur_place', true, 'signature', s.id, 'signataire', v_nom, 'preuve', v_preuve), a.entite_id);
  perform private.publier_evenement(a.client_id, 'daliro.avenant_signe',
    jsonb_build_object('avenant', a.id, 'chantier', a.chantier_id, 'marche', a.marche_id, 'total_ht', s.document -> 'total_ht', 'sur_place', true),
    'avenant:' || a.id::text);
  return jsonb_build_object('signee', true, 'signee_le', v_maintenant, 'empreinte', s.empreinte, 'preuve', v_preuve,
                            'message', format('Avenant n° %s signé le %s.', a.numero, to_char(v_maintenant at time zone 'Europe/Paris', 'DD/MM/YYYY à HH24:MI')));
end $function$;

-- La trace, pour le bureau qui voit les prix.
create or replace function public.btp_preuve_signature(p_avenant uuid)
 returns jsonb
 language plpgsql
 stable
 security definer
 set search_path to ''
as $function$
declare
  a public.btp_avenants;
begin
  select * into a from public.btp_avenants where id = p_avenant;
  if not found then
    raise exception 'Avenant introuvable.' using errcode = 'P0002';
  end if;
  perform private.btp_exiger_bureau(a.client_id, a.entite_id);
  return (select jsonb_build_object('signature_id', s.id, 'statut', s.statut, 'document', s.document, 'empreinte', s.empreinte,
                                    'expire_le', s.expire_le, 'prepare_le', s.prepare_le, 'signataire_nom', s.signataire_nom,
                                    'signataire_qualite', s.signataire_qualite, 'lu_approuve', s.lu_approuve, 'trace', s.trace,
                                    'trace_empreinte', s.trace_empreinte, 'appareil', s.appareil, 'signee_le', s.signee_le,
                                    'preuve_empreinte', s.preuve_empreinte, 'annulee_motif', s.annulee_motif)
          from public.btp_signatures s where s.avenant_id = a.id order by s.prepare_le desc limit 1);
end $function$;

-- ─────────────────────────────────────────────────────────────────────────
-- Droits (à inscrire dans omega/a5_01_liste_figee.txt)
-- ─────────────────────────────────────────────────────────────────────────
revoke execute on function private.btp_document_avenant(uuid) from public, anon, authenticated;
revoke execute on function private.btp_empreinte(text) from public, anon, authenticated;
revoke execute on function private.btp_signature_par_jeton(text) from public, anon, authenticated;
grant execute on function private.btp_document_avenant(uuid) to service_role;
grant execute on function private.btp_empreinte(text) to service_role;
grant execute on function private.btp_signature_par_jeton(text) to service_role;

revoke execute on function public.btp_preparer_signature(uuid, integer) from public, anon;
revoke execute on function public.btp_annuler_signature(uuid, text) from public, anon;
revoke execute on function public.btp_preuve_signature(uuid) from public, anon;
grant execute on function public.btp_preparer_signature(uuid, integer) to authenticated, service_role;
grant execute on function public.btp_annuler_signature(uuid, text) to authenticated, service_role;
grant execute on function public.btp_preuve_signature(uuid) to authenticated, service_role;

-- L'exception : le téléphone du chantier, sans compte. Le jeton seul ouvre.
revoke execute on function public.btp_lire_a_signer(text) from public;
revoke execute on function public.btp_signer_sur_place(text, text, text, text, boolean, text) from public;
grant execute on function public.btp_lire_a_signer(text) to anon, authenticated, service_role;
grant execute on function public.btp_signer_sur_place(text, text, text, text, boolean, text) to anon, authenticated, service_role;
