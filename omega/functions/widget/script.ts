// Le script que le site du client charge : <script src=".../functions/v1/widget/<clé>/widget.js" async></script>.
// Une bulle en bas à droite, isolée dans un Shadow DOM (aucun style du site ne la touche, elle ne touche aucun style du
// site), sans cookie, sans traceur, sans dépendance. Le visiteur écrit son message, laisse un e-mail ou un téléphone
// (pour la réponse) et coche l'accord ; la conversation garde son identifiant dans le navigateur (localStorage).
// Un champ piège invisible et le temps de saisie écartent les robots (la fonction les ignore sans le leur dire).

export type ConfigScript = {
  cle: string;
  /** URL d'envoi : https://<projet>.supabase.co/functions/v1/widget/<clé>/message */
  envoi: string;
  libelle: string;
  couleur: string;
  accueil: string;
};

/** JSON sûr dans un <script> : pas de « </script> », pas de séparateurs de ligne Unicode. */
function jsonSur(v: unknown): string {
  return JSON.stringify(v).replace(/</g, "\\u003c").replace(
    /\u2028/g,
    "\\u2028",
  ).replace(/\u2029/g, "\\u2029");
}

const CODE = String.raw`
(function (C) {
  if (window.__omegaWidget && window.__omegaWidget[C.cle]) return;
  window.__omegaWidget = window.__omegaWidget || {};
  window.__omegaWidget[C.cle] = true;
  var cleStock = "omega_widget_" + C.cle;
  function lire(k) { try { return JSON.parse(localStorage.getItem(cleStock + k) || "null"); } catch (e) { return null; } }
  function ecrire(k, v) { try { localStorage.setItem(cleStock + k, JSON.stringify(v)); } catch (e) {} }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16); crypto.getRandomValues(b); b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return (x + 256).toString(16).slice(1); }).join("");
    return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) + "-" + h.slice(16, 20) + "-" + h.slice(20);
  }
  var conversation = lire("conversation") || uuid();
  ecrire("conversation", conversation);
  var coord = lire("coordonnees") || {};
  var fil = lire("fil") || [];

  var hote = document.createElement("div");
  hote.setAttribute("data-omega-widget", C.cle);
  var ombre = hote.attachShadow ? hote.attachShadow({ mode: "open" }) : hote;
  var css =
    ":host{all:initial}*{box-sizing:border-box;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif}" +
    ".bulle{position:fixed;right:20px;bottom:20px;width:56px;height:56px;border-radius:50%;border:0;cursor:pointer;" +
    "background:" + C.couleur + ";color:#fff;box-shadow:0 4px 16px rgba(0,0,0,.25);z-index:2147483646;font-size:26px}" +
    ".panneau{position:fixed;right:20px;bottom:88px;width:340px;max-width:calc(100vw - 32px);max-height:min(560px,calc(100vh - 110px));" +
    "background:#fff;color:#111;border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.25);display:none;flex-direction:column;" +
    "overflow:hidden;z-index:2147483647;font-size:14px}" +
    ".ouvert .panneau{display:flex}.tete{background:" + C.couleur + ";color:#fff;padding:12px 14px;font-weight:600}" +
    ".fil{padding:12px 14px;overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:8px}" +
    ".msg{padding:8px 10px;border-radius:10px;max-width:85%;white-space:pre-wrap;word-wrap:break-word}" +
    ".eux{background:#f1f1f1;align-self:flex-start}.moi{background:" + C.couleur + ";color:#fff;align-self:flex-end}" +
    ".etat{font-size:12px;color:#555;align-self:flex-end}form{border-top:1px solid #eee;padding:10px 12px;display:flex;flex-direction:column;gap:6px}" +
    "input,textarea{width:100%;border:1px solid #ccc;border-radius:8px;padding:7px 9px;font-size:14px;color:#111;background:#fff}" +
    "textarea{resize:vertical;min-height:56px}label.accord{font-size:12px;color:#444;display:flex;gap:6px;align-items:flex-start}" +
    "label.accord input{width:auto;margin-top:2px}button.envoyer{border:0;border-radius:8px;padding:9px;background:" + C.couleur + ";" +
    "color:#fff;font-weight:600;cursor:pointer}button.envoyer:disabled{opacity:.6;cursor:default}" +
    ".piege{position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden}.erreur{color:#b00020;font-size:12px}";
  ombre.innerHTML =
    "<style>" + css + "</style>" +
    "<div class='racine'><button class='bulle' type='button' aria-label='Écrire un message' aria-expanded='false'>&#128172;</button>" +
    "<div class='panneau' role='dialog' aria-label=''><div class='tete'></div><div class='fil' aria-live='polite'></div>" +
    "<form novalidate><div class='piege' aria-hidden='true'><input name='site_web' tabindex='-1' autocomplete='off'></div>" +
    "<textarea name='texte' required maxlength='5000' placeholder='Votre message'></textarea>" +
    "<div class='coord'><input name='nom' maxlength='200' placeholder='Votre nom' autocomplete='name'>" +
    "<input name='email' type='email' maxlength='254' placeholder='E-mail (pour la réponse)' autocomplete='email'>" +
    "<input name='telephone' type='tel' maxlength='40' placeholder='ou téléphone' autocomplete='tel'>" +
    "<label class='accord'><input name='consentement' type='checkbox'> <span>J'accepte que ces coordonnées servent à me répondre.</span></label></div>" +
    "<div class='erreur' role='alert'></div><button class='envoyer' type='submit'>Envoyer</button></form></div></div>";
  var racine = ombre.querySelector(".racine"), bulle = ombre.querySelector(".bulle"), panneau = ombre.querySelector(".panneau");
  var filEl = ombre.querySelector(".fil"), form = ombre.querySelector("form"), erreur = ombre.querySelector(".erreur");
  var bouton = ombre.querySelector(".envoyer"), blocCoord = ombre.querySelector(".coord");
  ombre.querySelector(".tete").textContent = C.libelle;
  panneau.setAttribute("aria-label", C.libelle);
  var ouvertA = 0;

  function bulleMsg(classe, texte) {
    var d = document.createElement("div"); d.className = "msg " + classe; d.textContent = texte; filEl.appendChild(d);
    filEl.scrollTop = filEl.scrollHeight;
  }
  function etat(texte) { var d = document.createElement("div"); d.className = "etat"; d.textContent = texte; filEl.appendChild(d); }
  function rendre() {
    filEl.textContent = "";
    bulleMsg("eux", C.accueil);
    fil.forEach(function (m) { bulleMsg("moi", m.texte); });
    if (fil.length) etat(confirmation());
    blocCoord.style.display = coord.ok ? "none" : "block";
  }
  function confirmation() {
    return coord.email ? "Bien reçu. Nous vous répondons par e-mail (" + coord.email + ")."
                       : "Bien reçu. Nous vous répondons au " + (coord.telephone || "numéro indiqué") + ".";
  }
  bulle.addEventListener("click", function () {
    var ouvert = racine.classList.toggle("ouvert");
    bulle.setAttribute("aria-expanded", ouvert ? "true" : "false");
    if (ouvert) { ouvertA = ouvertA || Date.now(); rendre(); form.texte.focus(); }
  });
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    erreur.textContent = "";
    var texte = form.texte.value.trim();
    if (!texte) { erreur.textContent = "Écrivez votre message."; return; }
    if (!coord.ok) {
      var email = form.email.value.trim(), tel = form.telephone.value.trim();
      if (!email && !tel) { erreur.textContent = "Laissez un e-mail ou un téléphone pour la réponse."; return; }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { erreur.textContent = "Cet e-mail ne semble pas valide."; return; }
      if (!form.consentement.checked) { erreur.textContent = "Cochez l'accord pour que nous puissions vous répondre."; return; }
      coord = { nom: form.nom.value.trim(), email: email, telephone: tel, ok: false };
    }
    bouton.disabled = true;
    var corps = {
      conversation: conversation, message: uuid(), texte: texte, nom: coord.nom || null, email: coord.email || null,
      telephone: coord.telephone || null, page: location.href.slice(0, 500), consentement: true,
      site_web: form.site_web.value, delai_ms: Date.now() - ouvertA
    };
    fetch(C.envoi, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corps), credentials: "omit" })
      .then(function (r) {
        if (r.status === 429) throw new Error("Trop de messages d'un coup : réessayez dans quelques minutes.");
        if (!r.ok) throw new Error("Le message n'a pas pu partir. Réessayez, ou contactez-nous par téléphone.");
        coord.ok = true; ecrire("coordonnees", coord);
        fil.push({ texte: texte, le: Date.now() }); ecrire("fil", fil.slice(-30));
        form.texte.value = ""; rendre();
      })
      .catch(function (x) { erreur.textContent = x && x.message ? x.message : "Le message n'a pas pu partir."; })
      .then(function () { bouton.disabled = false; });
  });
  (document.body || document.documentElement).appendChild(hote);
})`;

export function scriptWidget(c: ConfigScript): string {
  return `/* Messagerie du site — Omega. */\n${CODE.trim()}(${jsonSur(c)});\n`;
}
