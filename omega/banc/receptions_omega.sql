-- Boîtes de réception de l'organisation Omega (premier client réel, SUR LA RECETTE ygwbgpowzlbdaajlsqkn) — A2, 18/10/2026.
-- À JOUER PAR LE COORDINATEUR, après la création de l'organisation par A3 (slug « omega »). Idempotent ; aucun DROP ;
-- aucun envoi.
--
-- Une boîte de réception Brevo inbound est une ligne public.expediteurs (canal email, fournisseur brevo,
-- identite = l'adresse) : reception/brevo appelle resoudre_boite('email', <adresse du destinataire>), qui rend
-- client et module de la ligne dont l'identité est l'adresse (même schéma que banc@recu.omegaai.fr, a3630f13).
-- Statut « suspendu » : resoudre_boite la trouve quand même (elle trie seulement l'actif en premier), et aucun
-- envoi ne peut la prendre (on ne SORT pas par recu.omegaai.fr, domaine de réception seulement).
--   · omega@recu.omegaai.fr           → module reput (demandes des clients d'Omega) ;
--   · factures-omega@recu.omegaai.fr  → module filed (factures fournisseurs que Teo fait suivre).
-- Côté Brevo : rien à faire. Le webhook inbound (2225428, domaine omegaai.fr) reçoit tout ce que les MX de
-- recu.omegaai.fr reçoivent, quelle que soit l'adresse ; le tri par adresse se fait ici. Réserve : aucun courriel
-- réel n'est encore passé par cette voie (banc@ non plus) ; le premier envoyé à omega@ en sera la preuve.

-- ───────────────────────────────────────────────────────────────────────────
-- 0. Contrôles (lecture seule)
-- ───────────────────────────────────────────────────────────────────────────
-- Où vit le slug : colonne clients.slug si A3 l'a ajoutée, sinon clients.config ->> 'slug'.
select column_name from information_schema.columns where table_schema = 'public' and table_name = 'clients' and column_name = 'slug';
select id, nom, statut, config ->> 'slug' as slug_config from public.clients
 where config ->> 'slug' = 'omega' or nom ilike 'omega%';
select id, client_id, module, identite, statut from public.expediteurs
 where canal = 'email' and lower(identite) in ('omega@recu.omegaai.fr', 'factures-omega@recu.omegaai.fr');
-- Attendu : une seule organisation « omega » ; aucune ligne d'expéditeur pour ces deux adresses (sinon s'arrêter :
-- une adresse déjà rattachée à un autre client détournerait ses courriels).

-- ───────────────────────────────────────────────────────────────────────────
-- 1. Les deux boîtes
-- ───────────────────────────────────────────────────────────────────────────
do $$
declare
  v_client uuid;
  v_n int;
  v_a_slug boolean := exists (select 1 from information_schema.columns
                              where table_schema = 'public' and table_name = 'clients' and column_name = 'slug');
  b record;
begin
  if v_a_slug then
    execute 'select count(*), min(id::text)::uuid from public.clients where slug = $1' into v_n, v_client using 'omega';
  else
    select count(*), min(id::text)::uuid into v_n, v_client from public.clients where config ->> 'slug' = 'omega';
  end if;
  if v_n <> 1 then
    raise exception 'Organisation au slug « omega » : % trouvée(s), il en faut exactement une. Rien n''est fait.', v_n;
  end if;
  for b in select * from (values ('omega@recu.omegaai.fr', 'reput', 'Omega (réception)'),
                                 ('factures-omega@recu.omegaai.fr', 'filed', 'Omega (factures fournisseurs)')) as t(adresse, module, nom)
  loop
    if exists (select 1 from public.expediteurs x
               where x.canal = 'email' and lower(x.identite) = b.adresse and x.client_id <> v_client) then
      raise exception '% est déjà rattachée à une autre organisation : rien n''est fait.', b.adresse;
    end if;
    insert into public.expediteurs (client_id, module, canal, fournisseur, identite, nom_affiche, parametres, statut)
    select v_client, b.module, 'email', 'brevo', b.adresse, b.nom, '{"reception": "brevo_inbound"}'::jsonb, 'suspendu'
    where not exists (select 1 from public.expediteurs x
                      where x.canal = 'email' and lower(x.identite) = b.adresse and x.client_id = v_client);
  end loop;
  raise notice 'organisation omega : %', v_client;
end $$;

-- ───────────────────────────────────────────────────────────────────────────
-- 2. Vérifier (en rôle service : resoudre_boite exige l'ouvrier)
-- ───────────────────────────────────────────────────────────────────────────
select identite, module, statut, client_id from public.expediteurs
 where canal = 'email' and lower(identite) in ('omega@recu.omegaai.fr', 'factures-omega@recu.omegaai.fr');
-- Attendu : deux lignes, même client_id (omega), reput et filed, suspendu.
-- Puis, après un courriel réel à chaque adresse (une minute) :
select r.canal, r.boite, r.module, r.de_adresse, r.sujet, r.recu_le from public.receptions r
 where lower(r.boite) in ('omega@recu.omegaai.fr', 'factures-omega@recu.omegaai.fr') order by r.recu_le desc limit 5;

-- ───────────────────────────────────────────────────────────────────────────
-- 3. Lien OAuth Gmail rattaché à l'organisation omega (pour la session bureau)
-- ───────────────────────────────────────────────────────────────────────────
-- Le lien porte un état à usage unique créé par public.messagerie_preparer(p_client, 'gmail', p_retour_ecran),
-- au nom d'un gérant ou admin DE CETTE organisation (sinon 42501) ; c'est l'état qui rattache la boîte au client.
-- Le lien : https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/messagerie-oauth/google/debut?etat=<état>
-- (15 minutes, une fois). Écrire ci-dessous l'e-mail de connexion de Teo dans Omega (gérant de l'organisation).
do $$
declare
  v_email text := 'A_ECRIRE@exemple.fr';   -- ← compte Omega de Teo, gérant de l'organisation omega
  v_user uuid := (select id from auth.users where lower(email) = lower('A_ECRIRE@exemple.fr'));
  v_client uuid := (select id from public.clients where config ->> 'slug' = 'omega' limit 1);
  v_etat text;
begin
  v_user := (select id from auth.users where lower(email) = lower(v_email));
  if v_user is null or v_client is null then
    raise exception 'Compte (%) ou organisation omega introuvable : rien n''est fait.', v_email;
  end if;
  perform tests.endosser(v_user, v_email);
  v_etat := public.messagerie_preparer(v_client, 'gmail', null);
  perform tests.redevenir_admin();
  raise notice 'Lien (15 min) : https://ygwbgpowzlbdaajlsqkn.supabase.co/functions/v1/messagerie-oauth/google/debut?etat=%', v_etat;
end $$;
-- Le compte Gmail choisi doit être inscrit comme utilisateur test de l'application Google (régime Test).
-- Si la colonne clients.slug existe (partie 0), remplacer « config ->> 'slug' » par « slug » dans v_client.
