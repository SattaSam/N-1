(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const SPECIAL_TYPES = new Set([
    "energy_crystal", "abandoned_drone", "nocturnal_animal",
    "electrostatic_storm", "mobile_islet", "carnivorous_plant",
    "scout_drone", "harvest_drone", "npc_translucent", "npc_rocky"
  ]);
  const sceneCache = new WeakMap();
  const STORAGE_KEY = "bluefox_special_objects_v1";
  const DRONE_TYPES = new Set(["scout_drone", "harvest_drone"]);
  const RECIPES = Object.freeze({
    scout_drone: Object.freeze({ energy_crystal: 2, drone_components: 8, magnetic_ore: 12 }),
    harvest_drone: Object.freeze({ energy_crystal: 3, drone_components: 12, magnetic_ore: 18 })
  });
  const defaultState = () => ({ version: 1, drones: {}, resources: {} });
  const loadState = () => {
    try {
      const saved = JSON.parse(global.localStorage.getItem(STORAGE_KEY) || "null");
      return saved?.version === 1
        ? { ...defaultState(), ...saved, drones: { ...(saved.drones || {}) }, resources: { ...(saved.resources || {}) } }
        : defaultState();
    } catch {
      return defaultState();
    }
  };
  const state = loadState();
  const saveState = () => global.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const instanceKey = (root) => {
    const anchor = root.userData.specialBehavior?.anchor || root.position;
    const type = root.userData.libraryType || root.userData.catalogId || "object";
    return [
      BF.currentEngine?.currentMapId || "map",
      type,
      Number(anchor.x || 0).toFixed(2),
      Number(anchor.z || 0).toFixed(2),
      Number(root.userData.variant || 0)
    ].join(":");
  };
  const hitboxOf = (root) => {
    if (!root) return null;
    let found = null;
    root.traverse?.((child) => { if (!found && child.userData?.interactable) found = child; });
    return found;
  };
  const metadata = (root) => {
    root.userData.specialBehavior ||= {
      anchor: { x: root.position.x, y: root.position.y, z: root.position.z },
      lastHazardAt: 0,
      lastActionAt: 0
    };
    return root.userData.specialBehavior;
  };
  const distanceToPlayer = (root) => {
    const player = BF.currentEngine?.character?.root;
    if (!player) return Infinity;
    return Math.hypot(player.position.x - root.position.x, player.position.z - root.position.z);
  };
  const announce = (text) => BF.currentEngine?.callbacks?.onStatus?.(text);
  const applyHazard = (root, key, cooldown, pressure, text) => {
    const data = metadata(root);
    const now = Date.now();
    if (now - data.lastHazardAt < cooldown) return false;
    data.lastHazardAt = now;
    BF.survival?.applyHazard?.(key, pressure);
    announce(text);
    return true;
  };

  const collect = (scene) => {
    if (!scene) return [];
    const cached = sceneCache.get(scene);
    const childCount = scene.children?.length || 0;
    if (cached?.childCount === childCount) return cached.entries;
    const entries = [];
    scene.traverse?.((object) => {
      const type = object.userData?.libraryType;
      if (object.userData?.specialRuntimeRoot && SPECIAL_TYPES.has(type)) {
        entries.push({ root: object, type });
      }
    });
    sceneCache.set(scene, { childCount, entries });
    return entries;
  };

  const isNight = () => {
    const dayBlock = global.document?.querySelector?.(".day-block");
    return !dayBlock || dayBlock.classList.contains("night");
  };

  const updateLightning = (root, elapsed) => {
    root.children.filter((child) => child.name === "StormLightning").forEach((bolt, boltIndex) => {
      const attribute = bolt.geometry?.attributes?.position;
      if (!attribute) return;
      for (let index = 0; index < attribute.count; index += 1) {
        const y = 5.4 - index * 0.78;
        const angle = boltIndex * 1.31 + index * 0.52 + Math.sin(elapsed * 3.7 + boltIndex) * 0.34;
        const radius = 1.15 + (index % 2) * 0.62 + Math.sin(elapsed * 8.3 + index * 2.1 + boltIndex) * 0.22;
        attribute.setXYZ(index, Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      }
      attribute.needsUpdate = true;
      bolt.material.opacity = 0.34 + Math.max(0, Math.sin(elapsed * 11 + boltIndex * 2.7)) * 0.66;
      const colorIndex = Math.floor(elapsed * 3 + boltIndex) % 4;
      bolt.material.color.setHex(colorIndex < 2 ? 0xffffff : colorIndex === 2 ? 0xffcf68 : 0xff8a3d);
    });
  };

  const updateObject = (entry, elapsed) => {
    const { root, type } = entry;
    const phase = (root.userData.variant || 0) * 0.71;
    if (type === "energy_crystal") {
      const pulse = 1 + Math.sin(elapsed * 2.2 + phase) * 0.055;
      root.children.forEach((child) => {
        if (child.name === "EnergyShard") child.scale.setScalar(pulse);
        if (child.name === "EnergyGlow") child.intensity = 2.8 + (pulse - 0.945) * 12;
      });
    } else if (type === "abandoned_drone") {
      root.children.forEach((child, index) => {
        if (child.name === "ResidualOptic") child.material.emissiveIntensity = 0.35 + Math.max(0, Math.sin(elapsed * 1.7 + index)) * 1.1;
      });
    } else if (type === "nocturnal_animal") {
      const awake = isNight();
      const data = metadata(root);
      root.visible = awake;
      const hitbox = hitboxOf(root);
      if (hitbox) hitbox.userData.active = awake;
      if (awake) {
        root.position.x = data.anchor.x + Math.sin(elapsed * 0.16 + phase) * 1.2;
        root.position.z = data.anchor.z + Math.cos(elapsed * 0.13 + phase) * 0.8;
      } else {
        root.position.set(data.anchor.x, data.anchor.y, data.anchor.z);
      }
      root.children.forEach((child, index) => {
        if (child.name === "NightGlow") child.material.emissiveIntensity = awake ? 1.2 + Math.sin(elapsed * 2 + index) * 0.35 : 0.12;
        if (child.name === "SensorEar") child.rotation.z = -0.18 + Math.sin(elapsed * 1.4 + index) * (awake ? 0.12 : 0.025);
      });
      const body = root.children.find((child) => child.name === "NocturnalBody");
      if (body) body.position.y = 0.78 + (awake ? Math.sin(elapsed * 1.1 + phase) * 0.025 : -0.08);
    } else if (type === "npc_translucent") {
      const core = root.children.find((child) => child.name === "NpcCore");
      if (core) { core.rotation.y = elapsed * 0.65; core.scale.setScalar(1 + Math.sin(elapsed * 1.7 + phase) * 0.07); }
      root.children.forEach((child, index) => { if (child.name === "TranslucentTorso" || child.name === "TranslucentHead") child.material.opacity = 0.48 + Math.sin(elapsed * 0.65 + index) * 0.035; });
    } else if (type === "npc_rocky") {
      root.rotation.z = Math.sin(elapsed * 0.38 + phase) * 0.003;
    } else if (type === "electrostatic_storm") {
      const data = metadata(root);
      root.position.x = data.anchor.x + Math.sin(elapsed * 0.08 + phase) * 2.1;
      root.position.z = data.anchor.z + Math.cos(elapsed * 0.065 + phase) * 1.6;
      root.children.forEach((child, index) => {
        if (child.name === "StormCloud") child.rotation.z += 0.0025 * child.userData.spinDirection * (1 + index * 0.08);
        if (child.name === "StormCore") child.material.opacity = 0.26 + (Math.sin(elapsed * 2.8) + 1) * 0.08;
        if (child.name === "StormLight") child.intensity = 4.2 + Math.max(0, Math.sin(elapsed * 9.5)) * 3.8;
      });
      updateLightning(root, elapsed);
      if (distanceToPlayer(root) < 5.6) {
        applyHazard(root, "electrostatic_storm", 8000, { rest: 1.4, safety: 2.2 }, "La tempête électrostatique perturbe les systèmes de BlueFox.");
      }
    } else if (type === "mobile_islet") {
      const data = metadata(root);
      root.position.x = data.anchor.x + Math.sin(elapsed * 0.075 + phase) * 1.5;
      root.position.z = data.anchor.z + Math.cos(elapsed * 0.06 + phase) * 1.1;
      const mass = root.children.find((child) => child.name === "FloatingMass");
      if (mass) {
        mass.position.y = 2.8 + Math.sin(elapsed * 0.55 + phase) * 0.24;
        mass.rotation.y = Math.sin(elapsed * 0.16 + phase) * 0.12;
        mass.children.forEach((child, index) => {
          if (child.name === "LiftCrystal") child.rotation.y = elapsed * (0.45 + index * 0.03);
        });
      }
    } else if (type === "carnivorous_plant") {
      const proximity = distanceToPlayer(root);
      const jaw = root.children.find((child) => child.name === "CarnivorousJaw");
      const alert = proximity < 4.2 ? 1 : 0;
      if (jaw) jaw.rotation.y = Math.sin(elapsed * (0.72 + alert * 1.4) + phase) * (0.12 + alert * 0.16);
      if (jaw) jaw.scale.y = 0.9 + (Math.sin(elapsed * (1.15 + alert * 2.2) + phase) + 1) * (0.08 + alert * 0.07);
      root.children.forEach((child, index) => {
        if (child.name === "PlantTendril") child.rotation.y = Math.sin(elapsed * 0.8 + index) * 0.09;
      });
      if (proximity < 1.85) {
        applyHazard(root, "carnivorous_plant", 18000, { rest: 2.1, safety: 3.5 }, "La plante carnivore se referme : BlueFox recule de la zone dangereuse.");
      }
    } else if (type === "scout_drone" || type === "harvest_drone") {
      const droneState = state.drones[type];
      const active = Boolean(droneState?.crafted && droneState?.active);
      const drone = root.children.find((child) => child.name === "FunctionalDrone");
      if (!drone) return;
      drone.userData.operational = active;
      drone.position.y = 1.45 + Math.sin(elapsed * 1.5 + phase) * 0.12;
      drone.rotation.z = Math.sin(elapsed * 0.9 + phase) * (active ? 0.06 : 0.015);
      if (active) drone.rotation.y = elapsed * (type === "scout_drone" ? 0.34 : 0.2);
      drone.children.forEach((child, index) => {
        if (child.name === "DroneRotor") child.rotation.z = elapsed * (8 + index);
        if (child.name === "DroneLight") child.intensity = 1.5 + (Math.sin(elapsed * 3 + index) + 1) * 0.5;
        if (child.name === "HarvestArm") child.rotation.z = Math.sin(elapsed * 1.1 + index) * 0.12;
      });
    }
  };

  const emitDroneEvent = (type, root, detail = {}) => BF.ObjectEvents?.emit?.(
    type,
    hitboxOf(root) || root,
    { mapId: BF.currentEngine?.currentMapId || null, interactionSource: "drone", ...detail }
  );

  const worldEntries = (specialEntries) => {
    const byRoot = new Map(specialEntries.map((entry) => [entry.root, entry]));
    (BF.currentEngine?.currentMap?.interactables || []).forEach((hitbox) => {
      const root = hitbox.userData?.worldAnchor || hitbox.parent;
      if (!root || byRoot.has(root)) return;
      byRoot.set(root, {
        root,
        type: root.userData?.libraryType || hitbox.userData?.libraryType || "object"
      });
    });
    return [...byRoot.values()];
  };

  const updateRespawns = (entries) => {
    const now = Date.now();
    entries.forEach(({ root }) => {
      const key = instanceKey(root);
      const respawnAt = Number(state.resources[key]?.respawnAt || 0);
      const hitbox = hitboxOf(root);
      if (!respawnAt) return;
      if (respawnAt > now) {
        root.visible = false;
        if (hitbox) hitbox.userData.active = false;
        return;
      }
      root.visible = true;
      if (hitbox) hitbox.userData.active = true;
      delete state.resources[key];
      saveState();
    });
  };

  const scout = (entries, root) => {
    const droneState = state.drones.scout_drone;
    const now = Date.now();
    if (!droneState?.active || now - Number(droneState.lastActionAt || 0) < 120000) return;
    const known = BF.getProgressionState?.().discoveries?.instances || {};
    const target = entries.find(({ root: candidate, type }) =>
      candidate !== root && !DRONE_TYPES.has(type) && candidate.visible && !known[candidate.userData.instanceId]
    );
    if (!target) return;
    droneState.lastActionAt = now;
    emitDroneEvent(BF.ObjectEvents.types.OBJECT_SEEN, target.root, {
      state: "scouted", tags: ["drone-scouted"], quantity: 1
    });
    saveState();
    announce(`Le drone éclaireur a repéré : ${target.root.userData.functional?.label || target.type}.`);
  };

  const harvest = (entries, root) => {
    const droneState = state.drones.harvest_drone;
    const now = Date.now();
    if (!droneState?.active || now - Number(droneState.lastActionAt || 0) < 90000) return;
    const target = entries.find(({ root: candidate, type }) => {
      if (candidate === root || DRONE_TYPES.has(type) || !candidate.visible) return false;
      const definition = candidate.userData.functional;
      const tags = new Set([
        ...(definition?.spawn?.tags || []),
        ...(definition?.spawnProfile?.tags || []),
        ...(definition?.situation?.tags || [])
      ]);
      return definition?.gameplay?.collectable === true &&
        definition?.resource?.inventoryKey &&
        !tags.has("unique") && !tags.has("rare") &&
        (Number(definition?.ai?.danger) || 0) <= 0.25 &&
        (tags.has("drone-collectable") || Number(definition?.progression?.mapExpertise || 0) <= 2);
    });
    if (!target) return;
    const hitbox = hitboxOf(target.root);
    const definition = target.root.userData.functional;
    const respawnMs = Math.max(30000, Number(definition?.interaction?.respawnSeconds || 300) * 1000);
    droneState.lastActionAt = now;
    state.resources[instanceKey(target.root)] = { respawnAt: now + respawnMs };
    target.root.visible = false;
    if (hitbox) hitbox.userData.active = false;
    emitDroneEvent(BF.ObjectEvents.types.RESOURCE_COLLECTED, target.root, {
      inventoryKey: definition.resource.inventoryKey,
      kind: definition.resource.family,
      quantity: 1,
      state: "harvested-by-drone",
      tags: ["drone-harvested"]
    });
    saveState();
    announce(`Le drone récolteur rapporte : ${definition.label}.`);
  };

  const updateDrones = (entries) => {
    const scoutRoot = entries.find((entry) => entry.type === "scout_drone")?.root;
    const harvestRoot = entries.find((entry) => entry.type === "harvest_drone")?.root;
    if (scoutRoot) scout(entries, scoutRoot);
    if (harvestRoot) harvest(entries, harvestRoot);
  };

  let lastBehaviorUpdate = 0;
  const update = (scene, elapsed) => {
    const entries = collect(scene);
    entries.forEach((entry) => updateObject(entry, elapsed));
    const now = Date.now();
    if (now - lastBehaviorUpdate < 1000) return;
    lastBehaviorUpdate = now;
    const allEntries = worldEntries(entries);
    updateRespawns(allEntries);
    updateDrones(allEntries);
  };

  const canCraft = (type) => {
    const recipe = RECIPES[type];
    const mapId = BF.currentEngine?.currentMapId;
    const site = mapId
      ? BF.currentEngine?.missionManager?.memory?.state?.siteProgression?.[mapId]
      : null;
    if (!recipe || state.drones[type]?.crafted || Number(site?.stage || 0) < 3) return false;
    if (BF.canAccessCampInventory && !BF.canAccessCampInventory()) return false;
    return Object.entries(recipe).every(([key, amount]) => (BF.availableInventory?.(key) || 0) >= amount);
  };
  const craftDrone = (type) => {
    if (!canCraft(type)) return false;
    Object.entries(RECIPES[type]).forEach(([key, amount]) => BF.consumeInventoryPool?.(key, amount));
    state.drones[type] = { crafted: true, active: true, craftedAt: Date.now(), lastActionAt: 0 };
    saveState();
    const root = collect(BF.currentEngine?.currentMap?.group).find((entry) => entry.type === type)?.root || null;
    emitDroneEvent(BF.ObjectEvents?.types.OBJECT_CRAFTED, root, { droneType: type, recipe: RECIPES[type], state: "active" });
    emitDroneEvent(BF.ObjectEvents?.types.DRONE_ACTIVATED, root, { droneType: type, state: "active" });
    announce(`${type === "scout_drone" ? "Drone éclaireur" : "Drone récolteur"} assemblé et activé.`);
    global.dispatchEvent(new CustomEvent("bluefox:special-objects-changed", { detail: snapshot() }));
    return true;
  };
  const setDroneActive = (type, active) => {
    if (!state.drones[type]?.crafted) return false;
    state.drones[type].active = Boolean(active);
    saveState();
    if (active) emitDroneEvent(BF.ObjectEvents?.types.DRONE_ACTIVATED, null, { droneType: type, state: "active" });
    global.dispatchEvent(new CustomEvent("bluefox:special-objects-changed", { detail: snapshot() }));
    return true;
  };
  const snapshot = () => JSON.parse(JSON.stringify({ ...state, recipes: RECIPES }));

  const baseBuildMap = BF.buildMap;
  if (typeof baseBuildMap === "function" && !baseBuildMap.specialObjectRuntimeWrapped) {
    const wrappedBuildMap = function buildMapWithSpecialObjectRuntime(...args) {
      const built = baseBuildMap.apply(this, args);
      const baseUpdate = built.update;
      built.update = function updateSpecialObjects(elapsed) {
        baseUpdate?.call(this, elapsed);
        update(built.group, elapsed);
      };
      return built;
    };
    wrappedBuildMap.specialObjectRuntimeWrapped = true;
    BF.buildMap = wrappedBuildMap;
  }

  BF.SpecialObjectRuntime = Object.freeze({
    types: Object.freeze([...SPECIAL_TYPES]),
    collect,
    update,
    recipes: RECIPES,
    snapshot,
    canCraft,
    craftDrone,
    setDroneActive,
    invalidate(scene) { if (scene) sceneCache.delete(scene); }
  });
})(window);
