"use client";

/* ══════════════════════════════════════════════════════════════════════
   L'éditeur des notes (11/10/2026) — demande de Teo : « toute la note
   éditable, c'est du texte, quoi qu'on modifie », sans Markdown à
   l'écran ni cadres autour des sections.

   Tiptap : on écrit directement dans la page (titres, gras, listes, cases
   à cocher, liens, tableaux). Le texte reste rangé en Markdown dans
   omega_pages (tiptap-markdown le relit et le réécrit), si bien que le
   Manuel et les autres documents s'affichent toujours ailleurs (Aide).
   Rien n'est réécrit tant qu'on ne tape rien : onUpdate ne part qu'à une
   vraie modification.
   ══════════════════════════════════════════════════════════════════════ */

import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TableKit } from "@tiptap/extension-table";
import { Placeholder } from "@tiptap/extensions";
import { Markdown } from "tiptap-markdown";

type StockageMarkdown = { markdown: { getMarkdown: () => string } };

export default function EditeurRiche({ markdown, onChange, placeholder, etiquette }: { markdown: string; onChange: (markdown: string) => void; placeholder: string; etiquette: string }) {
  const editeur = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false, autolink: true } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit,
      Placeholder.configure({ placeholder }),
      Markdown.configure({ html: false, tightLists: true, linkify: true, transformPastedText: true }),
    ],
    content: markdown,
    editorProps: { attributes: { class: "no-riche", "aria-label": etiquette, "aria-multiline": "true", role: "textbox" } },
    onUpdate: ({ editor }) => onChange((editor.storage as unknown as StockageMarkdown).markdown.getMarkdown()),
  });
  return <EditorContent editor={editeur} />;
}
