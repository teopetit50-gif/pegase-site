"use client";

/* Le lecteur vidéo de /espace3/formation, sur celui de la documentation Linear :
   cadre 16:9 à filet de 5 % et rayon 8, barre de commandes posée à 17 px
   du bas avec 50 px de marge latérale, boutons ronds de 32 px « verre »,
   piste de 4 px à 16 % de blanc. Écart assumé : la piste est un vrai
   <input type="range">, réglable au clavier. */

import { useEffect, useRef, useState } from "react";
import { Maximize, Minimize, Pause, PictureInPicture2, Play, Volume2, VolumeX } from "lucide-react";

const VITESSES = [1, 1.5, 2];

const horloge = (s: number) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

/* `duree` : la durée affichée avant que la vidéo ait chargé ses métadonnées
   (sur téléphone, elle ne les charge souvent qu'au premier appui) */
export default function Lecteur({ src, affiche, titre, duree: dureeConnue = 0 }: { src: string; affiche: string; titre: string; duree?: number }) {
  const cadre = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const repos = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lecture, setLecture] = useState(false);
  const [muet, setMuet] = useState(false);
  const [temps, setTemps] = useState(0);
  const [duree, setDuree] = useState(dureeConnue);
  const [vitesse, setVitesse] = useState(1);
  const [plein, setPlein] = useState(false);
  const [commandes, setCommandes] = useState(true);
  const [pip, setPip] = useState(false);

  /* la vidéo a pu lire sa durée avant que React ne s'y branche : on rejoue
     l'événement, sinon la durée resterait à 00:00 */
  useEffect(() => {
    const v = video.current;
    if (v && v.readyState >= 1) v.dispatchEvent(new Event("loadedmetadata"));
  }, []);

  useEffect(() => {
    const surPlein = () => setPlein(document.fullscreenElement === cadre.current);
    document.addEventListener("fullscreenchange", surPlein);
    return () => document.removeEventListener("fullscreenchange", surPlein);
  }, []);

  /* en lecture, les commandes s'effacent après 2,5 s sans mouvement */
  const reveiller = () => {
    setCommandes(true);
    if (repos.current) clearTimeout(repos.current);
    repos.current = setTimeout(() => {
      if (video.current && !video.current.paused) setCommandes(false);
    }, 2500);
  };

  const basculer = () => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
    reveiller();
  };

  const changerVitesse = () => {
    const v = video.current;
    if (!v) return;
    const suivante = VITESSES[(VITESSES.indexOf(vitesse) + 1) % VITESSES.length];
    v.playbackRate = suivante;
    setVitesse(suivante);
  };

  const pleinEcran = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (cadre.current?.requestFullscreen) void cadre.current.requestFullscreen();
    /* iOS : seul l'élément vidéo sait passer en plein écran */ else
      (video.current as HTMLVideoElement & { webkitEnterFullscreen?: () => void })?.webkitEnterFullscreen?.();
  };

  const incrustation = () => {
    const v = video.current;
    if (!v) return;
    if (document.pictureInPictureElement) void document.exitPictureInPicture();
    else void v.requestPictureInPicture?.();
  };

  const avance = duree ? (temps / duree) * 100 : 0;

  return (
    <div
      ref={cadre}
      className="fm-video"
      data-lecture={lecture}
      data-commandes={commandes || !lecture}
      onMouseMove={reveiller}
      onMouseLeave={() => lecture && setCommandes(false)}
      onFocus={reveiller}
    >
      <video
        ref={video}
        className="fm-video-media"
        src={src}
        poster={affiche}
        preload="metadata"
        playsInline
        aria-label={titre}
        onClick={basculer}
        onPlay={() => {
          setLecture(true);
          reveiller();
        }}
        onPause={() => {
          setLecture(false);
          setCommandes(true);
        }}
        onLoadedMetadata={(e) => {
          setDuree(e.currentTarget.duration);
          setPip(typeof document !== "undefined" && "pictureInPictureEnabled" in document && document.pictureInPictureEnabled);
        }}
        onTimeUpdate={(e) => setTemps(e.currentTarget.currentTime)}
        onVolumeChange={(e) => setMuet(e.currentTarget.muted)}
        onEnded={() => setCommandes(true)}
      />
      <div className="fm-video-voile" aria-hidden="true" />

      <div className="fm-video-commandes">
        <button type="button" className="fm-verre" onClick={basculer} aria-label={lecture ? "Mettre en pause" : "Lire la vidéo"}>
          {lecture ? <Pause size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" /> : <Play size={16} fill="currentColor" strokeWidth={0} aria-hidden="true" />}
        </button>
        <button
          type="button"
          className="fm-verre"
          onClick={() => video.current && (video.current.muted = !video.current.muted)}
          aria-label={muet ? "Rétablir le son" : "Couper le son"}
        >
          {muet ? <VolumeX size={16} strokeWidth={1.75} aria-hidden="true" /> : <Volume2 size={16} strokeWidth={1.75} aria-hidden="true" />}
        </button>
        <span className="fm-video-temps">{horloge(temps)}</span>
        <input
          type="range"
          className="fm-video-piste"
          min={0}
          max={duree || 0}
          step={0.1}
          value={temps}
          aria-label="Position dans la vidéo"
          aria-valuetext={`${horloge(temps)} sur ${horloge(duree)}`}
          style={{ "--fm-avance": `${avance}%` } as React.CSSProperties}
          onChange={(e) => {
            const v = video.current;
            if (!v) return;
            v.currentTime = Number(e.currentTarget.value);
            setTemps(v.currentTime);
          }}
        />
        <span className="fm-video-temps">−{horloge(duree - temps)}</span>
        <button type="button" className="fm-verre fm-verre-texte fm-video-option" onClick={changerVitesse} aria-label={`Vitesse de lecture : ${vitesse}×`}>
          {vitesse}x
        </button>
        {pip && (
          <button type="button" className="fm-verre fm-video-option" onClick={incrustation} aria-label="Image dans l'image">
            <PictureInPicture2 size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        )}
        <button type="button" className="fm-verre" onClick={pleinEcran} aria-label={plein ? "Quitter le plein écran" : "Plein écran"}>
          {plein ? <Minimize size={16} strokeWidth={1.75} aria-hidden="true" /> : <Maximize size={16} strokeWidth={1.75} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
