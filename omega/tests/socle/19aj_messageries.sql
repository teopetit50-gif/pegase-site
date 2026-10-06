-- Socle 19aj — les messageries connectées : droits, état OAuth à usage unique, jetons au Vault seulement, reconnexion,
-- « à reconnecter », déconnexion (écran) puis oubli (ouvrier), expéditeur créé puis suspendu. Après le lot 19aj.
-- Client A de tests.jeu() : un gérant (gerant_a) et un collaborateur (user_a). runtests() annule tout (Vault compris).

create or replace function tests.test_socle_19aj_messageries() returns setof text
language plpgsql as $f$
declare
  jeu jsonb; client uuid; gerant uuid; membre uuid;
  v_etat text; v_etat2 text; r jsonb; v_cx uuid; m public.messageries; v_exp public.expediteurs;
  v_renouv uuid; code text;
begin
  perform tests.redevenir_admin();
  jeu := tests.jeu();
  client := (jeu ->> 'client_a')::uuid; gerant := (jeu ->> 'gerant_a')::uuid; membre := (jeu ->> 'user_a')::uuid;

  -- ── Droits ──
  return next ok(not has_table_privilege('authenticated', 'private.messageries_etats', 'select')
                 and not has_table_privilege('anon', 'private.messageries_etats', 'select'),
                 'les états OAuth sont illisibles hors des portes');
  return next ok(not has_column_privilege('authenticated', 'public.messageries', 'secret_renouvellement', 'select')
                 and not has_column_privilege('authenticated', 'public.messageries', 'secret_acces', 'select')
                 and not has_column_privilege('authenticated', 'public.messageries', 'curseur', 'select'),
                 'authenticated ne lit ni les ids Vault ni le curseur');
  return next ok(has_column_privilege('authenticated', 'public.messageries', 'adresse', 'select')
                 and not has_table_privilege('authenticated', 'public.messageries', 'insert')
                 and not has_table_privilege('authenticated', 'public.messageries', 'update')
                 and not has_table_privilege('authenticated', 'public.messageries', 'delete'),
                 'authenticated lit l''adresse et n''écrit jamais');
  return next ok((select relrowsecurity from pg_class where oid = 'public.messageries'::regclass), 'RLS active sur public.messageries');
  return next ok(not has_function_privilege('authenticated', 'public.messagerie_jetons(uuid)', 'execute')
                 and not has_function_privilege('anon', 'public.messagerie_jetons(uuid)', 'execute')
                 and not has_function_privilege('authenticated', 'public.messagerie_enregistrer(text, text, text, text, timestamptz, text[], text)', 'execute')
                 and not has_function_privilege('authenticated', 'public.messagerie_oublier(uuid)', 'execute'),
                 'les portes de l''ouvrier sont fermées à anon et authenticated');
  return next ok(has_function_privilege('authenticated', 'public.messagerie_preparer(uuid, text, text)', 'execute')
                 and not has_function_privilege('anon', 'public.messagerie_preparer(uuid, text, text)', 'execute'),
                 'messagerie_preparer : authenticated oui, anon non');

  -- ── 1. Préparer : gérant seulement, fournisseur connu, retour sur omegaai.fr ──
  perform tests.endosser(membre, 'a2-user-a@essai.invalid');
  begin perform public.messagerie_preparer(client, 'gmail', null); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un collaborateur ne connecte pas de messagerie (42501)');
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  begin perform public.messagerie_preparer(client, 'yahoo', null); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '22023', 'fournisseur inconnu refusé (22023)');
  begin perform public.messagerie_preparer(client, 'gmail', 'https://omegaai.fr.evil.test/x'); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '22023', 'retour hors omegaai.fr refusé : pas de redirection ouverte (22023)');
  v_etat := public.messagerie_preparer(client, 'gmail', 'https://omegaai.fr/espace/messagerie');
  return next ok(v_etat ~ '^[A-Za-z0-9_-]{32,200}$', 'le gérant obtient un état aléatoire');

  -- ── 2. Ouvrir puis enregistrer (ouvrier) ──
  perform tests.endosser_serveur();
  r := public.messagerie_ouvrir(v_etat);
  return next is(r ->> 'fournisseur', 'gmail', 'ouvrir : fournisseur de l''état');
  return next is(r ->> 'retour_ecran', 'https://omegaai.fr/espace/messagerie', 'ouvrir : retour vers l''écran');
  r := public.messagerie_enregistrer(v_etat, 'Compta@Banc.Test', 'renouv-1', 'acces-1', now() + interval '1 hour',
                                     array['https://www.googleapis.com/auth/gmail.readonly'], '500');
  v_cx := (r ->> 'connexion')::uuid;
  return next ok(v_cx is not null, 'enregistrer rend la connexion');
  begin perform public.messagerie_enregistrer(v_etat, 'compta@banc.test', 'x', 'y', now(), '{}', '1'); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, 'P0002', 'l''état est à usage unique (P0002)');
  perform tests.redevenir_admin();
  select * into m from public.messageries where id = v_cx;
  return next is(m.adresse || '/' || m.etat || '/' || m.curseur, 'compta@banc.test/active/500', 'connexion active, adresse en minuscules, curseur posé');
  return next ok(m.secret_renouvellement is not null and m.secret_acces is not null, 'les jetons sont au Vault (ids)');
  return next is((select s.decrypted_secret from vault.decrypted_secrets s where s.id = m.secret_renouvellement), 'renouv-1',
                 'le Vault porte le jeton de renouvellement');
  select * into v_exp from public.expediteurs where id = m.expediteur_id;
  return next is(v_exp.canal || '/' || v_exp.fournisseur || '/' || v_exp.statut || '/' || (v_exp.parametres ->> 'connexion'),
                 'email/gmail/actif/' || v_cx, 'l''expéditeur gmail est actif et porte la connexion');

  -- ── 3. Jetons, accès renouvelé, rotation, curseur, relève ──
  perform tests.endosser_serveur();
  r := public.messagerie_jetons(v_cx);
  return next is(r ->> 'acces' || '/' || (r ->> 'renouvellement'), 'acces-1/renouv-1', 'jetons rendus à l''ouvrier');
  perform public.messagerie_poser_acces(v_cx, 'acces-2', now() + interval '1 hour', null);
  r := public.messagerie_jetons(v_cx);
  return next is(r ->> 'acces' || '/' || (r ->> 'renouvellement'), 'acces-2/renouv-1', 'accès reposé, renouvellement inchangé (Google)');
  perform public.messagerie_poser_acces(v_cx, 'acces-3', now() + interval '1 hour', 'renouv-2');
  r := public.messagerie_jetons(v_cx);
  return next is(r ->> 'renouvellement', 'renouv-2', 'jeton tournant reposé (Microsoft)');
  perform public.messagerie_poser_curseur(v_cx, '510');
  return next ok(exists (select 1 from jsonb_array_elements(public.messagerie_connexions('gmail')) c
                         where c ->> 'connexion' = v_cx::text and c ->> 'curseur' = '510'),
                 'la connexion est à relever, au nouveau curseur');

  -- ── 4. Lecture à l'écran ──
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  return next is((select adresse from public.messageries where id = v_cx), 'compta@banc.test', 'le gérant voit sa messagerie');
  begin perform (select secret_acces from public.messageries where id = v_cx); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'le gérant ne lit pas l''id du secret (42501)');

  -- ── 5. À reconnecter, puis reconnexion de la même boîte ──
  perform tests.endosser_serveur();
  perform public.messagerie_a_reconnecter(v_cx, 'invalid_grant');
  perform tests.redevenir_admin();
  return next is((select etat from public.messageries where id = v_cx), 'a_reconnecter', 'jeton refusé : à reconnecter');
  return next ok(exists (select 1 from public.alertes a where a.client_id = client and a.source = 'messagerie' and not a.interne),
                 'une alerte visible par le client');
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  v_etat2 := public.messagerie_preparer(client, 'gmail', null);
  perform tests.endosser_serveur();
  return next ok(not exists (select 1 from jsonb_array_elements(public.messagerie_connexions('gmail')) c
                             where c ->> 'connexion' = v_cx::text), 'une boîte à reconnecter n''est pas relevée');
  r := public.messagerie_enregistrer(v_etat2, 'compta@banc.test', 'renouv-3', 'acces-4', now() + interval '1 hour', '{}', '900');
  return next is((r ->> 'connexion')::uuid, v_cx, 'reconnexion : même connexion');
  perform tests.redevenir_admin();
  select * into m from public.messageries where id = v_cx;
  return next is(m.etat || '/' || m.curseur, 'active/510', 'reconnectée, curseur de relève conservé (rien perdu ni doublé)');

  -- ── 6. Déconnexion à l'écran, puis oubli par l'ouvrier ──
  perform tests.endosser(membre, 'a2-user-a@essai.invalid');
  begin perform public.messagerie_revoquer(v_cx); code := 'ok';
  exception when others then code := sqlstate; end;
  return next is(code, '42501', 'un collaborateur ne déconnecte pas (42501)');
  perform tests.endosser(gerant, 'a2-gerant-a@essai.invalid');
  r := public.messagerie_revoquer(v_cx);
  perform tests.redevenir_admin();
  return next is((select etat from public.messageries where id = v_cx), 'deconnexion', 'déconnexion : plus de relève ni d''envoi');
  return next is((select statut from public.expediteurs where id = m.expediteur_id), 'suspendu', 'l''expéditeur est suspendu');
  return next ok(exists (select 1 from public.travaux t where t.genre = 'messagerie.revoquer' and t.cle = 'revoquer:' || v_cx::text),
                 'le travail messagerie.revoquer est déposé');
  v_renouv := m.secret_renouvellement;
  perform tests.endosser_serveur();
  r := public.messagerie_oublier(v_cx);
  perform tests.redevenir_admin();
  return next is(r ->> 'renouvellement' || '/' || (r ->> 'fournisseur'), 'renouv-3/gmail', 'oublier rend le jeton à révoquer et le fournisseur');
  select * into m from public.messageries where id = v_cx;
  return next ok(m.etat = 'revoquee' and m.secret_renouvellement is null and m.secret_acces is null and m.curseur is null,
                 'révoquée : plus aucun id de secret ni curseur');
  return next ok(coalesce((select s.decrypted_secret from vault.decrypted_secrets s where s.id = v_renouv), 'efface') = 'efface',
                 'le jeton n''est plus lisible au Vault');

  -- ── 7. verrous_envoi : la boîte connectée passe avant l'expéditeur partagé, à portée égale ──
  return next ok(position('(x.fournisseur in (''gmail'', ''microsoft'')) desc'
                          in pg_get_functiondef('private.verrous_envoi(public.envois, boolean, timestamp with time zone)'::regprocedure)) > 0,
                 'verrous_envoi préfère la boîte connectée');
end $f$;

select * from runtests('tests'::name, '^test_socle_19aj_');
