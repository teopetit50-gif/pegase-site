"use client";

/* Les briques du nouvel espace : badge, point d'état, note, état vide,
   squelette, touche, interrupteur, menu déroulant, jauge. Les menus
   reposent sur react-aria-components (clavier, lecture d'écran, retour
   du focus au déclencheur) ; leur style est dans espace2.css. */

import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import { Button, Menu, MenuItem, MenuSection, MenuTrigger, Popover, Header, Separator, type MenuItemProps } from "react-aria-components";

export type Teinte = "vert" | "ambre" | "rouge" | "bleu" | "gris";

/* les teintes de l'ancien espace (« noir » compris) ramenées aux nôtres */
export const teinte = (t: string | undefined): Teinte => (t === "vert" || t === "ambre" || t === "rouge" || t === "bleu" ? t : "gris");

export function Badge({ teinte: t = "gris", moyen, children, title }: { teinte?: Teinte; moyen?: boolean; children: React.ReactNode; title?: string }) {
  return (
    <span className={`v2-badge${moyen ? " v2-badge--moyen" : ""}`} data-teinte={t} title={title}>
      {children}
    </span>
  );
}

export function Etat({ teinte: t = "gris", children }: { teinte?: Teinte; children: React.ReactNode }) {
  return (
    <span className="v2-etat">
      <span className="v2-point" data-teinte={t} aria-hidden="true" />
      {children}
    </span>
  );
}

const ICONES = { vert: CheckCircle2, ambre: AlertTriangle, rouge: XCircle, bleu: Info, gris: Info };

export function Note({ teinte: t = "gris", children, role }: { teinte?: Teinte; children: React.ReactNode; role?: "status" | "alert" }) {
  const Icone = ICONES[t];
  return (
    <div className="v2-note" data-teinte={t} role={role}>
      <Icone width={16} height={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}

export function Vide({ icone, titre, children, action }: { icone: React.ReactNode; titre: string; children?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="v2-vide">
      <span className="v2-vide-icone" aria-hidden="true">
        {icone}
      </span>
      <h2>{titre}</h2>
      {children ? <p>{children}</p> : null}
      {action}
    </div>
  );
}

export function Squelette({ largeur = "100%", hauteur = 20, rond }: { largeur?: number | string; hauteur?: number; rond?: boolean }) {
  return <span className="v2-squelette" aria-hidden="true" style={{ width: largeur, height: hauteur, borderRadius: rond ? 999 : undefined }} />;
}

export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="v2-kbd">{children}</kbd>;
}

export function Interrupteur({ actif, onChange, children, desactive }: { actif: boolean; onChange: (v: boolean) => void; children: React.ReactNode; desactive?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={actif} className="v2-interrupteur" disabled={desactive} onClick={() => onChange(!actif)}>
      <span className="v2-interrupteur-rail" aria-hidden="true" />
      {children}
    </button>
  );
}

/* ——— menus ——— */

export function MenuDeroulant({
  declencheur,
  etiquette,
  classe = "v2-btn v2-btn--petit v2-btn--fantome v2-btn--icone",
  placement = "bottom end",
  largeur,
  entete,
  children,
}: {
  declencheur: React.ReactNode;
  etiquette: string;
  classe?: string;
  placement?: "bottom start" | "bottom end" | "bottom" | "top end" | "top start";
  largeur?: number;
  entete?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <MenuTrigger>
      <Button className={classe} aria-label={etiquette}>
        {declencheur}
      </Button>
      <Popover placement={placement} offset={8} className="v2-jetons v2-popover" style={largeur ? { width: largeur } : undefined}>
        {entete}
        <Menu className="v2-menu" aria-label={etiquette}>
          {children}
        </Menu>
      </Popover>
    </MenuTrigger>
  );
}

export function ItemMenu({ icone, suffixe, danger, children, ...props }: MenuItemProps & { icone?: React.ReactNode; suffixe?: React.ReactNode; danger?: boolean; children: React.ReactNode }) {
  const texte = typeof children === "string" ? children : props.textValue;
  return (
    <MenuItem {...props} textValue={texte} className="v2-menu-item" data-danger={danger ? "" : undefined}>
      {icone}
      <span>{children}</span>
      {suffixe ? <span className="v2-menu-item-suffixe">{suffixe}</span> : null}
    </MenuItem>
  );
}

export function SectionMenu({ titre, children }: { titre?: string; children: React.ReactNode }) {
  return (
    <MenuSection>
      {titre ? <Header className="v2-menu-section-titre">{titre}</Header> : null}
      {children}
    </MenuSection>
  );
}

export function SeparateurMenu() {
  return <Separator className="v2-menu-separateur" />;
}

/* la petite jauge circulaire de la carte des compteurs */
export function AnneauJauge({ part, teinte: t = "bleu" }: { part: number; teinte?: Teinte }) {
  const r = 7;
  const c = 2 * Math.PI * r;
  const couleur = t === "rouge" ? "var(--v2-red-700)" : t === "ambre" ? "var(--v2-amber-700)" : t === "vert" ? "var(--v2-green-700)" : t === "gris" ? "var(--v2-gray-600)" : "var(--v2-blue-700)";
  return (
    <svg className="v2-anneau-jauge" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <circle cx="9" cy="9" r={r} stroke="var(--v2-gray-300)" />
      <circle cx="9" cy="9" r={r} stroke={couleur} strokeDasharray={`${Math.max(0, Math.min(1, part)) * c} ${c}`} strokeLinecap="round" />
    </svg>
  );
}
