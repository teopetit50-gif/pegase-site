"use client";

/* L'aperçu de droite de /bienvenue (07/10/2026).

   Un cockpit en os gris — barre latérale, liste, tableau — et, posé
   dessus, un encart cerclé de bleu qui GROSSIT la partie que l'étape
   remplit, comme sur la référence :
   1. le sélecteur d'espace : logo (ou initiale) et nom, tapés en direct ;
   2. les listes de l'espace : celles du métier choisi, puis celles des
      priorités cochées — elles changent à chaque clic ;
   3. ce qui entre dans Omega : messagerie, pièces, formulaire du site,
      reliés au tableau des clients ;
   4. l'en-tête du cockpit, et les personnes invitées en lignes du tableau.

   Purement décoratif : le parent le pose en aria-hidden. */

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowDown,
  ArrowUpDown,
  Bell,
  ChartColumn,
  ChevronDown,
  CircleHelp,
  Columns2,
  Contact,
  EllipsisVertical,
  File,
  FileText,
  Globe,
  ListFilter,
  Mail,
  MapPin,
  MessagesSquare,
  PanelLeft,
  Play,
  Plus,
  Search,
  Send,
  SquareCheck,
  Upload,
  Video,
  Workflow,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { PRIORITES, type Metier } from "./donnees";

type Props = {
  etape: number;
  entreprise: string;
  logo: string | null;
  metier: Metier | undefined;
  priorites: string[];
  invitations: string[];
  email: string;
};

const ICONE = "size-4 shrink-0 text-[#8a8b91]";

function Os({ l, className = "" }: { l: number; className?: string }) {
  return <span className={`bv-os block ${className}`} style={{ width: l }} />;
}

/* la barre latérale du cockpit, en os */
const RAIL: { icone: LucideIcon; l: number; sous?: boolean }[] = [
  { icone: Bell, l: 88 },
  { icone: SquareCheck, l: 80 },
  { icone: File, l: 60 },
  { icone: Mail, l: 68 },
  { icone: Video, l: 72 },
  { icone: ChartColumn, l: 62 },
  { icone: Play, l: 60 },
  { icone: Send, l: 70, sous: true },
  { icone: Workflow, l: 56, sous: true },
];

function Rail() {
  return (
    <div className="absolute bottom-0 left-[22%] top-[150px] w-[48%] border-r border-[var(--bv-filet)] bg-[#0f1112]">
      <div className="space-y-[22px] px-5 pt-[34px]">
        {RAIL.map(({ icone: I, l, sous }, i) => (
          <div key={i} className={`flex items-center gap-3 ${sous ? "pl-6" : ""}`}>
            <I className={ICONE} />
            <Os l={l} />
            {i === 6 && <ChevronDown className="size-3.5 text-[#6b6c72]" />}
          </div>
        ))}
        <div className="flex items-center gap-3">
          <ChevronDown className="size-3.5 text-[#6b6c72]" />
          <Os l={56} />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="size-4 rounded-[5px] bg-[#2a3a5c]" />
            <Os l={52 + i * 12} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Liste({ titre }: { titre: string }) {
  return (
    <div className="absolute bottom-0 left-[70%] right-0 top-[150px] bg-[#0f1112]">
      <div className="flex h-[60px] items-center gap-2 border-b border-[var(--bv-filet)] pl-4">
        <span className="grid size-5 place-items-center rounded-[5px] bg-[var(--bv-bleu)]">
          <Contact className="size-3 text-white" />
        </span>
        <span className="text-[15px] font-medium">{titre}</span>
      </div>
      <div className="flex h-[60px] items-center gap-2 border-b border-[var(--bv-filet)] pl-4">
        <span className="flex h-9 items-center gap-2 rounded-lg border border-[var(--bv-champ-filet)] px-2">
          <span className="size-4 rounded-[4px] bg-[#1f9d55]" />
          <Os l={60} />
          <ChevronDown className="size-3.5 text-[#6b6c72]" />
        </span>
      </div>
      <div className="flex h-[60px] items-center gap-2 border-b border-[var(--bv-filet)] pl-4">
        <span className="flex h-8 items-center gap-2 rounded-lg border border-dashed border-[var(--bv-champ-filet)] px-2">
          <ArrowUpDown className="size-3.5 text-[#8a8b91]" />
          <Os l={52} />
        </span>
      </div>
      {Array.from({ length: 11 }, (_, i) => (
        <div key={i} className="flex h-[46px] items-center gap-3 border-b border-[var(--bv-filet)] pl-4">
          <span className="size-4 rounded-[4px] border border-[var(--bv-champ-filet)]" />
          <span className="size-4 rounded-full bg-[var(--bv-os)]" />
          <Os l={70 + ((i * 37) % 50)} />
        </div>
      ))}
    </div>
  );
}

function Zoom({ children, className }: { children: React.ReactNode; className: string }) {
  const reduit = useReducedMotion();
  return (
    <motion.div
      initial={reduit ? { opacity: 0 } : { opacity: 0, scale: 0.96, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={`bv-zoom absolute shadow-[0_30px_80px_rgba(0,0,0,0.5)] ${className}`}
    >
      <div>{children}</div>
    </motion.div>
  );
}

/* ——— 1. le sélecteur d'espace ——— */
function Espace({ entreprise, logo }: Pick<Props, "entreprise" | "logo">) {
  const nom = entreprise.trim() || "Votre entreprise";
  const initiale = (entreprise.trim()[0] ?? "O").toUpperCase();
  return (
    <Zoom className="left-[10%] top-[118px] w-[66%]">
      <div className="flex h-[66px] items-center gap-3 border-b border-[var(--bv-filet)] px-4">
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-[8px] border border-[var(--bv-champ-filet)] bg-[var(--bv-pastille)] text-[15px] text-[var(--bv-texte-2)]">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="size-full object-cover" />
          ) : (
            initiale
          )}
        </span>
        <span className="truncate text-[20px] font-semibold tracking-[-0.01em]">{nom}</span>
        <ChevronDown className="size-4 shrink-0 text-[var(--bv-texte-2)]" />
        <PanelLeft className="ml-auto size-5 shrink-0 text-[var(--bv-texte-2)]" />
      </div>
      <div className="flex items-center gap-2 p-3">
        <span className="flex h-10 flex-1 items-center gap-2 rounded-lg border border-[var(--bv-champ-filet)] px-2">
          <span className="grid size-5 place-items-center rounded-[5px] border border-[#8a8b91] text-[10px] text-[#8a8b91]">
            Ω
          </span>
          <Os l={110} />
          <span className="ml-auto flex gap-1">
            <kbd className="grid size-6 place-items-center rounded-md border border-[var(--bv-champ-filet)] text-[11px] text-[#8a8b91]">⌘</kbd>
            <kbd className="grid size-6 place-items-center rounded-md border border-[var(--bv-champ-filet)] text-[11px] text-[#8a8b91]">K</kbd>
          </span>
        </span>
        <span className="flex h-10 items-center gap-2 rounded-lg border border-[var(--bv-champ-filet)] px-2">
          <Search className="size-4 text-[var(--bv-texte-2)]" />
          <kbd className="grid size-6 place-items-center rounded-md border border-[var(--bv-champ-filet)] text-[11px] text-[#8a8b91]">/</kbd>
        </span>
      </div>
    </Zoom>
  );
}

/* ——— 2. les listes de l'espace ——— */
function Listes({ metier, priorites }: Pick<Props, "metier" | "priorites">) {
  const reduit = useReducedMotion();
  const noms = [
    ...(metier?.listes ?? []),
    ...PRIORITES.filter((p) => priorites.includes(p.cle)).map((p) => p.liste),
  ].filter((n, i, t) => t.indexOf(n) === i);
  const vides = Math.max(0, 5 - noms.length);
  return (
    <Zoom className="left-[10%] top-[300px] w-[62%]">
      <div className="px-5 py-4">
        <div className="flex items-center gap-3 pb-2">
          <ChevronDown className="size-3.5 text-[#8a8b91]" />
          <Os l={56} />
        </div>
        <AnimatePresence initial={false} mode="popLayout">
          {noms.map((n) => (
            <motion.div
              key={n}
              layout={!reduit}
              initial={reduit ? { opacity: 0 } : { opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex h-[48px] items-center gap-3"
            >
              <span className="grid size-6 place-items-center rounded-[6px] bg-[var(--bv-bleu)]">
                <FileText className="size-3.5 text-white" />
              </span>
              <span className="text-[19px] font-medium tracking-[-0.01em]">{n}</span>
            </motion.div>
          ))}
          {Array.from({ length: vides }, (_, i) => (
            <motion.div key={`v${i}`} layout={!reduit} className="flex h-[48px] items-center gap-3">
              <span className="size-6 rounded-[6px] bg-[var(--bv-os)]" />
              <Os l={68} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Zoom>
  );
}

/* ——— 3. ce qui entre dans Omega ——— */
function Sources() {
  const reduit = useReducedMotion();
  const pilules: { icone: LucideIcon; texte: string }[] = [
    { icone: Mail, texte: "E-mails + Agenda" },
    { icone: FileText, texte: "Factures et pièces jointes" },
    { icone: Globe, texte: "Formulaire de votre site" },
  ];
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="absolute inset-0"
    >
      <div className="flex flex-col items-center gap-[30px] pt-[84px]">
        {pilules.map(({ icone: I, texte }, i) => (
          <motion.span
            key={texte}
            initial={reduit ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.25 }}
            className="flex h-[46px] items-center gap-2.5 rounded-[12px] border border-[var(--bv-filet)] bg-[#0f1112] px-4 text-[17px] shadow-[0_10px_30px_rgba(0,0,0,0.35)]"
          >
            <I className="size-[18px] text-[var(--bv-texte-2)]" />
            {texte}
          </motion.span>
        ))}
        <span className="grid size-10 place-items-center rounded-[10px] border border-[var(--bv-filet)] bg-[#0f1112]">
          <ArrowDown className="size-4 text-[var(--bv-texte-2)]" />
        </span>
      </div>
      {/* les fils qui descendent vers le tableau */}
      <svg className="absolute left-1/2 top-[386px] -translate-x-1/2" width="380" height="54" viewBox="0 0 380 54" fill="none">
        {[0, 1, 2].map((i) => (
          <g key={i} stroke="var(--bv-bleu)" strokeWidth="1.5">
            <path d={`M${190 - 14 * (i + 1)} 0 C ${190 - 14 * (i + 1)} 20, ${30 + 22 * i} 6, ${30 + 22 * i} 54`} />
            <path d={`M${190 + 14 * (i + 1)} 0 C ${190 + 14 * (i + 1)} 20, ${350 - 22 * i} 6, ${350 - 22 * i} 54`} />
          </g>
        ))}
      </svg>
      <div className="bv-fondu absolute bottom-0 left-0 right-0 top-[440px] border-t border-[var(--bv-filet)] bg-[#0f1112]">
        <div className="flex h-[62px] items-center gap-2 border-b border-[var(--bv-filet)] pl-5">
          <span className="text-[16px] font-medium">Clients</span>
        </div>
        <div className="flex h-[62px] items-center gap-3 border-b border-[var(--bv-filet)] pl-5">
          <span className="flex h-9 items-center gap-2 rounded-lg border border-[var(--bv-champ-filet)] px-2">
            <span className="size-3 rounded-[3px] bg-[#1f9d55]" />
            <Os l={70} />
            <ChevronDown className="size-3.5 text-[#6b6c72]" />
          </span>
          <span className="flex h-9 items-center gap-2 rounded-lg border border-[var(--bv-champ-filet)] px-2">
            <Columns2 className="size-4 text-[#8a8b91]" />
            <Os l={80} />
            <ChevronDown className="size-3.5 text-[#6b6c72]" />
          </span>
        </div>
        <div className="flex h-[62px] items-center gap-3 border-b border-[var(--bv-filet)] pl-5">
          <span className="flex h-8 items-center gap-2 rounded-lg border border-dashed border-[var(--bv-champ-filet)] px-2">
            <ArrowUpDown className="size-3.5 text-[#8a8b91]" />
            <Os l={60} />
          </span>
          <span className="flex h-8 items-center gap-2 rounded-lg border border-dashed border-[var(--bv-champ-filet)] px-2">
            <ListFilter className="size-3.5 text-[#8a8b91]" />
            <Os l={50} />
          </span>
        </div>
        <div className="grid h-[50px] grid-cols-[1.2fr_1fr_0.6fr] items-center border-b border-[var(--bv-filet)] text-[#8a8b91]">
          <span className="flex items-center justify-between px-3">
            <Os l={110} />
            <Plus className="size-4" />
          </span>
          <span className="flex h-full items-center justify-between border-l border-[var(--bv-filet)] px-3">
            <Contact className="size-4" />
            <Zap className="size-4" />
          </span>
          <span className="flex h-full items-center gap-2 border-l border-[var(--bv-filet)] px-3">
            <MapPin className="size-4" />
            <Os l={60} />
          </span>
        </div>
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="grid h-[46px] grid-cols-[1.2fr_1fr_0.6fr] items-center border-b border-[var(--bv-filet)]">
            <span className="flex items-center gap-2 px-3">
              <span className="size-4 rounded-full bg-[var(--bv-os)]" />
              <Os l={90 + ((i * 23) % 30)} />
            </span>
            <span className="h-full border-l border-[var(--bv-filet)]" />
            <span className="h-full border-l border-[var(--bv-filet)]" />
          </div>
        ))}
      </div>
    </motion.div>
  );
}

/* ——— 4. l'équipe ——— */
function Equipe({ invitations, email }: Pick<Props, "invitations" | "email">) {
  const reduit = useReducedMotion();
  const initiale = (email.trim()[0] ?? "O").toUpperCase();
  return (
    <motion.div
      initial={reduit ? { opacity: 0 } : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className="bv-fondu absolute bottom-0 left-0 right-[10%] top-[165px] rounded-tr-[14px] border-r border-t border-[var(--bv-filet)] bg-[#0f1112]"
    >
      <div className="flex h-[68px] items-center justify-end gap-4 border-b border-[var(--bv-filet)] pr-4">
        <span className="grid size-7 place-items-center rounded-full bg-[#1a9fbf] text-[13px] font-medium text-white">
          {initiale}
        </span>
        <span className="h-5 w-px bg-[var(--bv-filet)]" />
        <MessagesSquare className="size-[18px] text-[var(--bv-texte-2)]" />
        <CircleHelp className="size-[18px] text-[var(--bv-texte-2)]" />
        <EllipsisVertical className="size-[18px] text-[var(--bv-texte-2)]" />
      </div>
      <div className="flex h-[70px] items-center justify-end gap-4 border-b border-[var(--bv-filet)] pr-4">
        <span className="flex h-11 items-center gap-3 rounded-lg border border-[var(--bv-champ-filet)] px-3">
          <Upload className="size-4 text-[var(--bv-texte-2)]" />
          <Os l={110} />
        </span>
        <span className="flex h-11 items-center gap-3 rounded-lg bg-[var(--bv-bleu)] px-3 shadow-[0_0_0_3px_var(--bv-bleu-anneau)]">
          <Plus className="size-4 text-white" />
          <span className="h-2 w-7 rounded-full bg-white/60" />
          <span className="h-2 w-20 rounded-full bg-white/60" />
        </span>
      </div>
      <div className="h-[70px] border-b border-[var(--bv-filet)]" />
      <div className="grid h-[58px] grid-cols-[0.6fr_1.4fr_1fr] border-b border-[var(--bv-filet)] text-[#8a8b91]">
        <span className="flex items-center justify-end pr-4">
          <Zap className="size-4" />
        </span>
        <span className="flex items-center gap-3 border-l border-[var(--bv-filet)] px-4">
          <Mail className="size-4" />
          <Os l={120} />
        </span>
        <span className="flex items-center gap-3 border-l border-[var(--bv-filet)] px-4">
          <Contact className="size-4" />
          <Os l={100} />
        </span>
      </div>
      <AnimatePresence initial={false}>
        {Array.from({ length: 9 }, (_, i) => {
          const adresse = invitations[i];
          return (
            <div key={i} className="grid h-[52px] grid-cols-[0.6fr_1.4fr_1fr] border-b border-[var(--bv-filet)]">
              <span />
              <span className="flex min-w-0 items-center gap-2 border-l border-[var(--bv-filet)] px-4">
                {adresse && (
                  <motion.span
                    key={adresse}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[#2a3a5c] text-[11px] text-white">
                      {adresse[0].toUpperCase()}
                    </span>
                    <span className="truncate text-[14px] text-[var(--bv-texte)]">{adresse}</span>
                  </motion.span>
                )}
              </span>
              <span className="flex items-center border-l border-[var(--bv-filet)] px-4">
                {adresse && <span className="text-[13px] text-[var(--bv-texte-2)]">Invitation demandée</span>}
              </span>
            </div>
          );
        })}
      </AnimatePresence>
    </motion.div>
  );
}

export function Apercu(p: Props) {
  const cockpit = p.etape <= 2;
  return (
    <div className="absolute inset-0">
      <AnimatePresence>
        {cockpit && (
          <motion.div
            key="cockpit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="bv-fondu absolute inset-0"
          >
            <Rail />
            <Liste titre={p.metier?.listes[0] ?? "Clients"} />
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence mode="wait">
        {p.etape === 1 && <Espace key="e1" entreprise={p.entreprise} logo={p.logo} />}
        {p.etape === 2 && <Listes key="e2" metier={p.metier} priorites={p.priorites} />}
        {p.etape === 3 && <Sources key="e3" />}
        {p.etape === 4 && <Equipe key="e4" invitations={p.invitations} email={p.email} />}
      </AnimatePresence>
    </div>
  );
}
