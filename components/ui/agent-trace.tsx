"use client";

import * as React from "react";
import { CircleAlert, Cpu, FileText, Pause, Play, Wrench, Zap, Bot } from "lucide-react";
import { cn } from "@/lib/cn";

/* ══════════════════════════════════════════════════════════════════════
   AgentTrace — le déroulé d'une exécution sur un axe de temps, qu'on
   peut rejouer à la main. Repris de 21st.dev (16/09/2026) pour
   /offres/sur-mesure.

   ── CE QUI A ÉTÉ ADAPTÉ, ET POURQUOI ─────────────────────────────────
   Le comportement n'a PAS bougé : mise en page, tête de lecture,
   défilement au pointeur, clavier, `prefers-reduced-motion`, boucle
   d'animation qui n'écrit qu'une variable CSS par ligne et par image.
   Ne pas y toucher sans relire les commentaires d'origine.

   Trois choses ont changé, toutes imposées par ce dépôt :

   1. `cn` vient de `@/lib/cn`. Il n'y a pas de `lib/utils` ici.

   2. TOUTES LES CLASSES DE COULEUR ONT ÉTÉ REMPLACÉES. L'original est
      écrit en jetons shadcn — `bg-card`, `text-muted-foreground`,
      `bg-primary`, `border-border`, `bg-destructive`, `ring-ring`. Ce
      site n'a AUCUN de ces jetons : son `@theme` ne déclare que
      `--color-bg`, `--color-panel`, `--color-line`, `--color-muted` et
      trois accents. En Tailwind v4 une utilitaire n'existe que si son
      jeton existe — `bg-card` n'aurait donc rien peint, sans une erreur,
      et le composant serait arrivé transparent sur fond blanc.
      L'habillage est porté par des classes `smd-trace-*` définies dans
      app/offres/sur-mesure/sur-mesure.css, avec le reste de la page.
      Conséquence à connaître : ce composant n'est PAS réutilisable tel
      quel ailleurs sur le site. Pour le poser sur une autre page, y
      copier le bloc `smd-trace-*` et le renommer.

   3. Les textes sont en français, y compris ceux que lit un lecteur
      d'écran (`queued` → « en attente », etc.). Le site est français.

   4. L'ÉCHELLE DES COLONNES A QUITTÉ LE COMPOSANT. Les paliers d'origine
      étaient calés sur des intitulés anglais courts et laissaient 28 px
      à l'axe de temps sur un conteneur de 452 — le composant arrivait
      illisible sur téléphone et sur petite tablette. `--gutter` et
      `--meta`, le pli de la ligne sous 32 rem, et ce qui s'affiche à
      chaque palier sont désormais dans la section 8 bis de
      sur-mesure.css, relevés sur les textes réels. Les classes
      `smd-trace-cadre`, `smd-trace-couloir`, `smd-trace-trame` et
      `smd-trace-lecture` n'existent que pour ça : ne pas les retirer.

   Les `tokens` de l'original (« 1 240 tk ») ne sont pas utilisés :
   c'est du vocabulaire de fournisseur de modèles, que le site ne nomme
   jamais. Le champ reste dans le type, la colonne affiche `detail`.
   ══════════════════════════════════════════════════════════════════════ */

export type SpanKind = "agent" | "model" | "tool" | "io";
export type SpanStatus = "ok" | "error" | "cached";

export interface TraceSpan {
  id: string;
  label: string;
  start: number;
  end: number;
  kind?: SpanKind;
  status?: SpanStatus;
  parentId?: string;
  detail?: string;
  tokens?: number;
  attempt?: number;
}

export interface AgentTraceProps extends React.ComponentProps<"div"> {
  spans: TraceSpan[];
  duration?: number;
  runId?: string;
  model?: string;
  defaultTime?: number;
  autoPlay?: boolean;
  loop?: boolean;
  speed?: number;
  holdMs?: number;
  showRuler?: boolean;
  showTransport?: boolean;
  showTokens?: boolean;
  labelWidth?: number;
  rowHeight?: number;
  onSpanSelect?: (span: TraceSpan) => void;
}

interface LaidSpan extends TraceSpan {
  depth: number;
  dur: number;
}

interface RowHandle {
  el: HTMLElement;
  meta: HTMLElement | null;
  dur: HTMLElement | null;
  status: HTMLElement | null;
  span: LaidSpan;
  lastP: number;
  lastState: string;
  lastMeta: string;
  lastDur: string;
}

const KIND_ICON = { agent: Bot, model: Cpu, tool: Wrench, io: FileText } as const;
const NICE_TICKS = [50, 100, 250, 500, 1000, 2000, 2500, 5000, 10_000, 30_000, 60_000];

const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v);

/* Séparateur de milliers déterministe — `toLocaleString` ne rend pas la
   même chose sur le serveur et dans le navigateur. */
const groupDigits = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/* Virgule décimale : on est en français. */
const formatMs = (ms: number) =>
  ms < 1000
    ? `${Math.round(ms)} ms`
    : `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1).replace(".", ",")} s`;

const metaText = (span: LaidSpan, progress: number, showTokens: boolean) =>
  span.tokens != null && showTokens
    ? `${groupDigits(Math.round(span.tokens * progress))} tk`
    : progress >= 1
      ? (span.detail ?? "")
      : "";

const STATUS_WORD = {
  queued: "en attente",
  running: "en cours",
  done: "terminée",
  error: "en échec",
} as const;

const statusWord = (span: LaidSpan, state: keyof typeof STATUS_WORD) =>
  state === "done" && span.status === "cached" ? "servie depuis le cache" : STATUS_WORD[state];

const useIsomorphicLayoutEffect =
  typeof window === "undefined" ? React.useEffect : React.useLayoutEffect;

/* Aplatit les étapes : les enfants sous leur parent, les frères par heure
   de départ ; les cycles et les orphelins sont tolérés. */
function layout(spans: TraceSpan[]): LaidSpan[] {
  const children = new Map<string, TraceSpan[]>();
  const ids = new Set(spans.map((s) => s.id));
  for (const s of spans) {
    const key = s.parentId && s.parentId !== s.id && ids.has(s.parentId) ? s.parentId : "";
    const list = children.get(key);
    if (list) list.push(s);
    else children.set(key, [s]);
  }
  const out: LaidSpan[] = [];
  const seen = new Set<string>();
  const walk = (parent: string, depth: number) => {
    for (const kid of (children.get(parent) ?? []).slice().sort((a, b) => a.start - b.start)) {
      if (seen.has(kid.id)) continue;
      seen.add(kid.id);
      out.push({ ...kid, depth, dur: Math.max(0, kid.end - kid.start) });
      walk(kid.id, depth + 1);
    }
  };
  walk("", 0);
  for (const s of spans)
    if (!seen.has(s.id)) out.push({ ...s, depth: 0, dur: Math.max(0, s.end - s.start) });
  return out;
}

interface TraceSpanRowProps {
  span: LaidSpan;
  index: number;
  total: number;
  showTokens: boolean;
  selected: boolean;
  onSelect: (span: LaidSpan) => void;
  register: (index: number, handle: RowHandle | null) => void;
}

export const TraceSpanRow = React.memo(function TraceSpanRow({
  span,
  index,
  total,
  showTokens,
  selected,
  onSelect,
  register,
}: TraceSpanRowProps) {
  const Icon = KIND_ICON[span.kind ?? "tool"];
  const accent = span.kind === "agent" || span.kind === "model";
  const settled = span.status === "error" ? "error" : "done";
  const left = `${(span.start / total) * 100}%`;
  const width = `${(span.dur / total) * 100}%`;

  return (
    <div
      ref={(node) => {
        register(
          index,
          node
            ? {
                el: node,
                meta: node.querySelector<HTMLElement>("[data-part='meta']"),
                dur: node.querySelector<HTMLElement>("[data-part='dur']"),
                status: node.querySelector<HTMLElement>("[data-part='status']"),
                span,
                lastP: 1,
                lastState: settled,
                lastMeta: metaText(span, 1, showTokens),
                lastDur: formatMs(span.dur),
              }
            : null
        );
      }}
      data-slot="trace-span"
      data-state={settled}
      data-selected={selected ? "true" : undefined}
      style={{ "--p": 1 } as React.CSSProperties}
      className="smd-trace-ligne group/row relative flex h-[var(--row)] items-center px-[var(--pad)]"
    >
      {span.depth > 0 && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-[var(--pad)]">
          {Array.from({ length: span.depth }, (_, d) => (
            <span
              key={d}
              className="smd-trace-rail absolute inset-y-0 w-px"
              style={{ left: `${d * 12 + 11}px` }}
            />
          ))}
        </div>
      )}

      <span data-part="status" className="sr-only">
        {statusWord(span, settled)}
      </span>

      <button
        type="button"
        data-slot="trace-span-label"
        onClick={() => onSelect(span)}
        aria-label={`${span.label}, ${formatMs(span.dur)}${
          span.attempt != null && span.attempt > 1 ? `, tentative ${span.attempt}` : ""
        }`}
        className="smd-trace-nom flex w-[var(--gutter)] shrink-0 cursor-pointer items-center gap-1.5 rounded-md py-1 pr-2 text-left outline-none"
        style={{ paddingLeft: `${span.depth * 12 + 4}px` }}
      >
        <Icon
          aria-hidden="true"
          className={cn("smd-trace-ico size-3.5 shrink-0", accent && "smd-trace-ico--accent")}
        />
        <span className="smd-trace-lbl truncate">{span.label}</span>
        {span.attempt != null && span.attempt > 1 && (
          <span className="smd-trace-essai shrink-0 rounded-md px-1">×{span.attempt}</span>
        )}
      </button>

      <div className="smd-trace-couloir relative h-full flex-1">
        <div
          className="absolute top-1/2 h-2 min-w-[3px] -translate-y-1/2 overflow-hidden rounded-full"
          style={{ left, width }}
        >
          <span aria-hidden="true" className="smd-trace-fantome absolute inset-0" />
          <span
            aria-hidden="true"
            className={cn(
              "smd-trace-jauge absolute inset-0 origin-left",
              span.status === "error"
                ? "smd-trace-jauge--echec"
                : accent
                  ? "smd-trace-jauge--accent"
                  : span.status === "cached"
                    ? "smd-trace-jauge--cache"
                    : ""
            )}
            style={{ transform: "scaleX(var(--p,1))" }}
          />
        </div>
      </div>

      <div className="smd-trace-resultat flex w-[var(--meta)] shrink-0 items-center justify-end gap-1.5 pl-2">
        {span.status === "error" && (
          <CircleAlert aria-hidden="true" className="smd-trace-ico-echec size-3.5 shrink-0" />
        )}
        {span.status === "cached" && (
          <Zap aria-hidden="true" className="smd-trace-ico-cache size-3 shrink-0" />
        )}
        <span data-part="meta" className="smd-trace-meta truncate">
          {metaText(span, 1, showTokens)}
        </span>
        <span
          data-part="dur"
          className={cn(
            "smd-trace-duree shrink-0",
            span.status === "error" && "smd-trace-duree--echec"
          )}
        >
          {formatMs(span.dur)}
        </span>
      </div>
    </div>
  );
});

export function AgentTrace({
  spans,
  duration,
  runId = "exécution",
  model,
  defaultTime = 0,
  autoPlay = true,
  loop = false,
  speed = 1,
  holdMs = 900,
  showRuler = true,
  showTransport = true,
  showTokens = false,
  labelWidth = 200,
  rowHeight = 34,
  onSpanSelect,
  className,
  style,
  ref,
  ...rest
}: AgentTraceProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const railRef = React.useRef<HTMLDivElement>(null);
  const clockRef = React.useRef<HTMLSpanElement>(null);
  const statusRef = React.useRef<HTMLSpanElement>(null);
  const rowsRef = React.useRef<(RowHandle | null)[]>([]);
  const timeRef = React.useRef(defaultTime);
  const playingRef = React.useRef(false);
  const seekRef = React.useRef<(ms: number) => void>(() => {});
  const runRef = React.useRef<() => void>(() => {});
  const haltRef = React.useRef<() => void>(() => {});
  const [playing, setPlaying] = React.useState(false);
  const [selected, setSelected] = React.useState<string | null>(null);

  const rows = React.useMemo(() => layout(spans), [spans]);
  const total = React.useMemo(
    () => Math.max(1, duration ?? rows.reduce((max, s) => Math.max(max, s.end), 0)),
    [rows, duration]
  );
  const ticks = React.useMemo(() => {
    const step = NICE_TICKS.find((t) => total / t <= 8) ?? total / 4;
    const out: number[] = [];
    for (let t = step; t < total; t += step) out.push(t);
    return out;
  }, [total]);

  const opts = React.useRef({ loop, speed, holdMs, showTokens, total });
  useIsomorphicLayoutEffect(() => {
    opts.current = { loop, speed, holdMs, showTokens, total };
  });

  const registerRow = React.useCallback((index: number, handle: RowHandle | null) => {
    rowsRef.current[index] = handle;
  }, []);

  useIsomorphicLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;
    let last = 0;
    let holdUntil = 0;
    let onScreen = true;
    let ariaAt = -1;

    let lastT = "";
    let lastRun = "";
    const paint = () => {
      const t = timeRef.current;
      const o = opts.current;
      const ratio = (t / o.total).toFixed(5);
      if (ratio !== lastT) {
        root.style.setProperty("--t", ratio);
        lastT = ratio;
      }

      for (const row of rowsRef.current) {
        if (!row) continue;
        const { span } = row;
        const p =
          span.dur > 0 ? clamp((t - span.start) / span.dur, 0, 1) : t >= span.start ? 1 : 0;
        if (p !== row.lastP) {
          row.el.style.setProperty("--p", p.toFixed(4));
          row.lastP = p;
        }
        const state =
          t < span.start ? "queued" : p < 1 ? "running" : span.status === "error" ? "error" : "done";
        if (state !== row.lastState) {
          row.el.dataset.state = state;
          if (row.status) row.status.textContent = statusWord(span, state);
          row.lastState = state;
        }
        const dur = state === "queued" ? "" : formatMs(span.dur * p);
        if (row.dur && dur !== row.lastDur) {
          row.dur.textContent = dur;
          row.lastDur = dur;
        }
        const meta = state === "queued" ? "" : metaText(span, p, o.showTokens);
        if (row.meta && meta !== row.lastMeta) {
          row.meta.textContent = meta;
          row.lastMeta = meta;
        }
      }

      if (clockRef.current)
        clockRef.current.textContent = `${(t / 1000).toFixed(2).replace(".", ",")} s / ${(
          o.total / 1000
        )
          .toFixed(2)
          .replace(".", ",")} s`;
      const runState = t >= o.total ? "complete" : "running";
      if (runState !== lastRun) {
        root.dataset.run = runState;
        if (statusRef.current)
          statusRef.current.textContent = runState === "complete" ? "Terminée" : "En cours";
        lastRun = runState;
      }

      const rail = playingRef.current ? null : railRef.current;
      const decis = Math.round(t / 100);
      if (rail && decis !== ariaAt) {
        ariaAt = decis;
        rail.setAttribute("aria-valuenow", String(Math.round(t)));
        rail.setAttribute("aria-valuetext", `${formatMs(t)} sur ${formatMs(o.total)}`);
      }
    };

    const frame = (now: number) => {
      raf = 0;
      const o = opts.current;
      const dt = Math.min(now - (last || now), 100);
      last = now;
      if (holdUntil > 0) {
        if (now >= holdUntil) {
          holdUntil = 0;
          timeRef.current = 0;
        }
      } else {
        timeRef.current += dt * o.speed;
        if (timeRef.current >= o.total) {
          timeRef.current = o.total;
          if (o.loop) holdUntil = now + o.holdMs;
          else {
            playingRef.current = false;
            setPlaying(false);
          }
        }
      }
      paint();
      if (playingRef.current) raf = requestAnimationFrame(frame);
    };

    const start = () => {
      if (raf || !playingRef.current || !onScreen || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const halt = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    runRef.current = start;
    haltRef.current = halt;
    seekRef.current = (ms: number) => {
      timeRef.current = clamp(ms, 0, opts.current.total);
      holdUntil = 0;
      last = 0;
      paint();
    };

    if (media.matches) {
      timeRef.current = opts.current.total;
    } else if (autoPlay) {
      playingRef.current = true;
      setPlaying(true);
    }
    paint();

    const onVisibility = () => (document.hidden ? halt() : start());
    const onMedia = () => {
      if (!media.matches) return;
      playingRef.current = false;
      setPlaying(false);
      halt();
      seekRef.current(opts.current.total);
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry?.isIntersecting ?? true;
        if (onScreen) start();
        else halt();
      },
      { threshold: 0 }
    );

    io.observe(root);
    document.addEventListener("visibilitychange", onVisibility);
    media.addEventListener("change", onMedia);
    start();

    return () => {
      halt();
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      media.removeEventListener("change", onMedia);
      runRef.current = () => {};
      haltRef.current = () => {};
      seekRef.current = () => {};
    };
  }, [autoPlay]);

  useIsomorphicLayoutEffect(() => {
    rowsRef.current.length = rows.length;
    seekRef.current(timeRef.current);
  }, [rows, total, showTokens, rowHeight, labelWidth]);

  const appliedDefault = React.useRef(defaultTime);
  useIsomorphicLayoutEffect(() => {
    if (appliedDefault.current === defaultTime) return;
    appliedDefault.current = defaultTime;
    seekRef.current(defaultTime);
  }, [defaultTime]);

  const togglePlay = () => {
    const next = !playingRef.current;
    if (next && timeRef.current >= total) timeRef.current = 0;
    playingRef.current = next;
    setPlaying(next);
    seekRef.current(timeRef.current);
    if (next) runRef.current();
    else haltRef.current();
  };

  const scrubFrom = (clientX: number, el: HTMLElement) => {
    const inset = Number(el.dataset.inset ?? 0);
    const rect = el.getBoundingClientRect();
    const width = rect.width - inset * 2;
    if (width > 0) seekRef.current(((clientX - rect.left - inset) / width) * total);
  };
  const onScrubDown = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    scrubFrom(e.clientX, e.currentTarget);
  };
  const onScrubMove = (e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) scrubFrom(e.clientX, e.currentTarget);
  };
  const onScrubUp = (e: React.PointerEvent<HTMLElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const onRailKeyDown = (e: React.KeyboardEvent) => {
    const step = total / 50;
    const delta: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * 10,
      PageDown: step * -10,
    };
    if (e.key === "Home") seekRef.current(0);
    else if (e.key === "End") seekRef.current(total);
    else if (e.key in delta) seekRef.current(timeRef.current + (delta[e.key] ?? 0));
    else return;
    e.preventDefault();
  };

  /* Écrit dans un EFFET et non pendant le rendu : React interdit de
     toucher un ref en phase de rendu, et le lint du dépôt le refuse. Un
     effet de mise en page tourne avant la peinture, donc le rappel est à
     jour avant qu'un clic puisse arriver. */
  const onSpanSelectRef = React.useRef(onSpanSelect);
  useIsomorphicLayoutEffect(() => {
    onSpanSelectRef.current = onSpanSelect;
  });
  const selectSpan = React.useCallback((span: LaidSpan) => {
    setSelected(span.id);
    seekRef.current(span.start);
    onSpanSelectRef.current?.(span);
  }, []);

  const trackBox = "absolute left-[calc(var(--gutter)+var(--pad))] right-[calc(var(--meta)+var(--pad))]";

  return (
    <div
      ref={(node) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      }}
      data-slot="agent-trace"
      style={
        {
          "--label-w": `${labelWidth}px`,
          "--row": `${rowHeight}px`,
          "--pad": "0.75rem",
          ...style,
        } as React.CSSProperties
      }
      className={cn("smd-trace group/trace @container/trace w-full overflow-hidden", className)}
      {...rest}
    >
      <div data-slot="trace-header" className="smd-trace-tete flex items-center gap-2.5 px-3 py-2.5">
        <span aria-hidden="true" className="smd-trace-point size-1.5 shrink-0 rounded-full" />
        <span className="smd-trace-id">{runId}</span>
        <span className="smd-trace-sous truncate">
          {model ? `${model} · ` : ""}
          {rows.length} étapes
        </span>
        <span ref={statusRef} className="smd-trace-etat ml-auto shrink-0 rounded-full px-2 py-0.5">
          Terminée
        </span>
      </div>

      {/* `--gutter` et `--meta` sont posés dans sur-mesure.css, par
          requêtes de conteneur : l'échelle des trois colonnes et le pli
          mobile de la ligne sont deux faces d'un même réglage et ne
          peuvent pas vivre à deux endroits. Voir la section 8 bis. */}
      <div className="smd-trace-cadre relative">
        {showRuler && (
          <div
            data-slot="trace-ruler"
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            className="smd-trace-regle relative h-7 cursor-ew-resize touch-none select-none"
          >
            <div className={cn(trackBox, "inset-y-0")}>
              {ticks.map((t) => (
                <span
                  key={t}
                  className="smd-trace-tic absolute top-2 -translate-x-1/2"
                  style={{ left: `${(t / total) * 100}%` }}
                >
                  {t < 1000 ? `${t} ms` : `${String(t / 1000).replace(".", ",")} s`}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="relative py-1">
          {showRuler && (
            <div aria-hidden="true" className={cn(trackBox, "smd-trace-trame inset-y-0")}>
              {ticks.map((t) => (
                <span
                  key={t}
                  className="smd-trace-grille absolute inset-y-0 w-px"
                  style={{ left: `${(t / total) * 100}%` }}
                />
              ))}
            </div>
          )}

          <ol aria-label={`Étapes de ${runId}`} className="relative">
            {rows.map((span, i) => (
              <li key={span.id}>
                <TraceSpanRow
                  span={span}
                  index={i}
                  total={total}
                  showTokens={showTokens}
                  selected={selected === span.id}
                  onSelect={selectSpan}
                  register={registerRow}
                />
              </li>
            ))}
          </ol>

          <div aria-hidden="true" className={cn(trackBox, "smd-trace-lecture pointer-events-none inset-y-0")}>
            <div
              className="relative h-full w-full"
              style={{ transform: "translateX(calc(var(--t,0) * 100%))" }}
            >
              <span className="smd-trace-tete-lecture absolute inset-y-0 w-px" />
              <span className="smd-trace-pointe absolute top-0 size-1.5 -translate-x-[2.5px] rotate-45" />
            </div>
          </div>

          <div
            data-slot="trace-scrub"
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            className={cn(trackBox, "inset-y-0 cursor-ew-resize touch-none select-none")}
          />
        </div>
      </div>

      {showTransport && (
        <div className="smd-trace-transport flex items-center gap-3 px-3 py-2">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Mettre en pause" : "Rejouer l'exécution"}
            className="smd-trace-jouer relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none before:absolute before:-inset-1 before:content-['']"
          >
            {playing ? (
              <Pause aria-hidden="true" className="size-3.5 fill-current" />
            ) : (
              <Play aria-hidden="true" className="size-3.5 translate-x-px fill-current" />
            )}
          </button>

          <div
            ref={railRef}
            role="slider"
            tabIndex={0}
            aria-label="Tête de lecture"
            aria-valuemin={0}
            aria-valuemax={Math.round(total)}
            aria-valuenow={Math.round(clamp(defaultTime, 0, total))}
            data-inset="6"
            onPointerDown={onScrubDown}
            onPointerMove={onScrubMove}
            onPointerUp={onScrubUp}
            onKeyDown={onRailKeyDown}
            className="smd-trace-piste relative h-9 flex-1 cursor-ew-resize touch-none rounded-md outline-none select-none"
          >
            <div className="smd-trace-rail-fond absolute inset-x-1.5 top-1/2 h-1 -translate-y-1/2 overflow-hidden rounded-full">
              <div
                aria-hidden="true"
                className="smd-trace-progression h-full w-full origin-left"
                style={{ transform: "scaleX(var(--t,0))" }}
              />
            </div>
            <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-1.5 left-1.5">
              <div
                className="relative h-full w-full"
                style={{ transform: "translateX(calc(var(--t,0) * 100%))" }}
              >
                <span className="smd-trace-curseur absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full" />
              </div>
            </div>
          </div>

          <span ref={clockRef} className="smd-trace-horloge w-[7.5rem] shrink-0 text-right" />
        </div>
      )}
    </div>
  );
}

export default AgentTrace;
