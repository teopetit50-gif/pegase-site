"use client";

/* La palette de commandes : ⌘K sur Mac, Ctrl+K ailleurs. Une fenêtre
   haute, un champ, la liste filtrée à la frappe (flèches, Entrée,
   Échap). Pages, modules, actions. Construite sur l'Autocomplete de
   react-aria-components : le focus reste dans le champ, la liste est
   parcourue en focus virtuel, et le focus revient au déclencheur à la
   fermeture. */

import { useRouter } from "next/navigation";
import { ArrowRight, CornerDownLeft, Laptop, Link2, Moon, Search, Sun, ExternalLink } from "lucide-react";
import { Autocomplete, Dialog, Input, Menu, Modal, ModalOverlay, TextField, useFilter } from "react-aria-components";
import { ItemMenu, Kbd, SectionMenu } from "./ui";
import { MODULES, ONGLETS_ORGANISATION } from "./modules";
import { changerTheme } from "./theme";
import { useToast } from "./Toasts";

export default function Palette({ ouverte, changer }: { ouverte: boolean; changer: (v: boolean) => void }) {
  const router = useRouter();
  const toast = useToast();
  const { contains } = useFilter({ sensitivity: "base" });

  const agir = (cle: React.Key) => {
    const c = String(cle);
    changer(false);
    if (c.startsWith("aller:")) router.push(c.slice(6));
    else if (c === "theme:clair") changerTheme("clair");
    else if (c === "theme:sombre") changerTheme("sombre");
    else if (c === "theme:systeme") changerTheme("systeme");
    else if (c === "copier") {
      navigator.clipboard?.writeText(window.location.href).then(
        () => toast("Lien copié", "vert"),
        () => toast("Impossible de copier le lien. Réessayez.", "rouge"),
      );
    } else if (c === "ancien") router.push("/espace/validations?ancien=1");
  };

  return (
    <ModalOverlay isOpen={ouverte} onOpenChange={changer} isDismissable className="v2-jetons v2-voile v2-voile--palette">
      <Modal className="v2-modale v2-palette">
        <Dialog className="v2-modale-dialogue" aria-label="Palette de commandes">
          <Autocomplete filter={contains}>
            <TextField aria-label="Rechercher une page ou une commande" autoFocus className="v2-palette-champ">
              <Search width={18} height={18} aria-hidden="true" />
              <Input placeholder="Rechercher une page, un module, une commande…" />
              <Kbd>Échap</Kbd>
            </TextField>
            <Menu className="v2-menu" onAction={agir} aria-label="Résultats" renderEmptyState={() => <div className="v2-palette-vide">Aucun résultat.</div>}>
              <SectionMenu titre="Pages">
                {ONGLETS_ORGANISATION.map((o) => (
                  <ItemMenu key={o.href} id={`aller:${o.href}`} icone={<ArrowRight width={16} height={16} aria-hidden="true" />}>
                    {o.libelle}
                  </ItemMenu>
                ))}
                <ItemMenu id="aller:/espace2/filed/a-payer" textValue="À payer FILED factures" icone={<ArrowRight width={16} height={16} aria-hidden="true" />}>
                  À payer (FILED)
                </ItemMenu>
              </SectionMenu>
              <SectionMenu titre="Modules">
                {MODULES.map((m) => (
                  <ItemMenu key={m.cle} id={`aller:/espace2/${m.cle}`} textValue={`${m.nom} ${m.libelle}`} icone={<m.icone width={16} height={16} aria-hidden="true" />} suffixe={<span>{m.libelle}</span>}>
                    {m.nom}
                  </ItemMenu>
                ))}
              </SectionMenu>
              <SectionMenu titre="Actions">
                <ItemMenu id="theme:clair" textValue="Thème clair" icone={<Sun width={16} height={16} aria-hidden="true" />}>
                  Passer au thème clair
                </ItemMenu>
                <ItemMenu id="theme:sombre" textValue="Thème sombre" icone={<Moon width={16} height={16} aria-hidden="true" />}>
                  Passer au thème sombre
                </ItemMenu>
                <ItemMenu id="theme:systeme" textValue="Thème du système" icone={<Laptop width={16} height={16} aria-hidden="true" />}>
                  Suivre le thème du système
                </ItemMenu>
                <ItemMenu id="copier" textValue="Copier le lien de la page" icone={<Link2 width={16} height={16} aria-hidden="true" />}>
                  Copier le lien de la page
                </ItemMenu>
                <ItemMenu id="ancien" textValue="Ouvrir l'ancien espace client" icone={<ExternalLink width={16} height={16} aria-hidden="true" />}>
                  Ouvrir l&apos;ancien espace client
                </ItemMenu>
              </SectionMenu>
            </Menu>
          </Autocomplete>
          <div className="v2-palette-pied" aria-hidden="true">
            <span>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> parcourir
            </span>
            <span>
              <Kbd>
                <CornerDownLeft width={12} height={12} />
              </Kbd>{" "}
              ouvrir
            </span>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}
