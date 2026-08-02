(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const STORAGE_KEY = "bluefox_map_exploration_v1";
  const VERSION = 1;
  const DEFAULT_GRID = 12;
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
      return this.state.maps[key];
    }

    sectorFor(map, x, z) {
      const bounds = Math.max(1, Number(map.bounds) || 27);
      const normalizedX = clamp((Number(x) + bounds) / (bounds * 2), 0, 0.999999);
      const normalizedZ = clamp((Number(z) + bounds) / (bounds * 2), 0, 0.999999);
      const column = Math.floor(normalizedX * map.gridSize);
      const row = Math.floor(normalizedZ * map.gridSize);
      return { column, row, key: `${column}:${row}` };
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
      const firstVisit = !map.visitedSectors[sector.key];

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
      if (firstVisit) {
        map.visitedSectors[sector.key] = {
          at: Date.now(),
          zoneId: detail.zoneId ?? null
        };
        map.sectorCount = Object.keys(map.visitedSectors).length;
        map.surfacePercent = Math.min(100, Number(((map.sectorCount / map.totalSectors) * 100).toFixed(2)));
      }
      map.updatedAt = Date.now();
      this.evaluateMilestones(map);
      this.save();

      if (firstVisit) {
        const eventDetail = {
          mapId: map.mapId,
          planetId: map.planetId,
          zoneId: detail.zoneId ?? null,
          sector: sector.key,
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
        }, 1);
      }
      return firstVisit;
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
  BF.resetMapExploration = (mapId) => tracker.reset(mapId);
})(window);
