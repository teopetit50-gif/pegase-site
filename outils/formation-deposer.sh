#!/usr/bin/env bash
# Met en ligne une vidéo de formation tournée par Teo (cahier des charges :
# docs/formation/CAHIER-DES-CHARGES.md).
#
# Usage : outils/formation-deposer.sh <identifiant> <fichier ou lien direct>
#   <identifiant> : la clé de la vidéo dans components/espace2/formation/videos.ts
#
# Produit, sous public/formation/ :
#   <id>.mp4  H.264, 1080p au plus, 30 i/s, AAC 96 kb/s, « faststart »
#   <id>.jpg  l'image d'affiche, 1280 × 720, tirée à 2 s
#   <id>.vtt  les sous-titres, par transcription (faster-whisper) — à relire
#             contre le script avant de pousser
# Il reste ensuite à poser `tournee: { duree, sousTitres: true }` sur la fiche.
set -euo pipefail

ID="${1:?identifiant manquant}"
SOURCE="${2:?fichier ou lien manquant}"
RACINE="$(cd "$(dirname "$0")/.." && pwd)"
SORTIE="$RACINE/public/formation"
TRAVAIL="$(mktemp -d)"
trap 'rm -rf "$TRAVAIL"' EXIT

grep -q "\"$ID\":" "$RACINE/components/espace2/formation/videos.ts" || { echo "« $ID » n'est pas au catalogue (videos.ts)." >&2; exit 1; }

# 1. récupérer le fichier
if [[ "$SOURCE" =~ ^https?:// ]]; then
  # lien de partage Drive : on passe par l'adresse de téléchargement direct
  if [[ "$SOURCE" =~ drive\.google\.com/file/d/([A-Za-z0-9_-]+) ]]; then
    SOURCE="https://drive.google.com/uc?export=download&confirm=t&id=${BASH_REMATCH[1]}"
  fi
  # Dropbox : dl=1 force le fichier plutôt que la page
  SOURCE="${SOURCE/dl=0/dl=1}"
  curl -fsSL "$SOURCE" -o "$TRAVAIL/brut"
else
  cp "$SOURCE" "$TRAVAIL/brut"
fi
ffprobe -v error -show_entries format=duration -of csv=p=0 "$TRAVAIL/brut" >/dev/null || { echo "Le fichier reçu n'est pas une vidéo." >&2; exit 1; }

# 2. compresser
ffmpeg -v error -y -i "$TRAVAIL/brut" \
  -vf "scale='min(1920,iw)':-2,fps=30" \
  -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -profile:v high \
  -c:a aac -b:a 96k -ac 1 \
  -movflags +faststart "$SORTIE/$ID.mp4"

# 3. l'affiche
ffmpeg -v error -y -ss 2 -i "$SORTIE/$ID.mp4" -frames:v 1 \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -q:v 3 "$SORTIE/$ID.jpg"

# 4. les sous-titres
python3 -c "import faster_whisper" 2>/dev/null || pip install -q faster-whisper
# le son est décodé par ffmpeg (16 kHz mono, flottants) : la lecture par PyAV
# de faster-whisper dépend de sa version et casse selon les machines
ffmpeg -v error -y -i "$SORTIE/$ID.mp4" -vn -ac 1 -ar 16000 -f f32le "$TRAVAIL/son.f32"
python3 -I - "$TRAVAIL/son.f32" "$SORTIE/$ID.vtt" <<'PY'
import sys
import numpy as np
from faster_whisper import WhisperModel
son, vtt = sys.argv[1:3]
audio = np.fromfile(son, dtype=np.float32)
segments, _ = WhisperModel("small", device="cpu", compute_type="int8").transcribe(audio, language="fr", vad_filter=True)
def t(s):
    h, r = divmod(s, 3600); m, s = divmod(r, 60)
    return f"{int(h):02}:{int(m):02}:{s:06.3f}"
with open(vtt, "w", encoding="utf-8") as f:
    f.write("WEBVTT\n\n")
    for g in segments:
        f.write(f"{t(g.start)} --> {t(g.end)}\n{g.text.strip()}\n\n")
PY

DUREE=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$SORTIE/$ID.mp4" | cut -d. -f1)
POIDS=$(du -h "$SORTIE/$ID.mp4" | cut -f1)
echo "public/formation/$ID.{mp4,jpg,vtt} : ${DUREE} s, $POIDS."
echo "À faire : relire $ID.vtt contre le script, puis poser  tournee: { duree: $DUREE, sousTitres: true }  sur la fiche « $ID » de videos.ts."
echo "Poids total de public/formation : $(du -sh "$SORTIE" | cut -f1) (au-delà de 150 Mo : passer à Vercel Blob)."
