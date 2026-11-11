# Les six logiciels métier, chacun sur son propre lien Vercel

Demande de Teo du 09/11/2026 : chaque logiciel métier a son déploiement
Vercel à lui, indépendant d'omegaai.fr. Les quatre modules (FILED, CASHD,
REPUT, OFFLOAD) restent uniquement sur omegaai.fr et ne changent pas.

Les six projets sont dans l'équipe Vercel `team_i1M2yUINJBwJA66d6L9i62OF`,
reliés au même dépôt GitHub `teopetit50-gif/pegase-site` (framework Next.js,
racine du dépôt, région fra1 via vercel.json). Chaque projet porte la
variable `NEXT_PUBLIC_PORTAIL=<logiciel>` (production et preview) ; c'est
elle qui réduit l'espace client à ce seul logiciel (components/espace2/portail.ts,
proxy.ts). La protection « Vercel Authentication » est désactivée : le
lien s'ouvre sans compte Vercel. Chaque push sur `main` redéploie les six
projets en plus d'omegaai.fr.

| Logiciel | Métier | Adresse (11/11) | Lien Vercel d'origine | Variable posée | Projet Vercel | Mis en ligne |
| --- | --- | --- | --- | --- | --- | --- |
| Daliro | BTP | https://daliro.omegaai.fr | https://daliro-teo18.vercel.app | `NEXT_PUBLIC_PORTAIL=daliro` | `daliro` | 09/11/2026 |
| Tamila | Avocats | https://tamila.omegaai.fr | https://tamila-teo18.vercel.app | `NEXT_PUBLIC_PORTAIL=tamila` | `tamila` | 09/11/2026 |
| Lorani | Architectes | https://lorani.omegaai.fr | https://lorani-teo18.vercel.app | `NEXT_PUBLIC_PORTAIL=lorani` | `lorani` | 09/11/2026 |
| Tiroma | Dentaires | https://tiroma.omegaai.fr | https://tiroma-teo18.vercel.app | `NEXT_PUBLIC_PORTAIL=tiroma` | `tiroma` | 09/11/2026 |
| Tavaro | Location | https://tavaro.omegaai.fr | https://tavaro-teo18.vercel.app | `NEXT_PUBLIC_PORTAIL=tavaro` | `tavaro` | 09/11/2026 |
| Varelo | Groupes | https://varelo.omegaai.fr | https://varelo-teo18.vercel.app | `NEXT_PUBLIC_PORTAIL=varelo` | `varelo` | 09/11/2026 |

## 11/11/2026 — chaque logiciel a son sous-domaine d'omegaai.fr

Teo (11/11) a demandé un nom à chaque logiciel, « hébergé comme omegaai.fr »,
sans frais. Les noms propres (daliro.fr, tamila.fr, lorani.fr, tiroma.fr,
tavaro.fr sont libres ; varelo.fr est pris, varelo.app est libre) coûtent
environ 8 € HT par an chez OVH, où vit omegaai.fr ; Vercel ne vend pas le
.fr. Dans l'attente, chaque projet Vercel porte un sous-domaine
d'omegaai.fr, rattaché le 11/11 (Vercel, « Domains » de chaque projet) :
`<logiciel>.omegaai.fr`. Chez OVH, la zone DNS d'omegaai.fr porte six
entrées CNAME (`daliro`, `tamila`, `lorani`, `tiroma`, `tavaro`, `varelo`)
vers `cname.vercel-dns.com.`, posées par Teo le 11/11. Le certificat HTTPS
est posé par Vercel. Le jour où un nom propre est acheté, on le rattache
au même projet et le sous-domaine redirige dessus.

Attention : un sous-domaine d'omegaai.fr contredit la règle du 10/11
(« rien à voir avec Omega ») dans l'adresse elle-même. C'est une solution
d'attente, acceptée par Teo le 11/11 pour ne rien payer tant qu'un logiciel
n'a pas son premier client.

## Ce que fait un lien

- La racine (`/`) redirige en 307 vers `/espace2/<logiciel>`.
- L'espace ne montre que ce logiciel, le Travail (tâches, notes, appels),
  les Fiches (entreprises, contacts), le Réseau, la Formation et les
  Réglages. Toute autre page de `/espace2` renvoie vers le logiciel.
- `?portail=complet` n'ouvre rien d'autre : le portail est imposé par la
  variable, pas par le témoin.

## Vérifié le 09/11/2026

Les six racines répondent 200 sur `/espace2/<logiciel>` avec l'onglet au
nom du logiciel (« Chantiers | DALIRO », « Dossiers du cabinet | TAMILA »,
« Calendrier des permis | LORANI », « Cabinet dentaire | TIROMA »,
« Location : retours et factures | TAVARO », « Ce matin — Varelo | VARELO »),
sans les autres métiers. omegaai.fr n'a pas changé : `/` sert l'accueil,
`/espace2` l'espace complet, `/daliro` l'espace réduit à DALIRO.

## Pour en ajouter un

1. `components/espace2/portail.ts` : ajouter la clé dans `PORTAILS`.
2. `proxy.ts` : ajouter `/<clé>` au `matcher`.
3. Créer le projet Vercel relié au dépôt, avec `NEXT_PUBLIC_PORTAIL=<clé>`
   et Vercel Authentication désactivée, puis déployer `main`.
