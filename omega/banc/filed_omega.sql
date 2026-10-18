-- Banc FILED — Omega, son propre client FILED, SUR LA RECETTE (décision de Teo, 18/10). Posé par le coordinateur.
--
-- Prérequis : l'organisation « omega » créée par A3 ; la boîte factures-omega@recu.omegaai.fr déclarée par A2 pour le
-- module filed (les réceptions de cette boîte portent module = 'filed' : private.filed_rattacher_reception, a4_20, en
-- fait des documents FILED d'Omega dès que FILED y est installé — rien d'autre à brancher).
-- Ce script, idempotent (le rejouer ne crée rien deux fois) :
--   1. retrouve l'organisation par son slug « omega » (colonne slug, sinon config ->> 'slug') ; s'arrête si absente ;
--   2. installe FILED (public.filed_installer : la ligne de réglages de l'organisation, aux valeurs par défaut du socle —
--      tolérance des totaux 0,05 €, fenêtre de doublon 3 jours, etc.) et, choix neutre, ouvre l'exercice civil en cours
--      (1er janvier – 31 décembre) de la société principale s'il n'en existe aucun à cette date ; aucun plan comptable
--      n'est posé (les imputations attendront qu'Omega pose le sien) ;
--   3. pose les fournisseurs attendus : Vercel, Supabase, Scaleway, OVH, Brevo, Meta — nom et pays seulement : leurs
--      SIREN / TVA viendront de leur première facture lue (identité contrôlée comme pour tout fournisseur), plutôt que
--      d'être saisis ici de mémoire ;
--   4. met l'envoi par courriel de FILED en mode essai (réponses aux fournisseurs : rien ne part au vrai destinataire) ;
--   5. dit, par des NOTICE, ce qui est en place et ce qui manque (la boîte d'A2).
-- Rien n'est supprimé.

begin;
set local role service_role;

do $$
declare
  v_cl uuid; v_nom text; v_n integer := 0; v_boite text; f record; v_ent uuid; v_ex boolean := false;
begin
  if exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'clients' and column_name = 'slug') then
    execute 'select id, nom from public.clients where slug = $1' into v_cl, v_nom using 'omega';
  else
    select c.id, c.nom into v_cl, v_nom from public.clients c where c.config ->> 'slug' = 'omega';
  end if;
  if v_cl is null then
    raise exception 'Organisation « omega » introuvable : A3 doit la créer avant ce banc.' using errcode = 'P0002';
  end if;

  -- 2. FILED installé (réglages par défaut) ; l'exercice civil en cours, s'il n'y en a pas.
  perform public.filed_installer(v_cl);
  select e.id into v_ent from public.entites e where e.client_id = v_cl and e.principale;
  if v_ent is not null and not exists (select 1 from public.filed_exercices x where x.client_id = v_cl
       and (x.entite_id = v_ent or x.entite_id is null) and current_date between x.debut and x.fin) then
    perform public.filed_ouvrir_exercice(v_cl, v_ent, date_trunc('year', current_date::timestamp)::date,
                                         (date_trunc('year', current_date::timestamp) + interval '1 year - 1 day')::date, null);
    v_ex := true;
  end if;

  -- 3. Les fournisseurs attendus d'Omega.
  for f in select * from (values
      ('VERCEL',   'Vercel Inc.',                    'US'),
      ('SUPABASE', 'Supabase Inc.',                  'US'),
      ('SCALEWAY', 'Scaleway SAS',                   'FR'),
      ('OVH',      'OVH SAS',                        'FR'),
      ('BREVO',    'Brevo (Sendinblue SAS)',         'FR'),
      ('META',     'Meta Platforms Ireland Limited', 'IE')) t(code, nom, pays)
  loop
    if not exists (select 1 from public.filed_fournisseurs x where x.client_id = v_cl and (x.code = f.code or x.nom = f.nom)) then
      insert into public.filed_fournisseurs (client_id, code, nom, nom_normalise, pays, statut, source)
      values (v_cl, f.code, f.nom, lower(regexp_replace(translate(f.nom, 'éèêàâîôûç', 'eeeaaiouc'), '[^A-Za-z0-9]+', ' ', 'g')), f.pays, 'actif', 'saisie');
      v_n := v_n + 1;
    end if;
  end loop;

  -- 4. Les réponses aux fournisseurs (a4_38) en mode essai : le socle les détourne vers l'adresse d'essai.
  insert into public.reglages_envois (client_id, module, mode, canaux)
  values (v_cl, 'filed', 'essai', array['email'])
  on conflict (client_id, module) do update set mode = 'essai', maj_le = now();

  -- 5. Le constat.
  select e.statut into v_boite from public.expediteurs e where e.client_id = v_cl and e.module = 'filed' and e.identite ilike 'factures-omega@recu.omegaai.fr' limit 1;
  raise notice 'FILED — organisation % (%) : FILED installé ; exercice civil % ; % fournisseur(s) posé(s) (6 attendus au total) ; envois FILED en mode essai.',
    v_nom, v_cl, case when v_ex then 'ouvert' else 'déjà présent' end, v_n;
  raise notice 'FILED — boîte factures-omega@recu.omegaai.fr (module filed) : %.',
    case when v_boite is null then 'PAS ENCORE DÉCLARÉE (A2) — les factures reçues ne seront rattachées qu''une fois la boîte en place'
         when v_boite = 'actif' then 'déclarée, active'
         else format('déclarée, statut « %s » : à activer (A2) pour que les factures arrivent', v_boite) end;
  if not exists (select 1 from public.reglages_envois r where r.client_id = v_cl and r.module = 'filed' and r.essai_adresse is not null)
     and not exists (select 1 from public.reglages_envois r where r.client_id = v_cl and r.module is null and r.essai_adresse is not null) then
    raise notice 'FILED — aucune adresse d''essai posée : les courriels d''essai n''ont nulle part où aller tant qu''un gérant ne la règle pas.';
  end if;
end $$;

reset role;
commit;
