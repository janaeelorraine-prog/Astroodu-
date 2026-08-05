# The Family Record — editable edition

`The_Family_Record.html` is your family record as **one self‑contained file** you
can open by double‑clicking. It looks and reads exactly like before, but now you
can **add and edit family right on the page** — no code, no separate files.

## How to use it

1. Open **`The_Family_Record.html`** in any web browser.
2. Click the **✎ Edit / Add family** button in the bottom‑right corner.
3. Pick a branch (Sharp, Bryant, Coles & Washington, Butler & Briggs, Ingram &
   Spencer). For any person you'll see:
   - **+ Sibling** — add a brother or sister (e.g. your dad's siblings).
   - **+ Child** — add a son or daughter (e.g. your mom's children).
   - **Edit** — correct a name, dates, relationship, add notes, a memory, a
     source link, or a photo.
   - **Remove** — take out a mistaken entry (you can Restore it).
   - **+ Add someone here** — add anyone to a whole generation.
4. Your changes **save automatically in that browser**.
5. Press **⤓ Download updated record** to save a fresh single file with your
   changes baked in — keep it as your master copy, back it up, or open it on
   another device. That downloaded file is fully editable too.

Everything works offline. Fonts and photos are embedded in the file.

## What's inside (for maintainers)

The file is generated from the original bundled record plus a small edit layer:

- `src/build.py` — rebuilds `The_Family_Record.html` from the original upload:
  inlines React + the `dc-runtime` renderer + the exact visual template, embeds
  the fonts as `data:` URIs, and injects the edit layer.
- `src/merge_shim.js` — applies your saved additions/edits on top of the
  original data at load time, without ever changing the original.
- `src/editor.js` — the in‑page editor UI (plain React) and the
  "Download updated record" exporter.

Edits are stored as a small overlay (`window.FAMILY_EDITS`) — the original
record data is never modified in place, so nothing can be lost.
