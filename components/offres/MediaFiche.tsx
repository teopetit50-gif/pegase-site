/* Visuels des fiches moteurs /offres/[system] — 25/07/2026.

   Les fiches reprennent le gabarit de la page de référence (home ocoya.com),
   rempli avec le contenu propre à chaque moteur (lib/fiches.ts). Ce fichier
   ne contient QUE du rendu : il ne fabrique aucune donnée, il met en forme
   `Fiche` — d'où l'absence totale de texte en dur ici hormis les libellés
   d'interface. Rien n'est inventé : un moteur dont le champ est vide ne
   rend pas la section.

   La démo typée (timeline / chat / doc / message / calendar / list) est
   re-rendue dans le langage de cette page — carte blanche, filet 1 px,
   Inter Tight — au lieu du rendu components/demos.tsx qui suit la charte v2
   du reste du site. */

import type { ReactNode } from "react";
import type { Demo } from "@/lib/fiches";
import {
  siAirtable,
  siCalendly,
  siDropbox,
  siGmail,
  siGooglecalendar,
  siGoogledrive,
  siGoogleforms,
  siGooglesheets,
  siHubspot,
  siMailchimp,
  siNotion,
  siPaypal,
  siQuickbooks,
  siShopify,
  siStripe,
  siTelegram,
  siTrello,
  siWhatsapp,
  siWoocommerce,
  siWordpress,
} from "simple-icons";

/* ——————————————————————————————————————————————————————————
   Primitives
   —————————————————————————————————————————————————————————— */

/* Carte de maquette. Toutes ses couleurs viennent des variables `--demo-*`
   posées par `.o-demo` dans globals.css : la variante sombre du gabarit les
   redéfinit en bloc, sans qu'aucune classe soit à réécrire ici. */
export function CarteBlanche({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`o-demo ${className}`}>{children}</div>;
}

/* `flex-wrap` et non un simple `justify-between` : plusieurs moteurs ont un
   titre ET un statut longs (OFFLOAD : « Photo de facture reçue à 11 h 42 » +
   « Classée → Juillet / … »). Sans le retour à la ligne, le titre se cassait
   sur trois lignes dans une colonne de 40 % pendant que le statut gardait
   toute sa largeur. */
function EnteteCarte({ titre, droite }: { titre: string; droite?: ReactNode }) {
  return (
    <div className="o-demo-tete flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-5 py-3.5">
      <span className="o-demo-doux text-[12px] font-semibold">{titre}</span>
      {droite}
    </div>
  );
}

function Jeton({ ton, children }: { ton: "ok" | "warn" | "off"; children: ReactNode }) {
  const tons = {
    ok: "o-demo-jeton--ok",
    warn: "o-demo-jeton--warn",
    off: "o-demo-jeton--off",
  };
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-[6px] px-2 py-[3px] text-[10.5px] font-semibold ${tons[ton]}`}
    >
      {children}
    </span>
  );
}

/* ——————————————————————————————————————————————————————————
   Rendu de la démo typée
   —————————————————————————————————————————————————————————— */

export function DemoFiche({ demo }: { demo: Demo }) {
  if (demo.type === "timeline") {
    return (
      <CarteBlanche>
        <EnteteCarte titre={demo.title} />
        <div className="relative px-5 py-5">
          {/* rail vertical derrière les jalons */}
          <div
            aria-hidden
            className="absolute bottom-9 left-[38px] top-9 w-px bg-[var(--demo-filet)]"
          />
          <div className="relative space-y-3.5">
            {demo.items.map((it) => (
              <div key={it.k + it.label} className="flex items-start gap-3.5">
                <span
                  className="o-demo-jalon z-10 grid h-9 w-[38px] shrink-0 place-items-center rounded-[8px] text-[10px] font-bold"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {it.k}
                </span>
                <div className="pt-0.5">
                  <div className="o-demo-fort text-[13px] font-semibold">{it.label}</div>
                  <div className="o-demo-faible text-[12px] leading-[1.6]">{it.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CarteBlanche>
    );
  }

  if (demo.type === "chat") {
    return (
      <CarteBlanche>
        <EnteteCarte
          titre={demo.title}
          droite={<Jeton ton="ok">{demo.sub}</Jeton>}
        />
        <div className="space-y-2.5 px-5 py-4">
          {demo.messages.map((msg, i) => (
            <div
              key={i}
              className={
                msg.from === "bot"
                  ? "o-demo-envoi ml-auto max-w-[88%] rounded-[12px] rounded-tr-[4px] px-3 py-2.5 text-[12.5px] leading-[1.6]"
                  : "o-demo-recu max-w-[80%] rounded-[12px] rounded-tl-[4px] px-3 py-2.5 text-[12.5px] leading-[1.6]"
              }
            >
              {msg.text}
              <span
                className={`ml-2 text-[10.5px] ${
                  msg.from === "bot" ? "opacity-50" : "o-demo-faible"
                }`}
              >
                {msg.time}
              </span>
            </div>
          ))}
          <div className="o-demo-faible pt-1 text-right text-[11px]">{demo.note}</div>
        </div>
      </CarteBlanche>
    );
  }

  if (demo.type === "doc") {
    return (
      <CarteBlanche>
        <EnteteCarte titre={demo.title} droite={<Jeton ton="ok">{demo.status}</Jeton>} />
        <div className="px-5 py-4">
          <div className="space-y-2">
            {demo.fields.map(([k, v]) => (
              <div
                key={k}
                className="o-demo-sep flex items-baseline justify-between gap-4 pb-2 last:border-0 last:pb-0"
              >
                <span className="o-demo-faible shrink-0 text-[12px]">{k}</span>
                <span className="o-demo-fort text-right text-[12.5px] font-medium">{v}</span>
              </div>
            ))}
          </div>
        </div>
      </CarteBlanche>
    );
  }

  if (demo.type === "message") {
    return (
      <CarteBlanche>
        <EnteteCarte titre={demo.title} />
        <div className="space-y-3.5 px-5 py-4">
          {demo.lines.map((l) => (
            <div key={l.label}>
              <div className="o-demo-faible text-[11px] font-semibold uppercase tracking-[0.06em]">
                {l.label}
              </div>
              <p className="o-demo-doux mt-1 text-[12.5px] leading-[1.7]">{l.text}</p>
            </div>
          ))}
        </div>
      </CarteBlanche>
    );
  }

  if (demo.type === "calendar") {
    return (
      <CarteBlanche>
        <EnteteCarte titre={demo.title} />
        <div className="space-y-1.5 px-4 py-4">
          {demo.items.map((it) => (
            <div
              key={it.day + it.text}
              className="o-demo-ligne flex items-center gap-3 rounded-[9px] px-3 py-2.5"
            >
              <span className="o-demo-faible w-14 shrink-0 text-[11px] font-semibold uppercase tracking-[0.04em]">
                {it.day}
              </span>
              <span className="o-demo-fort min-w-0 flex-1 truncate text-[12.5px]">
                {it.text}
              </span>
              <Jeton ton="off">{it.canal}</Jeton>
            </div>
          ))}
        </div>
      </CarteBlanche>
    );
  }

  /* list */
  return (
    <CarteBlanche>
      <EnteteCarte titre={demo.title} />
      <div className="space-y-1.5 px-4 py-4">
        {demo.items.map((it) => (
          <div
            key={it.text}
            className="o-demo-ligne flex items-center gap-3 rounded-[9px] px-3 py-2.5"
          >
            <span className="o-demo-fort min-w-0 flex-1 text-[12.5px] leading-[1.5]">
              {it.text}
            </span>
            <Jeton ton={it.tone}>{it.badge}</Jeton>
          </div>
        ))}
      </div>
      {demo.footer ? (
        <div className="o-demo-pied o-demo-faible px-4 py-3 text-[11.5px]">
          {demo.footer}
        </div>
      ) : null}
    </CarteBlanche>
  );
}

/* ——————————————————————————————————————————————————————————
   Outils du moteur — les libellés de `fiche.outils` sont de la prose
   (« Google Sheets / Excel », « Gmail / Outlook »). On y cherche les marques
   connues pour poser la bonne icône ; sans correspondance, la pastille rend
   les initiales. Aucune invention : le libellé affiché reste celui de la fiche.
   —————————————————————————————————————————————————————————— */

const MARQUES: { cle: string; m: { path: string; hex: string; title: string } }[] = [
  { cle: "gmail", m: siGmail },
  { cle: "sheets", m: siGooglesheets },
  { cle: "google sheet", m: siGooglesheets },
  { cle: "tableur", m: siGooglesheets },
  { cle: "whatsapp", m: siWhatsapp },
  { cle: "telegram", m: siTelegram },
  { cle: "drive", m: siGoogledrive },
  { cle: "agenda", m: siGooglecalendar },
  { cle: "calendrier", m: siGooglecalendar },
  { cle: "calendly", m: siCalendly },
  { cle: "stripe", m: siStripe },
  { cle: "paypal", m: siPaypal },
  { cle: "quickbooks", m: siQuickbooks },
  { cle: "shopify", m: siShopify },
  { cle: "woocommerce", m: siWoocommerce },
  { cle: "notion", m: siNotion },
  { cle: "airtable", m: siAirtable },
  { cle: "dropbox", m: siDropbox },
  { cle: "trello", m: siTrello },
  { cle: "hubspot", m: siHubspot },
  { cle: "mailchimp", m: siMailchimp },
  { cle: "wordpress", m: siWordpress },
  { cle: "formulaire", m: siGoogleforms },
];

function marquePour(libelle: string) {
  const l = libelle.toLowerCase();
  return MARQUES.find((x) => l.includes(x.cle))?.m;
}

function initiales(libelle: string) {
  return libelle
    .replace(/[/&]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

export function PastillesOutils({ outils }: { outils: string[] }) {
  return (
    <div className="flex items-center">
      {outils.map((o, i) => {
        const m = marquePour(o);
        return (
          <span
            key={o}
            className="o-chip ring-4 ring-[color:var(--chip-anneau)]"
            style={{ marginLeft: i === 0 ? 0 : -20, zIndex: outils.length - i }}
            title={o}
          >
            {m ? (
              <svg viewBox="0 0 24 24" role="img" aria-label={o} fill={`#${m.hex}`}>
                <path d={m.path} />
              </svg>
            ) : (
              <span className="text-[12px] font-bold text-[#52525b]">{initiales(o)}</span>
            )}
          </span>
        );
      })}
    </div>
  );
}

/* Bandeau des outils du moteur — répété pour remplir la piste défilante */
export function BandeauOutilsMoteur({ outils }: { outils: string[] }) {
  const serie = [...outils, ...outils, ...outils, ...outils];
  return (
    <div className="o-marquee">
      <div className="o-marquee-piste o-marquee-piste--lent items-center gap-16">
        {serie.map((o, i) => {
          const m = marquePour(o);
          return (
            <span key={`${o}-${i}`} className="flex shrink-0 items-center gap-2.5 opacity-40">
              {m ? (
                <svg viewBox="0 0 24 24" width="26" height="26" fill="#3f3f46" role="img" aria-label={o}>
                  <path d={m.path} />
                </svg>
              ) : null}
              <span className="whitespace-nowrap text-[19px] font-semibold tracking-[-0.02em] text-[#3f3f46]">
                {o}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   Chaînes de nœuds — reprises de la page catalogue, alimentées par la fiche
   —————————————————————————————————————————————————————————— */

function Glyphe({ d }: { d: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const GLYPHES = {
  check: "M20 6 9 17l-5-5",
  oeil: "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  plume: "M4 20 20 4M14 4h6v6M9 15l-4 4",
  pause: "M9 4v16M15 4v16",
  prise: "M9 2v6M15 2v6M5 8h14v3a7 7 0 0 1-14 0V8ZM12 18v4",
};

/* Les trois garde-fous, identiques pour tous les moteurs : ce sont des règles
   du desk, pas des caractéristiques produit — d'où leur présence en dur ici
   plutôt que dans lib/fiches.ts. */
export function ChaineControle() {
  const noeuds = [
    { label: "Le moteur prépare", ton: "#18181b", icone: GLYPHES.plume },
    { label: "Vous relisez", ton: "#18181b", icone: GLYPHES.oeil, decale: true },
    { label: "Vous validez, ça part", ton: "#2563eb", icone: GLYPHES.check },
    { label: "Ou vous suspendez", ton: "#a1a1aa", icone: GLYPHES.pause, decale: true },
  ];
  return (
    <div className="relative py-2">
      <div aria-hidden className="absolute bottom-6 left-1/2 top-6 z-0 w-px -translate-x-1/2 bg-black/[0.09]" />
      <div className="relative z-10 flex flex-col gap-3">
        {noeuds.map((n) => (
          <div key={n.label} className={`flex ${n.decale ? "justify-end pr-2" : "justify-start pl-2"}`}>
            <span className="o-noeud">
              <span className="o-noeud-icone" style={{ background: n.ton }}>
                <Glyphe d={n.icone} />
              </span>
              {n.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ChaineOutils({ outils }: { outils: string[] }) {
  return (
    <div className="relative py-2">
      <div aria-hidden className="absolute bottom-6 left-1/2 top-6 z-0 w-px -translate-x-1/2 bg-black/[0.09]" />
      <div className="relative z-10 flex flex-col gap-3">
        {outils.map((o, i) => {
          const m = marquePour(o);
          return (
            <div key={o} className={`flex ${i % 2 ? "justify-end pr-2" : "justify-start pl-2"}`}>
              <span className="o-noeud">
                <span className="o-noeud-icone bg-white ring-1 ring-black/[0.12]">
                  {m ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill={`#${m.hex}`} role="img" aria-label={o}>
                      <path d={m.path} />
                    </svg>
                  ) : (
                    <span className="text-[11px] font-bold text-[#3f3f46]">{initiales(o)}</span>
                  )}
                </span>
                {o}
              </span>
            </div>
          );
        })}
        <div className="flex justify-start pl-2">
          <span className="o-noeud">
            <span className="o-noeud-icone" style={{ background: "#2563eb" }}>
              <Glyphe d={GLYPHES.prise} />
            </span>
            Aucun outil à remplacer
          </span>
        </div>
      </div>
    </div>
  );
}

/* ——————————————————————————————————————————————————————————
   Bandeau des autres moteurs — remplace le carrousel de posts de la
   référence par une vraie navigation entre fiches
   —————————————————————————————————————————————————————————— */

export function BandeauAutresMoteurs({
  moteurs,
}: {
  moteurs: { system: string; role: string; pitch: string; href: string }[];
}) {
  const doubles = [...moteurs, ...moteurs];
  return (
    <div className="o-marquee">
      <div className="o-marquee-piste o-marquee-piste--lent gap-6">
        {doubles.map((m, i) => (
          <a key={`${m.system}-${i}`} href={m.href} className="w-[360px] shrink-0">
            <CarteBlanche className="h-full transition-transform duration-300 hover:-translate-y-1">
              <div className="px-6 py-6">
                <div
                  className="o-demo-fort text-[22px] font-semibold tracking-[-0.02em]"
                  style={{ fontFamily: "var(--font-jakarta)" }}
                >
                  {m.system}
                </div>
                <div className="o-demo-doux mt-0.5 text-[13px] font-medium">{m.role}</div>
                <p className="o-demo-faible mt-3 text-[14px] leading-[1.7]">{m.pitch}</p>
              </div>
            </CarteBlanche>
          </a>
        ))}
      </div>
    </div>
  );
}
