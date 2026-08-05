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

  // Rebuild window.FAMILY_DATA = base + edits (idempotent; safe to call repeatedly).
  window.__frApplyEdits = function (edits, photoEdits) {
    edits = edits || emptyEdits();
    var D = clone(window.__FR_BASE);
    D.branches = D.branches || [];
    D.people = D.people || {};
    function branch(id) { return D.branches.filter(function (b) { return b.id === id; })[0]; }

    // 1) new generations appended to their branch (so placements can target them)
    (edits.newGens || []).forEach(function (g) {
      var b = branch(g.branchId);
      if (!b) return;
      b.generations = b.generations || [];
      if (!b.generations.some(function (x) { return x.__genId === g.id; })) {
        b.generations.push({ label: g.label || "", note: g.note || "", people: [], __genId: g.id });
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

    if (edits.history) window.HISTORY = edits.history;

    window.FAMILY_DATA = D;

    // photo edits (data: URIs for newly added portraits) layer over the base
    var pe = photoEdits || {};
    window.PHOTO_OVERRIDES = Object.assign({}, window.__FR_BASE_PHOTO_OVERRIDES, pe);
    return D;
  };

  // Load the working copy (localStorage) or the copy baked into the file on export.
  window.__frLoadEdits = function () {
    var e = readLS(LS_EDITS) || window.FAMILY_EDITS || emptyEdits();
    // normalise shape
    e.people = e.people || {}; e.removed = e.removed || [];
    e.placements = e.placements || []; e.newGens = e.newGens || [];
    return e;
  };
  window.__frLoadPhotoEdits = function () {
    return readLS(LS_PHOTOS) || window.FAMILY_PHOTO_EDITS || {};
  };
  window.__frEmptyEdits = emptyEdits;
  window.__frSaveKeys = { edits: LS_EDITS, photos: LS_PHOTOS };

  // Apply immediately so the very first paint already includes your edits.
  window.__frApplyEdits(window.__frLoadEdits(), window.__frLoadPhotoEdits());
})();
