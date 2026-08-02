(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const A = Missions.ActionType;
  const SECONDARY_CAMP_BAG_THRESHOLD = 10;
  const DEFAULT_SITE_INTERACTION_RADIUS = 12;
  const PRIMARY_MAP_ID = "crystal";
  const START_CAPSULE_FALLBACK = Object.freeze({ x: 0.8, y: 0, z: -0.9 });
  const startupPlacement = (sceneId, position, rotation) => Object.freeze({
    sceneId,
    position: Object.freeze(position),
    rotation: Object.freeze(rotation)
  });
  const STARTUP_STAGES = Object.freeze({
    camp: Object.freeze({
      stage: 1,
      sceneId: "MSC-CUSTOM-CAMP",
      placements: Object.freeze([
        startupPlacement("MSC-CUSTOM-CAMP", [4.4049, 0.85, 2.318], [0, 2.356194, 0])
      ]),
      skillId: "carpentry",
      skillTitle: "Menuiserie : transformer le bois en planches",
      insight: "Je pourrais transformer ce bois en planches.",
      costs: Object.freeze([{ keys: Object.freeze(["wood"]), amount: 10 }])
    }),
    shelter: Object.freeze({
      stage: 2,
      sceneId: "MSC-CUSTOM-CAMP-BASE",
      placements: Object.freeze([
        startupPlacement("MSC-CUSTOM-CAMP-BASE", [-0.4399, 1.85, 4.9833], [0, 1.308997, 0])
      ]),
      skillId: "weaving",
      skillTitle: "Tissage : transformer les plantes fibreuses en textile",
      insight: "Ces plantes peuvent être transformées en tissu.",
      costs: Object.freeze([
        { keys: Object.freeze(["wood"]), amount: 100 },
        { keys: Object.freeze(["fiber"]), amount: 100 }
      ])
    }),
    base: Object.freeze({
      stage: 3,
      sceneId: "MSC-CUSTOM-CAMP-BASE-REINFORCED",
      placements: Object.freeze([
        startupPlacement("MSC-CUSTOM-CAMP-BASE-REINFORCED", [-2.7567, 2.6, 4.768], [0, 1.308997, 0]),
        startupPlacement("MSC-CUSTOM-CAMP-BASE", [-3.1166, 3.6, 3.895], [0, -0.785398, 0])
      ]),
      skillId: "mineral-transformation",
      skillTitle: "Transformation des minéraux",
      insight: "Les matériaux de cette planète peuvent être utilisés pour des constructions avancées.",
      costs: Object.freeze([
        { keys: Object.freeze(["fiber"]), amount: 1000 },
        { keys: Object.freeze(["crystal", "magnetic_ore"]), amount: 1000 }
      ])
    })
  });

  const leaf = (id, title, type, target, metric) => ({
    id,
    title,
    type,
    target,
    params: { catalogManaged: true, catalogMetric: metric }
  });
  const mission = (id, title, description, priority, children, scope = "global") => ({
    id,
    title,
    description,
    priority,
    catalogMission: true,
    scope,
    root: { id: `${id}-root`, title, type: "objective", children }
  });

  const catalog = {
    exploration_first_steps: mission(
      "exploration_first_steps", "Premiers pas",
      "Explorer au moins 60 % d’une map.", 65,
      [leaf("exploration-first-steps-map", "Atteindre 60 % d’exploration", A.EXPLORE_ZONE, 60, "max-map-percent")], "map"
    ),
    exploration_cartographer: mission(
      "exploration_cartographer", "Cartographe local",
      "Explorer trois maps à au moins 80 %.", 55,
      [leaf("exploration-cartographer-maps", "Cartographier trois maps", A.EXPLORE_ZONE, 3, "maps-80")], "global"
    ),
    exploration_complete: mission(
      "exploration_complete", "Exploration approfondie",
      "Explorer intégralement la map actuelle.", 60,
      [leaf("exploration-complete-map", "Map actuelle à 100 %", A.EXPLORE_ZONE, 100, "current-map-percent")], "map"
    ),
    exploration_total: mission(
      "exploration_total", "Exploration totale",
      "Explorer à 100 % tous les biomes découverts.", 58,
      [leaf("exploration-total-biomes", "Tous les biomes découverts à 100 %", A.EXPLORE_ZONE, 100, "all-discovered-biomes-percent")], "global"
    ),
    collection_samples: mission(
      "collection_samples", "Échantillons de base",
      "Réunir sur une même map trois minerais, une plante et un autre objet.", 60,
      [
        leaf("samples-minerals", "Collecter trois minerais", A.COLLECT, 3, "same-map-minerals"),
        leaf("samples-plants", "Collecter une plante", A.COLLECT, 1, "same-map-plants"),
        leaf("samples-other", "Collecter un autre objet", A.COLLECT, 1, "same-map-other")
      ], "map"
    ),
    collection_variety: mission(
      "collection_variety", "Panier varié",
      "Identifier cinq types de ressources différents.", 50,
      [leaf("collection-variety-types", "Réunir cinq types", A.COLLECT, 5, "unique-resources")]
    ),
    collection_reserves: mission(
      "collection_reserves", "Réserves sûres",
      "Collecter vingt objets au total.", 45,
      [leaf("collection-reserves-total", "Collecter vingt objets", A.COLLECT, 20, "total-acquisitions")]
    ),
    research_initial: mission(
      "research_initial", "Analyse initiale",
      "Effectuer trois analyses.", 55,
      [leaf("research-initial-total", "Effectuer trois analyses", A.ANALYZE, 3, "analyses")]
    ),
    research_hypothesis: mission(
      "research_hypothesis", "Hypothèse validée",
      "Effectuer dix analyses.", 50,
      [leaf("research-hypothesis-total", "Effectuer dix analyses", A.ANALYZE, 10, "analyses")]
    ),
    engineering_1: mission(
      "engineering_1", "Ingénierie I",
      "Étudier vingt-cinq minerais et dix composants.", 45,
      [
        leaf("engineering-1-minerals", "Étudier vingt-cinq minerais", A.ANALYZE, 25, "minerals"),
        leaf("engineering-1-components", "Étudier dix composants", A.ANALYZE, 10, "components")
      ]
    ),
    engineering_2: mission(
      "engineering_2", "Ingénierie II",
      "Étudier cinquante minerais et vingt-cinq composants.", 40,
      [
        leaf("engineering-2-minerals", "Étudier cinquante minerais", A.ANALYZE, 50, "minerals"),
        leaf("engineering-2-components", "Étudier vingt-cinq composants", A.ANALYZE, 25, "components")
      ]
    ),
    contact_first: mission(
      "contact_first", "Premier contact", "Rencontrer un autochtone.", 55,
      [leaf("contact-first-total", "Établir un contact", A.OBSERVE, 1, "contacts")]
    ),
    contact_cautious: mission(
      "contact_cautious", "Échanges prudents", "Rencontrer trois autochtones.", 50,
      [leaf("contact-cautious-total", "Établir trois contacts", A.OBSERVE, 3, "contacts")]
    ),
    contact_ambassador: mission(
      "contact_ambassador", "Ambassadeur", "Rencontrer cinq autochtones.", 45,
      [leaf("contact-ambassador-total", "Établir cinq contacts", A.OBSERVE, 5, "contacts")]
    ),
    travel_short: mission(
      "travel_short", "Voyage court", "Effectuer trois transitions entre maps.", 50,
      [leaf("travel-short-total", "Effectuer trois transitions", A.TRAVEL, 3, "transitions")]
    ),
    travel_long: mission(
      "travel_long", "Voyage long", "Effectuer huit transitions entre maps.", 45,
      [leaf("travel-long-total", "Effectuer huit transitions", A.TRAVEL, 8, "transitions")]
    ),
    travel_biomes: mission(
      "travel_biomes", "Explorateur de biomes", "Découvrir trois biomes distincts.", 50,
      [leaf("travel-biomes-total", "Découvrir trois biomes", A.TRAVEL, 3, "distinct-biomes")]
    ),
    survival_rest: mission(
      "survival_rest", "Repos sécurisé", "Établir un camp secondaire.", 55,
      [leaf("survival-rest-camps", "Établir un camp secondaire", A.BUILD, 1, "secondary-camps")]
    ),
    survival_stable: mission(
      "survival_stable", "Campement stable", "Revenir trois fois à la base principale après une mission.", 50,
      [leaf("survival-stable-returns", "Effectuer trois retours", A.TRAVEL, 3, "base-returns")]
    ),
    special_investigator: mission(
      "special_investigator", "Investigateur", "Effectuer dix inspections.", 50,
      [leaf("special-investigator-total", "Effectuer dix inspections", A.INSPECT, 10, "inspections")]
    ),
    special_archivist: mission(
      "special_archivist", "Archiviste", "Mémoriser cinq entrées marquantes du journal.", 45,
      [leaf("special-archivist-total", "Mémoriser cinq entrées", A.RESEARCH, 5, "journal-entries")]
    )
  };

  catalog.exploration_complete.evolving = true;
  catalog.exploration_complete.passivePriorityAxis = "Exploration";
  catalog.exploration_total.evolving = true;
  catalog.exploration_total.passivePriorityAxis = "Exploration";

  catalog.engineering_1.unlockMetric = "distinct-rock-types";
  catalog.engineering_1.unlockTarget = 5;
  catalog.engineering_1.journalIntro =
    "Maintenant que je connais mieux les zones rocheuses et cinq types de roches ou cristaux différents, je pense pouvoir déterminer avec précision quels minerais seront utilisables pour mes constructions. Mon ambition est de transformer ces observations en premières règles d’ingénierie fiables.";
  catalog.engineering_2.journalIntro =
    "Mes premières règles d’ingénierie tiennent. Je veux maintenant comparer davantage de minerais et de composants afin de concevoir des structures plus ambitieuses sans gaspiller nos réserves.";

  Missions.definitions = Object.freeze({ ...Missions.definitions, ...catalog });

  class MissionCatalogController {
    constructor(manager) {
      this.manager = manager;
      this.scheduled = false;
      const facts = this.manager.memory.state.facts;
      facts.primaryBaseMapId = facts.primaryBaseMapId ||
        this.manager.engine?.currentMapId || "crystal";
      this.retireInvalidSiteUpgrades();
      this.events = [
        "bluefox:progression-changed",
        "bluefox:multi-progression",
        "bluefox:map-exploration-changed",
        "bluefox:map-expertise-changed",
        "bluefox:journal-entry",
        "bluefox:site-progression",
        "bluefox:map-state"
      ];
      this.onChange = (event) => {
        if (event.type === "bluefox:map-state") {
          global.setTimeout(() => this.renderStartupSite(), 0);
        }
        this.schedule();
      };
      this.onTransition = (event) => {
        const facts = this.manager.memory.state.facts;
        facts.mapTransitions = (Number(facts.mapTransitions) || 0) + 1;
        this.manager.memory.save();
        this.considerSecondaryCamp(event.detail || {});
        this.schedule();
      };
      this.events.forEach((type) => global.addEventListener(type, this.onChange));
      global.addEventListener("bluefox:map-transition-completed", this.onTransition);
      BF.registerSiteAnchor = (mapId, anchor, interactionRadius) =>
        this.registerSiteAnchor(mapId, anchor, interactionRadius);
      this.evaluate();
      global.setTimeout(() => this.renderStartupSite(), 0);
    }

    retireInvalidSiteUpgrades() {
      const primaryMapId = this.primaryBaseMapId();
      const lifecycle = this.manager.memory.state.missionLifecycle || {};
      const invalidIds = Object.keys(lifecycle).filter((id) => {
        const match = /^(shelter|base)@(.+)$/.exec(id);
        return match && match[2] !== primaryMapId;
      });
      if (!invalidIds.length) return false;
      const invalid = new Set(invalidIds);
      invalidIds.forEach((id) => {
        lifecycle[id].status = "hidden";
        lifecycle[id].updatedAt = Date.now();
        lifecycle[id].discoveryReason = "Chaîne Refuge/Base réservée à la zone de départ.";
      });
      this.manager.activeMissionIds = (this.manager.activeMissionIds || []).filter(
        (id) => !invalid.has(id)
      );
      this.manager.memory.state.activeMissionIds = [
        ...this.manager.activeMissionIds
      ];
      if (invalid.has(this.manager.primaryMissionId)) {
        this.manager.selectBestPrimary?.(performance.now(), true);
      }
      this.manager.memory.save();
      return true;
    }

    primaryBaseMapId() {
      return this.manager.memory.state.facts.primaryBaseMapId || "crystal";
    }

    inventoryLoad() {
      return Object.values(BF.getProgressionState?.().inventory || {})
        .reduce((sum, amount) => sum + Math.max(0, Number(amount) || 0), 0);
    }

    currentEnergy() {
      const survivalEnergy = Number(BF.getSurvivalState?.().energy);
      if (Number.isFinite(survivalEnergy)) return survivalEnergy;
      try {
        const save = JSON.parse(
          global.localStorage.getItem("bluefox_odyssey_save_v1") || "null"
        );
        return Number.isFinite(Number(save?.energy)) ? Number(save.energy) : null;
      } catch {
        return null;
      }
    }

    considerSecondaryCamp(detail = {}) {
      const mapId = detail.mapId || this.manager.engine?.currentMapId;
      const primaryMapId = this.primaryBaseMapId();
      if (!mapId || mapId === primaryMapId) return false;
      const primarySite = this.manager.memory.state.siteProgression?.[primaryMapId];
      if (Number(primarySite?.stage) < 3) return false;
      const exploredMapCount = this.manager.engine?.discoveredMaps?.size || 0;
      if (exploredMapCount < 3) return false;
      const site = this.manager.memory.state.siteProgression?.[mapId];
      if (Number(site?.stage) >= 1) return false;
      const missionId = `camp@${mapId}`;
      if (this.manager.memory.state.missionLifecycle?.[missionId]?.status === "active") {
        return false;
      }

      const energy = this.currentEnergy();
      const inventoryLoad = this.inventoryLoad();
      const route = this.manager.engine?.findKnownRoute?.(primaryMapId, mapId);
      const hopsFromBase = Array.isArray(route) ? Math.max(0, route.length - 1) : 0;
      const lowEnergy = energy != null && energy < 35;
      const remote = hopsFromBase >= 2;
      const loadedBag = inventoryLoad >= SECONDARY_CAMP_BAG_THRESHOLD;
      const returnEnergyCost = 8 + hopsFromBase * 12;
      const campEnergyCost = 20;
      const returnMoreTiring = returnEnergyCost > campEnergyCost;
      const activeMissionNeedsCamp = (this.manager.activeMissionIds || []).some((id) => {
        const definition = this.manager.definition(id);
        return definition?.requiresLocalCamp === true ||
          definition?.requirements?.includes?.("local-camp");
      });
      const relevanceScore =
        (remote ? 2 : 0) +
        (loadedBag ? 1 : 0) +
        (lowEnergy && returnMoreTiring ? 2 : 0) +
        (activeMissionNeedsCamp ? 2 : 0);
      if (relevanceScore < 3) return false;

      const reasons = [];
      if (lowEnergy) reasons.push(`énergie basse (${Math.round(energy)} %)`);
      if (remote) reasons.push(`éloignement de ${hopsFromBase} Maps`);
      if (loadedBag) reasons.push(`sac chargé (${inventoryLoad} objets)`);
      if (returnMoreTiring) reasons.push("retour à la base plus fatigant qu’un camp local");
      if (activeMissionNeedsCamp) reasons.push("mission locale nécessitant un point de repos");
      return this.manager.startMission(missionId, {
        primary: false,
        urgency: lowEnergy && returnMoreTiring ? 22 : 6,
        narrativePriority: activeMissionNeedsCamp ? 16 : 4,
        source: "autonomie locale",
        reason: `BlueFox envisage un camp local : ${reasons.join(", ")}.`
      });
    }

    schedule() {
      if (this.scheduled) return;
      this.scheduled = true;
      global.setTimeout(() => {
        this.scheduled = false;
        this.evaluate();
      }, 0);
    }

    eventHistory() {
      return BF.getProgressionState?.().history || [];
    }

    countEvents(types) {
      const accepted = new Set(types);
      return this.eventHistory().reduce((sum, event) =>
        sum + (accepted.has(event.type) ? Math.max(1, Number(event.quantity) || 1) : 0), 0
      );
    }

    categorizedByMap() {
      const maps = {};
      this.eventHistory().forEach((event) => {
        if (!["RESOURCE_COLLECTED", "RESOURCE_EXTRACTED"].includes(event.type)) return;
        const map = maps[event.mapId || "unknown"] = maps[event.mapId || "unknown"] || {
          minerals: 0, plants: 0, other: 0
        };
        const tags = new Set(event.tags || []);
        const family = String(event.family || event.inventoryKey || "").toLowerCase();
        const amount = Math.max(1, Number(event.quantity) || 1);
        if (tags.has("mineral") || /mineral|crystal|ore|cristal|minerai/.test(family)) map.minerals += amount;
        else if (tags.has("plant") || /plant|flora|fiber|fibre|flore/.test(family)) map.plants += amount;
        else map.other += amount;
      });
      return maps;
    }

    analyzedByCategory(category) {
      return this.eventHistory().reduce((sum, event) => {
        if (event.type !== "OBJECT_ANALYZED") return sum;
        const tags = new Set(event.tags || []);
        const descriptor = `${event.family || ""} ${event.inventoryKey || ""}`.toLowerCase();
        const matches = category === "minerals"
          ? tags.has("mineral") || /mineral|crystal|ore|cristal|minerai|rock|roche/.test(descriptor)
          : tags.has("component") || tags.has("technology") || /component|technology|technologie/.test(descriptor);
        return sum + (matches ? Math.max(1, Number(event.quantity) || 1) : 0);
      }, 0);
    }

    inventoryAmount(keys) {
      if (BF.availableInventory) return BF.availableInventory(keys);
      const progression = BF.getProgressionState?.() || {};
      return (Array.isArray(keys) ? keys : [keys]).reduce((total, key) =>
        total + (Number(progression.inventory?.[key]) || 0) +
          (Number(progression.campStorage?.[key]) || 0), 0
      );
    }

    mineralInventoryKeys() {
      const keys = new Set(["crystal", "magnetic_ore"]);
      BF.ObjectLibrary?.list?.({ status: "active" }).forEach((definition) => {
        const tags = new Set(definition.spawn?.tags || []);
        const descriptor = `${definition.resource?.family || ""} ${definition.resource?.inventoryKey || ""}`.toLowerCase();
        if (
          definition.gameplay?.collectable === true &&
          definition.resource?.inventoryKey &&
          (tags.has("mineral") || tags.has("crystal") || /mineral|minerai|crystal|cristal|ore/.test(descriptor))
        ) {
          keys.add(definition.resource.inventoryKey);
        }
      });
      return [...keys];
    }

    isStudyEvent(event) {
      return ["PHENOMENON_OBSERVED", "OBJECT_INSPECTED", "OBJECT_ANALYZED"]
        .includes(event.type);
    }

    matchesPlant(event) {
      const tags = new Set(event.tags || []);
      const descriptor = `${event.objectId || ""} ${event.family || ""} ${event.inventoryKey || ""}`.toLowerCase();
      return tags.has("plant") || tags.has("tree") ||
        /flora|plant|tree|arbre|bush|buisson|branch|branche|fiber|fibre|frond|cactus/.test(descriptor);
    }

    matchesWoodSpecimen(event) {
      const tags = new Set(event.tags || []);
      const descriptor = `${event.objectId || ""} ${event.family || ""} ${event.inventoryKey || ""}`.toLowerCase();
      return tags.has("wood") || tags.has("tree") ||
        /tree|arbre|bush|buisson|branch|branche|wood/.test(descriptor);
    }

    matchesRock(event) {
      const tags = new Set(event.tags || []);
      const descriptor = `${event.objectId || ""} ${event.family || ""} ${event.inventoryKey || ""}`.toLowerCase();
      return tags.has("mineral") || tags.has("rock") || tags.has("crystal") ||
        /geolog|rock|roche|mineral|minerai|crystal|cristal|ore/.test(descriptor);
    }

    startMapStudyEvents(predicate) {
      return this.eventHistory().filter((event) =>
        (event.mapId || PRIMARY_MAP_ID) === PRIMARY_MAP_ID &&
        this.isStudyEvent(event) && predicate.call(this, event)
      );
    }

    startMapWoodSpecimenIds() {
      const ids = new Set();
      const interactables = this.manager.engine?.currentMapId === PRIMARY_MAP_ID
        ? this.manager.engine.currentMap?.interactables || []
        : [];
      interactables.forEach((object) => {
        const data = object?.userData || object?.parent?.userData || {};
        const definition = data.functional || object?.parent?.userData?.functional;
        if (!definition) return;
        const probe = {
          objectId: definition.id,
          family: definition.resource?.family || definition.knowledge?.family,
          inventoryKey: definition.resource?.inventoryKey,
          tags: definition.spawn?.tags || []
        };
        if (this.matchesWoodSpecimen(probe)) {
          ids.add(data.instanceId || object?.parent?.userData?.instanceId || definition.id);
        }
      });
      return ids;
    }

    startupMetric(name) {
      if (name === "available-wood") return this.inventoryAmount("wood");
      if (name === "available-fiber") return this.inventoryAmount("fiber");
      if (name === "available-minerals") {
        return this.inventoryAmount(this.mineralInventoryKeys());
      }
      if (name === "plant-studies") {
        return this.startMapStudyEvents(this.matchesPlant).length;
      }
      if (name === "rock-studies") {
        return this.startMapStudyEvents(this.matchesRock).length;
      }
      if (name === "wood-specimens-studied") {
        const required = this.startMapWoodSpecimenIds();
        const studied = new Set(this.startMapStudyEvents(this.matchesWoodSpecimen)
          .map((event) => event.instanceId || event.objectId).filter(Boolean));
        if (!required.size) return 0;
        return [...required].filter((id) => studied.has(id)).length;
      }
      return 0;
    }

    updateStartupTree(missionId, tree) {
      const baseId = this.manager.definition(missionId)?.baseMissionId;
      const config = STARTUP_STAGES[baseId];
      if (!config || this.manager.definition(missionId)?.scopeId !== PRIMARY_MAP_ID) {
        return false;
      }
      const currentStage = Number(
        this.manager.memory.state.siteProgression?.[PRIMARY_MAP_ID]?.stage
      ) || 0;
      if (currentStage >= config.stage) return false;
      let changed = false;
      tree.root.walk((node) => {
        const metric = node.params?.startupMetric;
        if (!metric || !node.isLeaf) return;
        if (metric === "wood-specimens-studied") {
          node.target = Math.max(1, this.startMapWoodSpecimenIds().size);
        }
        const value = Math.min(node.target, this.startupMetric(metric));
        if (node.progress === value) return;
        node.progress = value;
        if (value < node.target && node.status === Missions.MissionStatus.COMPLETED) {
          node.status = Missions.MissionStatus.ACTIVE;
          node.completedAt = 0;
        }
        changed = true;
      });
      if (changed) {
        tree.refresh();
        this.manager.memory.saveTree(tree);
      }
      return changed;
    }

    unlockStartupSkill(config) {
      const facts = this.manager.memory.state.facts;
      facts.researchSkills = facts.researchSkills || {};
      if (facts.researchSkills[config.skillId]) return false;
      facts.researchSkills[config.skillId] = {
        id: config.skillId,
        title: config.skillTitle,
        unlockedAt: Date.now(),
        mapId: PRIMARY_MAP_ID
      };
      const skillRegistryAvailable = typeof BF.unlockResearchSkill === "function";
      BF.unlockResearchSkill?.(facts.researchSkills[config.skillId]);
      BF.reachProgressionMilestone?.(`skill-${config.skillId}`, {
        title: config.skillTitle,
        category: "research-skill",
        mapId: PRIMARY_MAP_ID
      });
      if (!skillRegistryAvailable) {
        global.dispatchEvent(new CustomEvent("bluefox:research-skill-unlocked", {
          detail: { ...facts.researchSkills[config.skillId] }
        }));
      }
      return true;
    }

    publishStartupJournal(config) {
      const entry = {
        id: `startup-insight-${config.stage}`,
        at: Date.now(),
        type: "research-discovery",
        title: config.skillTitle,
        text: config.insight,
        mapId: PRIMARY_MAP_ID,
        important: true
      };
      if (!BF.addJournalEntry?.(entry)) {
        global.dispatchEvent(new CustomEvent("bluefox:journal-entry", {
          detail: entry
        }));
      }
      this.manager.engine?.callbacks?.onAction?.(config.insight);
    }

    startupCapsuleAnchor() {
      const anchor = BF.maps?.[PRIMARY_MAP_ID]?.crashSite?.capsuleAnchor;
      return {
        x: Number.isFinite(Number(anchor?.x)) ? Number(anchor.x) : START_CAPSULE_FALLBACK.x,
        y: Number.isFinite(Number(anchor?.y)) ? Number(anchor.y) : START_CAPSULE_FALLBACK.y,
        z: Number.isFinite(Number(anchor?.z)) ? Number(anchor.z) : START_CAPSULE_FALLBACK.z
      };
    }

    completeStartupStage(missionId, tree) {
      const definition = this.manager.definition(missionId);
      const config = STARTUP_STAGES[definition?.baseMissionId];
      if (!config || definition.scopeId !== PRIMARY_MAP_ID || !tree.root.isComplete) {
        return false;
      }
      const facts = this.manager.memory.state.facts;
      facts.startupStageRewards = facts.startupStageRewards || {};
      if (facts.startupStageRewards[config.stage]) return false;
      const costs = config.stage === 3
        ? [config.costs[0], { keys: this.mineralInventoryKeys(), amount: 1000 }]
        : config.costs;
      if (costs.some((cost) => this.inventoryAmount(cost.keys) < cost.amount)) {
        return false;
      }
      facts.startupStageRewards[config.stage] = {
        status: "committing",
        at: Date.now()
      };
      costs.forEach((cost) => {
        const removed = BF.consumeInventoryPool?.(cost.keys, cost.amount) || 0;
        if (removed !== cost.amount) {
          throw new Error(`Consommation incomplète du palier ${config.stage}.`);
        }
      });
      this.unlockStartupSkill(config);
      this.publishStartupJournal(config);
      const siteAnchor = this.startupCapsuleAnchor();
      const changed = this.registerSiteStage(PRIMARY_MAP_ID, config.stage, {
        anchor: siteAnchor,
        interactionRadius: 12,
        microSceneId: config.sceneId,
        microSceneIds: config.placements.map((placement) => placement.sceneId),
        skillId: config.skillId
      });
      facts.startupStageRewards[config.stage] = {
        status: "completed",
        at: Date.now(),
        sceneId: config.sceneId,
        skillId: config.skillId
      };
      this.manager.memory.save();
      this.renderStartupSite();
      return changed || true;
    }

    clearRenderedStartupSite() {
      const rendered = this.renderedStartupSite;
      if (!rendered) return;
      const currentMap = this.manager.engine?.currentMap;
      const interactables = currentMap?.interactables;
      const colliders = currentMap?.colliders;
      rendered.records.forEach((record) => {
        if (Array.isArray(interactables) && record.instance?.hitbox) {
          const index = interactables.indexOf(record.instance.hitbox);
          if (index >= 0) interactables.splice(index, 1);
        }
        if (Array.isArray(colliders)) {
          for (let index = colliders.length - 1; index >= 0; index -= 1) {
            if (colliders[index]?.owner === record.root) colliders.splice(index, 1);
          }
        }
      });
      (rendered.roots || []).forEach((root) => {
        root.removeFromParent();
        BF.disposeObject?.(root);
      });
      this.renderedStartupSite = null;
    }

    renderStartupSite() {
      const engine = this.manager.engine;
      const stage = Number(
        this.manager.memory.state.siteProgression?.[PRIMARY_MAP_ID]?.stage
      ) || 0;
      if (engine?.currentMapId !== PRIMARY_MAP_ID || !engine.currentMap?.group || !stage) {
        this.clearRenderedStartupSite();
        return false;
      }
      const config = Object.values(STARTUP_STAGES).find((item) => item.stage === stage);
      if (
        !config ||
        !BF.ObjectSpawner ||
        config.placements.some((placement) => !BF.MicroScenes?.get(placement.sceneId))
      ) return false;
      if (
        this.renderedStartupSite?.stage === stage &&
        this.renderedStartupSite?.mapGroup === engine.currentMap.group
      ) return true;
      this.clearRenderedStartupSite();
      const spawner = new BF.ObjectSpawner({
        THREE: engine.THREE,
        scene: engine.currentMap.group
      });
      const capsuleAnchor = this.startupCapsuleAnchor();
      const roots = [];
      const records = [];
      config.placements.forEach((placement, placementIndex) => {
        const root = new engine.THREE.Group();
        root.position.set(
          capsuleAnchor.x + placement.position[0],
          capsuleAnchor.y + placement.position[1],
          capsuleAnchor.z + placement.position[2]
        );
        root.rotation.set(...placement.rotation);
        root.userData.startupSiteStage = stage;
        root.userData.startupMicroSceneId = placement.sceneId;
        root.userData.startupPlacementIndex = placementIndex;
        engine.currentMap.group.add(root);
        roots.push(root);
        records.push(...spawner.spawnMicroScene(placement.sceneId, {
          origin: { x: 0, y: 0, z: 0 },
          scene: root,
          force: true,
          source: `startup-site-stage-${stage}`
        }));
      });
      records.forEach((record) => {
        record.root.userData.startupSiteStage = stage;
        if (record.instance?.hitbox) engine.currentMap.interactables.push(record.instance.hitbox);
        (record.instance?.colliders || []).forEach((collider) => {
          record.root.updateWorldMatrix(true, false);
          const position = record.root.localToWorld(collider.offset.clone());
          engine.currentMap.colliders.push({
            position,
            radius: collider.radius,
            owner: record.root,
            startupSiteStage: stage
          });
        });
      });
      this.renderedStartupSite = {
        stage,
        mapGroup: engine.currentMap.group,
        roots,
        records
      };
      BF.registerSiteAnchor?.(PRIMARY_MAP_ID, capsuleAnchor, 12);
      return records.length > 0;
    }

    metric(name) {
      const exploration = BF.getExplorationSummary?.() || { maps: {} };
      const maps = Object.values(exploration.maps || {});
      const multi = BF.getMultiProgressionState?.() || {};
      const indicators = Object.values(multi.mapIndicators || {});
      const categorized = Object.values(this.categorizedByMap());
      const sampleMap = categorized.slice().sort((left, right) => {
        const score = (map) =>
          Math.min(map.minerals / 3, map.plants, map.other) * 1000 +
          Math.min(map.minerals, 3) + Math.min(map.plants, 1) + Math.min(map.other, 1);
        return score(right) - score(left);
      })[0] || { minerals: 0, plants: 0, other: 0 };
      const sites = Object.values(this.manager.memory.state.siteProgression || {});
      const facts = this.manager.memory.state.facts || {};
      const currentMapId = this.manager.engine?.currentMapId;
      const currentMap = exploration.maps?.[currentMapId];
      const discoveredMaps = maps.filter((map) => Number(map.surfacePercent) > 0);
      const completedDiscoveredMaps = discoveredMaps.filter(
        (map) => Number(map.surfacePercent) >= 100
      );
      const totalBiomePercent = discoveredMaps.length
        ? discoveredMaps.reduce((sum, map) => sum + Math.min(100, Number(map.surfacePercent) || 0), 0) /
          discoveredMaps.length
        : 0;
      const metricMap = {
        "max-map-percent": Math.max(0, ...maps.map((map) => Number(map.surfacePercent) || 0)),
        "current-map-percent": Number(currentMap?.surfacePercent) || 0,
        "all-discovered-biomes-percent": completedDiscoveredMaps.length === discoveredMaps.length && discoveredMaps.length
          ? 100
          : totalBiomePercent,
        "maps-80": maps.filter((map) => Number(map.surfacePercent) >= 80).length,
        "same-map-minerals": sampleMap.minerals,
        "same-map-plants": sampleMap.plants,
        "same-map-other": sampleMap.other,
        "unique-resources": Math.max(0, ...indicators.map((map) => Object.keys(map.uniqueResources || {}).length)),
        "total-acquisitions": this.countEvents(["RESOURCE_COLLECTED", "RESOURCE_EXTRACTED"]),
        analyses: this.countEvents(["OBJECT_ANALYZED"]),
        inspections: this.countEvents(["OBJECT_INSPECTED"]),
        minerals: this.analyzedByCategory("minerals"),
        components: this.analyzedByCategory("components"),
        "distinct-rock-types": new Set(this.eventHistory()
          .filter((event) => {
            const tags = new Set(event.tags || []);
            const family = `${event.family || ""} ${event.inventoryKey || ""}`.toLowerCase();
            return tags.has("mineral") || /mineral|crystal|ore|cristal|minerai|rock|roche/.test(family);
          })
          .map((event) => {
            const identity = event.objectId || event.inventoryKey || event.family;
            return identity == null ? null : `${identity}:${event.variant ?? 0}`;
          })
          .filter(Boolean)).size,
        contacts: Number(facts.contacts) || 0,
        transitions: Number(facts.mapTransitions) || 0,
        "distinct-biomes": new Set(maps.filter((map) =>
          Number(map.surfacePercent) > 0
        ).map((map) =>
          BF.maps?.[map.mapId]?.biome || BF.maps?.[map.mapId]?.atmosphere || map.mapId
        )).size,
        "secondary-camps": sites.filter((site) => site.stage >= 1 && !site.isPrimary).length,
        "base-returns": Number(facts.baseReturns) || 0,
        "journal-entries": (multi.journal || []).length
      };
      return Math.max(0, Number(metricMap[name]) || 0);
    }

    metricLabel(name) {
      const exploration = BF.getExplorationSummary?.() || { maps: {} };
      const maps = Object.values(exploration.maps || {}).filter(
        (map) => Number(map.surfacePercent) > 0
      );
      if (name === "current-map-percent") {
        const mapId = this.manager.engine?.currentMapId;
        const percent = Number(exploration.maps?.[mapId]?.surfacePercent) || 0;
        const mapName = BF.maps?.[mapId]?.name || mapId || "Map actuelle";
        return `${mapName} · ${Math.round(percent)} %`;
      }
      if (name === "all-discovered-biomes-percent") {
        const completed = maps.filter((map) => Number(map.surfacePercent) >= 100).length;
        return `${completed}/${maps.length} biome${maps.length > 1 ? "s" : ""} à 100 %`;
      }
      return "";
    }

    updateTree(tree) {
      let changed = false;
      tree.root.walk((node) => {
        const metric = node.params?.catalogMetric;
        if (!metric || !node.isLeaf) return;
        const value = Math.min(node.target, this.metric(metric));
        const progressLabel = this.metricLabel(metric);
        if (progressLabel && node.params.progressLabel !== progressLabel) {
          node.params.progressLabel = progressLabel;
          changed = true;
        }
        if (node.progress === value) return;
        if (value < node.target && node.isComplete) {
          node.status = Missions.MissionStatus.ACTIVE;
          node.completedAt = 0;
          tree.root.status = Missions.MissionStatus.ACTIVE;
          tree.root.completedAt = 0;
        }
        node.progress = value;
        changed = true;
      });
      if (changed) tree.refresh();
      return changed;
    }

    unlockCatalogMission(definition) {
      const lifecycle = this.manager.memory.state.missionLifecycle?.[definition.id];
      if (
        definition.unlockMetric &&
        this.metric(definition.unlockMetric) < Number(definition.unlockTarget || 1)
      ) {
        if (lifecycle?.status === "available" && lifecycle.source === "system") {
          lifecycle.status = "hidden";
          lifecycle.updatedAt = Date.now();
          return true;
        }
        return false;
      }
      const probe = new Missions.MissionTree(Missions.cloneDefinition(definition));
      this.updateTree(probe);
      const hasProgress = definition.unlockMetric || this.manager.treeProgress(probe) > 0;
      if (!hasProgress) {
        if (lifecycle?.status === "available" && lifecycle.source === "system") {
          lifecycle.status = "hidden";
          lifecycle.updatedAt = Date.now();
          return true;
        }
        return false;
      }
      const status = lifecycle?.status;
      if (!status || status === "hidden" || status === "available") {
        this.manager.startMission(definition.id, {
          primary: false,
          autoPrimaryEligible: Boolean(definition.passivePriorityAxis),
          source: "catalogue",
          reason: "Progression réelle détectée dans le registre central."
        });
        return true;
      }
      return false;
    }

    evaluate() {
      let changed = false;
      [...this.manager.trees.entries()].forEach(([missionId, tree]) => {
        changed = this.updateStartupTree(missionId, tree) || changed;
      });
      [...this.manager.trees.entries()].forEach(([missionId, tree]) => {
        if (!tree.root.isComplete) return;
        const definition = this.manager.definition(missionId);
        const stage = { camp: 1, shelter: 2, base: 3 }[definition?.baseMissionId];
        if (stage) {
          changed = this.completeStartupStage(missionId, tree) || changed;
        }
      });
      Object.values(catalog).forEach((definition) => {
        changed = this.unlockCatalogMission(definition) || changed;
        const tree = this.manager.trees.get(definition.id);
        if (!tree) return;
        if (this.updateTree(tree)) {
          this.manager.memory.saveTree(tree);
          changed = true;
        }
        const lifecycle = this.manager.memory.state.missionLifecycle?.[definition.id];
        if (definition.evolving && lifecycle?.status === "completed" && !tree.root.isComplete) {
          lifecycle.status = "active";
          lifecycle.completedAt = 0;
          lifecycle.autoPrimaryEligible = Boolean(definition.passivePriorityAxis);
          if (!this.manager.activeMissionIds.includes(definition.id)) {
            this.manager.activeMissionIds.push(definition.id);
          }
          changed = true;
        }
      });
      this.manager.syncLifecycleFromTrees();
      Object.values(catalog).forEach((definition) => {
        const lifecycle = this.manager.memory.state.missionLifecycle?.[
          definition.id
        ];
        if (!lifecycle) return;
        if (lifecycle.status !== "completed") return;
        const rewards = this.manager.memory.state.rewardedMissions;
        if (rewards[definition.id]) return;
        rewards[definition.id] = { at: Date.now(), source: "catalogue" };
        global.dispatchEvent(new CustomEvent("bluefox:mission-reward", {
          detail: { missionId: definition.id, title: definition.title }
        }));
        changed = true;
      });
      if (changed) {
        this.manager.memory.save();
        this.manager.publish();
      }
      return changed;
    }

    registerSiteAnchor(mapId, anchor, interactionRadius) {
      const site = this.manager.memory.state.siteProgression?.[mapId];
      if (
        !site ||
        Number(site.stage) < 1 ||
        !Number.isFinite(Number(anchor?.x)) ||
        !Number.isFinite(Number(anchor?.z))
      ) return false;
      site.anchor = { x: Number(anchor.x), z: Number(anchor.z) };
      site.interactionRadius = Math.max(
        4,
        Number(interactionRadius) ||
          Number(site.interactionRadius) ||
          DEFAULT_SITE_INTERACTION_RADIUS
      );
      site.updatedAt = Date.now();
      this.manager.memory.save();
      this.manager.publish();
      return true;
    }

    registerSiteStage(mapId, stage, detail = {}) {
      if (!mapId) return false;
      const sites = this.manager.memory.state.siteProgression;
      const site = sites[mapId] = sites[mapId] || { mapId, stage: 0 };
      const requestedStage = Math.max(0, Number(stage) || 0);
      if (requestedStage > site.stage + 1) return false;
      const nextStage = Math.max(site.stage, requestedStage);
      if (nextStage === site.stage) return false;
      site.stage = nextStage;
      site.updatedAt = Date.now();
      if (nextStage >= 1 && !site.anchor) {
        const requestedAnchor = detail.anchor || detail.position;
        const characterPosition = this.manager.engine?.character?.root?.position;
        const anchor = requestedAnchor || characterPosition || { x: 0, z: 8 };
        site.anchor = {
          x: Number.isFinite(Number(anchor.x)) ? Number(anchor.x) : 0,
          z: Number.isFinite(Number(anchor.z)) ? Number(anchor.z) : 8
        };
      }
      site.interactionRadius = Math.max(
        4,
        Number(detail.interactionRadius) ||
          Number(site.interactionRadius) ||
          DEFAULT_SITE_INTERACTION_RADIUS
      );
      const primaryMapId = this.primaryBaseMapId();
      site.isPrimary = mapId === primaryMapId;
      if (detail.microSceneId) site.microSceneId = detail.microSceneId;
      if (Array.isArray(detail.microSceneIds)) {
        site.microSceneIds = detail.microSceneIds.slice();
      }
      if (detail.skillId) site.skillId = detail.skillId;
      const completedId = [null, `camp@${mapId}`, `shelter@${mapId}`, `base@${mapId}`][nextStage];
      const nextId = nextStage === 1 && site.isPrimary
        ? `shelter@${mapId}`
        : nextStage === 2 && site.isPrimary
          ? `base@${mapId}`
          : null;
      if (completedId) {
        const tree = this.manager.trees.get(completedId);
        tree?.root.walk((node) => { if (node.isLeaf) node.progress = node.target; });
        tree?.refresh();
        if (tree) this.manager.memory.saveTree(tree);
      }
      this.manager.syncLifecycleFromTrees();
      if (nextId) this.manager.startMission(nextId, {
        primary: false,
        prerequisites: [completedId],
        source: "progression du site"
      });
      this.manager.syncLifecycleFromTrees();
      this.manager.memory.save();
      this.manager.publish();
      global.dispatchEvent(new CustomEvent("bluefox:site-progression", {
        detail: { ...site, previousStage: nextStage - 1 }
      }));
      return true;
    }

    dispose() {
      this.events.forEach((type) => global.removeEventListener(type, this.onChange));
      global.removeEventListener("bluefox:map-transition-completed", this.onTransition);
      this.clearRenderedStartupSite();
    }
  }

  Missions.catalogDefinitions = Object.freeze(catalog);
  Missions.MissionCatalogController = MissionCatalogController;
})(window);
