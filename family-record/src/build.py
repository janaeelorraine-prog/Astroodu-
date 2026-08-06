#!/usr/bin/env python3
"""
Rebuild "The Family Record" as ONE plain, self-contained, editable HTML file.

- Same proven renderer (React + dc-runtime + the exact visual template).
- Fonts inlined as data: URIs (works fully offline, no network).
- Base data (FAMILY_DATA / PHOTOS / HISTORY / GALLERY_CAPTIONS) inlined verbatim.
- A new in-page EDITOR overlay lets you add siblings, children, or anyone,
  edit or remove people, and download an updated single file. Edits also
  auto-save in the browser (localStorage) so nothing is lost on reload.
"""
import re, json, base64, gzip, sys, os, pathlib

SRC = "/root/.claude/uploads/e1556964-b9e7-5a0a-a3ec-bbf1b6a0b802/5fcd6e25-The_Family_Record_one_file.html"
OUT = sys.argv[1] if len(sys.argv) > 1 else "The_Family_Record.html"
HERE = pathlib.Path(__file__).parent
# Optionally bake previously-saved edits into the fresh build (preserves a
# person's existing additions when only the editor code changed).
EDITS_FILE = os.environ.get("FR_EDITS_FILE")

orig = open(SRC, encoding="utf-8").read()

def block(t):
    m = re.search(r'<script type="__bundler/%s">\s*(.*?)\s*</script>' % re.escape(t), orig, re.S)
    return m.group(1)

manifest = json.loads(block("manifest"))
template = json.loads(block("template"))  # JSON-encoded string

# ---- decode all resources ----
res = {}
for uuid, info in manifest.items():
    raw = base64.b64decode(info["data"])
    if info.get("compressed"):
        raw = gzip.decompress(raw)
    res[uuid] = (info["mime"], raw)

def text_of(uuid):
    return res[uuid][1].decode("utf-8")

# uuid roles (by inspection)
U_RUNTIME = "3a335e7f-380e-4e6c-a3bf-21358afa1b6d"
U_DATA    = "40445f6c-6ef9-4285-a802-fb5f867e6a52"
U_PHOTOS  = "914ce992-a93b-41cd-8be4-0687820d5450"
U_REACT   = "fbda0c83-08e6-4348-851d-7eae74d1be26"
U_REACTDOM= "26d50081-a936-4454-89fd-f3d7c188fc0b"

runtime_src  = text_of(U_RUNTIME)
data_src     = text_of(U_DATA)
photos_src   = text_of(U_PHOTOS)
react_src    = text_of(U_REACT)
reactdom_src = text_of(U_REACTDOM)

# --- Fix a latent renderer bug: cssToObj() splits inline `style` on every ";",
#     which severs data: URIs at ";base64," — truncating EVERY photo to an
#     invalid url("data:image/jpeg"). Replace it with a splitter that ignores
#     ";" inside parentheses or quotes, so background-image data URIs survive.
_css_old = '''  function cssToObj(css) {
    const o = {};
    for (const decl of css.split(";")) {
      const i = decl.indexOf(":");
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim();
      o[prop.startsWith("--") ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
    }
    return o;
  }'''
_css_new = '''  function cssToObj(css) {
    const o = {};
    const decls = [];
    let depth = 0, quote = "", start = 0;
    for (let k = 0; k < css.length; k++) {
      const ch = css[k];
      if (quote) { if (ch === quote) quote = ""; }
      else if (ch === '"' || ch === "'") quote = ch;
      else if (ch === "(") depth++;
      else if (ch === ")") depth = depth > 0 ? depth - 1 : 0;
      else if (ch === ";" && depth === 0) { decls.push(css.slice(start, k)); start = k + 1; }
    }
    decls.push(css.slice(start));
    for (const decl of decls) {
      const i = decl.indexOf(":");
      if (i < 0) continue;
      const prop = decl.slice(0, i).trim();
      if (!prop) continue;
      o[prop.startsWith("--") ? prop : kebabToCamel(prop)] = decl.slice(i + 1).trim();
    }
    return o;
  }'''
assert _css_old in runtime_src, "cssToObj not found — runtime changed"
runtime_src = runtime_src.replace(_css_old, _css_new)

# ---- font data: URIs ----
def data_uri(uuid):
    mime, raw = res[uuid]
    return "data:%s;base64,%s" % (mime, base64.b64encode(raw).decode())

# ---- split the template into: head styles, x-dc visual markup, component script ----
helmet = re.search(r'<helmet>(.*?)</helmet>', template, re.S).group(1)
# keep the INNER css of every <style> block in the helmet (drop <link>/<script>)
styles = "\n".join(re.findall(r'<style>(.*?)</style>', helmet, re.S))

# replace every url("uuid") reference with an inlined font data: URI
def repl_url(m):
    uuid = m.group(1)
    return 'url("%s")' % data_uri(uuid) if uuid in res else m.group(0)
styles = re.sub(r'url\("([0-9a-f]{8}-[0-9a-f-]+)"\)', repl_url, styles)

# visual markup = everything inside <x-dc> AFTER </helmet>, up to </x-dc>
xdc_inner = re.search(r'<x-dc>(.*)</x-dc>', template, re.S).group(1)
visual = xdc_inner.split('</helmet>', 1)[1]

# component script (the DCLogic class) sits after </x-dc>
comp = re.search(r'(<script type="text/x-dc"[^>]*>.*?</script>)', template, re.S).group(1)

# Add an "In memoriam" badge for people marked deceased (living=false, deceased=true).
_living_line = 'if(p.living) badges.push({text:"Living", color:"#4f7440", line:"rgba(79,116,64,.55)"});'
assert _living_line in comp, "living-badge line not found — template changed"
comp = comp.replace(
    _living_line,
    _living_line + '\n    if(!p.living && p.deceased) badges.push({text:"In memoriam", color:"#6b5d47", line:"#d8c9ab"});')

# Make the record's own drag-onto-portrait photos downscale too (same ~5MB cap).
_read_old = '''  readFileTo(key, file){
    if(!file || !/^image\\//.test(file.type)) return;
    const r = new FileReader();
    r.onload = () => this.setDrop(key, r.result);
    r.readAsDataURL(file);
  }'''
_read_new = '''  readFileTo(key, file){
    if(!file || !/^image\\//.test(file.type)) return;
    if(window.__frDownscaleFile){ window.__frDownscaleFile(file,1200,0.82).then(url=>this.setDrop(key,url)).catch(()=>{ const r=new FileReader(); r.onload=()=>this.setDrop(key,r.result); r.readAsDataURL(file); }); return; }
    const r = new FileReader();
    r.onload = () => this.setDrop(key, r.result);
    r.readAsDataURL(file);
  }'''
assert _read_old in comp, "readFileTo not found — template changed"
comp = comp.replace(_read_old, _read_new)

def safe_js(s):
    # A literal </script inside inline JS closes the tag early. Neutralise it —
    # JS reads <\/script identically inside strings/regex, HTML won't close on it.
    return s.replace("</script", "<\\/script")

def scr(body, **attrs):
    a = "".join(' %s="%s"' % (k.replace("_", "-"), v) for k, v in attrs.items())
    return "<script%s>\n%s\n</script>" % (a, body)

# ---- editor + merge shim (external files for readability) ----
merge_shim = safe_js(open(HERE / "merge_shim.js", encoding="utf-8").read())
editor_js  = safe_js(open(HERE / "editor.js", encoding="utf-8").read())

# The exported-file regenerator needs the pristine <x-dc> visual markup so it can
# strip the live React render before serialising. The component <script> survives
# in the DOM on its own, so the stash holds only the <x-dc> markup.
pristine_xdc = "<x-dc>\n" + visual + "\n</x-dc>"

doc = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>The Family Record</title>
<style id="fr-fonts">{styles}</style>
</head>
<body>

{react}
{reactdom}
{photos}
{data}
{edits_placeholder}
{shim}
{runtime}

<x-dc>
{visual}
</x-dc>
{comp}

<script type="application/x-family-pristine" id="fr-pristine">{pristine}</script>
{editor}
</body>
</html>
""".format(
    styles=styles,
    react=scr(react_src),
    reactdom=scr(reactdom_src),
    photos=scr(photos_src),
    data=scr(data_src, id="fr-base-data"),
    # window.FAMILY_EDITS / FAMILY_PHOTO_EDITS are (re)written into this exact
    # block whenever you press "Download updated record", baking edits in.
    edits_placeholder=scr(
        safe_js(open(EDITS_FILE, encoding="utf-8").read().strip()) if EDITS_FILE else
        ("window.FAMILY_EDITS = window.FAMILY_EDITS || null;\n"
         "window.FAMILY_PHOTO_EDITS = window.FAMILY_PHOTO_EDITS || null;"),
        id="fr-baked-edits"),
    shim=scr(merge_shim, id="fr-merge-shim"),
    runtime=scr(runtime_src),
    visual=visual,
    comp=comp,
    pristine=pristine_xdc.replace("</script>", "<\\/script>"),
    editor=scr(editor_js, id="fr-editor"),
)

open(OUT, "w", encoding="utf-8").write(doc)
print("Wrote %s (%.2f MB)" % (OUT, len(doc.encode("utf-8")) / 1e6))
