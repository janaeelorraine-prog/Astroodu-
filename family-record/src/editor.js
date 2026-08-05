/* ============================================================
   THE FAMILY RECORD — in-page editor
   Add relatives (a father's siblings, a mother's children, anyone),
   edit or correct a person, remove a mistaken entry, and download an
   updated copy of the whole record as a single file. Every change is
   also saved automatically in this browser so nothing is ever lost.
   ============================================================ */
(function () {
  function start() {
    var React = window.React, ReactDOM = window.ReactDOM;
    if (!React || !ReactDOM) { return setTimeout(start, 60); }
    var h = React.createElement;
    var useState = React.useState, useRef = React.useRef;

    var KEYS = window.__frSaveKeys || { edits: "familyRecord.edits", photos: "familyRecord.photoEdits" };
    var GOLD = "#9a7420", INK = "#241d15", MUTE = "#7a6a53", LINE = "#e0d3b7", GREEN = "#4f7440", RUST = "#a8492a";
    var PAT = "#a8492a", MAT = "#43606e";

    // ---------- helpers ----------
    function clone(o) { try { return structuredClone(o); } catch (e) { return JSON.parse(JSON.stringify(o)); } }
    function newId(name) {
      var slug = String(name || "person").toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "person";
      return slug + "_" + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
    }
    function base() { return window.__FR_BASE || { branches: [], people: {} }; }
    function isBasePerson(id) { return !!(base().people || {})[id]; }
    function mergedPerson(edits, id) {
      return Object.assign({}, (base().people || {})[id] || {}, edits.people[id] || {});
    }
    function accent(side) { return side === "mat" ? MAT : PAT; }

    // Branch → generations → people, reflecting working edits, no heavy photo clones.
    function structure(edits) {
      return (base().branches || []).map(function (b) {
        var gens = (b.generations || []).map(function (g, gi) {
          return { label: g.label, note: g.note, genIndex: gi, isNew: false, people: (g.people || []).slice() };
        });
        (edits.newGens || []).filter(function (g) { return g.branchId === b.id; }).forEach(function (g) {
          gens.push({ label: g.label, note: g.note, genIndex: gens.length, isNew: true, parentId: g.parentId || null, people: [] });
        });
        (edits.placements || []).filter(function (p) { return p.branchId === b.id; }).forEach(function (p) {
          var gen = gens[p.genIndex];
          if (gen && gen.people.indexOf(p.personId) === -1) {
            if (p.atStart) gen.people.unshift(p.personId); else gen.people.push(p.personId);
          }
        });
        gens.forEach(function (g) {
          g.people = g.people.map(function (id) {
            var m = mergedPerson(edits, id);
            return { id: id, name: m.name || id, rel: m.rel || "", side: m.side || b.side,
                     isNew: !isBasePerson(id), removed: (edits.removed || []).indexOf(id) !== -1 };
          });
        });
        orderGens(gens);
        return { id: b.id, name: b.name, side: b.side, road: b.road, gens: gens };
      });
    }

    // Sort a branch's generations by depth so the editor list mirrors the record.
    function orderGens(gens) {
      if (gens.length < 2) return;
      function genOfPerson(pid) {
        for (var i = 0; i < gens.length; i++)
          if ((gens[i].people || []).some(function (p) { return p.id === pid; })) return gens[i];
        return null;
      }
      gens.forEach(function (g, i) {
        g.__depth = g.isNew ? undefined : i;
        g.__ord = i;
      });
      for (var pass = 0; pass < gens.length + 2; pass++) {
        gens.forEach(function (g) {
          if (g.__depth !== undefined || !g.parentId) return;
          var pg = genOfPerson(g.parentId);
          if (pg && pg.__depth !== undefined) g.__depth = pg.__depth + 1;
        });
      }
      var maxd = 0; gens.forEach(function (g) { if (g.__depth !== undefined) maxd = Math.max(maxd, g.__depth); });
      gens.forEach(function (g) { if (g.__depth === undefined) g.__depth = maxd + 1; });
      function pathOf(g) {
        if (g.__path) return g.__path;
        if (!g.isNew) return (g.__path = [g.__ord]);
        if (g.parentId) {
          var pg = genOfPerson(g.parentId);
          var idx = pg ? pg.people.map(function (p) { return p.id; }).indexOf(g.parentId) : 999;
          return (g.__path = (pg ? pathOf(pg) : []).concat([idx]));
        }
        return (g.__path = [999]);
      }
      gens.forEach(pathOf);
      gens.sort(function (a, c) {
        if (a.__depth !== c.__depth) return a.__depth - c.__depth;
        var pa = a.__path, pc = c.__path, n = Math.max(pa.length, pc.length);
        for (var i = 0; i < n; i++) { var x = pa[i] == null ? -1 : pa[i], y = pc[i] == null ? -1 : pc[i]; if (x !== y) return x - y; }
        return a.__ord - c.__ord;
      });
    }

    function parseStories(text) {
      return String(text || "").split("\n").map(function (s) { return s.trim(); })
        .filter(Boolean).map(function (t) { return { kind: "family", text: t }; });
    }
    function parseSources(text) {
      return String(text || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
        .map(function (line) {
          var i = line.indexOf("|");
          if (i !== -1) return { label: line.slice(0, i).trim(), url: line.slice(i + 1).trim() };
          if (/^https?:\/\//i.test(line)) return { label: line, url: line };
          return { label: line, url: "" };
        });
    }

    // ---------- editor component ----------
    function Editor() {
      var s0 = useState(false), open = s0[0], setOpen = s0[1];
      var s1 = useState(function () { return clone(window.__frLoadEdits()); }), edits = s1[0], setEdits = s1[1];
      var s2 = useState(function () { return clone(window.__frLoadPhotoEdits()); }), photoEdits = s2[0], setPhotoEdits = s2[1];
      var b0 = (base().branches || [])[0];
      var s3 = useState(b0 ? b0.id : null), branchId = s3[0], setBranchId = s3[1];
      var s4 = useState(null), form = s4[0], setForm = s4[1];
      var s5 = useState(false), dirty = s5[0], setDirty = s5[1];
      var s6 = useState(""), flashMsg = s6[0], setFlash = s6[1];
      var flashT = useRef(null);

      function persist(nextEdits, nextPhotos) {
        try { localStorage.setItem(KEYS.edits, JSON.stringify(nextEdits)); } catch (x) {}
        try { localStorage.setItem(KEYS.photos, JSON.stringify(nextPhotos || photoEdits)); } catch (x) {}
        setDirty(true); setFlash("Saved");
        if (flashT.current) clearTimeout(flashT.current);
        flashT.current = setTimeout(function () { setFlash(""); }, 1400);
      }
      function commit(nextEdits, nextPhotos) {
        nextEdits.updatedAt = Date.now(); // newest-wins when the file is reopened elsewhere
        setEdits(nextEdits);
        if (nextPhotos) setPhotoEdits(nextPhotos);
        persist(nextEdits, nextPhotos);
      }

      function currentPhotoOf(id) {
        if (photoEdits[id]) return photoEdits[id];
        var drops = {};
        try { drops = JSON.parse(localStorage.getItem("familyRecord.drops") || "{}"); } catch (e) {}
        if (drops[id]) return drops[id];
        var bp = (base().people[id] || {}).photo;
        return (bp && /^data:image/.test(bp)) ? bp : "";
      }
      function blankDraft(side) {
        return { name: "", known: "", dates: "", place: "", rel: "", life: "", status: "unknown",
                 gap: false, addStory: "", addSource: "", photo: "", currentPhoto: "", removePhoto: false, side: side || "pat" };
      }
      function openAdd(branch, genIndex, title) {
        setForm({ mode: "add", title: title, branchId: branch.id, genIndex: genIndex, personId: null, draft: blankDraft(branch.side) });
      }
      function openSibling(branch, gen, person) {
        setForm({ mode: "add", title: "Add a sibling of " + person.name, branchId: branch.id,
                  genIndex: gen.genIndex, personId: null, draft: blankDraft(person.side || branch.side) });
      }
      function openChild(branch, gen, person) {
        setForm({ mode: "child", title: "Add a child of " + person.name, branchId: branch.id,
                  parentGenIndex: gen.genIndex, parentId: person.id, parentName: person.name,
                  personId: null, draft: blankDraft(person.side || branch.side) });
      }
      function openEdit(branch, gen, person) {
        var m = mergedPerson(edits, person.id);
        setForm({ mode: "edit", title: "Edit " + (m.name || person.name), branchId: branch.id, genIndex: gen.genIndex, personId: person.id,
          draft: { name: m.name || "", known: m.known || "", dates: m.dates || "", place: m.place || "", rel: m.rel || "",
                   life: m.life || "", status: m.living ? "living" : (m.deceased ? "deceased" : "unknown"),
                   gap: !!m.gap, addStory: "", addSource: "", photo: "", currentPhoto: currentPhotoOf(person.id),
                   removePhoto: false, side: m.side || branch.side } });
      }

      function saveForm() {
        var f = form, d = f.draft;
        if (!d.name.trim()) { alert("Please enter a name."); return; }
        var next = clone(edits), nextPhotos = clone(photoEdits);
        var id = f.personId || newId(d.name);
        var branchIdT = f.branchId, genIndex = f.genIndex;

        if (f.mode === "child") {
          // Each parent gets their OWN "Children of <name>" group — never reuse
          // another person's children group just because it sits below them.
          var br = structure(next).filter(function (b) { return b.id === branchIdT; })[0];
          var target = "Children of " + f.parentName;
          var own = br.gens.filter(function (g) {
            return (g.parentId && g.parentId === f.parentId) || (g.isNew && g.label === target);
          })[0];
          if (own) {
            genIndex = own.genIndex;
          } else {
            next.newGens.push({ branchId: branchIdT, id: "gen_" + Date.now().toString(36),
                                label: target, note: "", parentId: f.parentId || null });
            genIndex = br.gens.length; // appended after the current generations
          }
        }

        var prev = f.mode === "edit" ? mergedPerson(edits, id) : {};
        var obj = { name: d.name.trim(), side: d.side || "pat", dates: d.dates.trim(),
                    place: d.place.trim(), rel: d.rel.trim(), life: d.life.trim() };
        obj.known = d.known.trim();
        obj.living = d.status === "living";
        obj.deceased = d.status === "deceased";
        if (d.gap) obj.gap = true;
        if (f.mode !== "edit") { obj.facts = []; obj.flags = []; }
        var addS = parseStories(d.addStory); if (addS.length) obj.stories = (prev.stories || []).concat(addS);
        var addU = parseSources(d.addSource); if (addU.length) obj.sources = (prev.sources || []).concat(addU);

        next.people[id] = Object.assign({}, next.people[id] || {}, obj);
        next.removed = (next.removed || []).filter(function (x) { return x !== id; });
        if (f.mode !== "edit") next.placements.push({ branchId: branchIdT, genIndex: genIndex, personId: id });
        // photos live only in the photo layer (never inline in the person, to
        // keep edits small); photo:null overrides a base portrait when removed.
        if (d.photo) { nextPhotos[id] = d.photo; if (next.people[id].photo) next.people[id].photo = null; }
        else if (d.removePhoto) { delete nextPhotos[id]; next.people[id].photo = null; }

        commit(next, nextPhotos);
        setForm(null);
      }

      function removePerson(person) {
        if (!confirm("Remove " + person.name + " from the record?\n(You can restore them or add them again.)")) return;
        var next = clone(edits);
        if (isBasePerson(person.id)) {
          if ((next.removed || []).indexOf(person.id) === -1) next.removed.push(person.id);
        } else {
          delete next.people[person.id];
          next.placements = next.placements.filter(function (p) { return p.personId !== person.id; });
        }
        commit(next);
      }
      function restorePerson(person) {
        var next = clone(edits);
        next.removed = (next.removed || []).filter(function (x) { return x !== person.id; });
        commit(next);
      }
      function done() { if (dirty) location.reload(); else setOpen(false); }

      function download() {
        try {
          var docEl = document.documentElement.cloneNode(true);
          var root = docEl.querySelector("#dc-root");
          var pri = document.getElementById("fr-pristine");
          if (root && pri) {
            var tmp = document.createElement("div");
            tmp.innerHTML = pri.textContent.split("<\\/script>").join("<\/script>");
            var xdc = tmp.querySelector("x-dc");
            if (xdc) root.replaceWith(xdc); else root.remove();
          }
          var be = docEl.querySelector("#fr-baked-edits");
          if (be) {
            // fold in any photos added by dragging onto a portrait/gallery frame
            // (the record's own photo system), so they survive the download too
            var drops = {};
            try { drops = JSON.parse(localStorage.getItem("familyRecord.drops") || "{}"); } catch (e) {}
            var allPhotos = Object.assign({}, drops, photoEdits);
            var body = "window.FAMILY_EDITS = " + JSON.stringify(edits) + ";\n"
                     + "window.FAMILY_PHOTO_EDITS = " + JSON.stringify(allPhotos) + ";";
            be.textContent = body.replace(/<\/script/gi, "<\\/script");
          }
          var ui = docEl.querySelector("#fr-editor-ui"); if (ui) ui.remove();
          docEl.querySelectorAll("head style").forEach(function (st) { if (st.id !== "fr-fonts") st.remove(); });
          var htmlText = "<!doctype html>\n" + docEl.outerHTML;
          var blob = new Blob([htmlText], { type: "text/html" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob); a.download = "The_Family_Record.html";
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 8000);
        } catch (err) {
          alert("Sorry — the download failed: " + (err && err.message ? err.message : err));
        }
      }

      // ----- render: closed = floating button -----
      if (!open) {
        return h("button", { onClick: function () { setOpen(true); }, title: "Add or edit family", style: fab() },
          "✎  Edit / Add family");
      }

      var branches = structure(edits);
      var branch = branches.filter(function (b) { return b.id === branchId; })[0] || branches[0];

      return h("div", { style: overlay() },
        h("div", { style: sheet() },
          h("div", { style: { display: "flex", alignItems: "center", gap: "10px", padding: "16px 20px",
              borderBottom: "1px solid " + LINE, position: "sticky", top: 0, background: "#fbf7ee", zIndex: 2, flexWrap: "wrap" } },
            h("div", { style: { fontFamily: "'Cormorant Garamond',serif", fontSize: "24px", color: INK, flex: 1, minWidth: "140px" } }, "Edit the Family Record"),
            flashMsg ? h("span", { style: { color: GREEN, fontSize: "13px", fontFamily: "Archivo,sans-serif" } }, "✓ " + flashMsg) : null,
            h("button", { onClick: download, style: btn(GOLD, false), title: "Save a permanent copy you can keep or share" }, "⤓  Download updated record"),
            h("button", { onClick: done, style: btn(INK, false) }, dirty ? "Done — show changes" : "Close")),

          h("div", { style: { padding: "10px 20px", background: "#f7f1e3", color: MUTE, fontSize: "13px", lineHeight: 1.5, borderBottom: "1px solid " + LINE } },
            "Changes save automatically in this browser. To keep them forever, or open the record on another device, press ",
            h("b", null, "Download updated record"), " and reopen that file."),

          h("div", { style: { display: "flex", flexWrap: "wrap", gap: "6px", padding: "12px 20px" } },
            branches.map(function (b) {
              var on = b.id === branchId;
              return h("button", { key: b.id, onClick: function () { setBranchId(b.id); },
                style: { all: "unset", cursor: "pointer", fontFamily: "Archivo,sans-serif", fontSize: "12px", padding: "6px 12px",
                  borderRadius: "999px", color: on ? "#fff" : INK, background: on ? accent(b.side) : "transparent",
                  border: "1px solid " + (on ? accent(b.side) : LINE) } },
                b.name.replace(/^The /, "").replace(/ Line$/, ""),
                h("span", { style: { opacity: .7, marginLeft: "6px", fontSize: "10px" } }, b.side === "mat" ? "mother's" : "father's"));
            })),

          h("div", { style: { padding: "4px 20px 24px" } },
            branch ? h("div", { style: { fontSize: "13px", color: MUTE, fontStyle: "italic", marginBottom: "12px" } }, branch.road || "") : null,
            branch ? branch.gens.map(function (gen) {
              return h("div", { key: gen.genIndex, style: { marginBottom: "18px" } },
                h("div", { style: { display: "flex", alignItems: "baseline", gap: "10px", borderBottom: "1px solid " + LINE, paddingBottom: "6px", marginBottom: "8px" } },
                  h("div", { style: { fontFamily: "Archivo,sans-serif", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: GOLD, flex: 1 } }, gen.label || "(untitled group)"),
                  h("button", { onClick: function () { openAdd(branch, gen.genIndex, "Add a person to this group"); }, style: miniBtn() }, "+ Add someone here")),
                gen.people.length
                  ? gen.people.map(function (p) { return personRow(p, branch, gen); })
                  : h("div", { style: { color: MUTE, fontStyle: "italic", fontSize: "14px", padding: "2px 0 6px" } }, "No one here yet."));
            }) : null),

          form ? personForm() : null));

      function personRow(p, branch, gen) {
        var col = accent(p.side);
        return h("div", { key: p.id, style: { display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px",
            border: "1px solid " + LINE, borderRadius: "8px", marginBottom: "6px", background: p.removed ? "#f3ece0" : "#fffdf8", opacity: p.removed ? .55 : 1 } },
          h("span", { style: { width: "8px", height: "8px", borderRadius: "50%", background: col, flex: "0 0 auto" } }),
          h("div", { style: { flex: 1, minWidth: 0 } },
            h("div", { style: { fontFamily: "'Cormorant Garamond',serif", fontSize: "18px", color: INK, textDecoration: p.removed ? "line-through" : "none" } },
              p.name, p.isNew ? h("span", { style: tag(GREEN) }, "added") : null),
            h("div", { style: { fontSize: "12px", color: MUTE } }, p.rel || "")),
          p.removed
            ? h("button", { onClick: function () { restorePerson(p); }, style: miniBtn() }, "Restore")
            : h("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" } },
                h("button", { onClick: function () { openSibling(branch, gen, p); }, style: miniBtn() }, "+ Sibling"),
                h("button", { onClick: function () { openChild(branch, gen, p); }, style: miniBtn() }, "+ Child"),
                h("button", { onClick: function () { openEdit(branch, gen, p); }, style: miniBtn() }, "Edit"),
                h("button", { onClick: function () { removePerson(p); }, style: miniBtn(RUST) }, "Remove")));
      }

      function personForm() {
        var d = form.draft;
        function set(k, v) { var nf = Object.assign({}, form); nf.draft = Object.assign({}, d); nf.draft[k] = v; setForm(nf); }
        function field(label, k, opts) {
          opts = opts || {};
          return h("label", { style: { display: "block", marginBottom: "12px" } },
            h("div", { style: lbl() }, label),
            opts.area
              ? h("textarea", { value: d[k], onChange: function (ev) { set(k, ev.target.value); }, rows: opts.rows || 3, placeholder: opts.ph || "", style: input(true) })
              : h("input", { value: d[k], onChange: function (ev) { set(k, ev.target.value); }, placeholder: opts.ph || "", style: input(false) }));
        }
        function pickPhoto() {
          var inp = document.createElement("input"); inp.type = "file"; inp.accept = "image/*";
          inp.onchange = function () {
            var file = inp.files[0]; if (!file) return;
            var r = new FileReader();
            r.onload = function () { var nf = Object.assign({}, form); nf.draft = Object.assign({}, d, { photo: r.result, removePhoto: false }); setForm(nf); };
            r.readAsDataURL(file);
          };
          inp.click();
        }
        var shownPhoto = d.removePhoto ? "" : (d.photo || d.currentPhoto);
        return h("div", { style: overlay(0.4), onClick: function (ev) { if (ev.target === ev.currentTarget) setForm(null); } },
          h("div", { style: formSheet() },
            h("div", { style: { fontFamily: "'Cormorant Garamond',serif", fontSize: "22px", color: INK, marginBottom: "4px" } }, form.title),
            h("div", { style: { fontSize: "12.5px", color: MUTE, marginBottom: "16px" } },
              form.mode === "child" ? "They'll be added in the generation below."
                : form.mode === "edit" ? "Update details. Existing photos, facts and sources are kept."
                : "They'll be added to this branch."),
            field("Full name", "name", { ph: "e.g. Clarence Sharp" }),
            row(field("Also known as (optional)", "known", { ph: "nickname" }), field("Dates (optional)", "dates", { ph: "e.g. 1930 — 2001, or “Living”" })),
            row(field("Where (optional)", "place", { ph: "b. Logan County, W.Va." }), field("Relationship (optional)", "rel", { ph: "e.g. Great-uncle" })),
            field("Life / notes (optional)", "life", { area: true, rows: 4, ph: "Anything you know — where they lived, their work, family, a story in a sentence or two." }),
            field("Add a memory (optional)", "addStory", { area: true, rows: 2, ph: "One per line. Saved as family testimony." }),
            field("Add a source link (optional)", "addSource", { area: true, rows: 2, ph: "One per line. “Label | https://…” or just a link." }),
            h("div", { style: { margin: "6px 0 10px" } },
              h("div", { style: lbl() }, "Status"),
              h("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
                [["living", "Living"], ["deceased", "Deceased"], ["unknown", "Unknown"]].map(function (o) {
                  var on = d.status === o[0];
                  var c = o[0] === "living" ? GREEN : o[0] === "deceased" ? "#6b5d47" : MUTE;
                  return h("button", { key: o[0], onClick: function () { set("status", o[0]); },
                    style: { all: "unset", cursor: "pointer", fontFamily: "Archivo,sans-serif", fontSize: "12px", padding: "6px 14px",
                      borderRadius: "999px", color: on ? "#fff" : c, background: on ? c : "transparent", border: "1px solid " + c } }, o[1]);
                }))),
            h("div", { style: { margin: "6px 0 6px" } },
              h("div", { style: lbl() }, "Photo"),
              h("div", { style: { display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" } },
                shownPhoto
                  ? h("img", { src: shownPhoto, style: { width: "48px", height: "48px", objectFit: "cover", borderRadius: "50%", border: "1px solid " + LINE } })
                  : h("div", { style: { width: "48px", height: "48px", borderRadius: "50%", border: "1px dashed " + LINE, display: "flex", alignItems: "center", justifyContent: "center", color: MUTE, fontSize: "10px", fontFamily: "Archivo,sans-serif" } }, "none"),
                h("button", { onClick: pickPhoto, style: miniBtn() }, shownPhoto ? "Change photo" : "Choose a photo"),
                shownPhoto ? h("button", { onClick: function () { var nf = Object.assign({}, form); nf.draft = Object.assign({}, d, { photo: "", removePhoto: true }); setForm(nf); }, style: miniBtn(RUST) }, "Remove photo") : null)),
            h("div", { style: { display: "flex", gap: "18px", alignItems: "center", flexWrap: "wrap", margin: "10px 0 14px" } },
              h("label", { style: chk() }, h("input", { type: "checkbox", checked: d.gap, onChange: function (e) { set("gap", e.target.checked); } }), " Not yet found / a gap")),
            h("div", { style: { display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid " + LINE, paddingTop: "14px" } },
              h("button", { onClick: function () { setForm(null); }, style: btn(MUTE, false) }, "Cancel"),
              h("button", { onClick: saveForm, style: btn(GOLD, true) }, form.mode === "edit" ? "Save changes" : "Add to the record"))));
      }

      function row(a, b) { return h("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
        h("div", { style: { flex: "1 1 180px" } }, a), h("div", { style: { flex: "1 1 180px" } }, b)); }
    }

    // ---------- style helpers ----------
    function fab() { return { all: "unset", cursor: "pointer", fontFamily: "Archivo,sans-serif", fontSize: "13px", letterSpacing: ".03em",
      color: "#fff", background: GOLD, border: "1px solid " + GOLD, padding: "12px 18px", borderRadius: "999px", boxShadow: "0 6px 20px rgba(0,0,0,.25)" }; }
    function overlay(a) { return { position: "fixed", inset: 0, background: "rgba(30,24,16," + (a == null ? .3 : a) + ")",
      zIndex: 2147483000, display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "24px", overflow: "auto" }; }
    function sheet() { return { width: "min(880px,100%)", background: "#fbf7ee", borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,.35)",
      fontFamily: "Newsreader,Georgia,serif", color: INK, overflow: "hidden", marginBottom: "40px" }; }
    function formSheet() { return { width: "min(560px,100%)", background: "#fbf7ee", borderRadius: "12px", boxShadow: "0 20px 60px rgba(0,0,0,.4)",
      padding: "22px", fontFamily: "Newsreader,Georgia,serif", maxHeight: "90vh", overflow: "auto" }; }
    function btn(color, filled) { return { all: "unset", cursor: "pointer", fontFamily: "Archivo,sans-serif", fontSize: "12px", letterSpacing: ".04em",
      padding: "9px 14px", borderRadius: "999px", color: filled ? "#fff" : color, background: filled ? color : "transparent", border: "1px solid " + color, whiteSpace: "nowrap" }; }
    function miniBtn(color) { color = color || MUTE; return { all: "unset", cursor: "pointer", fontFamily: "Archivo,sans-serif", fontSize: "11px",
      padding: "5px 9px", borderRadius: "6px", color: color, border: "1px solid " + (color === RUST ? "rgba(168,73,42,.4)" : LINE), whiteSpace: "nowrap" }; }
    function lbl() { return { fontFamily: "Archivo,sans-serif", fontSize: "10px", letterSpacing: ".12em", textTransform: "uppercase", color: GOLD, marginBottom: "4px" }; }
    function input(area) { return { width: "100%", boxSizing: "border-box", font: "16px Newsreader,Georgia,serif", color: INK, background: "#fffdf8",
      border: "1px solid " + LINE, borderRadius: "7px", padding: "8px 10px", resize: area ? "vertical" : "none" }; }
    function chk() { return { fontFamily: "Archivo,sans-serif", fontSize: "12.5px", color: INK, display: "inline-flex", alignItems: "center", gap: "5px", cursor: "pointer" }; }
    function tag(c) { return { fontFamily: "Archivo,sans-serif", fontSize: "9px", letterSpacing: ".1em", textTransform: "uppercase", color: c,
      border: "1px solid " + c, borderRadius: "4px", padding: "1px 5px", marginLeft: "8px", verticalAlign: "middle" }; }

    function Mount() {
      return h("div", { style: { position: "fixed", right: "20px", bottom: "20px", zIndex: 2147483000, fontFamily: "Newsreader,serif" } }, h(Editor, null));
    }

    var host = document.createElement("div");
    host.id = "fr-editor-ui";
    document.body.appendChild(host);
    if (ReactDOM.createRoot) ReactDOM.createRoot(host).render(h(Mount)); else ReactDOM.render(h(Mount), host);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(start, 120); });
  else setTimeout(start, 120);
})();
