"use client";

/* TIROMA — trois icônes de Linear dont « Avant les rendez-vous » a besoin et
   que le sprite de Tiroma (TirIcone.tsx, généré par outils/tir-icones.mjs) ne
   porte pas : Accept issue from triage (Resolved), Snooze (AlarmClock), et le
   bouton des réactions (Face). Tracés repris tels quels : Resolved et
   AlarmClock de components/espace2/tamila/TamIcone.tsx, Face du sprite de
   Linear (releves/linear-commun/sprite-icones.svg). */

const TRACES = {
  Resolved: "<path d=\"M10.988 7.07a.75.75 0 1 0-.976-1.14L7.039 8.48 6.03 7.469A.75.75 0 0 0 4.97 8.53l1.5 1.5a.75.75 0 0 0 1.018.04z\"/><path fill-rule=\"evenodd\" d=\"M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0m-1.5 0a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0\" clip-rule=\"evenodd\"/>",
  AlarmClock: "<path d=\"m4.434 1.434-.377-.377A.2.2 0 0 0 3.919 1 2.92 2.92 0 0 0 1 3.92c0 .051.02.1.057.137l.377.377c.198.198.297.297.411.334a.5.5 0 0 0 .31 0c.114-.037.213-.136.41-.334l1.87-1.868c.197-.198.296-.297.333-.411a.5.5 0 0 0 0-.31c-.037-.114-.136-.213-.334-.41M3.5 12.5s-.355 1.067-.467 2.001c-.032.275.191.499.467.499h.793a.5.5 0 0 0 .354-.146L5.5 14zm9 0s.356 1.067.467 2.001c.033.275-.19.499-.467.499h-.793a.5.5 0 0 1-.353-.146L10.5 14zm-.934-11.066.377-.377A.2.2 0 0 1 12.081 1 2.92 2.92 0 0 1 15 3.92c0 .051-.02.1-.057.137l-.377.377c-.198.198-.297.297-.412.334a.5.5 0 0 1-.309 0c-.114-.037-.213-.136-.41-.334l-1.87-1.868c-.197-.198-.296-.297-.333-.411a.5.5 0 0 1 0-.31c.037-.114.136-.213.334-.41\"/><path fill-rule=\"evenodd\" d=\"M8 13.5a5.5 5.5 0 1 0 0-11 5.5 5.5 0 0 0 0 11m2.646-7.117a.5.5 0 0 0 0-.707l-.322-.323a.5.5 0 0 0-.707 0L7.353 7.617a.5.5 0 0 0 0 .707l.323.322a.5.5 0 0 0 .707 0z\" clip-rule=\"evenodd\"/>",
  Face: "<path fill-rule=\"evenodd\" d=\"M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14M5.671 8.665a.75.75 0 0 0-1.342.67C4.593 9.863 5.655 11.25 8 11.25s3.407-1.387 3.671-1.915a.75.75 0 0 0-1.342-.67C10.26 8.803 9.655 9.75 8 9.75s-2.26-.947-2.329-1.085M5 6a1 1 0 0 1 2 0v.5a.5.5 0 0 1-.5.5h-1a.5.5 0 0 1-.5-.5zm5-1a1 1 0 0 0-1 1v.5a.5.5 0 0 0 .5.5h1a.5.5 0 0 0 .5-.5V6a1 1 0 0 0-1-1\" clip-rule=\"evenodd\"/>",
} as const;

export type NomAvantIcone = keyof typeof TRACES;

export function AvantIcone({ nom, taille = 16, style }: { nom: NomAvantIcone; taille?: number; style?: React.CSSProperties }) {
  return <svg width={taille} height={taille} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" style={style} dangerouslySetInnerHTML={{ __html: TRACES[nom] }} />;
}
