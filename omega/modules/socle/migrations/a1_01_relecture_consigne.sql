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
