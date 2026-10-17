-- FILED, lot 34 (a4_42) — l'écran d'effacement dit aussi que les fichiers des pièces sont gardés.
--
-- Décision du coordinateur (17/10) : les fichiers des pièces sous conservation légale ne sont pas copiés par FILED ;
-- la préparation de l'effacement (private.preparer_effacement, A5) les exclut, les garde et les liste au manifeste.
-- Le bilan d'a4_40 (private.filed_bilan_effacement, texte repris, gen42.py) le dit : « gardés 10 ans, scellés,
-- exportables ». Migration idempotente ; aucune suppression.

create or replace function private.filed_bilan_effacement(p_client uuid)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_garde jsonb; v_efface jsonb; v_terme date; r record; n bigint;
begin
  perform private.filed_exiger_acteur(p_client, array['gerant', 'admin']);
  select jsonb_build_object(
           'registre', (select count(*) from public.filed_documents d where d.client_id = p_client),
           'archives', (select count(*) from public.filed_archives a where a.client_id = p_client),
           'factures', (select count(*) from public.filed_factures f where f.client_id = p_client),
           'ecritures', (select count(*) from public.filed_ecritures e where e.client_id = p_client))
    into v_garde;
  select max(t) into v_terme from (
    select private.filed_terme_conservation(e.client_id, e.entite_id, e.ecriture_date, e.exercice_id) t from public.filed_ecritures e where e.client_id = p_client
    union all
    select private.filed_terme_conservation(f.client_id, f.entite_id, f.date_emission) from public.filed_factures f where f.client_id = p_client
    union all
    select private.filed_terme_conservation(d.client_id, d.entite_id, (d.recu_le at time zone 'Europe/Paris')::date) from public.filed_documents d where d.client_id = p_client) s;
  v_efface := '{}'::jsonb;
  for r in select t.nom from private.tables_locataires t
            where t.nom like 'filed\_%' and t.nom not in ('filed_documents', 'filed_archives', 'filed_factures', 'filed_ecritures')
              and to_regclass('public.' || t.nom) is not null
            order by t.nom loop
    execute format('select count(*) from public.%I where client_id = $1', r.nom) into n using p_client;
    if n > 0 then v_efface := v_efface || jsonb_build_object(r.nom, n); end if;
  end loop;
  return jsonb_build_object(
    'garde', v_garde,
    'garde_jusqu_au', v_terme,
    'efface', v_efface,
    'fichiers', 'Les fichiers des pièces sont gardés dix ans, scellés, exportables : la préparation de l''effacement les exclut et les liste au manifeste.',
    'texte', concat_ws(' ',
      'Tout ce que FILED tient pour vous est effacé, sauf ce que la loi oblige à garder.',
      format('Le registre des pièces reçues (%s), les archives probantes (%s), les factures (%s), les écritures comptables (%s) et les fichiers des pièces sont gardés 10 ans après la clôture de leur exercice%s,',
             v_garde ->> 'registre', v_garde ->> 'archives', v_garde ->> 'factures', v_garde ->> 'ecritures',
             coalesce(', jusqu''au ' || to_char(v_terme, 'DD/MM/YYYY') || ' au plus tard', '')),
      'scellés (chaque ligne porte l''empreinte de la précédente), hors de votre espace, et exportables sur demande.',
      'Le reste — fournisseurs, imputations, contrôles, réglages, historique de traitement — est effacé.'));
end $$;
