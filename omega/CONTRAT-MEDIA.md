# CONTRAT-MEDIA — les photos et vocaux reçus (lecteur.media)

Écrit par A1 le 06/10/2026 pour la promesse de Daliro (« Daliro lit les photos et les vocaux envoyés au numéro
WhatsApp professionnel », AUDIT-PROMESSES § 2). Le lecteur est prêt (`omega/functions/lecteur/media/`) et prend
le genre `lecteur.media` à chaque passage. Le dépôt du travail et la porte de retour sont côté **module** (B6) ;
tant qu'aucun travail n'est déposé, rien ne se passe.

## Le parcours

1. La fonction `reception` (A2) range le message dans `public.receptions` et ses fichiers sous
   `<client>/receptions/<wamid>/<nom>` (`vocal.ogg` pour un vocal, `detail.media.vocal = true`), puis publie
   `reception.nouvelle`.
2. Le module (Daliro : son travail `daliro.reception`, b6_07) décide que ce message mérite d'être lu (un membre
   d'équipe, un client d'un chantier ouvert…) et dépose **un travail `lecteur.media`** (module `daliro`) :

```json
{"reception": 4512,
 "pieces": [{"chemin": "<client>/receptions/wamid.ABC/vocal.ogg", "mime": "audio/ogg", "nom": "vocal.ogg", "vocal": true},
            {"chemin": "<client>/receptions/wamid.ABC/image.jpg", "mime": "image/jpeg"}],
 "texte": "le texte ou la légende du message",
 "de_nom": "Chef d'équipe Pose A",
 "contexte": "chantier Résidence Lefèvre, lots en cours : menuiseries, garde-corps (facultatif, ≤ 2 000 car.)",
 "retour": "daliro_media_lu"}
```

   Clé conseillée : `media:<reception>` (le dépôt est idempotent par clé). Les chemins doivent être sous
   `<client>/receptions/` du client du travail, sinon le travail est clos (`ignore`). Six médias au plus.
3. Le lecteur transcrit chaque vocal (Mistral Voxtral, UE, clé `MISTRAL_API_KEY` ; sans clé : « non transcrit »),
   regarde les photos (Claude), et rend la lecture à la porte `retour` : **`public.<retour>(p_reception, p_lecture jsonb)`**,
   appelée avec la clé de service (grant au seul `service_role`). La lecture est aussi gardée dans
   `travaux.resultat.lecture` (`retour` = `pose`, `sans_porte` ou `erreur`) : rien ne se perd si la porte manque.

## La lecture (`p_lecture`)

```json
{"reception": 4512, "de_nom": "Chef d'équipe Pose A",
 "medias": [{"n": 1, "chemin": "…/vocal.ogg", "nature": "vocal", "statut": "lu", "transcription": "…", "duree_s": 14},
            {"n": 2, "chemin": "…/image.jpg", "nature": "photo", "statut": "lu"}],
 "resume": "Le client Lefèvre demande des garde-corps au R+3 ; une palette de plaques manque.",
 "demandes": [{"nature": "travail_supplementaire", "texte": "Garde-corps au R+3", "quantite": 12, "unite": "ml", "lieu": "R+3",
               "source": {"media": 1, "extrait": "Lefèvre veut aussi des garde-corps au R+3, douze mètres"},
               "verifiee": true, "controle": "extrait retrouvé dans la transcription du média 1"},
              {"nature": "probleme", "texte": "Allèges démolies", "source": {"media": 2, "extrait": "allèges démolies"},
               "verifiee": false, "controle": "vu sur la photo 2 : à confirmer"}],
 "cout_eur": 0.0142, "appels_ia": 1, "modele": "claude-sonnet-5-5", "version": "media/2026-10-06/claude-sonnet-5-5"}
```

- `statut` d'un média : `lu`, `non_transcrit` (vocal sans service), `absent` (fichier manquant), `trop_lourd`
  (image > 3,75 Mo, audio > 25 Mo), `ignore` (ni audio ni image : un PDF joint suit le chemin des pièces).
- `nature` d'une demande : `travail_supplementaire`, `probleme`, `question`, `information`, `avancement` (b6_25 : `ouvrage`, `lot_code?`, `pourcentage?` de 0 à 100 ; une demande d'avancement sans `ouvrage` est écartée ; tirée d'une photo, toujours `verifiee = false`).
- `source.media` : 0 = le texte du message, n = le média n. **Vérifiée** seulement si l'extrait se retrouve mot pour
  mot (espaces près) dans le texte ou la transcription ; une demande tirée d'une photo reste `verifiee = false`
  (« à confirmer ») ; une demande attribuée à un vocal non transcrit ou à une source inconnue est écartée.
- Pour Daliro : une `travail_supplementaire` devient un avenant brouillon avec `origine = {canal: "vocal" | "photo",
  auteur: de_nom, date, texte: extrait}` (ChantierVue) ; c'est au module de choisir le chantier.

Coût : la transcription (≈ 0,002 $ la minute) plus un appel Claude, sous le plafond `plafond_ia_jour_client`.
