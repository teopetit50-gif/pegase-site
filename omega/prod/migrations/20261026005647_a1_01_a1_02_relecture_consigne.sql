-- 20261026005647 a1_01_a1_02_relecture_consigne
-- Source : dépôt : 971aec0c58e7713f0cf5d7087cef696c7cf069a3 omega/modules/socle/migrations/a1_01_relecture_consigne.sql ; 971aec0c58e7713f0cf5d7087cef696c7cf069a3 omega/migrations/a1_02_filed_relecture_reprise.sql.
-- Assemblé par omega/prod/assembler.mjs pour la production (noepmkkplxshjbmqqxft). Transformations : fichiers : a1_01_relecture_consigne.sql @ 971aec0c58e7713f0cf5d7087cef696c7cf069a3, a1_02_filed_relecture_reprise.sql @ 971aec0c58e7713f0cf5d7087cef696c7cf069a3.
-- ═══ omega/modules/socle/migrations/a1_01_relecture_consigne.sql @ 971aec0c58e7713f0cf5d7087cef696c7cf069a3
-- a1_01_relecture_consigne.sql — la porte du lecteur pour relire une pièce avec une consigne (A1, 25/10/2026 ;
-- format validé par le coordinateur et A4 le 25/10, 01 h 20 Z ; reprise après refus, socle 19az).
--
--   · private.lecteur_relire(piece, consigne, origine) : la pièce repasse « recue » et un travail lecteur.lire est
--     déposé avec {piece, consigne, essai}, sous la clé « relire:<piece>:<n> ». Le lecteur donne la consigne au modèle
--     en « Indication du valideur » (jamais une valeur : chaque citation reste vérifiée sur la page) et rend une
--     version « …+c<n> » : la clé de piece_lue change, les modules abonnés la reçoivent de nouveau.
--   · Le travail ordinaire « piece:<id> » que le déclencheur demander_lecture dépose au retour à « recue » est clos
--     aussitôt (remplacé par la relecture) : la pièce n'est jamais relue sans sa consigne.
--   · private.relectures : une ligne par relecture (essai n), avec son origine (« reprise:<demande> »…).
--   · Garde-fous : consigne non vide, ramenée à 500 caractères ; pièce rattachée, ni en lecture ni exportée ;
--     trois relectures avec consigne au plus par pièce (54000), au-delà une personne la reprend.
-- Rien n'est supprimé. Rejouable.

create table if not exists private.relectures (
  piece_id   uuid not null references public.pieces(id) on delete cascade,
  essai      integer not null check (essai between 1 and 99),
  client_id  uuid not null,
  consigne   text not null check (char_length(consigne) between 1 and 500),
  origine    text check (char_length(origine) <= 200),
  travail_id bigint,
  cree_le    timestamptz not null default now(),
  primary key (piece_id, essai)
);
comment on table private.relectures is 'a1_01 : les relectures d''une pièce avec une consigne (reprise après refus) ; essai n → version du lecteur « +c<n> ».';
create index if not exists relectures_origine on private.relectures (origine) where origine is not null;
revoke all on table private.relectures from public, anon, authenticated;
grant select on table private.relectures to service_role;

create or replace function private.lecteur_relire(p_piece uuid, p_consigne text, p_origine text default null)
returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  p public.pieces;
  v_consigne text := left(btrim(regexp_replace(coalesce(p_consigne, ''), '[[:cntrl:][:space:]]+', ' ', 'g')), 500);
  v_essai integer;
  v_id bigint;
begin
  if v_consigne = '' then
    raise exception 'Une relecture dit où regarder : la consigne est vide.' using errcode = '22023';
  end if;
  select * into p from public.pieces x where x.id = p_piece for update;
  if p.id is null then
    raise exception 'Pièce introuvable.' using errcode = 'P0002';
  end if;
  if p.objet_id is null or p.source = 'export' then
    raise exception 'Cette pièce ne se relit pas (détachée ou exportée).' using errcode = '55000';
  end if;
  if p.statut not in ('lue', 'a_verifier', 'a_classer', 'rejetee', 'echec') then
    raise exception 'La pièce est « % » : elle se relira une fois sa lecture finie.', p.statut using errcode = '55000';
  end if;
  select coalesce(max(r.essai), 0) + 1 into v_essai from private.relectures r where r.piece_id = p.id;
  if v_essai > 3 then
    raise exception 'Trois relectures avec consigne au plus par pièce : une personne la reprend.' using errcode = '54000';
  end if;

  v_id := private.deposer_travail(p.client_id, p.module, 'lecteur.lire',
    jsonb_build_object('piece', p.id, 'consigne', v_consigne, 'essai', v_essai),
    'relire:' || p.id::text || ':' || v_essai, 0::smallint);
  insert into private.relectures (piece_id, essai, client_id, consigne, origine, travail_id)
  values (p.id, v_essai, p.client_id, v_consigne, left(p_origine, 200), v_id);

  update public.pieces set statut = 'recue' where id = p.id;
  -- Le déclencheur demander_lecture vient de déposer la lecture ordinaire « piece:<id> » : la relecture la remplace.
  update public.travaux
     set etat = 'fait', fini_le = now(), verrou_jusqu_au = null,
         resultat = jsonb_build_object('ignore', 'remplacé par la relecture avec consigne', 'relecture', 'relire:' || p.id::text || ':' || v_essai)
   where genre = 'lecteur.lire' and cle = 'piece:' || p.id::text and etat = 'a_faire';

  perform private.journaliser(p.client_id, 'lecteur.relecture_demandee', 'piece', p.id::text,
    jsonb_build_object('essai', v_essai, 'origine', p_origine, 'travail', v_id), null::uuid);
  return v_id;
end $$;

revoke all on function private.lecteur_relire(uuid, text, text) from public, anon, authenticated;
grant execute on function private.lecteur_relire(uuid, text, text) to service_role;


-- ═══ omega/migrations/a1_02_filed_relecture_reprise.sql @ 971aec0c58e7713f0cf5d7087cef696c7cf069a3
-- a1_02_filed_relecture_reprise.sql — la reprise après refus de FILED relit la facture avec la consigne du refus
-- (A1, 25/10/2026). À poser APRÈS 19az (socle), a4_86 (reprise FILED, version réduite) et a1_01 (porte du lecteur).
--
-- a4_86 attend une correction de la facture refusée (24 h au plus) ; il prévoyait « la relecture, quand le lecteur
-- saura relire avec la consigne ». Ce lot la branche :
--   · private.filed_relire_pour_reprise(refusee, document, consigne) : une fois par reprise, la pièce de la facture
--     est relue par private.lecteur_relire, avec « Motif du refus : … Commentaire du valideur : … » ;
--   · filed_traiter_reprises l'appelle quand rien n'a changé et que le délai court encore (repère « elle attend ») ;
--   · filed_integrer_facture laisse passer la relecture d'une facture « refusee » dont la reprise est à faire
--     (repère « déjà décidée ») : la facture change de version, le recontrôle garde « refusee », et le cron suivant de
--     a4_86 voit les corrections et propose la reprise, au nom du moteur, à une nouvelle validation humaine.
-- Une relecture qui ne change rien laisse la reprise attendre une correction humaine, puis « reprise impossible » au
-- bout du délai, comme avant. Repères trouvés une fois chacun, sinon la pose s'arrête. Rejouable ; rien n'est supprimé.

create or replace function private.filed_relire_pour_reprise(p_refusee uuid, p_document uuid, p_consigne jsonb)
returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_piece uuid;
  v_origine text := 'reprise:' || p_refusee::text;
  r private.relectures;
  v_consigne text;
begin
  select d.piece_id into v_piece from public.filed_documents d where d.id = p_document;
  if v_piece is null then return false; end if;
  select * into r from private.relectures x where x.origine = v_origine order by x.essai desc limit 1;
  if r.piece_id is not null then
    -- Déjà demandée : elle attend tant que la lecture n'est pas rendue.
    return exists (select 1 from public.travaux t where t.id = r.travail_id and t.etat in ('a_faire', 'en_cours'))
        or exists (select 1 from public.pieces p where p.id = v_piece and p.statut in ('recue', 'en_lecture'));
  end if;
  v_consigne := concat_ws(' ',
    'Motif du refus : ' || nullif(btrim(p_consigne ->> 'motif'), '') || '.',
    'Commentaire du valideur : ' || nullif(btrim(p_consigne ->> 'commentaire'), ''));
  if v_consigne = '' then return false; end if;
  begin
    perform private.lecteur_relire(v_piece, v_consigne, v_origine);
  exception when others then
    raise warning 'FILED : relecture de la reprise % non demandée (%)', p_refusee, sqlerrm;
    return false;
  end;
  return true;
end $$;

-- La relecture d'une facture refusée n'entre que si sa reprise attend encore.
create or replace function private.filed_relecture_attendue(p_piece uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from private.relectures rl
                   join private.reprises rp on rl.origine = 'reprise:' || rp.demande_id::text
                  where rl.piece_id = p_piece and rp.statut = 'a_faire')
$$;

revoke all on function private.filed_relire_pour_reprise(uuid, uuid, jsonb) from public, anon, authenticated;
revoke all on function private.filed_relecture_attendue(uuid) from public, anon, authenticated;
grant execute on function private.filed_relire_pour_reprise(uuid, uuid, jsonb) to service_role;
grant execute on function private.filed_relecture_attendue(uuid) to service_role;

-- Le cron des reprises demande la relecture quand rien n'a changé et que le délai court.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_traiter_reprises(interval)'::regprocedure);
  v_rep constant text := E'        continue;   -- elle attend une correction (ou la relecture avec la consigne)\n';
  v_n int;
begin
  if position('filed_relire_pour_reprise' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a1_02 : repère « elle attend » de filed_traiter_reprises trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
       E'        -- a1_02 : une fois par reprise, la pièce est relue avec la consigne du refus.\n'
    || E'        if r.cree_le > now() - p_delai then\n'
    || E'          perform private.filed_relire_pour_reprise(d.id, f.document_id, r.consigne);\n'
    || E'        end if;\n'
    || v_rep);
end $$;

-- L'intégration laisse passer la relecture d'une facture refusée dont la reprise est à faire.
do $$
declare
  v_def text := pg_get_functiondef('private.filed_integrer_facture(uuid)'::regprocedure);
  v_rep constant text := E'  if found and v_f.statut not in (''a_completer'', ''bloquee'', ''a_valider'', ''ecartee'') then\n';
  v_n int;
begin
  if position('filed_relecture_attendue' in v_def) > 0 then return; end if;
  v_n := (length(v_def) - length(replace(v_def, v_rep, ''))) / length(v_rep);
  if v_n <> 1 then raise exception 'a1_02 : repère « déjà décidée » de filed_integrer_facture trouvé % fois (1 attendu)', v_n; end if;
  execute replace(v_def, v_rep,
       E'  if found and v_f.statut not in (''a_completer'', ''bloquee'', ''a_valider'', ''ecartee'')\n'
    || E'     and not (v_f.statut = ''refusee'' and private.filed_relecture_attendue(v_doc.piece_id)) then  -- a1_02\n');
end $$;
