#!/usr/bin/env python3
"""VARELO — trois vrais petits groupes, d'après les comptes annuels publiés (B1, 18/10/2026, chantier 3).

Écrit omega/banc/varelo_groupes_publics.sql, le script que le coordinateur pose sur la recette.

Sources, toutes ouvertes et légales :
  · les chiffres : jeu « Ratios financiers (BCE / INPI) » de data.economie.gouv.fr (DGE, Licence Ouverte v2.0),
    tiré des comptes annuels déposés à l'INPI ; seules les lignes « confidentiality = Public » et les comptes
    sociaux (type_bilan C complet ou S simplifié, jamais K consolidé) sont lus ;
  · les liens mère / filiales : Wikidata (P749 « organisation mère », P1616 « SIREN »), CC0 ; l'INPI n'ouvre pas
    les liens capitalistiques.
Le jeu ouvert donne le chiffre d'affaires et le résultat net, pas la trésorerie : aucune ligne 51/53 n'est
écrite, l'écran dit « non publiée ». Le reste du bilan n'y est pas non plus : une contrepartie 471 équilibre
la balance, sans rien inventer.

Usage : python3 omega/banc/varelo_groupes_publics.py   (réseau requis ; ne touche à aucune base)
"""
import datetime
import json
import pathlib
import urllib.parse
import urllib.request

API = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/ratios_inpi_bce/records"
SORTIE = pathlib.Path(__file__).with_suffix(".sql")

# client, gérant, nom du groupe, sociétés (SIREN, dénomination) ; la mère en premier.
GROUPES = [
    ("cccccccc-0000-4000-8000-000000000101", "cccccccc-0000-4000-8000-0000000001c1", "gerant-edh@banc-varelo.test",
     "Groupe EDH (comptes publiés)",
     [("381224054", "Groupe EDH"), ("852953629", "EFAP"), ("478968100", "École française de journalisme")]),
    ("cccccccc-0000-4000-8000-000000000102", "cccccccc-0000-4000-8000-0000000002c1", "gerant-ankama@banc-varelo.test",
     "Ankama (comptes publiés)",
     [("437785223", "Ankama"), ("494163744", "Ankama Animations"), ("492360169", "Ankama Éditions"),
      ("492360730", "Ankama Games")]),
    ("cccccccc-0000-4000-8000-000000000103", "cccccccc-0000-4000-8000-0000000003c1", "gerant-normaxis@banc-varelo.test",
     "Normaxis (comptes publiés)",
     [("823618582", "Normaxis"), ("511587792", "Arkemep"), ("883963993", "Arkenor")]),
]


def exercices(siren):
    q = urllib.parse.urlencode({
        "where": f'siren="{siren}" and confidentiality="Public" and type_bilan in ("C", "S")',
        "order_by": "date_cloture_exercice desc", "limit": 2})
    with urllib.request.urlopen(f"{API}?{q}", timeout=30) as r:
        return json.load(r)["results"]


def lit(t):
    return "'" + str(t).replace("'", "''") + "'"


def balance(ca, rn):
    """Ventes en 706 (crédit), le reste du résultat en une ligne 6 ou 7, la contrepartie en 471."""
    autres = ca - rn  # charges nettes des produits hors ventes
    lignes = [{"compte": "706000", "libelle": "Chiffre d'affaires publié", "solde": f"{-ca:.2f}"}]
    if autres >= 0:
        lignes.append({"compte": "600000", "libelle": "Charges nettes des produits hors ventes (total publié, non détaillé)",
                       "solde": f"{autres:.2f}"})
    else:
        lignes.append({"compte": "758000", "libelle": "Produits hors ventes nets des charges (total publié, non détaillé)",
                       "solde": f"{autres:.2f}"})
    lignes.append({"compte": "471000", "libelle": "Contrepartie : bilan non publié dans le jeu ouvert", "solde": f"{rn:.2f}"})
    return lignes


def debut(cloture):
    a, m, j = (int(x) for x in cloture.split("-"))
    # l'exercice commence le lendemain de la clôture précédente (douze mois)
    d = datetime.date(a - 1, m, j) + datetime.timedelta(days=1)
    return d.isoformat()


def main():
    out = [
        "-- VARELO — trois vrais petits groupes multi-sociétés, d'après les comptes annuels publiés (B1, 18/10/2026)",
        "-- Écrit par omega/banc/varelo_groupes_publics.py ; ne pas modifier à la main. À poser sur la RECETTE seulement.",
        "-- Chiffres : « Ratios financiers (BCE / INPI) », data.economie.gouv.fr, Licence Ouverte v2.0 — comptes annuels",
        "-- déposés à l'INPI, lignes publiques, comptes sociaux. Liens mère / filiales : Wikidata (P749), CC0.",
        "-- Chaque société reçoit la balance de son dernier exercice publié et, s'il existe, celle du précédent (l'écart",
        "-- sur l'an dernier). Ni trésorerie (absente du jeu ouvert), ni caisse : les caisses du banc restent fictives, et leur",
        "-- source le dit désormais (« Z fictif (banc) »), ce que l'écran affiche.",
        "-- Idempotent : chaque écriture est gardée (on conflict do nothing, not exists). Rien n'est supprimé.",
        "-- Les trois gérants n'ont pas de mot de passe utilisable : le coordinateur le pose comme pour les comptes du banc.",
        "",
        "do $banc$",
        "declare",
        "  v_entite uuid;",
        "begin",
    ]
    for client, gerant, email, nom, societes in GROUPES:
        out += [
            f"  -- {nom}",
            f"  insert into public.clients (id, nom) values ({lit(client)}, {lit(nom)}) on conflict do nothing;",
            "  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at,",
            "                          raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous)",
            f"  values ({lit(gerant)}, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', {lit(email)}, '',",
            "          now(), now(), now(), '{\"provider\":\"email\",\"providers\":[\"email\"]}', '{}', false, false)",
            "  on conflict do nothing;",
            f"  insert into public.comptes (user_id, client_id, role, perimetre_total) values ({lit(gerant)}, {lit(client)}, 'gerant', true)",
            "  on conflict do nothing;",
            f"  perform public.grp_installer({lit(client)});",
        ]
        for siren, denomination in societes:
            ex = exercices(siren)
            if not ex:
                raise SystemExit(f"{siren} : aucun exercice public")
            out += [
                f"  select e.id into v_entite from public.entites e where e.client_id = {lit(client)} and e.siren = {lit(siren)};",
                "  if v_entite is null then",
                f"    v_entite := public.grp_ajouter_societe({lit(client)}, {lit(denomination)}, {lit(siren)}, 'FR');",
                "  end if;",
            ]
            for r in reversed(ex):  # N-1 d'abord, N ensuite : la dernière balance est la plus récente
                cloture = r["date_cloture_exercice"]
                ca = float(r["chiffre_d_affaires"] or 0)
                rn = float(r["resultat_net"] or 0)
                src = f"Comptes annuels publiés (INPI), exercice clos le {'/'.join(reversed(cloture.split('-')))}, SIREN {siren}"
                out += [
                    "  if not exists (select 1 from public.grp_balances_depots d",
                    f"                 where d.client_id = {lit(client)} and d.entite_id = v_entite and d.arrete_le = {lit(cloture)}) then",
                    f"    perform private.grp_deposer_balance({lit(client)}, v_entite, {lit(cloture)}::date, {lit(debut(cloture))}::date,",
                    f"      {lit(json.dumps(balance(ca, rn), ensure_ascii=False))}::jsonb,",
                    f"      {lit(src)});",
                    "  end if;",
                ]
        out.append("")
    out += [
        "  -- Les caisses du banc Sogexal sont inventées : leur source le dit, l'écran l'affiche (Caisses.tsx).",
        "  update public.grp_ventes_caisse set source = left('Z fictif (banc) — ' || coalesce(source, 'dépôt'), 200)",
        "  where client_id = 'cccccccc-0000-4000-8000-00000000000c' and coalesce(source, '') !~* 'fictif';",
    ]
    out += ["end $banc$;", "",
            "-- Contrôle (lecture seule) : 10 sociétés, 19 balances, ventes et résultat par société.",
            "select c.nom as groupe, g.societe, g.arrete_le, g.ventes, g.resultat, g.ventes_n1, g.source",
            "from public.grp_groupe_page g join public.clients c on c.id = g.client_id",
            "where g.client_id in (" + ", ".join(lit(g[0]) for g in GROUPES) + ")",
            "order by c.nom, g.societe;", ""]
    SORTIE.write_text("\n".join(out), encoding="utf-8")
    print(SORTIE)


if __name__ == "__main__":
    main()
