-- ═══════════════════════════════════════════════════════════════════════════
-- CASHD — c2_53 : codes de langue et numéro de facturation contrôlés ; la langue réelle du texte
-- (27/10/2026, session C2 — TNUIT-05, TNUIT-07, contre-recette de nuit du testeur)
-- ═══════════════════════════════════════════════════════════════════════════
-- TNUIT-05 : « es-ES », code courant des exports, tombait sur la contrainte brute cashd_comptes_langue_check ; et une
-- relance d'un compte « pt » ou « de » écrite en anglais portait la langue « pt » ou « de ».
-- TNUIT-07 : un numéro de facturation « abc » était accepté, puis WhatsApp répondait « renseignez d'abord le numéro ».
-- Désormais, à toute écriture d'un compte (saisie, import, modification) :
--   · la langue est ramenée à sa langue principale (es-ES, es_ES, ES → es ; pt-BR → pt) ; un code illisible est refusé
--     avec la raison et un exemple ;
--   · le numéro de facturation compte au moins 9 chiffres et ne porte que chiffres, espaces, +, ., -, ( et ) ; sinon il
--     est refusé à la saisie (avec la raison), et écarté à l'import — la ligne n'est pas perdue, l'organisation est
--     prévenue ;
--   · chaque relance porte la langue de son TEXTE (cashd_relances.langue_texte, et dans la vue cashd_relances_etat) :
--     celle du compte si l'organisation a écrit ce palier dans cette langue, sinon fr / en / es selon les textes par défaut.
--     La langue du compte (cashd_relances.langue) reste celle à laquelle on écrit.
--
-- Règles de pose : rejouable ; jamais de DROP ni de DELETE ; revoke execute de public.

-- Une écriture faite à la main (porte publique cashd_ecrire_compte) : une saisie fausse se refuse ; à l'import, elle
-- s'écarte et se signale, pour ne pas perdre la ligne.
create or replace function private.cashd_en_saisie(p_source text, p_op text)
 returns boolean language sql stable set search_path to ''
as $function$
  select coalesce(current_setting('omega.cashd_saisie', true), '') = 'oui'
         or (p_op = 'INSERT' and coalesce(p_source, 'saisie') = 'saisie')
$function$;

create or replace function public.cashd_ecrire_compte(p_compte uuid, p_client uuid, p_champs jsonb)
 returns uuid language plpgsql security definer set search_path to ''
as $function$
declare v uuid;
begin
  perform set_config('omega.cashd_saisie', 'oui', true);
  v := private.cashd_ecrire_compte(p_compte, p_client, p_champs, 'saisie');
  perform set_config('omega.cashd_saisie', '', true);
  return v;
end $function$;

create or replace function private.cashd_garder_compte()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
declare
  v_brut text;
  v_tel text;
begin
  -- la langue de facturation
  if tg_op = 'INSERT' or new.langue is distinct from old.langue then
    v_brut := btrim(coalesce(new.langue, ''));
    new.langue := lower(split_part(replace(v_brut, '_', '-'), '-', 1));
    if v_brut = '' then
      new.langue := 'fr';
    elsif new.langue !~ '^[a-z]{2}$' then
      if private.cashd_en_saisie(new.source, tg_op) then
        raise exception 'Langue de facturation inconnue : « % ». Donnez son code de deux lettres (fr, en, es, de…), au besoin avec sa région (es-ES).', v_brut
          using errcode = '22023';
      end if;
      perform private.lever_alerte_module(new.client_id, 'cashd', 'attention',
        left(format('Compte %s : langue de facturation illisible (« %s ») à l''import, le français est retenu.', new.nom, v_brut), 200),
        jsonb_build_object('compte', new.reference, 'langue', v_brut), 'compte:langue:' || new.client_id || ':' || new.reference, true, null);
      new.langue := case when tg_op = 'UPDATE' then old.langue else 'fr' end;
    end if;
  end if;
  -- le numéro de facturation
  if tg_op = 'INSERT' or new.contact_facturation_telephone is distinct from old.contact_facturation_telephone then
    v_tel := nullif(btrim(coalesce(new.contact_facturation_telephone, '')), '');
    if v_tel is not null and (v_tel !~ '^\+?[0-9 .()\-]+$' or char_length(regexp_replace(v_tel, '\D', '', 'g')) not between 9 and 15) then
      if private.cashd_en_saisie(new.source, tg_op) then
        raise exception 'Numéro de facturation invalide : « % ». Un numéro compte au moins 9 chiffres, par exemple +590 690 12 34 56.', v_tel
          using errcode = '22023';
      end if;
      perform private.lever_alerte_module(new.client_id, 'cashd', 'attention',
        left(format('Compte %s : numéro de facturation illisible (« %s ») à l''import, il est écarté.', new.nom, v_tel), 200),
        jsonb_build_object('compte', new.reference, 'telephone', v_tel), 'compte:telephone:' || new.client_id || ':' || new.reference, true, null);
      v_tel := null;
    end if;
    new.contact_facturation_telephone := v_tel;
  end if;
  return new;
end $function$;

do $t$
begin
  if not exists (select 1 from pg_trigger where tgname = 'cashd_comptes_aa_garder' and tgrelid = 'public.cashd_comptes'::regclass) then
    create trigger cashd_comptes_aa_garder before insert or update on public.cashd_comptes
      for each row execute function private.cashd_garder_compte();
  end if;
end $t$;

-- La langue du texte d'une relance.
alter table public.cashd_relances add column if not exists langue_texte text;
comment on column public.cashd_relances.langue_texte is 'Langue dans laquelle le texte est écrit (c2_53) : celle du compte si l''organisation a écrit ce palier dans cette langue, sinon fr / en / es.';

create or replace function private.cashd_langue_texte(p_client uuid, p_gabarit text, p_langue text)
 returns text language sql stable security definer set search_path to ''
as $function$
  select case when p_gabarit is not null
                   and exists (select 1 from private.cashd_gabarits_de(p_client) x where x.cle = p_gabarit and x.langue = p_langue and x.actif)
              then p_langue
              when p_langue in ('fr', 'es') then p_langue
              else 'en' end
$function$;

create or replace function private.cashd_relance_langue_texte()
 returns trigger language plpgsql security definer set search_path to ''
as $function$
begin
  if new.corps is not null and (tg_op = 'INSERT' or new.corps is distinct from old.corps or new.gabarit is distinct from old.gabarit or new.langue_texte is null) then
    new.langue_texte := private.cashd_langue_texte(new.client_id, new.gabarit, new.langue);
  end if;
  return new;
end $function$;

do $t$
begin
  if not exists (select 1 from pg_trigger where tgname = 'cashd_relances_aa_langue_texte' and tgrelid = 'public.cashd_relances'::regclass) then
    create trigger cashd_relances_aa_langue_texte before insert or update on public.cashd_relances
      for each row execute function private.cashd_relance_langue_texte();
  end if;
end $t$;

-- Les relances déjà écrites reçoivent la langue de leur texte.
update public.cashd_relances r set langue_texte = private.cashd_langue_texte(r.client_id, r.gabarit, r.langue)
 where r.langue_texte is null and r.corps is not null;

-- La vue des relances (c2_02), avec la langue du texte en dernière colonne.
create or replace view public.cashd_relances_etat with (security_invoker = true) as
 SELECT r.id,
    r.client_id,
    r.entite_id,
    r.compte_id,
    r.jour,
    r.nature,
    r.palier,
    r.langue,
    r.canal,
    r.destinataire_adresse,
    r.destinataire_nom,
    r.sujet,
    r.corps,
    r.montant,
    r.penalites,
    r.indemnites,
    r.statut,
    r.motif,
    r.demande_id,
    r.envoi_id,
    r.prepare_par,
    r.cree_le,
    r.maj_le,
    d.statut AS demande_statut,
    d.decide_le,
    d.politique_id,
    e.statut AS envoi_statut,
    e.mode AS envoi_mode,
    e.envoye_le,
        CASE
            WHEN (EXISTS ( SELECT 1
               FROM cashd_envois_main m
              WHERE m.relance_id = r.id)) THEN 'envoyee'::text
            WHEN r.statut <> 'a_valider'::text THEN r.statut
            WHEN e.statut = 'envoye'::text OR e.envoye_le IS NOT NULL THEN 'envoyee'::text
            WHEN d.statut = 'approuvee'::text THEN 'validee'::text
            WHEN d.statut = 'rejetee'::text THEN 'refusee'::text
            WHEN d.statut = ANY (ARRAY['annulee'::text, 'expiree'::text]) THEN 'coupee'::text
            ELSE 'a_valider'::text
        END AS etat,
    (( SELECT count(*) AS count
           FROM cashd_relances_pieces p
          WHERE p.relance_id = r.id AND NOT p.annulee))::integer AS nb_pieces,
    r.langue_texte
   FROM cashd_relances r
     LEFT JOIN demandes_validation d ON d.id = r.demande_id
     LEFT JOIN envois e ON e.id = r.envoi_id;

-- Le canal WhatsApp d'un compte (c2_51), avec un refus juste quand le numéro manque.
create or replace function public.cashd_canal_compte(p_compte uuid, p_canal text)
 returns jsonb language plpgsql security definer set search_path to ''
as $function$
declare c public.cashd_comptes;
begin
  select * into c from public.cashd_comptes where id = p_compte;
  if c.id is null then
    raise exception 'Compte introuvable.' using errcode = 'P0002';
  end if;
  perform private.cashd_exiger_gestion(c.client_id);
  if p_canal is null or p_canal not in ('email', 'whatsapp') then
    raise exception 'Canal des relances : email ou whatsapp.' using errcode = '22023';
  end if;
  if p_canal = 'whatsapp' and c.contact_facturation_telephone is null then
    raise exception 'Pour relancer par WhatsApp, renseignez d''abord le numéro de facturation du compte.' using errcode = '22023';
  end if;
  update public.cashd_comptes set canal_relance = p_canal, maj_le = now() where id = c.id;
  perform private.journaliser_module(c.client_id, 'cashd', 'cashd.canal_compte', 'cashd_comptes', c.id::text,
    jsonb_build_object('avant', c.canal_relance, 'apres', p_canal, 'par', (select auth.uid())), c.entite_id);
  return jsonb_build_object('compte', c.id, 'canal', p_canal, 'whatsapp_possible', private.cashd_whatsapp_possible(c.id),
    'phrase', case when p_canal = 'whatsapp' and not private.cashd_whatsapp_possible(c.id)
                   then 'Choisi. Tant que le modèle WhatsApp n''est pas validé, ses relances partent par courriel.'
                   when p_canal = 'whatsapp' then 'Ses rappels et relances partiront par WhatsApp ; la mise en demeure, jamais.'
                   else 'Ses relances partent par courriel.' end);
end $function$;

revoke execute on function private.cashd_garder_compte() from public, anon, authenticated;
revoke execute on function private.cashd_en_saisie(text, text) from public, anon, authenticated;
revoke execute on function public.cashd_ecrire_compte(uuid, uuid, jsonb) from public, anon;
grant execute on function public.cashd_ecrire_compte(uuid, uuid, jsonb) to authenticated, service_role;
revoke execute on function private.cashd_langue_texte(uuid, text, text) from public, anon, authenticated;
revoke execute on function private.cashd_relance_langue_texte() from public, anon, authenticated;
revoke execute on function public.cashd_canal_compte(uuid, text) from public, anon;
grant execute on function public.cashd_canal_compte(uuid, text) to authenticated, service_role;
