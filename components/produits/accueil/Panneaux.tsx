import { CONVERSATION } from "@/lib/produits/accueil";

/* Les quatre panneaux produit.
 *
 * La référence remplit ces cadres avec ses propres captures (about-img.png,
 * features/img-1..3.png, testimonials/avatar-lg.png). Ce sont ses fichiers,
 * et ils montrent son produit : on ne les reprend pas, et on ne fabrique pas
 * de fausse capture d'écran non plus. Même géométrie, contenu écrit en HTML,
 * tiré mot pour mot de la fiche FRONTD.
 */

function Cadre({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        "w-full rounded-2xl bg-white border border-neutral-200/80 a-ombre-integration overflow-hidden " +
        className
      }
    >
      {children}
    </div>
  );
}

function EnTete({ gauche, droite }: { gauche: string; droite: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-100 px-5 py-3.5">
      <span className="font-mono text-xs uppercase text-neutral-900">{gauche}</span>
      <span className="font-mono text-xs uppercase text-neutral-400">{droite}</span>
    </div>
  );
}

export function PanneauConversation() {
  return (
    <Cadre>
      <EnTete gauche={CONVERSATION.contexte} droite={CONVERSATION.sousTitre} />
      <div className="flex flex-col gap-3 px-5 py-6">
        {CONVERSATION.messages.map((m, i) => (
          <div key={i} className={m.de === "moteur" ? "flex justify-end" : "flex justify-start"}>
            <div
              className={
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed " +
                (m.de === "moteur"
                  ? "bg-[#edf4ea] text-neutral-900 rounded-br-md"
                  : "bg-neutral-100 text-neutral-700 rounded-bl-md")
              }
            >
              <span className="block font-mono text-[11px] uppercase text-neutral-400 mb-1">
                {m.heure} · {m.de === "moteur" ? "réponse" : "client"}
              </span>
              {m.texte}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 border-t border-neutral-100 px-5 py-4">
        <span className="size-1.5 rounded-full bg-neutral-900" />
        <span className="text-sm text-neutral-500">{CONVERSATION.issue}</span>
      </div>
    </Cadre>
  );
}

const CIRCUITS = [
  { type: "Devis", suite: "Chiffré si le cas est dans la base, sinon transféré" },
  { type: "Urgence", suite: "Votre téléphone sonne, la conversation vous suit", chaud: true },
  { type: "Réclamation", suite: "Transfert immédiat, avec tout l'historique", chaud: true },
  { type: "Renseignement", suite: "Réponse seule, archivée" },
];

/** Version courte : l'échange de 21 h 47 en deux bulles. La conversation
 *  complète reste dans « ce qu'il apporte » — la même démonstration deux fois
 *  sur une page, c'est ce qui la fait paraître bavarde. */
export function PanneauReponse() {
  const [question, reponse] = [CONVERSATION.messages[0], CONVERSATION.messages[1]];
  return (
    <Cadre>
      <EnTete gauche={CONVERSATION.contexte} droite={CONVERSATION.sousTitre} />
      <div className="flex flex-col gap-3 px-5 py-5">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-bl-md bg-neutral-100 px-4 py-3 text-sm leading-relaxed text-neutral-700">
            <span className="mb-1 block font-mono text-[11px] uppercase text-neutral-400">
              {question.heure} · client
            </span>
            {question.texte}
          </div>
        </div>
        <div className="flex justify-end">
          <div className="max-w-[85%] rounded-2xl rounded-br-md bg-[#edf4ea] px-4 py-3 text-sm leading-relaxed text-neutral-900">
            <span className="mb-1 block font-mono text-[11px] uppercase text-neutral-400">
              {reponse.heure} · réponse
            </span>
            {reponse.texte}
          </div>
        </div>
      </div>
    </Cadre>
  );
}

export function PanneauTri() {
  return (
    <Cadre>
      <EnTete gauche="Qualification" droite="4 circuits" />
      <ul className="divide-y divide-neutral-100">
        {CIRCUITS.map((c) => (
          <li key={c.type} className="flex items-center gap-4 px-5 py-4">
            <span
              className={
                "shrink-0 inline-flex h-7 items-center rounded-full px-3 font-mono text-[11px] uppercase " +
                (c.chaud ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-600")
              }
            >
              {c.type}
            </span>
            <span className="text-sm text-neutral-500">{c.suite}</span>
          </li>
        ))}
      </ul>
    </Cadre>
  );
}

const CADENCE = [
  { quand: "J+3", quoi: "Demande d'avis", etat: "envoyée" },
  { quand: "J+10", quoi: "Première relance", etat: "si rien" },
  { quand: "J+20", quoi: "Seconde relance", etat: "dernière" },
  { quand: "6 mois", quoi: "Carence par personne", etat: "arrêt" },
];

export function PanneauAvis() {
  return (
    <Cadre>
      <EnTete gauche="Après règlement" droite="deux relances au maximum" />
      <ol className="px-5 py-6 space-y-4">
        {CADENCE.map((e, i) => (
          <li key={e.quand} className="flex items-start gap-4">
            <span className="mt-0.5 shrink-0 w-14 font-mono text-xs uppercase text-neutral-900">{e.quand}</span>
            <span className="relative flex-1 pb-4 last:pb-0">
              <span className="block text-sm text-neutral-900">{e.quoi}</span>
              <span className="block font-mono text-[11px] uppercase text-neutral-400">{e.etat}</span>
              {i < CADENCE.length - 1 && (
                <span className="absolute -left-[26px] top-5 h-full w-px bg-neutral-100" />
              )}
            </span>
          </li>
        ))}
      </ol>
      <p className="border-t border-neutral-100 px-5 py-4 text-sm text-neutral-500">
        Le même message pour tout le monde : aucun tri des mécontents.
      </p>
    </Cadre>
  );
}

