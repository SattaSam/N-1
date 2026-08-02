(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_map_exploration_v1";
  const VERSION = 1;
  const DEFAULT_GRID = 12;
  const DEFAULT_REVEAL_RADIUS = 4;
  const EXPLORATION_THRESHOLDS = [10, 25, 50, 75, 100];
  const EXPERTISE_THRESHOLDS = [10, 25, 50, 100, 200];

  const clone = (value) => value == null ? value : JSON.parse(JSON.stringify(value));
  const cleanKey = (value, fallback = "unknown") => {
    const key = String(value ?? "").trim();
    return key || fallback;
  };
  const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

  const createMapState = (mapId, gridSize = DEFAULT_GRID) => ({
    mapId,
    planetId: null,
    gridSize,
    bounds: 27,
    revealRadius: DEFAULT_REVEAL_RADIUS,
    visitedSectors: {},
    visitedZones: {},
    surfacePercent: 0,
    sectorCount: 0,
    totalSectors: gridSize * gridSize,
    distanceTravelled: 0,
    lastPosition: null,
    explorationMilestones: {},
    expertiseMilestones: {},
    expertise: 0,
    updatedAt: Date.now()
  });

  const defaultState = () => ({
    version: VERSION,
    updatedAt: Date.now(),
    maps: {}
  });

  class MapExplorationTracker {
    constructor(storage = global.localStorage) {
      this.storage = storage;
      this.state = defaultState();
      this.load();
      this.onMapState = (event) => {
        const detail = event?.detail || {};
        if (detail.mapId) this.ensureMap(detail.mapId, detail.gridSize);
      };
      this.onPlayerPosition = (event) => this.recordPosition(event?.detail || {});
      this.onProgression = (event) => this.syncExpertise(event?.detail);
      global.addEventListener?.("bluefox:map-state", this.onMapState);
      global.addEventListener?.("bluefox:player-position", this.onPlayerPosition);
      global.addEventListener?.("bluefox:multi-progression", this.onProgression);
      this.lastEngineSampleAt = 0;
      this.engineSampler = global.setInterval?.(() => this.sampleCurrentEngine(), 500);
    }

    sampleCurrentEngine() {
      const engine = BF.currentEngine;
      const position = engine?.character?.root?.position;
      if (!engine || !position || engine.disposed) return false;
      return this.recordPosition({
        mapId: engine.currentMapId,
        planetId: engine.currentPlanetId || "planet-1",
        zoneId: engine.currentZoneIndex,
        x: position.x,
        z: position.z,
        bounds: engine.currentMap?.bounds || 27
      });
    }

    load() {
      try {
        const saved = JSON.parse(this.storage?.getItem?.(STORAGE_KEY) || "null");
        if (saved?.version === VERSION && saved.maps) this.state = saved;
      } catch (error) {
        console.warn("Exploration de Map illisible, réinitialisation.", error);
      }
      return this.state;
    }

    save() {
      this.state.updatedAt = Date.now();
      try {
        this.storage?.setItem?.(STORAGE_KEY, JSON.stringify(this.state));
        return true;
      } catch (error) {
        console.warn("Sauvegarde de l’exploration de Map indisponible.", error);
        return false;
      }
    }

    ensureMap(mapId, gridSize = DEFAULT_GRID) {
      const key = cleanKey(mapId, "unassigned");
      if (!this.state.maps[key]) {
        this.state.maps[key] = createMapState(key, Math.max(4, Number(gridSize) || DEFAULT_GRID));
      }
      const map = this.state.maps[key];
      map.revealRadius = Math.max(0, Number(map.revealRadius) || DEFAULT_REVEAL_RADIUS);
      map.visitedSectors = map.visitedSectors || {};
      map.totalSectors = map.gridSize * map.gridSize;
      return map;
    }

    sectorFor(map, x, z) {
      const bounds = Math.max(1, Number(map.bounds) || 27);
      const normalizedX = clamp((Number(x) + bounds) / (bounds * 2), 0, 0.999999);
      const normalizedZ = clamp((Number(z) + bounds) / (bounds * 2), 0, 0.999999);
      const column = Math.floor(normalizedX * map.gridSize);
      const row = Math.floor(normalizedZ * map.gridSize);
      return { column, row, key: `${column}:${row}` };
    }

    sectorsWithinRadius(map, x, z, radius = DEFAULT_REVEAL_RADIUS) {
      const bounds = Math.max(1, Number(map.bounds) || 27);
      const gridSize = Math.max(4, Number(map.gridSize) || DEFAULT_GRID);
      const cellSize = (bounds * 2) / gridSize;
      const safeRadius = Math.max(0, Number(radius) || 0);
      const minimumColumn = clamp(Math.floor((x - safeRadius + bounds) / cellSize), 0, gridSize - 1);
      const maximumColumn = clamp(Math.floor((x + safeRadius + bounds) / cellSize), 0, gridSize - 1);
      const minimumRow = clamp(Math.floor((z - safeRadius + bounds) / cellSize), 0, gridSize - 1);
      const maximumRow = clamp(Math.floor((z + safeRadius + bounds) / cellSize), 0, gridSize - 1);
      const sectors = [];

      for (let column = minimumColumn; column <= maximumColumn; column += 1) {
        const cellMinX = -bounds + column * cellSize;
        const cellMaxX = cellMinX + cellSize;
        const nearestX = clamp(x, cellMinX, cellMaxX);
        for (let row = minimumRow; row <= maximumRow; row += 1) {
          const cellMinZ = -bounds + row * cellSize;
          const cellMaxZ = cellMinZ + cellSize;
          const nearestZ = clamp(z, cellMinZ, cellMaxZ);
          if (Math.hypot(x - nearestX, z - nearestZ) <= safeRadius) {
            sectors.push({ column, row, key: `${column}:${row}` });
          }
        }
      }
      return sectors;
    }

    nextUnexploredTarget(mapId, origin = {}) {
      const map = this.ensureMap(mapId);
      const bounds = Math.max(1, Number(map.bounds) || 27);
      const cellSize = (bounds * 2) / map.gridSize;
      const originX = Number(origin.x) || 0;
      const originZ = Number(origin.z) || 0;
      const candidates = [];
      for (let column = 0; column < map.gridSize; column += 1) {
        for (let row = 0; row < map.gridSize; row += 1) {
          const key = `${column}:${row}`;
          if (map.visitedSectors[key]) continue;
          const x = -bounds + (column + 0.5) * cellSize;
          const z = -bounds + (row + 0.5) * cellSize;
          candidates.push({ key, x, z, distance: Math.hypot(x - originX, z - originZ) });
        }
      }
      candidates.sort((left, right) => left.distance - right.distance);
      return candidates[0] || null;
    }

    reach(type, map, threshold) {
      const bucket = type === "exploration"
        ? map.explorationMilestones
        : map.expertiseMilestones;
      if (bucket[threshold]) return false;
      bucket[threshold] = Date.now();
      const id = `map:${map.mapId}:${type}:${threshold}`;
      BF.progressionRegistry?.reachMilestone?.(id, {
        mapId: map.mapId,
        planetId: map.planetId,
        type,
        threshold,
        surfacePercent: map.surfacePercent,
        expertise: map.expertise
      });
      global.dispatchEvent?.(new CustomEvent("bluefox:map-milestone", {
        detail: { id, mapId: map.mapId, type, threshold, snapshot: clone(map) }
      }));
      return true;
    }

    evaluateMilestones(map) {
      EXPLORATION_THRESHOLDS.forEach((threshold) => {
        if (map.surfacePercent >= threshold) this.reach("exploration", map, threshold);
      });
      EXPERTISE_THRESHOLDS.forEach((threshold) => {
        if (map.expertise >= threshold) this.reach("expertise", map, threshold);
      });
    }

    recordPosition(detail) {
      const mapId = detail.mapId || detail.currentMapId;
      if (!mapId || !Number.isFinite(Number(detail.x)) || !Number.isFinite(Number(detail.z))) {
        return false;
      }
      const map = this.ensureMap(mapId, detail.gridSize);
      map.bounds = Math.max(1, Number(detail.bounds) || map.bounds || 27);
      map.planetId = detail.planetId ?? map.planetId;
      const x = Number(detail.x);
      const z = Number(detail.z);
      const sector = this.sectorFor(map, x, z);
      const revealRadius = Math.max(0, Number(detail.revealRadius) || map.revealRadius);
      map.revealRadius = revealRadius;
      const newlyVisited = this.sectorsWithinRadius(map, x, z, revealRadius)
        .filter((candidate) => !map.visitedSectors[candidate.key]);

      if (map.lastPosition) {
        const dx = x - map.lastPosition.x;
        const dz = z - map.lastPosition.z;
        const distance = Math.hypot(dx, dz);
        if (distance <= map.bounds * 0.5) map.distanceTravelled += distance;
      }
      map.lastPosition = { x, z, at: Date.now() };

      if (detail.zoneId != null) {
        map.visitedZones[cleanKey(detail.zoneId)] = map.visitedZones[cleanKey(detail.zoneId)] || Date.now();
      }
      if (newlyVisited.length) {
        newlyVisited.forEach((candidate) => {
          map.visitedSectors[candidate.key] = {
            at: Date.now(),
            zoneId: detail.zoneId ?? null
          };
        });
        map.sectorCount = Object.keys(map.visitedSectors).length;
        map.surfacePercent = Math.min(100, Number(((map.sectorCount / map.totalSectors) * 100).toFixed(2)));
      }
      map.updatedAt = Date.now();
      this.evaluateMilestones(map);
      this.save();

      if (newlyVisited.length) {
        const eventDetail = {
          mapId: map.mapId,
          planetId: map.planetId,
          zoneId: detail.zoneId ?? null,
          sector: sector.key,
          sectors: newlyVisited.map((candidate) => candidate.key),
          revealedSectorCount: newlyVisited.length,
          revealRadius,
          sectorCount: map.sectorCount,
          totalSectors: map.totalSectors,
          surfacePercent: map.surfacePercent
        };
        global.dispatchEvent?.(new CustomEvent("bluefox:map-exploration-changed", { detail: eventDetail }));
        BF.progressionRegistry?.incrementScopes?.({
          type: "MAP_SECTOR_VISITED",
          mapId: map.mapId,
          planetId: map.planetId,
          zoneId: detail.zoneId
        }, newlyVisited.length);
      }
      return newlyVisited.length > 0;
    }

    syncExpertise(detail) {
      const event = detail?.event;
      if (!event?.mapId) return false;
      const indicators = detail.mapIndicators || BF.multiProgression?.getMapIndicators?.(event.mapId);
      if (!indicators) return false;
      const map = this.ensureMap(event.mapId);
      const previous = map.expertise;
      map.expertise = Math.max(0, Number(indicators.expertise) || 0);
      map.updatedAt = Date.now();
      this.evaluateMilestones(map);
      this.save();
      if (map.expertise !== previous) {
        global.dispatchEvent?.(new CustomEvent("bluefox:map-expertise-changed", {
          detail: { mapId: map.mapId, expertise: map.expertise, snapshot: clone(map) }
        }));
      }
      return map.expertise !== previous;
    }

    getMap(mapId) {
      return clone(this.ensureMap(mapId));
    }

    getSummary() {
      const maps = Object.values(this.state.maps);
      return {
        mapCount: maps.length,
        exploredMaps: maps.filter((map) => map.surfacePercent > 0).length,
        completedMaps: maps.filter((map) => map.surfacePercent >= 100).length,
        totalDistanceTravelled: maps.reduce((sum, map) => sum + (Number(map.distanceTravelled) || 0), 0),
        maps: clone(this.state.maps)
      };
    }

    reset(mapId = null) {
      if (mapId == null) this.state = defaultState();
      else delete this.state.maps[cleanKey(mapId)];
      this.save();
      return this.getSummary();
    }

    dispose() {
      global.removeEventListener?.("bluefox:map-state", this.onMapState);
      global.removeEventListener?.("bluefox:player-position", this.onPlayerPosition);
      global.removeEventListener?.("bluefox:multi-progression", this.onProgression);
      if (this.engineSampler) global.clearInterval?.(this.engineSampler);
    }
  }

  const tracker = new MapExplorationTracker();
  BF.MapExplorationTracker = MapExplorationTracker;
  BF.mapExploration = tracker;
  BF.recordMapPosition = (detail) => tracker.recordPosition(detail);
  BF.getMapExplorationState = (mapId) => tracker.getMap(mapId);
  BF.getExplorationSummary = () => tracker.getSummary();
  BF.getNextUnexploredMapTarget = (mapId, origin) =>
    tracker.nextUnexploredTarget(mapId, origin);
  BF.resetMapExploration = (mapId) => tracker.reset(mapId);
})(window);
