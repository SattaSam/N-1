(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (typeof BF.mount !== "function") {
    console.error("[BlueFox] WorldTopologyV3 : world-engine.js doit être chargé avant ce module.");
    return;
  }

  const VERSION = 3;
  const STORAGE_KEY = "bluefox_world_topology_v2";
  const LEGACY_KEY = "bluefox_generated_topology_v1";

  const DELTAS = Object.freeze({
    north: Object.freeze({ x: 0, y: -1, opposite: "south", label: "le Nord" }),
    south: Object.freeze({ x: 0, y: 1, opposite: "north", label: "le Sud" }),
    east: Object.freeze({ x: 1, y: 0, opposite: "west", label: "l’Est" }),
    west: Object.freeze({ x: -1, y: 0, opposite: "east", label: "l’Ouest" })
  });

  const keyOf = (x, y) => `${Math.trunc(Number(x) || 0)},${Math.trunc(Number(y) || 0)}`;

  class CoordinateTopology {
    constructor(engine) {
      this.engine = engine;
      this.coordinates = new Map();
      this.occupancy = new Map();
      this.conflicts = [];
      this.repairs = [];
      this.restoreSavedCoordinates();
      this.ensureOrigin();
      this.solveFromLegacyLinks();
      this.solveFromExistingExits();
      this.reconcileGeneratedExits();
      this.persist();
    }

    ensureOrigin() {
      const savedCrystal = this.coordinates.get("crystal");
      if (savedCrystal && (savedCrystal.x !== 0 || savedCrystal.y !== 0)) {
        this.coordinates.delete("crystal");
        this.occupancy.delete(keyOf(savedCrystal.x, savedCrystal.y));
      }
      this.place("crystal", 0, 0, "canonical-origin", true);
    }

    restoreSavedCoordinates() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
        const source = saved?.coordinates && typeof saved.coordinates === "object"
          ? saved.coordinates
          : {};
        Object.entries(source).forEach(([mapId, point]) => {
          if (!BF.maps?.[mapId]) return;
          if (!Number.isFinite(Number(point?.x)) || !Number.isFinite(Number(point?.y))) return;
          this.place(mapId, point.x, point.y, "saved-v2", false);
        });
      } catch (error) {
        console.warn("[BlueFox] Coordonnées V2 illisibles, reconstruction.", error);
      }
    }

    place(mapId, x, y, source = "runtime", force = false) {
      if (!mapId || !BF.maps?.[mapId]) return false;
      const nx = Math.trunc(Number(x) || 0);
      const ny = Math.trunc(Number(y) || 0);
      const key = keyOf(nx, ny);
      const existing = this.coordinates.get(mapId);
      const occupant = this.occupancy.get(key);

      if (existing && !force) {
        return existing.x === nx && existing.y === ny;
      }

      if (occupant && occupant !== mapId) {
        this.conflicts.push({
          type: "coordinate-collision",
          coordinate: { x: nx, y: ny },
          occupant,
          candidate: mapId,
          source
        });
        return false;
      }

      if (existing) this.occupancy.delete(keyOf(existing.x, existing.y));
      const point = Object.freeze({ x: nx, y: ny });
      this.coordinates.set(mapId, point);
      this.occupancy.set(key, mapId);
      return true;
    }

    coordinateOf(mapId) {
      return this.coordinates.get(mapId) || null;
    }

    mapAt(x, y) {
      return this.occupancy.get(keyOf(x, y)) || null;
    }

    targetFrom(mapId, direction) {
      const point = this.coordinateOf(mapId);
      const delta = DELTAS[direction];
      if (!point || !delta) return null;
      const x = point.x + delta.x;
      const y = point.y + delta.y;
      return { x, y, mapId: this.mapAt(x, y) };
    }

    readLegacyLinks() {
      const links = [];
      const add = (link) => {
        if (!link?.from || !link?.to || !DELTAS[link.direction]) return;
        if (!BF.maps?.[link.from] || !BF.maps?.[link.to]) return;
        if (links.some((item) =>
          item.from === link.from &&
          item.direction === link.direction &&
          item.to === link.to
        )) return;
        links.push({
          from: link.from,
          direction: link.direction,
          to: link.to
        });
      };

      (Array.isArray(this.engine.generatedTopology)
        ? this.engine.generatedTopology
        : []
      ).forEach(add);

      try {
        const stored = JSON.parse(localStorage.getItem(LEGACY_KEY) || "[]");
        if (Array.isArray(stored)) stored.forEach(add);
      } catch {
        // Le moteur a déjà géré la compatibilité V1.
      }
      return links;
    }

    solveFromLegacyLinks() {
      const links = this.readLegacyLinks();
      let progress = true;
      let pass = 0;

      while (progress && pass < Math.max(12, links.length + 4)) {
        progress = false;
        pass += 1;

        links.forEach((link) => {
          const delta = DELTAS[link.direction];
          const from = this.coordinateOf(link.from);
          const to = this.coordinateOf(link.to);

          if (from && !to) {
            const expectedX = from.x + delta.x;
            const expectedY = from.y + delta.y;
            const occupant = this.mapAt(expectedX, expectedY);

            // Important : si la case attendue est déjà occupée, le lien V1
            // est obsolète. On ne déplace pas la planète pour lui faire plaisir.
            if (occupant && occupant !== link.to) {
              this.repairs.push({
                type: "legacy-target-replaced-by-occupant",
                from: link.from,
                direction: link.direction,
                oldTarget: link.to,
                canonicalTarget: occupant
              });
              return;
            }
            progress = this.place(
              link.to,
              expectedX,
              expectedY,
              "legacy-link-forward"
            ) || progress;
          } else if (!from && to) {
            progress = this.place(
              link.from,
              to.x - delta.x,
              to.y - delta.y,
              "legacy-link-reverse"
            ) || progress;
          } else if (from && to) {
            const expectedX = from.x + delta.x;
            const expectedY = from.y + delta.y;
            if (to.x !== expectedX || to.y !== expectedY) {
              const occupant = this.mapAt(expectedX, expectedY);
              this.repairs.push({
                type: "legacy-link-inconsistent",
                from: link.from,
                direction: link.direction,
                oldTarget: link.to,
                canonicalTarget: occupant || null
              });
            }
          }
        });
      }
    }

    solveFromExistingExits() {
      let progress = true;
      let pass = 0;

      while (progress && pass < Math.max(12, Object.keys(BF.maps || {}).length + 4)) {
        progress = false;
        pass += 1;

        for (const [mapId, point] of [...this.coordinates.entries()]) {
          Object.entries(BF.maps?.[mapId]?.exits || {}).forEach(([direction, exit]) => {
            const delta = DELTAS[direction];
            const targetMapId = exit?.targetMap;
            if (!delta || !targetMapId || !BF.maps?.[targetMapId]) return;
            if (this.coordinates.has(targetMapId)) return;

            const x = point.x + delta.x;
            const y = point.y + delta.y;
            const occupant = this.mapAt(x, y);

            if (occupant && occupant !== targetMapId) {
              if (exit.generated) {
                this.repairs.push({
                  type: "generated-exit-collision",
                  from: mapId,
                  direction,
                  oldTarget: targetMapId,
                  canonicalTarget: occupant
                });
              }
              return;
            }

            progress = this.place(
              targetMapId,
              x,
              y,
              exit.generated ? "generated-exit" : "authored-exit"
            ) || progress;
          });
        }
      }
    }

    setCanonicalLink(fromMapId, direction, toMapId) {
      const delta = DELTAS[direction];
      const fromMap = BF.maps?.[fromMapId];
      const toMap = BF.maps?.[toMapId];
      if (!delta || !fromMap || !toMap) return false;

      fromMap.exits ||= {};
      toMap.exits ||= {};

      const placement = {
        north: { x: 0, z: -26 },
        south: { x: 0, z: 26 },
        east: { x: 26, z: 0 },
        west: { x: -26, z: 0 }
      };
      const p = placement[direction];
      const rp = placement[delta.opposite];

      fromMap.exits[direction] = {
        x: p.x,
        z: p.z,
        targetMap: toMapId,
        targetEntry: delta.opposite,
        generated: true,
        topologyVersion: VERSION
      };
      toMap.exits[delta.opposite] = {
        x: rp.x,
        z: rp.z,
        targetMap: fromMapId,
        targetEntry: direction,
        generated: true,
        topologyVersion: VERSION
      };
      return true;
    }

    reconcileGeneratedExits() {
      const canonicalLinks = [];

      for (const [mapId, point] of this.coordinates.entries()) {
        const definition = BF.maps?.[mapId];
        if (!definition) continue;
        definition.exits ||= {};

        Object.entries(DELTAS).forEach(([direction, delta]) => {
          const neighborId = this.mapAt(point.x + delta.x, point.y + delta.y);
          const existing = definition.exits[direction];

          if (neighborId) {
            if (
              existing?.targetMap &&
              existing.targetMap !== neighborId &&
              existing.generated !== true
            ) {
              this.conflicts.push({
                type: "authored-exit-protected",
                from: mapId,
                direction,
                authoredTarget: existing.targetMap,
                canonicalTarget: neighborId
              });
              return;
            }

            if (existing?.targetMap !== neighborId) {
              this.repairs.push({
                type: "generated-exit-rewired",
                from: mapId,
                direction,
                oldTarget: existing?.targetMap || null,
                canonicalTarget: neighborId
              });
            }
            this.setCanonicalLink(mapId, direction, neighborId);
            canonicalLinks.push({ from: mapId, direction, to: neighborId });
          } else if (existing?.generated === true) {
            const targetPoint = this.coordinateOf(existing.targetMap);
            const expectedX = point.x + delta.x;
            const expectedY = point.y + delta.y;

            if (
              !targetPoint ||
              targetPoint.x !== expectedX ||
              targetPoint.y !== expectedY
            ) {
              this.repairs.push({
                type: "orphan-generated-exit-removed",
                from: mapId,
                direction,
                oldTarget: existing.targetMap
              });
              delete definition.exits[direction];
            }
          }
        });
      }

      // Réécrit la topologie V1 en reflet du graphe canonique, afin que les
      // anciennes couches du moteur ne puissent plus réintroduire les mauvais liens.
      const unique = [];
      canonicalLinks.forEach((link) => {
        if (unique.some((item) =>
          item.from === link.from &&
          item.direction === link.direction &&
          item.to === link.to
        )) return;
        unique.push(link);
      });
      this.engine.generatedTopology = unique;
      localStorage.setItem(LEGACY_KEY, JSON.stringify(unique));
    }

    persist() {
      const coordinates = {};
      this.coordinates.forEach((point, mapId) => {
        coordinates[mapId] = { x: point.x, y: point.y };
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: VERSION,
        origin: "crystal",
        coordinates,
        savedAt: Date.now()
      }));
      global.dispatchEvent(new CustomEvent("bluefox:topology-coordinates-changed", {
        detail: { version: VERSION, coordinates }
      }));
    }

    snapshot() {
      return Object.freeze({
        version: VERSION,
        coordinates: Object.freeze(
          Object.fromEntries(
            [...this.coordinates.entries()].map(([mapId, point]) => [
              mapId,
              Object.freeze({ ...point })
            ])
          )
        ),
        repairs: Object.freeze(this.repairs.map((entry) => Object.freeze({ ...entry }))),
        conflicts: Object.freeze(this.conflicts.map((entry) => Object.freeze({ ...entry })))
      });
    }
  }

  const rebuildRuntimeGeneratedGates = (engine) => {
    const map = engine.currentMap;
    const definition = BF.maps?.[engine.currentMapId];
    if (!map?.group || !definition) return;

    const keep = [];
    (map.gates || []).forEach((gate) => {
      const exit = gate?.userData?.exit;
      if (exit?.generated === true || gate?.userData?.runtimeGenerated === true) {
        gate.removeFromParent?.();
        if (BF.disposeObject) BF.disposeObject(gate);
      } else {
        keep.push(gate);
      }
    });
    map.gates = keep;

    Object.entries(definition.exits || {}).forEach(([direction, exit]) => {
      if (exit?.generated !== true) return;
      engine.addRuntimeGate(direction, exit, definition);
    });
  };

  const install = (engine) => {
    if (!engine || engine.worldTopology?.version === VERSION) return engine;

    const topology = new CoordinateTopology(engine);
    engine.worldTopology = topology;

    // La map de reprise a été construite avant l'installation du module :
    // on remplace immédiatement ses anciens portails générés.
    rebuildRuntimeGeneratedGates(engine);

    const originalLoadMap = engine.loadMap.bind(engine);
    engine.loadMap = async function loadMapTopologyAware(mapId, entry, announce = true) {
      topology.reconcileGeneratedExits();
      topology.persist();
      const result = await originalLoadMap(mapId, entry, announce);
      rebuildRuntimeGeneratedGates(this);
      return result;
    };

    engine.generateUnknownPassage = async function generateCoordinateAwarePassage(direction) {
      const delta = DELTAS[direction];
      const currentDefinition = BF.maps?.[this.currentMapId];
      if (!delta || !currentDefinition) return;

      const currentPoint = topology.coordinateOf(this.currentMapId);
      if (!currentPoint) {
        this.callbacks.onStatus(
          "La position planétaire de cette Zone est inconnue : passage interrompu."
        );
        console.error("[BlueFox] Coordonnée canonique absente.", this.currentMapId);
        return;
      }

      // La grille est TOUJOURS interrogée avant l'ancienne sortie.
      const target = topology.targetFrom(this.currentMapId, direction);
      if (!target) return;

      if (target.mapId && BF.maps?.[target.mapId]) {
        topology.setCanonicalLink(this.currentMapId, direction, target.mapId);
        topology.reconcileGeneratedExits();
        topology.persist();
        rebuildRuntimeGeneratedGates(this);

        const gate = this.currentMap.gates.find((candidate) =>
          candidate?.userData?.exit?.targetMap === target.mapId &&
          candidate?.userData?.exit?.direction === direction
        ) || this.addRuntimeGate(
          direction,
          currentDefinition.exits[direction],
          currentDefinition
        );

        if (!gate) return;
        this.pendingGate = gate;
        this.character.setTarget(gate.position, "run");
        this.showWorldMarker(gate.position);
        this.callbacks.onStatus(
          `BlueFox rejoint ${BF.maps[target.mapId].name} vers ${delta.label}.`
        );
        this.callbacks.onAction(
          "La coordonnée voisine est déjà occupée : le passage est reconnecté sans générer de nouvelle Zone."
        );
        return;
      }

      // Une sortie authored non générée reste protégée si elle occupe réellement
      // cette direction ; elle donne alors sa coordonnée au territoire cible.
      const authored = currentDefinition.exits?.[direction];
      if (authored?.targetMap && authored.generated !== true && BF.maps?.[authored.targetMap]) {
        if (topology.place(authored.targetMap, target.x, target.y, "authored-navigation")) {
          topology.reconcileGeneratedExits();
          topology.persist();
        }
        this.handleNavigationSuggestion({ mapId: authored.targetMap });
        return;
      }

      if (!BF.MapGenerator) {
        this.callbacks.onStatus("Le générateur de territoires n’est pas disponible.");
        return;
      }

      let destination;
      try {
        destination = BF.MapGenerator.generate({
          fromMapId: this.currentMapId,
          direction,
          discoveryIndex: this.discoveredMaps.size,
          ordinal: BF.MapGenerator.listSaved().length + 1
        });
      } catch (error) {
        console.error("Échec de génération de map", error);
        this.callbacks.onStatus(
          "Aucun territoire compatible ne peut être généré dans cette direction."
        );
        return;
      }

      if (!topology.place(destination.id, target.x, target.y, "generated")) {
        const occupant = topology.mapAt(target.x, target.y);
        if (occupant && BF.maps?.[occupant]) {
          topology.setCanonicalLink(this.currentMapId, direction, occupant);
        } else {
          this.callbacks.onStatus(
            "Conflit topographique : la nouvelle Zone n’a pas été raccordée."
          );
          return;
        }
      } else {
        topology.setCanonicalLink(this.currentMapId, direction, destination.id);
      }

      topology.reconcileGeneratedExits();
      topology.persist();
      rebuildRuntimeGeneratedGates(this);

      const finalTarget = topology.mapAt(target.x, target.y);
      const gate = this.currentMap.gates.find((candidate) =>
        candidate?.userData?.exit?.targetMap === finalTarget &&
        candidate?.userData?.exit?.direction === direction
      );
      if (!gate) return;

      this.pendingGate = gate;
      this.character.setTarget(gate.position, "run");
      this.showWorldMarker(gate.position);
      this.callbacks.onStatus(
        `BlueFox se dirige vers une terre inconnue vers ${delta.label}.`
      );
    };

    const originalDiagnostics = engine.getDiagnostics.bind(engine);
    engine.getDiagnostics = function topologyDiagnostics() {
      return {
        ...originalDiagnostics(),
        worldTopology: topology.snapshot()
      };
    };

    BF.WorldTopology = Object.freeze({
      version: VERSION,
      coordinateOf: (mapId) => topology.coordinateOf(mapId),
      mapAt: (x, y) => topology.mapAt(x, y),
      snapshot: () => topology.snapshot(),
      reconcile: () => {
        topology.reconcileGeneratedExits();
        topology.persist();
        rebuildRuntimeGeneratedGates(engine);
        return topology.snapshot();
      }
    });

    console.info(
      "[BlueFox] World Topology V3 actif : grille canonique prioritaire, liens générés réparés.",
      topology.snapshot()
    );
    return engine;
  };

  const originalMount = BF.mount.bind(BF);
  BF.mount = async function mountWithWorldTopologyV3(options) {
    const engine = await originalMount(options);
    return install(engine);
  };
})(window);
