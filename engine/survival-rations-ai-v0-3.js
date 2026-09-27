(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const VERSION = "survival-rations-ai-v0.3";
  const RECIPE_ID = "ration-basic-v2";
  const CONSERVATION_KNOWLEDGE_ID = "ration_conservation_mastery";

  const POLICY = Object.freeze({
    criticalMax: 3,
    lowMax: 11,
    acceptableMax: 25,
    targetMin: 12,
    targetComfort: 25,
    offlineCollectionIntervalMs:
      20 * 60 * 1000,
    offlineMaxCollections: 12,
    offlinePreferredRestGainPerHour: 6
  });

  const rationCount = () =>
    Number(
      BF.Rations?.snapshot?.().rations
    ) || 0;

  const profile = () => {
    const count = rationCount();
    if (count <= POLICY.criticalMax) {
      return {
        level: "critical",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    if (count <= POLICY.lowMax) {
      return {
        level: "low",
        shouldCollect: true,
        shouldCraft: true,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    if (count <= POLICY.acceptableMax) {
      return {
        level: "acceptable",
        shouldCollect: false,
        shouldCraft: false,
        targetMin: POLICY.targetMin,
        targetComfort:
          POLICY.targetComfort
      };
    }
    return {
      level: "comfortable",
      shouldCollect: false,
      shouldCraft: false,
      targetMin: POLICY.targetMin,
      targetComfort:
        POLICY.targetComfort
    };
  };

  const reward = () =>
    BF.Research?.get?.(RECIPE_ID) || null;

  const requirements = () =>
    Array.isArray(reward()?.requirements)
      ? reward().requirements
      : [];

  const ingredientKeys = () =>
    requirements()
      .map(
        (entry) =>
          entry.inventoryKey ||
          entry.resource
      )
      .filter(Boolean);

  const recipeUnlocked = () =>
    BF.Research?.isUnlocked?.(
      RECIPE_ID
    ) === true;

  const autoCraftEnabled = () =>
    reward()?.autoCraft === true ||
    BF.isTutorialSurvivalCapabilityUnlocked?.("ration-craft") === true;

  const campAccessible = () =>
    BF.canAccessCampInventory?.() === true;

  const missionRationCraftContext = (engine) => {
    const manager = engine?.missionManager;
    const missionId = String(manager?.primaryMissionId || "");
    const mission = manager?.definition?.(missionId);
    if (!missionId || mission?.allowsAutonomousRationCraft !== true) return null;

    const counter = Array.isArray(mission?.runtimeCounters)
      ? mission.runtimeCounters.find((entry) =>
          entry?.source === "rations.craftedTotal" && entry?.slot
        )
      : null;
    if (!counter?.slot) return null;

    const node = manager?.trees?.get?.(missionId)?.find?.(
      `${missionId}:${counter.slot}`
    );
    if (!node || node.isComplete) return null;

    const sequenceEntry = Array.isArray(mission?.sequence)
      ? mission.sequence.find((entry) => entry?.slot === counter.slot)
      : null;
    const recipeId = String(
      sequenceEntry?.params?.recipeId ||
      node?.params?.recipeId ||
      ""
    );

    // Ce propriétaire ne traite que la recette ration qu'il possède.
    // Une mission future est reconnue par ses données, jamais par son ID.
    if (recipeId && recipeId !== RECIPE_ID) return null;

    const target = Math.max(0, Number(node.target) || 0);
    const progress = Math.max(0, Number(node.progress) || 0);
    const remaining = Math.max(0, target - progress);

    return {
      missionId,
      mission,
      counter,
      node,
      recipeId: recipeId || RECIPE_ID,
      target,
      progress,
      remaining,
      priority: Math.max(0, Number(mission?.priority) || 0)
    };
  };

  const missionRationCraftRemaining = (engine) =>
    missionRationCraftContext(engine)?.remaining || 0;


  const availableFor = (key) =>
    BF.progression
      ?.availableInventory?.([key]) || 0;

  const craftableCount = (
    limit = Infinity,
    options = {}
  ) => {
    if (!recipeUnlocked()) return 0;
    if (
      !options.ignoreShelter &&
      !campAccessible()
    ) {
      return 0;
    }

    const reqs = requirements();
    if (!reqs.length) return 0;

    const capacity = reqs.reduce(
      (maxCount, entry) => {
        const key =
          entry.inventoryKey ||
          entry.resource;
        const quantity = Math.max(
          1,
          Number(entry.quantity) || 1
        );
        if (!key) return 0;
        return Math.min(
          maxCount,
          Math.floor(
            availableFor(key) / quantity
          )
        );
      },
      Number.isFinite(Number(limit))
        ? Math.max(
            0,
            Math.floor(Number(limit))
          )
        : Number.MAX_SAFE_INTEGER
    );

    return Math.max(0, capacity);
  };

  const autonomyCandidate = (engine, now = performance.now()) => {
    if (!engine || !recipeUnlocked() || !autoCraftEnabled()) {
      return null;
    }

    const currentProfile = profile();
    const manager = engine.missionManager;
    const missionContext = missionRationCraftContext(engine);
    const missionAllowsRationCraft = Boolean(
      missionContext &&
      BF.isTutorialSurvivalCapabilityUnlocked?.("ration-craft") === true
    );
    const missionCraftRemaining = missionAllowsRationCraft
      ? missionContext.remaining
      : 0;

    if (
      manager?.hasPrimaryMissionAuthority?.() === true &&
      !missionAllowsRationCraft
    ) {
      return null;
    }

    const survivalMissing = Math.max(
      0,
      currentProfile.targetMin - rationCount()
    );
    const capacityRemaining = Math.max(
      0,
      (
        Number(BF.Rations?.maxRations) ||
        Number(BF.Rations?.snapshot?.().maxRations) ||
        0
      ) - rationCount()
    );
    const desiredCrafts = Math.min(
      missionCraftRemaining > 0
        ? missionCraftRemaining
        : survivalMissing,
      capacityRemaining
    );

    if (
      desiredCrafts <= 0 ||
      !(currentProfile.shouldCraft || missionCraftRemaining > 0)
    ) {
      return null;
    }

    const atCraftLocation = campAccessible();
    const possible = atCraftLocation
      ? craftableCount(desiredCrafts)
      : 0;
    const possibleIgnoringLocation = craftableCount(
      desiredCrafts,
      { ignoreShelter: true }
    );

    if (possible > 0) {
      const missionPriorityBoost =
        missionContext
          ? Math.min(
              35,
              12 + Math.max(0, Number(missionContext.priority) || 0) / 20
            )
          : 0;

      return {
        id: "survival-ration-craft",
        axis: "survival",
        baseWeight:
          missionCraftRemaining > 0
            ? Math.round(72 + missionPriorityBoost)
            : currentProfile.level === "critical"
              ? 52
              : 34,
        available: true,
        allowDuringPrimaryMission: missionAllowsRationCraft,
        missionDriven: missionCraftRemaining > 0,
        missionCraftRemaining,
        execute: () => {
          const crafted =
            BF.Research?.craft?.(
              RECIPE_ID,
              possible,
              {
                automatic: true,
                source: "bac-survival"
              }
            ) || 0;

          engine.__lastRationAutonomyDecision = {
            at: Date.now(),
            level: currentProfile.level || null,
            shouldCraft: true,
            missionDriven: missionCraftRemaining > 0,
            missionId: missionContext?.missionId || null,
            missionCraftRemaining,
            requested: possible,
            crafted,
            directOverride: false,
            source: "bac-candidate"
          };

          if (crafted > 0) {
            engine.callbacks?.onStatus?.(
              `BlueFox profite du camp pour préparer ${crafted} ration${crafted > 1 ? "s" : ""}.`
            );
            return true;
          }
          return false;
        }
      };
    }

    if (
      !atCraftLocation &&
      reward()?.requiresShelter === true &&
      possibleIgnoringLocation > 0
    ) {
      const missionPriorityBoost =
        missionContext
          ? Math.min(
              35,
              12 + Math.max(0, Number(missionContext.priority) || 0) / 20
            )
          : 0;

      return {
        id: "survival-ration-craft-location",
        axis: "survival",
        baseWeight:
          missionCraftRemaining > 0
            ? Math.round(80 + missionPriorityBoost)
            : 38,
        available: typeof engine.returnToBase === "function",
        allowDuringPrimaryMission: missionAllowsRationCraft,
        missionDriven: missionCraftRemaining > 0,
        missionCraftRemaining,
        craftableOnArrival: possibleIgnoringLocation,
        execute: () => {
          if (typeof engine.returnToBase !== "function") return false;
          engine.__lastRationAutonomyDecision = {
            at: Date.now(),
            level: currentProfile.level || null,
            shouldReturnToCraft: true,
            missionDriven: missionCraftRemaining > 0,
            missionId: missionContext?.missionId || null,
            missionCraftRemaining,
            craftableOnArrival: possibleIgnoringLocation,
            directOverride: false,
            source: "bac-candidate"
          };
          engine.returnToBase();
          engine.callbacks?.onStatus?.(
            missionCraftRemaining > 0
              ? "BlueFox a les ingrédients nécessaires et rejoint le refuge pour poursuivre la fabrication prévue."
              : "BlueFox rejoint le refuge pour préparer des rations."
          );
          return true;
        }
      };
    }

    return ingredientCandidate(
      engine,
      now,
      {
        desiredCrafts,
        missionContext: missionAllowsRationCraft ? missionContext : null,
        currentProfile
      }
    );
  };


  BF.RationPolicy = Object.freeze({
    recipeId: RECIPE_ID,
    profile,
    ingredientKeys,
    recipeUnlocked,
    autoCraftEnabled,
    craftableCount,
    campAccessible,
    missionRationCraftRemaining,
    autonomyCandidate,
    policy: POLICY
  });

  const objectInventoryKey = (
    object
  ) => {
    const data = object?.userData || {};
    const definition =
      data.functional ||
      BF.ObjectLibrary?.get?.(
        data.libraryType
      ) ||
      BF.ObjectLibrary?.get?.(
        data.kind
      ) ||
      {};

    return (
      definition?.resource
        ?.inventoryKey ||
      data.inventoryKey ||
      null
    );
  };

  const isFoodFlora = (object) =>
    ingredientKeys().includes(
      objectInventoryKey(object)
    );

  const targetPosition = (object) =>
    object?.userData?.worldAnchor
      ?.position ||
    object?.position ||
    null;

  const nearest = (
    engine,
    objects
  ) => {
    if (!objects?.length) return null;

    if (
      typeof engine.chooseBACTarget ===
      "function"
    ) {
      const routed = engine.chooseBACTarget(
        objects,
        "collection"
      );
      if (routed) return routed;
    }

    if (
      typeof engine
        .pickNearestInteractable ===
      "function"
    ) {
      return (
        engine.pickNearestInteractable(
          objects
        ) || null
      );
    }

    const origin =
      engine.character?.root?.position;
    if (!origin) return objects[0] || null;

    return [...objects].sort(
      (left, right) => {
        const lp =
          targetPosition(left);
        const rp =
          targetPosition(right);
        const ld = lp
          ? origin.distanceTo(lp)
          : Infinity;
        const rd = rp
          ? origin.distanceTo(rp)
          : Infinity;
        return ld - rd;
      }
    )[0] || null;
  };


  const conservationPreferenceUnlocked = () =>
    BF.Research?.isUnlocked?.(CONSERVATION_KNOWLEDGE_ID) === true;

  const resourceYield = (object) => {
    const data = object?.userData || {};
    const definition =
      data.functional ||
      BF.ObjectLibrary?.get?.(data.libraryType) ||
      BF.ObjectLibrary?.get?.(data.kind) ||
      {};
    return Math.max(0, Number(definition?.resource?.quantity) || 0);
  };

  const acquisitionAction = (object) => {
    const data = object?.userData || {};
    const definition =
      data.functional ||
      BF.ObjectLibrary?.get?.(data.libraryType) ||
      BF.ObjectLibrary?.get?.(data.kind) ||
      {};
    const actions = new Set(definition?.interaction?.actions || []);
    const configured = String(
      definition?.interaction?.acquisitionAction ||
      definition?.interaction?.afterInspectionAction ||
      ""
    ).toLowerCase();

    if (configured === "extract" && actions.has("extract")) return "extract";
    if (configured === "collect") return "collect";
    if (actions.has("extract") && !actions.has("collect")) return "extract";
    return actions.has("collect") || definition?.gameplay?.collectable === true
      ? "collect"
      : null;
  };

  const ingredientDeficits = (craftCount) => {
    const requestedCrafts = Math.max(0, Math.floor(Number(craftCount) || 0));
    if (!requestedCrafts) return [];

    return requirements()
      .map((entry) => {
        const key = entry.inventoryKey || entry.resource;
        const perCraft = Math.max(1, Number(entry.quantity) || 1);
        const required = perCraft * requestedCrafts;
        const available = key ? availableFor(key) : 0;
        const missing = Math.max(0, required - available);
        return {
          key,
          perCraft,
          required,
          available,
          missing,
          deficitRatio: required > 0 ? missing / required : 0
        };
      })
      .filter((entry) => entry.key && entry.missing > 0)
      .sort((left, right) =>
        right.deficitRatio - left.deficitRatio ||
        right.missing - left.missing ||
        String(left.key).localeCompare(String(right.key))
      );
  };

  const ingredientCandidate = (
    engine,
    now,
    {
      desiredCrafts = 0,
      missionContext = null,
      currentProfile = profile()
    } = {}
  ) => {
    const deficits = ingredientDeficits(desiredCrafts);
    if (!deficits.length) return null;

    const interactables = (engine?.currentMap?.interactables || [])
      .filter((object) =>
        object?.userData?.active &&
        engine.canInteractWith?.(object, now)
      );

    const availableDeficits = deficits
      .map((deficit) => ({
        ...deficit,
        objects: interactables.filter(
          (object) => objectInventoryKey(object) === deficit.key
        )
      }))
      .filter((entry) => entry.objects.length > 0);

    if (!availableDeficits.length) return null;

    const selectedDeficit = availableDeficits[0];
    let candidateObjects = selectedDeficit.objects;
    if (
      selectedDeficit.key === "adaptive_biomass" &&
      conservationPreferenceUnlocked()
    ) {
      const richestYield = candidateObjects.reduce(
        (maximum, object) => Math.max(maximum, resourceYield(object)),
        0
      );
      if (richestYield > 0) {
        candidateObjects = candidateObjects.filter(
          (object) => resourceYield(object) === richestYield
        );
      }
    }
    const object = nearest(engine, candidateObjects);
    if (!object) return null;

    const action = acquisitionAction(object);
    if (!action) return null;

    const missionRemainingRatio =
      missionContext?.target > 0
        ? Math.min(1, missionContext.remaining / missionContext.target)
        : 0;
    const missionPriorityBoost =
      missionContext
        ? Math.min(
            35,
            12 + Math.max(0, Number(missionContext.priority) || 0) / 20
          )
        : 0;

    // Pondération générique :
    // - déficit réel de CE matériau ;
    // - part de l'objectif de craft encore à produire ;
    // - priorité déclarative de la mission.
    const baseWeight = Math.round(
      46 +
      selectedDeficit.deficitRatio * 28 +
      missionRemainingRatio * 12 +
      missionPriorityBoost
    );

    return {
      id: "survival-ration-ingredient",
      axis: "collection",
      baseWeight,
      available: true,
      allowDuringPrimaryMission: Boolean(missionContext),
      missionDriven: Boolean(missionContext),
      missionCraftRemaining: missionContext?.remaining || 0,
      ingredientKey: selectedDeficit.key,
      ingredientMissing: selectedDeficit.missing,
      ingredientRequired: selectedDeficit.required,
      ingredientDeficitRatio: selectedDeficit.deficitRatio,
      execute: () => {
        object.userData.requestedInteraction = action;
        object.userData.requestedInteractionSource = "autonomy";

        engine.__lastRationAutonomyDecision = {
          at: Date.now(),
          level: currentProfile.level || null,
          shouldCollect: true,
          missionDriven: Boolean(missionContext),
          missionId: missionContext?.missionId || null,
          missionCraftRemaining: missionContext?.remaining || 0,
          ingredientKey: selectedDeficit.key,
          ingredientMissing: selectedDeficit.missing,
          ingredientRequired: selectedDeficit.required,
          ingredientDeficitRatio: selectedDeficit.deficitRatio,
          requestedInteraction: action,
          directOverride: false,
          source: "bac-candidate"
        };

        const accepted = engine.targetInteraction?.(object);
        if (accepted === false) {
          object.userData.requestedInteraction = null;
          object.userData.requestedInteractionSource = null;
          object.userData.lastInteractionAt = performance.now();
          return false;
        }

        engine.callbacks?.onStatus?.(
          missionContext
            ? `BlueFox cherche en priorité ${selectedDeficit.key} pour poursuivre la fabrication prévue.`
            : "BlueFox cherche de quoi reconstituer son stock de rations."
        );
        return true;
      }
    };
  };

  const install = () => {
    const engine = BF.currentEngine;
    if (!engine) return false;
    engine.__rationAiVersion = VERSION;
    engine.__autonomyBeforeRationAI = null;
    return true;
  };

  const emitOfflineResource = (
    inventoryKey,
    index,
    mapId
  ) => {
    const type =
      BF.ObjectEvents?.types
        ?.RESOURCE_COLLECTED ||
      "resource_collected";

    BF.progression?.consume?.({
      id:
        `offline-ration-${Date.now()}-${index}-${inventoryKey}`,
      type,
      quantity: 1,
      family: inventoryKey,
      inventoryKey,
      mapId: mapId || "crystal",
      objectId:
        `offline-flora-${inventoryKey}`,
      instanceId:
        `offline-${mapId || "crystal"}-${inventoryKey}-${Date.now()}-${index}`,
      detail: {
        offline: true,
        inventoryKey,
        kind: inventoryKey,
        source:
          "bac-survival-rations"
      },
      at: Date.now()
    });
  };

  const offlineIngredientCycle =
    () => {
      const cycle = [];
      requirements().forEach(
        (entry) => {
          const key =
            entry.inventoryKey ||
            entry.resource;
          const quantity = Math.max(
            1,
            Number(entry.quantity) || 1
          );
          for (
            let i = 0;
            i < quantity;
            i += 1
          ) {
            cycle.push(key);
          }
        }
      );
      return cycle.filter(Boolean);
    };

  const processOffline = (
    detail = {}
  ) => {
    const durationMs = Math.max(
      0,
      Number(detail.durationMs) || 0
    );
    if (!durationMs) return;

    const survival = BF.survival;
    if (survival?.state) {
      survival.state.rest = Math.max(
        0,
        Math.min(
          100,
          survival.state.rest +
            (
              durationMs / 3600000
            ) *
              POLICY
                .offlinePreferredRestGainPerHour
        )
      );
    }

    if (recipeUnlocked()) {
      const currentProfile = profile();
      const cycle =
        offlineIngredientCycle();

      if (
        currentProfile.shouldCollect &&
        cycle.length
      ) {
        const budget = Math.min(
          POLICY.offlineMaxCollections,
          Math.max(
            0,
            Math.floor(
              durationMs /
                POLICY
                  .offlineCollectionIntervalMs
            )
          )
        );

        for (
          let i = 0;
          i < budget;
          i += 1
        ) {
          emitOfflineResource(
            cycle[i % cycle.length],
            i,
            detail.mapId
          );
        }
      }

      if (
        currentProfile.shouldCraft &&
        autoCraftEnabled()
      ) {
        const missing = Math.max(
          0,
          currentProfile.targetMin -
            rationCount()
        );
        const possible =
          craftableCount(
            missing,
            { ignoreShelter: true }
          );

        if (possible > 0) {
          BF.Research?.craft?.(
            RECIPE_ID,
            possible,
            {
              automatic: true,
              source:
                "offline-survival",
              ignoreShelter: true
            }
          );
        }
      }
    }

    if (survival?.state) {
      // Consommation automatique suspendue jusqu’au futur jalon T12.
      survival.save?.();
    }
  };

  const connect = () => {
    if (install()) return;

    let attempts = 0;
    const timer =
      global.setInterval(() => {
        attempts += 1;
        if (
          install() ||
          attempts >= 120
        ) {
          global.clearInterval(timer);
        }
      }, 250);
  };

  BF.reconnectRationAI = install;

  global.addEventListener(
    "bluefox:scene-images",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:map-transition-completed",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:rations-changed",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:research-unlocked",
    () =>
      global.setTimeout(install, 0)
  );
  global.addEventListener(
    "bluefox:offline-progress",
    (event) =>
      processOffline(
        event.detail || {}
      )
  );

  connect();
})(window);
