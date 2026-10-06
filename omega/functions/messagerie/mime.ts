// Messages RFC 5322 / MIME : lecture d'un message reçu (Gmail le rend brut, format=raw) et
// fabrication d'un brouillon (Gmail drafts.create prend le message brut en base64url).
// Sans dépendance. Lecture tolérante : en-têtes repliés, mots encodés RFC 2047 (B et Q),
// multipart imbriqués, base64, quoted-printable, utf-8 / iso-8859-1 / windows-1252.

export type PieceLue = {
  nom: string;
  typeMime: string;
  octets: Uint8Array<ArrayBuffer>;
  enLigne: boolean;
};

export type MessageLu = {
  messageId: string | null;
  enReponseA: string | null;
  references: string[];
  de: string | null;
  deNom: string | null;
  a: string[];
  cc: string[];
  sujet: string | null;
  date: string | null;
  texte: string;
  html: string | null;
  pieces: PieceLue[];
};

type Entetes = Map<string, string[]>;
type Partie = { entetes: Entetes; corps: Uint8Array<ArrayBuffer> };

const CRLF = "\r\n";

function latin1(octets: Uint8Array): string {
  let s = "";
  for (let i = 0; i < octets.length; i += 0x8000) {
    s += String.fromCharCode(...octets.subarray(i, i + 0x8000));
  }
  return s;
}

function depuisLatin1(s: string): Uint8Array<ArrayBuffer> {
  const o = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) o[i] = s.charCodeAt(i) & 0xff;
  return o;
}

function decoder(octets: Uint8Array, charset: string | null): string {
  const c = (charset ?? "utf-8").toLowerCase().replace(/^"|"$/g, "");
  try {
    return new TextDecoder(c === "us-ascii" ? "utf-8" : c).decode(octets);
  } catch {
    return new TextDecoder("utf-8").decode(octets);
  }
}

function base64VersOctets(b64: string): Uint8Array<ArrayBuffer> {
  const propre = b64.replace(/-/g, "+").replace(/_/g, "/").replace(
    /[^A-Za-z0-9+/]/g,
    "",
  );
  try {
    return depuisLatin1(
      atob(propre + "=".repeat((4 - (propre.length % 4)) % 4)),
    );
  } catch {
    return new Uint8Array(0);
  }
}

export function octetsVersBase64(octets: Uint8Array): string {
  return btoa(latin1(octets));
}

/** base64url sans remplissage, comme le veut l'API Gmail. */
export function base64url(octets: Uint8Array): string {
  return octetsVersBase64(octets).replace(/\+/g, "-").replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function depuisBase64url(texte: string): Uint8Array<ArrayBuffer> {
  return base64VersOctets(texte);
}

function quotedPrintable(texte: string): Uint8Array<ArrayBuffer> {
  const s = texte.replace(/=\r?\n/g, "");
  const sortie: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "=" && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) {
      sortie.push(parseInt(s.slice(i + 1, i + 3), 16));
      i += 2;
    } else sortie.push(s.charCodeAt(i) & 0xff);
  }
  return new Uint8Array(sortie);
}

/** Mots encodés RFC 2047 : =?charset?B|Q?…?= ; les espaces entre deux mots encodés disparaissent. */
export function decoderMotsEncodes(valeur: string): string {
  return valeur
    .replace(/(=\?[^?]+\?[BbQq]\?[^?]*\?=)\s+(?==\?)/g, "$1")
    .replace(
      /=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g,
      (_t, charset: string, enc: string, donnees: string) => {
        const octets = enc.toUpperCase() === "B"
          ? base64VersOctets(donnees)
          : quotedPrintable(donnees.replace(/_/g, " "));
        return decoder(octets, charset.split("*")[0]);
      },
    );
}

function lireEntetes(texte: string): Entetes {
  const entetes: Entetes = new Map();
  const lignes = texte.replace(/\r\n/g, "\n").split("\n");
  let courante = "";
  const pousser = () => {
    const i = courante.indexOf(":");
    if (i > 0) {
      const nom = courante.slice(0, i).trim().toLowerCase();
      const valeur = courante.slice(i + 1).trim();
      entetes.set(nom, [...(entetes.get(nom) ?? []), valeur]);
    }
  };
  for (const l of lignes) {
    if (/^[ \t]/.test(l)) courante += " " + l.trim();
    else {
      if (courante) pousser();
      courante = l;
    }
  }
  if (courante) pousser();
  return entetes;
}

function couper(octets: Uint8Array<ArrayBuffer>): Partie {
  const texte = latin1(octets);
  const m = texte.match(/\r?\n\r?\n/);
  if (!m || m.index === undefined) {
    return { entetes: lireEntetes(texte), corps: new Uint8Array(0) };
  }
  return {
    entetes: lireEntetes(texte.slice(0, m.index)),
    corps: octets.slice(m.index + m[0].length),
  };
}

function entete(e: Entetes, nom: string): string | null {
  return e.get(nom)?.[0] ?? null;
}

/** « type/sous-type; param=valeur; … » → {valeur, params}. Paramètres RFC 2231 (nom*=utf-8''…) compris. */
export function lireParametres(
  v: string | null,
): { valeur: string; params: Record<string, string> } {
  if (!v) return { valeur: "", params: {} };
  const morceaux = v.match(/(?:[^;"]+|"[^"]*")+/g) ?? [];
  const valeur = (morceaux.shift() ?? "").trim().toLowerCase();
  const params: Record<string, string> = {};
  const suites: Record<string, string[]> = {};
  for (const m of morceaux) {
    const i = m.indexOf("=");
    if (i < 0) continue;
    const cle = m.slice(0, i).trim().toLowerCase();
    let val = m.slice(i + 1).trim().replace(/^"|"$/g, "");
    const suite = cle.match(/^([^*]+)\*(\d+)?\*?$/);
    if (suite) {
      const base = suite[1];
      if (cle.endsWith("*")) {
        const p = val.match(/^([^']*)'[^']*'(.*)$/);
        const charset = p ? p[1] : null;
        const brut = p ? p[2] : val;
        val = decoder(
          depuisLatin1(decodeURIComponentTolerant(brut)),
          charset || "utf-8",
        );
      }
      (suites[base] ??= [])[Number(suite[2] ?? 0)] = val;
      continue;
    }
    params[cle] = decoderMotsEncodes(val);
  }
  for (const [b, parts] of Object.entries(suites)) params[b] = parts.join("");
  return { valeur, params };
}

function decodeURIComponentTolerant(s: string): string {
  return s.replace(
    /%([0-9A-Fa-f]{2})/g,
    (_t, h: string) => String.fromCharCode(parseInt(h, 16)),
  );
}

function corpsDecode(p: Partie): Uint8Array<ArrayBuffer> {
  const enc = (entete(p.entetes, "content-transfer-encoding") ?? "7bit")
    .toLowerCase().trim();
  if (enc === "base64") return base64VersOctets(latin1(p.corps));
  if (enc === "quoted-printable") return quotedPrintable(latin1(p.corps));
  return p.corps;
}

function sousParties(p: Partie, frontiere: string): Partie[] {
  const texte = latin1(p.corps);
  const sep = "--" + frontiere;
  const parties: Partie[] = [];
  const morceaux = texte.split(sep);
  for (let i = 1; i < morceaux.length; i++) {
    const m = morceaux[i];
    if (m.startsWith("--")) break;
    const contenu = m.replace(/^\r?\n/, "").replace(/\r?\n$/, "");
    parties.push(couper(depuisLatin1(contenu)));
  }
  return parties;
}

/** Adresses d'un en-tête From / To / Cc : [{adresse, nom}]. */
export function lireAdresses(
  v: string | null,
): { adresse: string; nom: string | null }[] {
  if (!v) return [];
  const sortie: { adresse: string; nom: string | null }[] = [];
  for (const brut of v.match(/(?:[^,"]+|"[^"]*")+/g) ?? []) {
    const morceau = brut.trim();
    const m = morceau.match(/^(.*)<([^>]+)>\s*$/);
    if (m) {
      const nom = decoderMotsEncodes(m[1].trim().replace(/^"|"$/g, "")).trim();
      sortie.push({ adresse: m[2].trim().toLowerCase(), nom: nom || null });
    } else if (morceau.includes("@")) {
      sortie.push({
        adresse: morceau.replace(/\s*\(.*\)\s*$/, "").trim().toLowerCase(),
        nom: null,
      });
    }
  }
  return sortie;
}

/** Lit un message brut (octets RFC 5322). */
export function lireMessage(brut: Uint8Array<ArrayBuffer>): MessageLu {
  const racine = couper(brut);
  const e = racine.entetes;
  const sortie: MessageLu = {
    messageId: entete(e, "message-id")?.trim() ?? null,
    enReponseA: entete(e, "in-reply-to")?.trim().split(/\s+/)[0] ?? null,
    references: (entete(e, "references") ?? "").split(/\s+/).filter((r) =>
      r.includes("@")
    ),
    de: null,
    deNom: null,
    a: lireAdresses(entete(e, "to")).map((x) => x.adresse),
    cc: lireAdresses(entete(e, "cc")).map((x) => x.adresse),
    sujet: entete(e, "subject") !== null
      ? decoderMotsEncodes(entete(e, "subject")!)
      : null,
    date: null,
    texte: "",
    html: null,
    pieces: [],
  };
  const de = lireAdresses(entete(e, "from"))[0];
  sortie.de = de?.adresse ?? null;
  sortie.deNom = de?.nom ?? null;
  const d = entete(e, "date");
  if (d && !Number.isNaN(Date.parse(d))) {
    sortie.date = new Date(d).toISOString();
  }

  const parcourir = (p: Partie, profondeur: number) => {
    if (profondeur > 8) return;
    const ct = lireParametres(
      entete(p.entetes, "content-type") ?? "text/plain; charset=us-ascii",
    );
    const cd = lireParametres(entete(p.entetes, "content-disposition"));
    if (ct.valeur.startsWith("multipart/") && ct.params.boundary) {
      for (const s of sousParties(p, ct.params.boundary)) {
        parcourir(s, profondeur + 1);
      }
      return;
    }
    const nom = cd.params.filename ?? ct.params.name ?? null;
    const estPiece = cd.valeur === "attachment" ||
      (nom !== null && !ct.valeur.startsWith("text/"));
    const octets = corpsDecode(p);
    if (!estPiece && ct.valeur === "text/plain" && sortie.texte === "") {
      sortie.texte = decoder(octets, ct.params.charset ?? null).replace(
        /\r\n/g,
        "\n",
      );
    } else if (!estPiece && ct.valeur === "text/html" && sortie.html === null) {
      sortie.html = decoder(octets, ct.params.charset ?? null);
    } else if (estPiece || nom !== null || ct.valeur !== "message/rfc822") {
      if (ct.valeur.startsWith("text/") && !estPiece && nom === null) return; // autre corps texte : ignoré
      sortie.pieces.push({
        nom: nom ?? `piece-${sortie.pieces.length + 1}`,
        typeMime: ct.valeur || "application/octet-stream",
        octets,
        enLigne: cd.valeur === "inline",
      });
    }
  };
  parcourir(racine, 0);
  if (sortie.texte === "" && sortie.html) {
    sortie.texte = sortie.html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(
        /&nbsp;/g,
        " ",
      ).replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\n{3,}/g, "\n\n")
      .trim();
  }
  return sortie;
}

// ─── Fabrication d'un brouillon ──────────────────────────────────────────────────────────────

export type PieceAJoindre = {
  nom: string;
  typeMime: string;
  octets: Uint8Array;
};

export type Brouillon = {
  de: string;
  deNom?: string | null;
  a: string;
  aNom?: string | null;
  repondreA?: string | null;
  sujet: string;
  texte: string;
  html?: string | null;
  pieces?: PieceAJoindre[];
  enReponseA?: string | null;
  references?: string[] | null;
  /** En-têtes propres à Omega (X-Omega-Envoi…). */
  entetes?: Record<string, string>;
  date?: Date;
  messageId?: string;
};

/** Mot encodé si nécessaire (non ASCII) ; sinon tel quel. */
export function encoderMot(v: string): string {
  if (/^[\x20-\x7e]*$/.test(v)) return v;
  return `=?UTF-8?B?${octetsVersBase64(new TextEncoder().encode(v))}?=`;
}

function adresse(adr: string, nom?: string | null): string {
  if (!/^[^\s<>@]+@[^\s<>@]+$/.test(adr)) {
    throw new Error(`adresse invalide : ${adr}`);
  }
  if (!nom) return adr;
  const n = /^[\x20-\x7e]*$/.test(nom)
    ? `"${nom.replace(/["\\]/g, "")}"`
    : encoderMot(nom);
  return `${n} <${adr}>`;
}

function enLignes76(b64: string): string {
  return b64.replace(/.{1,76}/g, (l) => l + CRLF);
}

function frontiere(): string {
  return `omega_${crypto.randomUUID().replace(/-/g, "")}`;
}

/** Le brouillon en RFC 5322 (CRLF), corps en base64 UTF-8 ; un en-tête ne porte jamais de saut de ligne. */
export function composerBrouillon(b: Brouillon): string {
  const sansSaut = (v: string) => v.replace(/[\r\n]+/g, " ").trim();
  const t: string[] = [];
  t.push(
    `From: ${adresse(sansSaut(b.de), b.deNom ? sansSaut(b.deNom) : null)}`,
  );
  t.push(`To: ${adresse(sansSaut(b.a), b.aNom ? sansSaut(b.aNom) : null)}`);
  if (b.repondreA) t.push(`Reply-To: ${adresse(sansSaut(b.repondreA))}`);
  t.push(`Subject: ${encoderMot(sansSaut(b.sujet))}`);
  t.push(
    `Date: ${(b.date ?? new Date()).toUTCString().replace("GMT", "+0000")}`,
  );
  if (b.messageId) t.push(`Message-ID: ${sansSaut(b.messageId)}`);
  if (b.enReponseA) t.push(`In-Reply-To: ${sansSaut(b.enReponseA)}`);
  if (b.references?.length) {
    t.push(`References: ${b.references.map(sansSaut).join(" ")}`);
  }
  for (const [k, v] of Object.entries(b.entetes ?? {})) {
    if (/^[A-Za-z0-9-]+$/.test(k)) t.push(`${k}: ${sansSaut(v)}`);
  }
  t.push("MIME-Version: 1.0");

  const texte = (contenu: string, type: string) =>
    [
      `Content-Type: ${type}; charset=UTF-8`,
      "Content-Transfer-Encoding: base64",
      "",
      enLignes76(octetsVersBase64(new TextEncoder().encode(contenu))),
    ].join(CRLF);
  const corps = b.html
    ? (() => {
      const f = frontiere();
      return [
        `Content-Type: multipart/alternative; boundary="${f}"`,
        "",
        `--${f}`,
        texte(b.texte, "text/plain"),
        `--${f}`,
        texte(b.html!, "text/html"),
        `--${f}--`,
        "",
      ].join(CRLF);
    })()
    : texte(b.texte, "text/plain");

  if (!b.pieces?.length) return t.join(CRLF) + CRLF + corps;
  const f = frontiere();
  const parties = [
    corps,
    ...b.pieces.map((p) => {
      const nom = sansSaut(p.nom).replace(/"/g, "");
      const nomEnc = encoderMot(nom);
      return [
        `Content-Type: ${
          p.typeMime || "application/octet-stream"
        }; name="${nomEnc}"`,
        `Content-Disposition: attachment; filename="${nomEnc}"`,
        "Content-Transfer-Encoding: base64",
        "",
        enLignes76(octetsVersBase64(p.octets)),
      ].join(CRLF);
    }),
  ];
  return t.join(CRLF) + CRLF +
    `Content-Type: multipart/mixed; boundary="${f}"` + CRLF + CRLF +
    parties.map((p) => `--${f}${CRLF}${p}`).join(CRLF) + CRLF + `--${f}--` +
    CRLF;
}
