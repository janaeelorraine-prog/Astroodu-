/* ============================================================
   FAMILY RECORD — edit layer
   Applies your saved additions/edits on top of the original record,
   without ever altering the original data. Runs before the page draws.
   ============================================================ */
(function () {
  // Skip the runtime's optional "re-fetch my own source" hot-reload step — it
  // fails harmlessly on file:// but logs a scary error. We never need it.
  if (!window.__resources) window.__resources = true;

  var LS_EDITS  = "familyRecord.edits";
  var LS_PHOTOS = "familyRecord.photoEdits";

  function clone(o) {
    try { return structuredClone(o); } catch (e) { return JSON.parse(JSON.stringify(o)); }
  }
  function readLS(k) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; }
  }

  // Pristine copy of the record as first authored — never mutated.
  window.__FR_BASE = window.__FR_BASE || clone(window.FAMILY_DATA || { branches: [], people: {} });
  window.__FR_BASE_PHOTO_OVERRIDES = window.__FR_BASE_PHOTO_OVERRIDES || clone(window.PHOTO_OVERRIDES || {});

  function emptyEdits() {
    return { people: {}, removed: [], placements: [], newGens: [], history: null };
  }

  // Reorder a branch's generations by depth (generation level), keeping each
  // parent's child-group next to its siblings' groups on the same level.
  function orderGenerations(b, D) {
    var gens = b.generations || [];
    if (gens.length < 2) return;
    function genOfPerson(pid) {
      for (var i = 0; i < gens.length; i++) if ((gens[i].people || []).indexOf(pid) !== -1) return gens[i];
      return null;
    }
    // backfill parent for legacy child-groups that predate parent tracking
    gens.forEach(function (g) {
      if (g.__genId && !g.__parentId && /^Children of /.test(g.label || "")) {
        var nm = g.label.replace(/^Children of /, "");
        for (var pid in D.people) { if (D.people[pid].name === nm) { g.__parentId = pid; break; } }
      }
    });
    // depth: base gens known; child gens = parent's gen depth + 1 (resolve iteratively)
    gens.forEach(function (g) { g.__depth = (g.__baseIndex != null) ? g.__baseIndex : undefined; });
    for (var pass = 0; pass < gens.length + 2; pass++) {
      gens.forEach(function (g) {
        if (g.__depth !== undefined || !g.__parentId) return;
        var pg = genOfPerson(g.__parentId);
        if (pg && pg.__depth !== undefined) g.__depth = pg.__depth + 1;
      });
    }
    var maxd = 0; gens.forEach(function (g) { if (g.__depth !== undefined) maxd = Math.max(maxd, g.__depth); });
    gens.forEach(function (g) { if (g.__depth === undefined) g.__depth = maxd + 1; });
    // path: orders groups within a level by where their parent reads
    function pathOf(g) {
      if (g.__path) return g.__path;
      if (g.__baseIndex != null) return (g.__path = [g.__baseIndex]);
      if (g.__parentId) {
        var pg = genOfPerson(g.__parentId);
        var idx = pg ? (pg.people || []).indexOf(g.__parentId) : 999;
        return (g.__path = (pg ? pathOf(pg) : []).concat([idx]));
      }
      return (g.__path = [999]);
    }
    gens.forEach(function (g, i) { g.__ord = i; pathOf(g); });
    gens.sort(function (a, c) {
      if (a.__depth !== c.__depth) return a.__depth - c.__depth;
      var pa = a.__path, pc = c.__path, n = Math.max(pa.length, pc.length);
      for (var i = 0; i < n; i++) {
        var x = pa[i] == null ? -1 : pa[i], y = pc[i] == null ? -1 : pc[i];
        if (x !== y) return x - y;
      }
      return a.__ord - c.__ord;
    });
  }

  // Rebuild window.FAMILY_DATA = base + edits (idempotent; safe to call repeatedly).
  window.__frApplyEdits = function (edits, photoEdits) {
    edits = edits || emptyEdits();
    var D = clone(window.__FR_BASE);
    D.branches = D.branches || [];
    D.people = D.people || {};
    function branch(id) { return D.branches.filter(function (b) { return b.id === id; })[0]; }

    // tag the original generations with their depth (their position in the line)
    D.branches.forEach(function (b) {
      (b.generations || []).forEach(function (g, i) { g.__baseIndex = i; });
    });

    // 1) new generations appended to their branch (so placements can target them)
    (edits.newGens || []).forEach(function (g) {
      var b = branch(g.branchId);
      if (!b) return;
      b.generations = b.generations || [];
      if (!b.generations.some(function (x) { return x.__genId === g.id; })) {
        b.generations.push({ label: g.label || "", note: g.note || "", people: [],
                             __genId: g.id, __parentId: g.parentId || null });
      }
    });

    // 2) people: add brand-new or override existing fields
    Object.keys(edits.people || {}).forEach(function (id) {
      D.people[id] = Object.assign({}, D.people[id] || {}, edits.people[id]);
    });

    // 3) placements: put a person into a branch generation
    (edits.placements || []).forEach(function (p) {
      var b = branch(p.branchId);
      if (!b || !b.generations) return;
      var gen = b.generations[p.genIndex];
      if (!gen) return;
      gen.people = gen.people || [];
      if (gen.people.indexOf(p.personId) === -1) {
        if (p.atStart) gen.people.unshift(p.personId); else gen.people.push(p.personId);
      }
    });

    // 4) removals: drop the person and scrub them from every generation list
    (edits.removed || []).forEach(function (id) {
      delete D.people[id];
      D.branches.forEach(function (b) {
        (b.generations || []).forEach(function (g) {
          g.people = (g.people || []).filter(function (x) { return x !== id; });
        });
      });
    });

    // 5) order every branch's generations by genealogical depth, so a person's
    //    children always sit one level below them — an uncle's children land at
    //    the cousin level, never appended beneath your own descendants.
    D.branches.forEach(function (b) { orderGenerations(b, D); });

    if (edits.history) window.HISTORY = edits.history;

    window.FAMILY_DATA = D;

    // photo edits (data: URIs for newly added portraits) layer over the base
    var pe = photoEdits || {};
    window.PHOTO_OVERRIDES = Object.assign({}, window.__FR_BASE_PHOTO_OVERRIDES, pe);
    return D;
  };

  // Choose between the browser's working copy (localStorage) and the copy baked
  // into the file — whichever was saved most recently wins, so reopening a
  // freshly downloaded record never loses newer edits to a stale browser copy.
  function pickSource() {
    var ls = readLS(LS_EDITS), baked = window.FAMILY_EDITS;
    if (ls && baked) return ((ls.updatedAt || 0) >= (baked.updatedAt || 0)) ? "ls" : "baked";
    return ls ? "ls" : (baked ? "baked" : "none");
  }
  window.__frLoadEdits = function () {
    var src = pickSource(); window.__frSource = src;
    var e = (src === "ls" ? readLS(LS_EDITS) : src === "baked" ? window.FAMILY_EDITS : null) || emptyEdits();
    e.people = e.people || {}; e.removed = e.removed || [];
    e.placements = e.placements || []; e.newGens = e.newGens || [];
    return e;
  };
  window.__frLoadPhotoEdits = function () {
    var src = window.__frSource || pickSource();
    if (src === "ls") return readLS(LS_PHOTOS) || {};
    if (src === "baked") return window.FAMILY_PHOTO_EDITS || {};
    return readLS(LS_PHOTOS) || window.FAMILY_PHOTO_EDITS || {};
  };
  window.__frEmptyEdits = emptyEdits;
  window.__frSaveKeys = { edits: LS_EDITS, photos: LS_PHOTOS };

  // Apply immediately so the very first paint already includes your edits.
  window.__frApplyEdits(window.__frLoadEdits(), window.__frLoadPhotoEdits());
})();
