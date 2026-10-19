# Banc de référence FILED (A4, lot a4_62, 19/10/2026)

Une note par contrôle FILED et par champ du lecteur, rejouée à chaque lot FILED ou A1, sur des pièces et des cas
dont on connaît la bonne réponse. Décision de Teo, 19/10, 15 h 22 Z.

## Poser, puis rejouer

1. `omega/migrations/a4_62_filed_lot54_banc_de_reference.sql` : les tables `private.filed_banc_*` et les fonctions.
2. `omega/banc/banc_reference_cas.sql` : les 37 cas. Il est écrit par `node omega/banc/banc_reference.mjs --preparer`.
3. `node omega/banc/banc_reference.mjs --deposer` : les six PDF synthétiques sur le client du banc. Ensuite le
   lecteur lit et FILED contrôle.
4. Sur la recette, en service_role :
   ```sql
   select private.filed_banc_rejouer('<lot ou SHA du lecteur>', 'cccccccc-0000-4000-8000-00000000000c');
   select * from private.filed_banc_notes();          -- dernier relevé, avec la note du précédent
   ```
   Les scénarios se jouent à blanc : les factures construites sont annulées, rien n'en reste. Les cas « piece » lisent
   seulement ce que le lecteur (`pieces_valeurs`) et FILED (`filed_controles`) ont déjà écrit.

## Sources et attribution

| Source | Licence | Ce qui en est pris | Dans git |
|---|---|---|---|
| [djo33350/french-synthetic-document-test-samples](https://huggingface.co/datasets/djo33350/french-synthetic-document-test-samples) | CC BY 4.0, **données synthétiques** | 6 PDF fictifs, vérité terrain (montants imprimés, ventilation, lignes, anomalies voulues) | empreintes et bonnes réponses ; pas les PDF |
| [Einvoi, Jeu de tests Factur-X 1.09.2](https://www.data.gouv.fr/datasets/jeu-de-tests-factur-x-1-09-2-tva-montants-doublons-et-coherence-pdf-xml) | Licence Ouverte 2.0 | 29 cas décrits : 21 traduits en scénarios FILED, 8 gardés hors périmètre, avec la raison | traduction (dans le script) et empreinte du JSON |
| Pièces NOBAT (recette) | pièces client | bonnes réponses remplies par le coordinateur sur la recette | codes de cas seulement |
| [canopynexus/factur-x](https://github.com/canopynexus/factur-x) | MIT | outil pour fabriquer des variantes à anomalie connue ; hors produit, non utilisé dans ce lot | rien |

Écarté : osolmaz/invoice-fixture, qui n'a pas de licence. Les éditions payantes de djo33350 ne sont pas achetées.
Les empreintes de tous les fichiers sources sont dans `banc_reference_SOURCE.tsv`.

## Première note, en local (souche A4, 19/10)

Seuls les scénarios Einvoi sont joués. Les PDF ne sont pas déposés en local, donc champs et pièces sont « non joués ».
Il y a 27 verdicts joués, dont 24 justes. Les trois faux sont de vrais écarts de FILED, gardés au banc ; un quatrième
cas attend ses empreintes :

- **EINVOI-COH-FXC-002, `tva.ventilation`** : FILED compare la somme de la ventilation au total de TVA, mais ne vérifie
  pas base × taux = montant. Une ventilation « 100 × 20 % = 19 » passe.
- **EINVOI-COH-FXC-005, `montant.net_a_payer`** : FILED signale l'écart net / TTC en *info*, sans vérifier
  TTC − prépayé + arrondi = net à payer.
- **EINVOI-COH-FXC-016, `lecture.complete`** : une facture structurée sans vendeur est rangée par a4_55 chez « Tickets
  de caisse ». Le fournisseur ne manque donc plus. Il faudrait qu'une pièce XML ou Factur-X ne soit jamais tenue pour
  un ticket.
- **NOBAT-DOSSIER1-FACTURE, `rapprochement.devis`** : non joué tant que le coordinateur n'a pas posé les empreintes.
  Ce contrôle n'existe pas encore (voir ci-dessous).

Les huit cas Einvoi hors périmètre visent le lecteur ou l'import XML : PDF/XML contradictoires, devise absente ou
mêlée, XML hostile, avoir reconnu. Ils sont aussi au banc, et leur raison est dans `filed_banc_cas.note`. Un point à
trancher : une devise absente devient EUR par défaut (`filed_factures.devise`), et l'absence ne se voit plus.

## Devis ↔ facture d'un même fournisseur : oui, il doit exister

Aujourd'hui, FILED ne rapproche une facture que d'un bon de commande ou d'une réception. Avec un devis seul, il dit
« Sans commande : rien à rapprocher ». Pour une TPE, le devis accepté **tient lieu de commande**. Le rapprochement à
deux voies devis ↔ facture doit donc exister :

- **Candidats** : un devis du même fournisseur et du même client, daté au plus tard le jour de la facture, dans une
  fenêtre de 12 mois, et pas déjà soldé par d'autres factures.
- **Comparaison** : le montant TTC, à la tolérance des totaux près, et les lignes quand le lecteur les a. Une facture
  inférieure au devis est un acompte ou une situation : en *info*, avec le reste à facturer. Une facture supérieure
  est en *attention*.
- **Proposition, pas décision** : FILED **propose** le rattachement (contrôle `rapprochement.devis`, le message cite le
  devis). Une personne le confirme quand plusieurs devis conviennent. Un devis non signé n'engage rien : jamais
  bloquant.

Au banc, c'est le cas attendu `NOBAT-DOSSIER1-FACTURE` (lié à `NOBAT-DOSSIER1-DEVIS`). Sa note vaut 0 tant que ce
contrôle n'existe pas.
