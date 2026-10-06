-- 19ak_receptions_confidentialite_module.sql — une réception rattachée à un module ne se lit que selon la règle du
-- module (A5, 06/10/2026, demande du coordinateur ; numéroté 19ak car 19ai et 19aj portent déjà les compteurs de
-- facturation et l'export complet).
--
-- Constat : public.receptions et les fichiers <client>/receptions/… du bucket omega-clients se lisent par tout membre
-- de l'organisation (politique de 18a, politique storage « les membres lisent les pièces de leurs organisations »
-- de 19b, qui ne regarde que le préfixe client). Or Tamila (b4_10) fait arriver des avis RPVA en clair dans
-- receptions jusqu'au rattachement : un stagiaire ou un avocat muré les verrait.
--
-- Règle : le module d'une réception est receptions.module, sinon celui de la boîte qui l'a reçue
-- (expediteurs.module, par client, canal et identité). private.reception_lisible(client, module, user) vaut :
--   · vrai sans module ;
--   · private.<module>_peut_lire_reception(client, user) quand cette fonction existe (B4 : tamila_peut_lire_reception) ;
--   · « membre du client » sinon.
-- Elle s'ajoute par deux politiques AS RESTRICTIVE (rien n'est retiré ni remplacé) :
--   · sur public.receptions (SELECT) ;
--   · sur storage.objects (SELECT), pour les seuls chemins <client>/receptions/… du bucket omega-clients : la
--     réception s'y retrouve par le chemin de sa pièce (receptions.pieces[].chemin). Un fichier qui n'appartient à
--     aucune réception garde la règle d'avant.
-- Le service (service_role) contourne la RLS, comme avant : les ouvriers ne changent pas.
-- Idempotent : rejouable sans effet.

-- Le module effectif d'une réception.
create or replace function private.reception_module_effectif(p_client uuid, p_module text, p_canal text, p_boite text)
returns text language sql stable security definer set search_path = '' as $$
  select coalesce(nullif(p_module, ''),
                  (select e.module from public.expediteurs e
                    where e.client_id = p_client and e.canal = p_canal and lower(e.identite) = lower(p_boite)
                    order by e.cree_le limit 1))
$$;

create or replace function private.reception_lisible(p_client uuid, p_module text, p_user uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_fonction regprocedure;
  v_ok boolean;
begin
  -- On ne répond que pour soi : la fonction n'est pas une sonde des droits des autres.
  if auth.uid() is not null and p_user is distinct from auth.uid() then return false; end if;
  if p_user is null then return false; end if;
  if p_module is null then return true; end if;
  if p_module !~ '^[a-z][a-z_]{1,29}$' then return false; end if;
  v_fonction := to_regprocedure(format('private.%I(uuid, uuid)', p_module || '_peut_lire_reception'));
  if v_fonction is not null then
    execute format('select private.%I($1, $2)', p_module || '_peut_lire_reception') into v_ok using p_client, p_user;
    return coalesce(v_ok, false);
  end if;
  return exists (select 1 from public.comptes c where c.user_id = p_user and c.client_id = p_client);
end $$;

-- Un fichier du bucket omega-clients : lisible sauf s'il appartient à une réception qu'on ne peut pas lire.
create or replace function private.reception_objet_lisible(p_nom text, p_user uuid)
returns boolean language plpgsql stable security definer set search_path = '' as $$
declare
  v_client uuid;
begin
  if p_nom !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/receptions/' then return true; end if;
  v_client := substring(p_nom from 1 for 36)::uuid;
  return not exists (
    select 1 from public.receptions r
    where r.client_id = v_client
      and r.pieces @> jsonb_build_array(jsonb_build_object('chemin', p_nom))
      and not private.reception_lisible(r.client_id,
                                        private.reception_module_effectif(r.client_id, r.module, r.canal, r.boite), p_user));
end $$;

-- Les politiques les appellent au nom de l'utilisateur : authenticated les exécute (règle a5_01, source a).
do $$ declare f text; begin
  foreach f in array array['private.reception_module_effectif(uuid, text, text, text)',
                           'private.reception_lisible(uuid, text, uuid)',
                           'private.reception_objet_lisible(text, uuid)'] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated, service_role', f);
  end loop;
end $$;

do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'receptions'
                 and policyname = 'réceptions : confidentialité par module') then
    create policy "réceptions : confidentialité par module" on public.receptions
      as restrictive for select to authenticated
      using (private.reception_lisible(client_id, private.reception_module_effectif(client_id, module, canal, boite), (select auth.uid())));
  end if;
  if to_regclass('storage.objects') is not null
     and not exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                     and policyname = 'réceptions : confidentialité par module (fichiers)') then
    create policy "réceptions : confidentialité par module (fichiers)" on storage.objects
      as restrictive for select to authenticated
      using (bucket_id <> 'omega-clients' or private.reception_objet_lisible(name, (select auth.uid())));
  end if;
end $$;
