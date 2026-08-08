(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "0.1";
  const MAX_PROGRESS_NARRATIVES = 3;

  const TRIGGER_TYPES = Object.freeze([
    "manual",
    "interaction.collect",
    "interaction.extract",
    "interaction.observe",
    "interaction.inspect",
    "interaction.analyze",
    "movement.portal_crossed",
    "exploration.zone_discovered",
    "exploration.map_discovered",
    "exploration.sector_discovered",
    "exploration.surface_percent",
    "progression.mission_completed",
    "progression.milestone",
    "progression.skill_unlocked"
  ]);

  const COMMON_TRIGGER_FILTERS = Object.freeze([
    "type", "count", "threshold", "mapId", "zoneId", "uniqueOnly"
  ]);

  const TRIGGER_FILTERS = Object.freeze({
    manual: Object.freeze([]),

    "interaction.collect": Object.freeze([
      "objectId", "kind", "family", "subject", "tagsAny", "tagsAll"
    ]),
    "interaction.extract": Object.freeze([
      "objectId", "kind", "family", "subject", "tagsAny", "tagsAll"
    ]),
    "interaction.observe": Object.freeze([
      "objectId", "kind", "family", "subject", "tagsAny", "tagsAll"
    ]),
    "interaction.inspect": Object.freeze([
      "objectId", "kind", "family", "subject", "tagsAny", "tagsAll"
    ]),
    "interaction.analyze": Object.freeze([
      "objectId", "kind", "family", "subject", "tagsAny", "tagsAll"
    ]),

    "movement.portal_crossed": Object.freeze([
      "direction", "fromMapId", "toMapId"
    ]),

    "exploration.zone_discovered": Object.freeze([
      "biome"
    ]),
    "exploration.map_discovered": Object.freeze([
      "biome"
    ]),
    "exploration.sector_discovered": Object.freeze([
      "biome"
    ]),
    "exploration.surface_percent": Object.freeze([
      "biome"
    ]),

    "progression.mission_completed": Object.freeze([
      "missionId"
    ]),
    "progression.milestone": Object.freeze([
      "milestoneId"
    ]),
    "progression.skill_unlocked": Object.freeze([
      "skillId"
    ])
  });

  const EFFECT_TYPES = Object.freeze([
    "inventory.add",
    "world.spawn"
  ]);

  const COMPLETION_GATE_TYPES = Object.freeze([
    "proximity.shelter"
  ]);

  const SHELTER_KINDS = Object.freeze([
    "camp",
    "refuge",
    "base"
  ]);

  const PLACEMENT_MODES = Object.freeze([
    "specific",
    "random-valid",
    "near-bluefox",
    "near-camp",
    "map-center",
    "zone-random"
  ]);

  const isObject = (value) =>
    Boolean(value && typeof value === "object" && !Array.isArray(value));

  const isNonEmptyString = (value) =>
    typeof value === "string" && value.trim().length > 0;

  const asArray = (value) =>
    Array.isArray(value) ? value : value == null ? [] : [value];

  const add = (bucket, missionId, path, message) => {
    bucket.push(`${missionId || "<sans-id>"} · ${path} : ${message}`);
  };

  const legacyTriggerToV01 = (trigger) => {
    if (!isObject(trigger)) return null;
    if (trigger.type) return { ...trigger };
    if (trigger.mode === "manual") return { type: "manual" };

    const event = String(trigger.event || "").toUpperCase();
    const mapped = event.includes("COLLECT")
      ? "interaction.collect"
      : event.includes("EXTRACT")
        ? "interaction.extract"
        : event.includes("ANALYZ")
          ? "interaction.analyze"
          : event.includes("INSPECT")
            ? "interaction.inspect"
            : event.includes("OBSERV")
              ? "interaction.observe"
              : null;

    return mapped
      ? {
          type: mapped,
          family: trigger.family,
          objectId: trigger.objectId,
          tagsAny: trigger.tagsAny
        }
      : null;
  };

  const validateTrigger = (mission, errors, warnings, compatibility) => {
    const missionId = mission?.id;
    const original = mission?.trigger;

    if (!isObject(original)) {
      add(errors, missionId, "trigger", "déclencheur absent ou invalide.");
      return;
    }

    let trigger = original;
    if (!trigger.type && compatibility === "legacy-v0") {
      const converted = legacyTriggerToV01(trigger);
      if (converted) {
        trigger = converted;
        add(
          warnings,
          missionId,
          "trigger",
          `syntaxe V0 détectée ; cible V0.1 recommandée : ${JSON.stringify(converted)}`
        );
      }
    }

    if (!isNonEmptyString(trigger.type) || !TRIGGER_TYPES.includes(trigger.type)) {
      add(
        errors,
        missionId,
        "trigger.type",
        `type non supporté. Autorisés : ${TRIGGER_TYPES.join(", ")}.`
      );
      return;
    }

    const allowed = new Set([
      ...COMMON_TRIGGER_FILTERS,
      ...(TRIGGER_FILTERS[trigger.type] || [])
    ]);

    Object.keys(trigger).forEach((key) => {
      if (!allowed.has(key)) {
        add(
          errors,
          missionId,
          `trigger.${key}`,
          `filtre hors contrat pour ${trigger.type}.`
        );
      }
    });

    if (trigger.count != null && (!Number.isFinite(Number(trigger.count)) || Number(trigger.count) < 1)) {
      add(errors, missionId, "trigger.count", "doit être un entier >= 1.");
    }

    if (trigger.threshold != null && !Number.isFinite(Number(trigger.threshold))) {
      add(errors, missionId, "trigger.threshold", "doit être numérique.");
    }

    if (
      trigger.type === "movement.portal_crossed" &&
      trigger.direction != null &&
      !["north", "south", "east", "west"].includes(trigger.direction)
    ) {
      add(
        errors,
        missionId,
        "trigger.direction",
        "doit valoir north, south, east ou west."
      );
    }

    if (
      trigger.type === "exploration.surface_percent" &&
      (Number(trigger.threshold) <= 0 || Number(trigger.threshold) > 100)
    ) {
      add(
        errors,
        missionId,
        "trigger.threshold",
        "pour surface_percent, doit être > 0 et <= 100."
      );
    }

    ["tagsAny", "tagsAll"].forEach((key) => {
      if (trigger[key] != null && !Array.isArray(trigger[key])) {
        add(errors, missionId, `trigger.${key}`, "doit être un tableau.");
      }
    });
  };

  const validateNarrative = (mission, errors, warnings, compatibility) => {
    const missionId = mission?.id;
    const narrative = mission?.narrative || {};

    ["revealed", "completed"].forEach((moment) => {
      if (narrative[moment] == null) return;
      if (!Array.isArray(narrative[moment])) {
        add(errors, missionId, `narrative.${moment}`, "doit être un tableau.");
        return;
      }
      narrative[moment].forEach((line, index) => {
        if (!isNonEmptyString(line)) {
          add(
            errors,
            missionId,
            `narrative.${moment}[${index}]`,
            "doit être une chaîne non vide."
          );
        }
      });
    });

    const progress = asArray(narrative.progress);
    if (progress.length > MAX_PROGRESS_NARRATIVES) {
      add(
        errors,
        missionId,
        "narrative.progress",
        `maximum ${MAX_PROGRESS_NARRATIVES} jalons de progression.`
      );
    }

    progress.forEach((entry, index) => {
      if (isNonEmptyString(entry)) {
        if (compatibility === "legacy-v0") {
          add(
            warnings,
            missionId,
            `narrative.progress[${index}]`,
            "ancienne forme texte ; V0.1 attend {text, at} ou {text, atCount}."
          );
          return;
        }
        add(
          errors,
          missionId,
          `narrative.progress[${index}]`,
          "V0.1 exige un jalon structuré."
        );
        return;
      }

      if (!isObject(entry) || !isNonEmptyString(entry.text)) {
        add(
          errors,
          missionId,
          `narrative.progress[${index}]`,
          "doit contenir un champ text non vide."
        );
        return;
      }

      const hasAt = entry.at != null;
      const hasAtCount = entry.atCount != null;
      if (hasAt === hasAtCount) {
        add(
          errors,
          missionId,
          `narrative.progress[${index}]`,
          "doit définir exactement un seuil : at OU atCount."
        );
      }
      if (hasAt && (Number(entry.at) <= 0 || Number(entry.at) >= 1)) {
        add(
          errors,
          missionId,
          `narrative.progress[${index}].at`,
          "doit être strictement compris entre 0 et 1."
        );
      }
      if (hasAtCount && (!Number.isFinite(Number(entry.atCount)) || Number(entry.atCount) < 1)) {
        add(
          errors,
          missionId,
          `narrative.progress[${index}].atCount`,
          "doit être >= 1."
        );
      }
      if (entry.slot != null && !isNonEmptyString(entry.slot)) {
        add(
          errors,
          missionId,
          `narrative.progress[${index}].slot`,
          "doit être une chaîne non vide."
        );
      }
    });

    if (narrative.hesitation?.length) {
      add(
        warnings,
        missionId,
        "narrative.hesitation",
        "conservé comme extension future ; non contractualisé en V0.1."
      );
    }
  };

  const validateCompletionGate = (mission, errors) => {
    const missionId = mission?.id;
    const gate = mission?.completionGate;
    if (gate == null) return;

    if (!isObject(gate)) {
      add(errors, missionId, "completionGate", "doit être un objet.");
      return;
    }

    if (!COMPLETION_GATE_TYPES.includes(gate.type)) {
      add(
        errors,
        missionId,
        "completionGate.type",
        `type non supporté. Autorisé V0.1 : ${COMPLETION_GATE_TYPES.join(", ")}.`
      );
      return;
    }

    if (gate.type === "proximity.shelter") {
      const kinds = gate.shelterKinds == null
        ? [...SHELTER_KINDS]
        : asArray(gate.shelterKinds);

      if (!kinds.length || kinds.some((kind) => !SHELTER_KINDS.includes(kind))) {
        add(
          errors,
          missionId,
          "completionGate.shelterKinds",
          `valeurs autorisées : ${SHELTER_KINDS.join(", ")}.`
        );
      }

      if (
        gate.radius != null &&
        (!Number.isFinite(Number(gate.radius)) || Number(gate.radius) <= 0)
      ) {
        add(errors, missionId, "completionGate.radius", "doit être > 0.");
      }

      if (
        gate.scope != null &&
        !["current-map", "any-established"].includes(gate.scope)
      ) {
        add(
          errors,
          missionId,
          "completionGate.scope",
          "doit valoir current-map ou any-established."
        );
      }
    }
  };

  const validateEffects = (mission, errors) => {
    const missionId = mission?.id;
    const effects = mission?.effects;
    if (effects == null) return;

    if (!Array.isArray(effects)) {
      add(errors, missionId, "effects", "doit être un tableau.");
      return;
    }

    effects.forEach((effect, index) => {
      const path = `effects[${index}]`;
      if (!isObject(effect) || !EFFECT_TYPES.includes(effect.type)) {
        add(
          errors,
          missionId,
          `${path}.type`,
          `type non supporté. Autorisés : ${EFFECT_TYPES.join(", ")}.`
        );
        return;
      }

      if (!isNonEmptyString(effect.objectId)) {
        add(errors, missionId, `${path}.objectId`, "objet requis.");
      }

      if (effect.type === "inventory.add") {
        if (
          effect.destination != null &&
          !["bluefox", "base"].includes(effect.destination)
        ) {
          add(
            errors,
            missionId,
            `${path}.destination`,
            "doit valoir bluefox ou base."
          );
        }
        if (
          effect.quantity != null &&
          (!Number.isFinite(Number(effect.quantity)) || Number(effect.quantity) < 1)
        ) {
          add(errors, missionId, `${path}.quantity`, "doit être >= 1.");
        }
      }

      if (effect.type === "world.spawn") {
        const placement = effect.placement || {};
        if (!PLACEMENT_MODES.includes(placement.mode)) {
          add(
            errors,
            missionId,
            `${path}.placement.mode`,
            `mode requis parmi : ${PLACEMENT_MODES.join(", ")}.`
          );
        }
        if (
          placement.mode === "specific" &&
          (!Number.isFinite(Number(placement.x)) || !Number.isFinite(Number(placement.z)))
        ) {
          add(
            errors,
            missionId,
            `${path}.placement`,
            "specific exige x et z numériques."
          );
        }
      }
    });
  };

  const validatePatternUse = (
    mission,
    patterns,
    errors,
    warnings,
    compatibility
  ) => {
    const missionId = mission?.id;
    const pattern = patterns?.[mission?.pattern];

    if (!pattern) {
      add(errors, missionId, "pattern", `patron inconnu : ${mission?.pattern}.`);
      return;
    }

    const patternSlots = new Set((pattern.steps || []).map((step) => step.slot));

    (pattern.steps || []).forEach((step) => {
      if (!mission.slots?.[step.slot]) {
        add(errors, missionId, `slots.${step.slot}`, "slot requis par le patron.");
      }
      (step.requires || []).forEach((required) => {
        if (!patternSlots.has(required)) {
          add(
            errors,
            missionId,
            `pattern.steps.${step.slot}.requires`,
            `slot requis inconnu : ${required}.`
          );
        }
      });

      if (["build", "craft"].includes(step.action)) {
        const message =
          "BUILD/CRAFT doit migrer vers effects (inventory.add ou world.spawn) en V0.1.";
        if (compatibility === "legacy-v0") {
          add(warnings, missionId, `pattern.${mission.pattern}`, message);
        } else {
          add(errors, missionId, `pattern.${mission.pattern}`, message);
        }
      }
    });
  };

  const validateMission = (
    mission,
    patterns,
    options = {}
  ) => {
    const compatibility = options.compatibility || "strict";
    const errors = [];
    const warnings = [];
    const missionId = mission?.id;

    if (!isObject(mission)) {
      return {
        ok: false,
        errors: ["<mission> : fiche invalide."],
        warnings: []
      };
    }

    if (!isNonEmptyString(missionId)) {
      add(errors, missionId, "id", "identifiant requis.");
    }
    if (!isNonEmptyString(mission.title)) {
      add(errors, missionId, "title", "titre requis.");
    }
    if (!isNonEmptyString(mission.pattern)) {
      add(errors, missionId, "pattern", "patron requis.");
    }
    if (!isObject(mission.slots)) {
      add(errors, missionId, "slots", "objet requis.");
    }

    validatePatternUse(
      mission,
      patterns,
      errors,
      warnings,
      compatibility
    );
    validateTrigger(mission, errors, warnings, compatibility);
    validateNarrative(mission, errors, warnings, compatibility);
    validateCompletionGate(mission, errors);
    validateEffects(mission, errors);

    return {
      missionId: missionId || null,
      ok: errors.length === 0,
      errors,
      warnings
    };
  };

  const validateCatalog = (
    catalog,
    patterns,
    options = {}
  ) => {
    const list = Array.isArray(catalog)
      ? catalog
      : Object.values(catalog || {});
    const errors = [];
    const warnings = [];
    const ids = new Set();
    const missionReports = [];

    if (!list.length) errors.push("Catalogue BIBLE vide.");
    if (!patterns || !Object.keys(patterns).length) {
      errors.push("Catalogue de patrons BIBLE vide.");
    }

    list.forEach((mission) => {
      if (mission?.id && ids.has(mission.id)) {
        errors.push(`${mission.id} · id : identifiant dupliqué.`);
      }
      if (mission?.id) ids.add(mission.id);

      const report = validateMission(mission, patterns, options);
      missionReports.push(report);
      errors.push(...report.errors);
      warnings.push(...report.warnings);
    });

    list.forEach((mission) => {
      (mission?.next || []).forEach((nextId) => {
        if (!ids.has(nextId)) {
          warnings.push(
            `${mission.id} · next : mission suivante absente du lot courant : ${nextId}.`
          );
        }
      });
    });

    return Object.freeze({
      contractVersion: VERSION,
      compatibility: options.compatibility || "strict",
      ok: errors.length === 0,
      missionCount: list.length,
      patternCount: Object.keys(patterns || {}).length,
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      missions: Object.freeze(missionReports)
    });
  };

  BF.BibleContractV01 = Object.freeze({
    version: VERSION,
    limits: Object.freeze({
      maxProgressNarratives: MAX_PROGRESS_NARRATIVES
    }),
    triggerTypes: TRIGGER_TYPES,
    triggerFilters: TRIGGER_FILTERS,
    effectTypes: EFFECT_TYPES,
    completionGateTypes: COMPLETION_GATE_TYPES,
    shelterKinds: SHELTER_KINDS,
    placementModes: PLACEMENT_MODES,
    legacyTriggerToV01,
    validateMission,
    validateCatalog
  });

  console.info("[BlueFox] Bible Contract V0.1 chargé.", {
    triggerTypes: TRIGGER_TYPES.length,
    maxProgressNarratives: MAX_PROGRESS_NARRATIVES,
    completionGateTypes: COMPLETION_GATE_TYPES
  });
})(window);
