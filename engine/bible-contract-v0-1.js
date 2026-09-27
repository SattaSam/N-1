(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "0.1";
  const MAX_PROGRESS_NARRATIVES = 4;

  const TRIGGER_TYPES = Object.freeze([
    "manual",
    "interaction.any",
    "interaction.discovery",
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

    "interaction.any": Object.freeze([
      "objectId", "kind", "family", "subject", "tagsAny", "tagsAll", "studyOnly"
    ]),
    "interaction.discovery": Object.freeze([
      "objectId", "kind", "family", "subject", "tagsAny", "tagsAll"
    ]),
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
      "biome", "direction", "featuredMicroSceneIdsAny"
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

  const NARRATIVE_AXES = Object.freeze([
    "EXPLORATEUR",
    "SCIENTIFIQUE",
    "NATURALISTE",
    "ARCHEOLOGUE",
    "INGENIEUR",
    "LOGISTICIEN",
    "DIPLOMATE",
    "PROTECTEUR",
    "OPPORTUNISTE",
    "DOMINATEUR",
    "MYSTIQUE",
    "HISTORIEN"
  ]);

  const EFFECT_TYPES = Object.freeze([
    "inventory.add",
    "inventory.consume",
    "site.establish"
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
    "zone-random",
    "player"
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
      ["movement.portal_crossed", "exploration.map_discovered"].includes(
        trigger.type
      ) &&
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

    ["tagsAny", "tagsAll", "featuredMicroSceneIdsAny"].forEach((key) => {
      if (trigger[key] != null && !Array.isArray(trigger[key])) {
        add(errors, missionId, `trigger.${key}`, "doit être un tableau.");
      }
    });
  };

  const validateTriggerTargetRelation = (
    mission,
    errors,
    compatibility
  ) => {
    const missionId = mission?.id;
    const original = mission?.trigger;
    const trigger =
      !original?.type && compatibility === "legacy-v0"
        ? legacyTriggerToV01(original)
        : original;
    const interactionTrigger = String(trigger?.type || "")
      .startsWith("interaction.");
    const declaresTriggerOnly = mission?.triggerOnly != null;
    const declaresTargetBinding = mission?.targetBinding != null;

    if (declaresTriggerOnly && mission.triggerOnly !== true) {
      add(
        errors,
        missionId,
        "triggerOnly",
        "doit valoir true lorsqu’il est déclaré."
      );
    }

    if (mission?.triggerOnly === true && declaresTargetBinding) {
      add(
        errors,
        missionId,
        "triggerOnly/targetBinding",
        "relations contradictoires : déclarer REVEAL-ONLY ou un binding, jamais les deux."
      );
      return;
    }

    if (
      interactionTrigger &&
      !declaresTriggerOnly &&
      !declaresTargetBinding
    ) {
      add(
        errors,
        missionId,
        "triggerOnly/targetBinding",
        "une fiche déclenchée par interaction doit déclarer triggerOnly: true, targetBinding: definition ou targetBinding: instance."
      );
    }
  };

  const STEP_RELATION_FIELDS = Object.freeze([
    "objectId",
    "cuoType",
    "family",
    "subject",
    "category",
    "mapId",
    "instanceId",
    "persistentMicroSceneId"
  ]);

  const validateStepRelations = (mission, errors) => {
    const steps = asArray(mission?.sequence)
      .filter((step) => isObject(step));
    if (!steps.length) return;

    const slotIndexes = new Map();
    steps.forEach((step, index) => {
      const slot = isNonEmptyString(step.slot) ? step.slot.trim() : `step${index + 1}`;
      slotIndexes.set(slot, index);
    });

    steps.forEach((step, index) => {
      const relation = step?.params?.relation;
      if (relation == null) return;
      const path = `sequence[${index}].params.relation`;
      if (!isObject(relation)) {
        add(errors, mission?.id, path, "doit être un objet.");
        return;
      }

      const fromSlot = String(relation.fromSlot || "").trim();
      if (!fromSlot || !slotIndexes.has(fromSlot)) {
        add(errors, mission?.id, `${path}.fromSlot`, "doit référencer un slot existant.");
        return;
      }
      if (slotIndexes.get(fromSlot) >= index) {
        add(errors, mission?.id, `${path}.fromSlot`, "doit référencer une étape antérieure.");
      }

      const sameBy = asArray(relation.sameBy);
      const differentBy = asArray(relation.differentBy);
      if (!sameBy.length && !differentBy.length) {
        add(errors, mission?.id, path, "doit déclarer sameBy et/ou differentBy.");
      }

      [["sameBy", sameBy], ["differentBy", differentBy]].forEach(([key, fields]) => {
        if (relation[key] != null && !Array.isArray(relation[key])) {
          add(errors, mission?.id, `${path}.${key}`, "doit être un tableau.");
          return;
        }
        fields.forEach((field) => {
          if (!STEP_RELATION_FIELDS.includes(field)) {
            add(
              errors,
              mission?.id,
              `${path}.${key}`,
              `champ non supporté : ${field}.`
            );
          }
        });
      });

      sameBy.forEach((field) => {
        if (differentBy.includes(field)) {
          add(
            errors,
            mission?.id,
            path,
            `le champ ${field} ne peut pas être à la fois identique et différent.`
          );
        }
      });
    });
  };

  const REQUIRED_OBJECT_IDENTITY_FIELDS = Object.freeze([
    "objectId",
    "cuoType"
  ]);

  const validateMapGenerationRequiredObjects = (mission, errors) => {
    const required = mission?.mapGeneration?.requiredObjects;
    if (required == null) return;
    const missionId = mission?.id;
    const path = "mapGeneration.requiredObjects";
    if (!Array.isArray(required) || !required.length) {
      add(errors, missionId, path, "doit être un tableau non vide.");
      return;
    }

    const steps = asArray(mission?.sequence).filter((step) => isObject(step));
    const slotIndexes = new Map();
    steps.forEach((step, index) => {
      const slot = isNonEmptyString(step.slot) ? step.slot.trim() : `step${index + 1}`;
      slotIndexes.set(slot, index);
    });
    const firstTravelIndex = steps.findIndex((step) =>
      String(step?.action || "").trim().toLowerCase() === "travel"
    );

    required.forEach((entry, index) => {
      const entryPath = `${path}[${index}]`;
      if (!isObject(entry)) {
        add(errors, missionId, entryPath, "doit être un objet.");
        return;
      }
      if (entry.count != null) {
        const count = Number(entry.count);
        if (!Number.isInteger(count) || count < 1) {
          add(errors, missionId, `${entryPath}.count`, "doit être un entier >= 1.");
        }
      }

      const staticIdentity = isNonEmptyString(entry.objectId) || isNonEmptyString(entry.type);
      const declaresConditionalIdentity =
        entry.selectionFact != null ||
        entry.selectionField != null ||
        entry.choices != null;
      const conditionalChoices = isObject(entry.choices)
        ? Object.values(entry.choices)
        : [];
      const conditionalIdentity = Boolean(
        isNonEmptyString(entry.selectionFact) &&
        isNonEmptyString(entry.selectionField) &&
        conditionalChoices.length &&
        conditionalChoices.every((choice) =>
          isObject(choice) &&
          (isNonEmptyString(choice.objectId) || isNonEmptyString(choice.type)) &&
          (
            choice.count == null ||
            (Number.isInteger(Number(choice.count)) && Number(choice.count) >= 1)
          )
        )
      );
      const sourceSlot = String(entry.sourceSlot || "").trim();
      if (declaresConditionalIdentity && !conditionalIdentity) {
        add(errors, missionId, entryPath, "l’identité conditionnelle exige selectionFact, selectionField et choices valides.");
        return;
      }
      if ((staticIdentity || conditionalIdentity) && sourceSlot) {
        add(errors, missionId, entryPath, "ne doit pas mélanger identité déclarée et sourceSlot.");
        return;
      }
      if (staticIdentity || conditionalIdentity) return;

      if (!sourceSlot || !slotIndexes.has(sourceSlot)) {
        add(errors, missionId, `${entryPath}.sourceSlot`, "doit référencer un slot existant.");
        return;
      }
      if (firstTravelIndex < 0 || slotIndexes.get(sourceSlot) >= firstTravelIndex) {
        add(errors, missionId, `${entryPath}.sourceSlot`, "doit référencer une étape antérieure au voyage de génération.");
      }
      const identityField = String(entry.identityField || "objectId").trim();
      if (!REQUIRED_OBJECT_IDENTITY_FIELDS.includes(identityField)) {
        add(errors, missionId, `${entryPath}.identityField`, `champ non supporté : ${identityField}.`);
      }
    });
  };

  const validatePsychology = (mission, errors) => {
    const missionId = mission?.id;

    if (mission.ponderation != null) {
      const value = Number(mission.ponderation);
      if (!Number.isFinite(value) || value < -1 || value > 1.6) {
        add(errors, missionId, "ponderation", "doit être comprise entre -1 et 1.6.");
      }
    }

    if (mission.obsessionEligible != null && typeof mission.obsessionEligible !== "boolean") {
      add(errors, missionId, "obsessionEligible", "doit être booléen.");
    }
    if (mission.obsessionIntensity != null) {
      const value = Number(mission.obsessionIntensity);
      if (!Number.isInteger(value) || value < 1 || value > 5) {
        add(errors, missionId, "obsessionIntensity", "doit être un entier de 1 à 5.");
      }
    }

    if (mission.souvenir != null && typeof mission.souvenir !== "boolean") {
      add(errors, missionId, "souvenir", "doit être booléen.");
    }
    if (mission.memoryValence != null && !["positive", "negative", "mixed"].includes(mission.memoryValence)) {
      add(errors, missionId, "memoryValence", "doit valoir positive, negative ou mixed.");
    }
    if (mission.scoreTrauma != null) {
      const value = Number(mission.scoreTrauma);
      if (!Number.isFinite(value) || value < 0 || value > 132) {
        add(errors, missionId, "scoreTrauma", "doit être compris entre 0 et 132.");
      }
    }
    if (mission.souvenir === true && !mission.memoryValence) {
      add(errors, missionId, "memoryValence", "requis lorsqu’un souvenir est déclaré.");
    }
    if (mission.souvenir === true && mission.scoreTrauma == null) {
      add(errors, missionId, "scoreTrauma", "requis lorsqu’un souvenir est déclaré.");
    }

    if (mission.narrativeAxis != null && !NARRATIVE_AXES.includes(mission.narrativeAxis)) {
      add(errors, missionId, "narrativeAxis", `axe narratif non supporté : ${mission.narrativeAxis}.`);
    }
    if (mission.reinforcesNarrativeAxis != null) {
      const reinforcement = mission.reinforcesNarrativeAxis;
      if (!isObject(reinforcement)) {
        add(errors, missionId, "reinforcesNarrativeAxis", "doit être un objet.");
      } else {
        if (!NARRATIVE_AXES.includes(reinforcement.axis)) {
          add(errors, missionId, "reinforcesNarrativeAxis.axis", "axe narratif non supporté.");
        }
        if (reinforcement.weight != null && !Number.isFinite(Number(reinforcement.weight))) {
          add(errors, missionId, "reinforcesNarrativeAxis.weight", "doit être numérique.");
        }
      }
    }
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
        if (isNonEmptyString(line)) return;
        if (!isObject(line) || !isNonEmptyString(line.text)) {
          add(
            errors,
            missionId,
            `narrative.${moment}[${index}]`,
            "doit être une chaîne non vide ou un objet {text, route?}."
          );
          return;
        }
        if (line.route != null && line.route !== "journal") {
          add(
            errors,
            missionId,
            `narrative.${moment}[${index}].route`,
            "seule la route explicite journal est supportée."
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
      if (entry.route != null && entry.route !== "journal") {
        add(
          errors,
          missionId,
          `narrative.progress[${index}].route`,
          "seule la route explicite journal est supportée."
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

      if (gate.bagCounter != null) {
        const counter = gate.bagCounter;
        if (!isObject(counter)) {
          add(errors, missionId, "completionGate.bagCounter", "doit être un objet.");
        } else {
          const hasInventoryKey = isNonEmptyString(counter.inventoryKey);
          const hasSource = isNonEmptyString(counter.source);
          if (hasInventoryKey === hasSource) {
            add(
              errors,
              missionId,
              "completionGate.bagCounter.inventoryKey/source",
              "déclarer exactement inventoryKey ou source."
            );
          }
          if (hasSource && counter.source !== "rations") {
            add(
              errors,
              missionId,
              "completionGate.bagCounter.source",
              "source supportée : rations."
            );
          }
          if (
            !Number.isInteger(Number(counter.minimum)) ||
            Number(counter.minimum) < 1
          ) {
            add(
              errors,
              missionId,
              "completionGate.bagCounter.minimum",
              "doit être un entier >= 1."
            );
          }
        }
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

      if (effect.type === "inventory.add") {
        if (!isNonEmptyString(effect.objectId)) {
          add(errors, missionId, `${path}.objectId`, "objet requis.");
        }
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

      if (effect.type === "inventory.consume") {
        const hasInventoryKey = isNonEmptyString(effect.inventoryKey);
        const hasInventoryKeys =
          Array.isArray(effect.inventoryKeys) &&
          effect.inventoryKeys.length > 0 &&
          effect.inventoryKeys.every((key) => isNonEmptyString(key));
        const hasSubject = isNonEmptyString(effect.subject);
        if ([hasInventoryKey, hasInventoryKeys, hasSubject].filter(Boolean).length !== 1) {
          add(
            errors,
            missionId,
            `${path}.inventoryKey/inventoryKeys/subject`,
            "déclarer exactement inventoryKey, inventoryKeys ou subject."
          );
        }
        if (effect.inventoryKeys != null && !hasInventoryKeys) {
          add(
            errors,
            missionId,
            `${path}.inventoryKeys`,
            "doit être un tableau non vide de clés d’inventaire."
          );
        }
        if (!Number.isFinite(Number(effect.quantity)) || Number(effect.quantity) < 1) {
          add(errors, missionId, `${path}.quantity`, "doit être >= 1.");
        }
      }

      if (effect.type === "site.establish") {
        if (!SHELTER_KINDS.includes(effect.kind)) {
          add(errors, missionId, `${path}.kind`, "camp, refuge ou base requis.");
        }
        if (!isNonEmptyString(effect.microSceneId)) {
          add(errors, missionId, `${path}.microSceneId`, "micro-scène requise.");
        }
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
        if (
          placement.referenceKind != null &&
          !SHELTER_KINDS.includes(placement.referenceKind)
        ) {
          add(
            errors,
            missionId,
            `${path}.placement.referenceKind`,
            "camp, refuge ou base requis."
          );
        }
      }
    });
  };

  const validateDynamicSequence = (
    mission,
    pattern,
    errors
  ) => {
    const missionId = mission?.id;
    if (!Array.isArray(mission?.sequence)) {
      add(errors, missionId, "sequence", "tableau requis.");
      return;
    }

    const steps = mission.sequence
      .filter((step) => isObject(step));
    const configuredMinimum = Math.max(
      1,
      Number(pattern?.minSteps) || 1
    );
    const runtimeManagedSingleStep = Boolean(
      steps.length === 1 &&
      isObject(mission?.runtimeValidation) &&
      steps[0]?.params?.catalogManaged === true
    );
    const minimumSteps =
      mission?.constructionMission === true || runtimeManagedSingleStep
        ? 1
        : configuredMinimum;

    if (steps.length < minimumSteps) {
      add(
        errors,
        missionId,
        "sequence",
        `minimum ${minimumSteps} étape${minimumSteps > 1 ? "s" : ""}.`
      );
      return;
    }

    const slots = new Set();
    steps.forEach((step, index) => {
      const slot = isNonEmptyString(step.slot)
        ? step.slot.trim()
        : `step${index + 1}`;

      if (slots.has(slot)) {
        add(
          errors,
          missionId,
          `sequence[${index}].slot`,
          "identifiant dupliqué."
        );
      }
      slots.add(slot);

      const action = String(step.action || "").trim().toLowerCase();
      const supportedActions = Object.values(
        BF.Missions?.ActionType || {}
      );
      if (
        !action ||
        (supportedActions.length && !supportedActions.includes(action))
      ) {
        add(
          errors,
          missionId,
          `sequence[${index}].action`,
          "action non supportée."
        );
      }

      if (
        step.target != null &&
        (!Number.isFinite(Number(step.target)) || Number(step.target) < 1)
      ) {
        add(
          errors,
          missionId,
          `sequence[${index}].target`,
          "doit être >= 1."
        );
      }
    });

    steps.forEach((step, index) => {
      asArray(step.requires).forEach((required) => {
        if (!slots.has(required)) {
          add(
            errors,
            missionId,
            `sequence[${index}].requires`,
            `slot inconnu ${required}.`
          );
        }
      });
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

    if (pattern.dynamicSequence === true) {
      validateDynamicSequence(mission, pattern, errors);
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
          "BUILD/CRAFT doit migrer vers effects (inventory.add, inventory.consume ou site.establish) en V0.1.";
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
    const pattern = patterns?.[mission.pattern];
    if (pattern?.dynamicSequence !== true && !isObject(mission.slots)) {
      add(errors, missionId, "slots", "objet requis.");
    }
    if (
      mission.targetBinding != null &&
      !["instance", "definition"].includes(mission.targetBinding)
    ) {
      add(
        errors,
        missionId,
        "targetBinding",
        "doit valoir instance ou definition."
      );
    }
    if (
      mission.prerequisites != null &&
      (!Array.isArray(mission.prerequisites) ||
        mission.prerequisites.some((id) => !isNonEmptyString(id)))
    ) {
      add(
        errors,
        missionId,
        "prerequisites",
        "doit être un tableau d’identifiants de missions non vides."
      );
    }

    validatePatternUse(
      mission,
      patterns,
      errors,
      warnings,
      compatibility
    );
    validateTrigger(mission, errors, warnings, compatibility);
    validateTriggerTargetRelation(mission, errors, compatibility);
    validateStepRelations(mission, errors);
    validateMapGenerationRequiredObjects(mission, errors);
    validatePsychology(mission, errors);
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
      (mission?.prerequisites || []).forEach((prerequisiteId) => {
        if (!ids.has(prerequisiteId)) {
          warnings.push(
            `${mission.id} · prerequisites : mission requise absente du lot courant : ${prerequisiteId}.`
          );
        }
      });
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
    validateCatalog,
    sequenceActions: Object.freeze({
      version: "sequence-actions-v1",
      minSteps: 2
    }),
    __sequenceActionsContractV1: true
  });

  console.info("[BlueFox] Bible Contract V0.1 chargé.", {
    triggerTypes: TRIGGER_TYPES.length,
    maxProgressNarratives: MAX_PROGRESS_NARRATIVES,
    completionGateTypes: COMPLETION_GATE_TYPES
  });
})(window);
