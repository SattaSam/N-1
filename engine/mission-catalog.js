(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  const VERSION = "npc-civilization-r3";
  const HONORED_ACCEPTED_THRESHOLD = 3;
  const CIVILIZATIONS = Object.freeze({
    translucent: Object.freeze({
      id: "translucent",
      cuoType: "npc_translucent",
      rewardInventoryKey: "stellar_iridium",
      rewardQuantity: 1,
      glyph: "⋔ ⌁ ∆ ⟟"
    }),
    rocky: Object.freeze({
      id: "rocky",
      cuoType: "npc_rocky",
      rewardInventoryKey: "resonant_basalt",
      rewardQuantity: 2,
      glyph: "⟁ ⌬ ⋰ ⟟"
    })
  });
  const SERVICE_KINDS = Object.freeze(["collect", "recon", "observe"]);

  const CIVILIZATION_CITIES = Object.freeze({
    translucent: Object.freeze({
      mapId: "custom-map-31-tinycity",
      civilizationId: "translucent"
    }),
    rocky: Object.freeze({
      mapId: "custom-map-32-rock-village",
      civilizationId: "rocky"
    })
  });

  const BLUEPRINTS = Object.freeze({
    rocky: Object.freeze({
      id: "quantum-geographic-marker-blueprint-v1",
      type: "research.blueprint",
      civilizationId: "rocky",
      label: "Marqueur géographique quantique",
      description: "Stabiliser et décrire une position géographique avec une précision quantique.",
      purchase: Object.freeze({ inventoryKey: "energy_crystal", quantity: 25, label: "Cristal d’énergie bleu" }),
      fabrication: Object.freeze([
        Object.freeze({ inventoryKey: "deployed_beacon", quantity: 5, label: "Balises" }),
        Object.freeze({ inventoryKey: "accumulator", quantity: 10, label: "Accumulateurs" }),
        Object.freeze({ inventoryKey: "core", quantity: 25, label: "Cores" }),
        Object.freeze({ inventoryKey: "parts", quantity: 50, label: "Composants" }),
        Object.freeze({ pool: "rare_ore", quantity: 50, label: "Minerais rares" }),
        Object.freeze({ pool: "ore", quantity: 100, label: "Minerais communs" }),
        Object.freeze({ inventoryKey: "biocapital", quantity: 50, label: "Plantes fluorescentes" }),
        Object.freeze({ inventoryKey: "magnetic_ore", quantity: 50, label: "Minerai magnétique" }),
        Object.freeze({ inventoryKey: "energy_crystal", quantity: 25, label: "Cristaux d’énergie bleus" }),
        Object.freeze({ inventoryKey: "crystal", quantity: 50, label: "Amas de cristal" })
      ])
    }),
    translucent: Object.freeze({
      id: "fragmenter-assembler-blueprint-v1",
      type: "research.blueprint",
      civilizationId: "translucent",
      label: "Fragmenteur-Assembleur",
      description: "Fragmenter une structure matérielle puis guider sa recomposition contrôlée.",
      purchase: Object.freeze({ inventoryKey: "biocapital", provenance: "prismatic_orchid", quantity: 25, label: "Orchidée prismatique" }),
      fabrication: Object.freeze([
        Object.freeze({ inventoryKey: "deployed_beacon", quantity: 3, label: "Balises" }),
        Object.freeze({ inventoryKey: "accumulator", quantity: 12, label: "Accumulateurs" }),
        Object.freeze({ inventoryKey: "core", quantity: 20, label: "Cores" }),
        Object.freeze({ inventoryKey: "parts", quantity: 40, label: "Composants" }),
        Object.freeze({ pool: "rare_ore", quantity: 30, label: "Minerais rares" }),
        Object.freeze({ pool: "ore", quantity: 60, label: "Minerais communs" }),
        Object.freeze({ inventoryKey: "biocapital", quantity: 120, label: "Biocapital végétal" }),
        Object.freeze({ inventoryKey: "adaptive_biomass", quantity: 80, label: "Biomasse adaptative" }),
        Object.freeze({ inventoryKey: "energy_crystal", quantity: 25, label: "Cristaux d’énergie bleus" }),
        Object.freeze({ inventoryKey: "crystal", quantity: 35, label: "Amas de cristal" })
      ])
    })
  });

  const ORCHID_BALANCE_KEY = "civilization:trade:prismatic-orchid-balance";
  const TELEPORT_HYPOTHESIS_KEY = "civilization:research:teleport-hypothesis-v1";

  const SERVICE_IDS = Object.freeze(Object.fromEntries(
    Object.keys(CIVILIZATIONS).map((civilizationId) => [
      civilizationId,
      Object.freeze(Object.fromEntries(SERVICE_KINDS.map((kind) => [
        kind,
        `NPC-SERVICE-${kind.toUpperCase()}@${civilizationId}`
      ])))
    ])
  ));

  const serviceDefinition = (civilization, kind) => {
    const id = SERVICE_IDS[civilization.id][kind];
    const common = {
      id,
      title: {
        collect: "Service de collecte",
        recon: "Reconnaissance locale",
        observe: "Observation demandée"
      }[kind],
      description: {
        collect: "Rassembler quelques fibres demandées par la civilisation rencontrée.",
        recon: "Reconnaître deux éléments de flore distincts pour confirmer l'état des environs.",
        observe: "Observer un élément minéral intéressant pour la civilisation rencontrée."
      }[kind],
      priority: 28,
      repeatable: true,
      passivePriorityAxis: "civilization",
      npcService: {
        civilizationId: civilization.id,
        kind,
        rewardInventoryKey: civilization.rewardInventoryKey,
        rewardQuantity: civilization.rewardQuantity
      }
    };
    const leaf = kind === "collect"
      ? {
          id: `${id}:collect`,
          title: "Rassembler 5 fibres",
          type: "collect",
          target: 5,
          params: { kind: "fiber" }
        }
      : kind === "recon"
        ? {
            id: `${id}:recon`,
            title: "Reconnaître deux éléments de flore distincts",
            type: "observe",
            target: 2,
            params: { subject: "flora", distinctBy: "instanceId" }
          }
        : {
            id: `${id}:observe`,
            title: "Observer un élément minéral",
            type: "observe",
            target: 1,
            params: { subject: "mineral" }
          };
    return Object.freeze({
      ...common,
      root: Object.freeze({
        id: `${id}:root`,
        title: common.title,
        type: "objective",
        target: 1,
        children: Object.freeze([Object.freeze(leaf)])
      })
    });
  };

  const SERVICE_DEFINITIONS = Object.freeze(
    Object.values(CIVILIZATIONS).flatMap((civilization) =>
      SERVICE_KINDS.map((kind) => serviceDefinition(civilization, kind))
    )
  );

  // mission-catalog.js est précisément le point d'enregistrement prévu pour
  // les définitions moteur hors Bible. L'enregistrement a lieu avant la
  // construction de MissionManager afin que reload/restauration restent sûrs.
  BF.registerMissionDefinitions?.(SERVICE_DEFINITIONS);

  const relationKey = (civilizationId) =>
    `civilization:relation:${String(civilizationId || "").trim().toLowerCase()}`;
  const serviceRewardReceipt = (missionId, completedAt) =>
    `npc-service-reward:${missionId}:${Number(completedAt) || 0}`;

  class MissionCatalogController {
    constructor(manager) {
      this.manager = manager;
      this.disposed = false;
      this.unsubscribeObjectEvents = BF.ObjectEvents?.subscribe?.((event) =>
        this.onObjectEvent(event)
      ) || null;
      this.onMissionState = () => this.reconcileServiceRewards();
      this.onProgressionChanged = (event) => this.trackOrchidConsumption(event?.detail || {});
      global.addEventListener?.("bluefox:mission-state", this.onMissionState);
      global.addEventListener?.("bluefox:progression-changed", this.onProgressionChanged);
      this.reconcileServiceRewards();
    }

    getRelation(civilizationId) {
      const id = String(civilizationId || "").trim().toLowerCase();
      const saved = this.manager?.memory?.getFact?.(relationKey(id), null);
      return Object.freeze({
        civilizationId: id,
        rank: String(saved?.rank || "neutral").toLowerCase(),
        acceptedMissions: Math.max(0, Number(saved?.acceptedMissions) || 0),
        completedMissions: Math.max(0, Number(saved?.completedMissions) || 0),
        score: Number.isFinite(Number(saved?.score)) ? Number(saved.score) : 0,
        acceptedMissionIds: Array.isArray(saved?.acceptedMissionIds)
          ? [...saved.acceptedMissionIds]
          : [],
        updatedAt: Number(saved?.updatedAt) || 0
      });
    }

    setRelation(civilizationId, rank, detail = {}) {
      const id = String(civilizationId || "").trim().toLowerCase();
      if (!CIVILIZATIONS[id]) return false;
      const allowed = new Set(["hostile", "wary", "neutral", "friendly", "honored"]);
      const nextRank = String(rank || "").toLowerCase();
      if (!allowed.has(nextRank)) return false;
      const previous = this.getRelation(id);
      const next = {
        ...previous,
        ...detail,
        civilizationId: id,
        rank: nextRank,
        acceptedMissions: Math.max(0, Number(detail.acceptedMissions ?? previous.acceptedMissions) || 0),
        completedMissions: Math.max(0, Number(detail.completedMissions ?? previous.completedMissions) || 0),
        score: Number.isFinite(Number(detail.score ?? previous.score))
          ? Number(detail.score ?? previous.score)
          : 0,
        acceptedMissionIds: Array.isArray(detail.acceptedMissionIds)
          ? [...detail.acceptedMissionIds]
          : [...previous.acceptedMissionIds],
        updatedAt: Date.now()
      };
      this.manager?.memory?.setFact?.(relationKey(id), next);
      this.manager?.memory?.save?.();
      if (previous.rank !== next.rank) {
        global.dispatchEvent?.(new CustomEvent("bluefox:civilization-rank-changed", {
          detail: { civilizationId: id, previous: previous.rank, rank: next.rank }
        }));
        if (next.rank === "honored") {
          global.dispatchEvent?.(new CustomEvent("bluefox:civilization-special-eligible", {
            detail: { civilizationId: id, rank: next.rank }
          }));
        }
      }
      return Object.freeze({ ...next });
    }

    noteAccepted(civilizationId, missionId) {
      const previous = this.getRelation(civilizationId);
      const acceptedMissions = previous.acceptedMissions + 1;
      const acceptedMissionIds = [...previous.acceptedMissionIds, String(missionId || "")].slice(-24);
      const nextRank = acceptedMissions >= HONORED_ACCEPTED_THRESHOLD &&
        ["friendly", "honored"].includes(previous.rank)
        ? "honored"
        : previous.rank;
      return this.setRelation(civilizationId, nextRank, {
        acceptedMissions,
        score: previous.score + 1,
        acceptedMissionIds
      });
    }

    npcRoot(event) {
      const type = String(event?.detail?.cuoType || "");
      const roots = BF.NpcRuntime?.list?.(type) || [];
      const instanceId = String(event?.instanceId || "");
      return roots.find((root) => String(root?.userData?.instanceId || "") === instanceId) ||
        roots[roots.length - 1] || null;
    }

    speakFor(event, text) {
      const root = this.npcRoot(event);
      if (!root) return false;
      return BF.NpcRuntime?.speak?.(root, text, { duration: 4.2 }) === true;
    }

    activeService(civilizationId) {
      const ids = Object.values(SERVICE_IDS[civilizationId] || {});
      return ids.find((id) =>
        this.manager?.memory?.state?.missionLifecycle?.[id]?.status === "active"
      ) || null;
    }

    chooseService(civilizationId) {
      const relation = this.getRelation(civilizationId);
      const order = SERVICE_KINDS.map((_, index) =>
        SERVICE_KINDS[(relation.acceptedMissions + index) % SERVICE_KINDS.length]
      );
      for (const kind of order) {
        const missionId = SERVICE_IDS[civilizationId]?.[kind];
        if (!missionId || !this.manager?.definition?.(missionId)) continue;
        const lifecycle = this.manager.memory?.state?.missionLifecycle?.[missionId];
        if (lifecycle?.status === "active") continue;
        if (lifecycle?.status === "completed") {
          this.manager.rearmRepeatableMission?.(missionId, {
            source: "npc-service",
            reason: "Nouveau service proposé par la civilisation."
          });
        }
        const refreshed = this.manager.memory?.state?.missionLifecycle?.[missionId];
        if (refreshed?.status === "failed" || refreshed?.status === "paused") continue;
        return { missionId, kind };
      }
      return null;
    }

    offerService(event, civilizationId) {
      const civilization = CIVILIZATIONS[civilizationId];
      const relation = this.getRelation(civilizationId);
      if (!civilization) return false;
      if (!["friendly", "honored"].includes(relation.rank)) {
        this.speakFor(event, `${civilization.glyph} … contact … ⧖`);
        return false;
      }
      const active = this.activeService(civilizationId);
      if (active) {
        this.speakFor(event, `${civilization.glyph} … mission … en cours …`);
        return false;
      }
      const offer = this.chooseService(civilizationId);
      if (!offer) {
        this.speakFor(event, `${civilization.glyph} … échange … bientôt …`);
        return false;
      }
      const started = this.manager.startMission?.(offer.missionId, {
        primary: false,
        autoPrimaryEligible: true,
        source: "npc-contact",
        reason: `Mission courte proposée par la civilisation ${civilizationId}.`
      }) === true;
      if (!started) return false;
      const updated = this.noteAccepted(civilizationId, offer.missionId);
      const hint = {
        collect: "mission … fibres … 5",
        recon: "mission … flore … 2",
        observe: "mission … minerai … observer"
      }[offer.kind];
      this.speakFor(event, `${civilization.glyph} … ${hint} … ⧖`);
      global.dispatchEvent?.(new CustomEvent("bluefox:npc-mission-offered", {
        detail: {
          civilizationId,
          missionId: offer.missionId,
          kind: offer.kind,
          acceptedMissions: updated?.acceptedMissions || 0,
          rank: updated?.rank || relation.rank
        }
      }));
      return true;
    }

    memoryFact(key, fallback = null) {
      return this.manager?.memory?.getFact?.(key, fallback) ?? fallback;
    }

    setMemoryFact(key, value) {
      this.manager?.memory?.setFact?.(key, value);
      this.manager?.memory?.save?.();
      return value;
    }

    orchidBalance() {
      return Math.max(0, Number(this.memoryFact(ORCHID_BALANCE_KEY, 0)) || 0);
    }

    noteOrchidCollected(event) {
      const type = String(BF.ObjectEvents?.types?.RESOURCE_COLLECTED || "RESOURCE_COLLECTED");
      if (String(event?.type || "") !== type) return false;
      const subject = String(event?.objectId || event?.detail?.cuoType || event?.detail?.kind || "").toLowerCase();
      if (!subject.includes("prismatic_orchid") && subject !== "bio-pris-s-001") return false;
      const amount = Math.max(1, Number(event?.quantity || event?.detail?.quantity) || 1);
      this.setMemoryFact(ORCHID_BALANCE_KEY, this.orchidBalance() + amount);
      return true;
    }

    trackOrchidConsumption(detail = {}) {
      if (String(detail.reason || "") !== "inventory-consumed") return false;
      if (String(detail.event?.inventoryKey || "") !== "biocapital") return false;
      const quantity = Math.max(0, Number(detail.event?.quantity) || 0);
      if (!quantity) return false;
      const balance = this.orchidBalance();
      if (!balance) return false;
      this.setMemoryFact(ORCHID_BALANCE_KEY, Math.max(0, balance - quantity));
      return true;
    }

    resourceCatalog() {
      const byKey = new Map();
      (BF.ObjectLibrary?.list?.() || []).forEach((definition) => {
        const key = String(definition?.resource?.inventoryKey || "");
        if (!key || definition?.gameplay?.collectable !== true) return;
        if (["survival_bag", "deployed_beacon"].includes(key)) return;
        const rarity = String(definition?.rarity || definition?.spawn?.rarity || "common").toLowerCase();
        const value = rarity === "rare" ? 8 : rarity === "uncommon" ? 3 : 1;
        if (!byKey.has(key) || value > byKey.get(key).value) {
          byKey.set(key, {
            key,
            label: definition.label || key,
            rarity,
            value
          });
        }
      });
      return [...byKey.values()].sort((a, b) => a.value - b.value || a.label.localeCompare(b.label, "fr"));
    }

    tradeStockKey(civilizationId) {
      return `civilization:trade-stock:${civilizationId}`;
    }

    tradeStock(civilizationId) {
      const key = this.tradeStockKey(civilizationId);
      const saved = this.memoryFact(key, null);
      if (saved && typeof saved === "object") return { ...saved };
      const stock = {};
      this.resourceCatalog().forEach((entry) => {
        stock[entry.key] = entry.rarity === "rare" ? 5 : entry.rarity === "uncommon" ? 12 : 30;
      });
      this.setMemoryFact(key, stock);
      return { ...stock };
    }

    tradeResource(civilizationId, offerKey, offerQuantity, receiveKey, receiveQuantity) {
      const relation = this.getRelation(civilizationId);
      if (!["friendly", "honored"].includes(relation.rank)) return { ok: false, reason: "reputation" };
      const catalog = new Map(this.resourceCatalog().map((entry) => [entry.key, entry]));
      const offer = catalog.get(String(offerKey || ""));
      const receive = catalog.get(String(receiveKey || ""));
      const offered = Math.max(1, Math.floor(Number(offerQuantity) || 1));
      const received = Math.max(1, Math.floor(Number(receiveQuantity) || 1));
      if (!offer || !receive || offer.key === receive.key) return { ok: false, reason: "offer" };
      if (offered * offer.value < received * receive.value) return { ok: false, reason: "value" };
      const inventory = BF.getProgressionState?.().inventory || {};
      if ((Number(inventory[offer.key]) || 0) < offered) return { ok: false, reason: "inventory" };
      const stock = this.tradeStock(civilizationId);
      if ((Number(stock[receive.key]) || 0) < received) return { ok: false, reason: "stock" };
      const capacity = BF.getInventoryCapacityState?.() || null;
      if (Number.isFinite(Number(capacity?.capacity)) && Number.isFinite(Number(capacity?.count))) {
        const projected = Number(capacity.count) - offered + received;
        if (projected > Number(capacity.capacity)) return { ok: false, reason: "capacity" };
      }
      const removed = BF.consumeInventory?.(offer.key, offered) || 0;
      if (removed !== offered) return { ok: false, reason: "consume" };
      const granted = BF.grantInventory?.(receive.key, received, {
        source: "civilization-trade",
        civilizationId
      }) || 0;
      if (granted !== received) {
        BF.grantInventory?.(offer.key, removed, { source: "civilization-trade-rollback", civilizationId });
        return { ok: false, reason: "grant" };
      }
      stock[receive.key] = Math.max(0, Number(stock[receive.key]) - received);
      stock[offer.key] = Math.max(0, Number(stock[offer.key]) || 0) + offered;
      this.setMemoryFact(this.tradeStockKey(civilizationId), stock);
      this.setRelation(civilizationId, relation.rank, { score: relation.score + Math.max(1, Math.floor(received * receive.value / 4)) });
      global.dispatchEvent?.(new CustomEvent("bluefox:civilization-trade-completed", {
        detail: { civilizationId, offerKey: offer.key, offerQuantity: offered, receiveKey: receive.key, receiveQuantity: received }
      }));
      return { ok: true, stock };
    }

    blueprint(civilizationId) {
      return BLUEPRINTS[String(civilizationId || "").toLowerCase()] || null;
    }

    blueprintUnlocked(civilizationId) {
      const blueprint = this.blueprint(civilizationId);
      return Boolean(blueprint && BF.Research?.isUnlocked?.(blueprint.id));
    }

    purchaseBlueprint(civilizationId) {
      const blueprint = this.blueprint(civilizationId);
      const relation = this.getRelation(civilizationId);
      if (!blueprint) return { ok: false, reason: "blueprint" };
      if (relation.rank !== "honored") return { ok: false, reason: "reputation" };
      if (this.blueprintUnlocked(civilizationId)) return { ok: false, reason: "owned" };
      const cost = blueprint.purchase;
      const inventory = BF.getProgressionState?.().inventory || {};
      if ((Number(inventory[cost.inventoryKey]) || 0) < cost.quantity) return { ok: false, reason: "inventory" };
      if (cost.provenance === "prismatic_orchid" && this.orchidBalance() < cost.quantity) {
        return { ok: false, reason: "orchid" };
      }
      const runtime = BF.bibleRuntime;
      if (!runtime?.unlockResearchRewards) return { ok: false, reason: "research" };
      const removed = BF.consumeInventory?.(cost.inventoryKey, cost.quantity) || 0;
      if (removed !== cost.quantity) return { ok: false, reason: "consume" };
      const unlocked = runtime.unlockResearchRewards({
        id: `CIV-TRADE-${civilizationId.toUpperCase()}`,
        rewards: [{
          id: blueprint.id,
          type: blueprint.type,
          category: "civilization-technology",
          label: blueprint.label,
          description: blueprint.description,
          fabrication: blueprint.fabrication
        }]
      });
      if (!unlocked || !BF.Research?.isUnlocked?.(blueprint.id)) {
        BF.grantInventory?.(cost.inventoryKey, removed, {
          source: "civilization-blueprint-rollback",
          civilizationId
        });
        if (cost.provenance === "prismatic_orchid") {
          this.setMemoryFact(ORCHID_BALANCE_KEY, this.orchidBalance() + removed);
        }
        return { ok: false, reason: "unlock" };
      }
      global.dispatchEvent?.(new CustomEvent("bluefox:civilization-blueprint-acquired", {
        detail: { civilizationId, blueprintId: blueprint.id, label: blueprint.label }
      }));
      this.maybeSuggestTeleportation();
      return { ok: true, blueprintId: blueprint.id };
    }

    maybeSuggestTeleportation() {
      if (!Object.values(BLUEPRINTS).every((blueprint) => BF.Research?.isUnlocked?.(blueprint.id))) return false;
      if (this.memoryFact(TELEPORT_HYPOTHESIS_KEY, false)) return false;
      const detail = {
        hypothesis: "teleportation",
        blueprintIds: Object.values(BLUEPRINTS).map((blueprint) => blueprint.id),
        requiresFurtherExperimentation: true,
        unlocksTeleporter: false
      };
      this.setMemoryFact(TELEPORT_HYPOTHESIS_KEY, { ...detail, at: Date.now() });
      BF.currentEngine?.callbacks?.onAction?.(
        "Les deux technologies semblent complémentaires : stabiliser une position puis fragmenter et recomposer la matière. Un transfert entre deux points paraît théoriquement possible, mais il faudra poursuivre les expérimentations énergétiques et technologiques avant d’envisager un téléporteur."
      );
      global.dispatchEvent?.(new CustomEvent("bluefox:teleportation-hypothesis", { detail }));
      return true;
    }

    closeTradePanel() {
      global.document?.querySelector?.("[data-bluefox-civilization-trade]")?.remove?.();
    }

    openTrade(event, civilizationId) {
      const relation = this.getRelation(civilizationId);
      if (!["friendly", "honored"].includes(relation.rank)) {
        this.speakFor(event, `${CIVILIZATIONS[civilizationId]?.glyph || "⌁"} … échanges … confiance …`);
        return false;
      }
      const doc = global.document;
      if (!doc?.createElement) return false;
      this.closeTradePanel();
      const stock = this.tradeStock(civilizationId);
      const catalog = this.resourceCatalog();
      const panel = doc.createElement("section");
      panel.dataset.bluefoxCivilizationTrade = civilizationId;
      Object.assign(panel.style, {
        position: "fixed", right: "18px", top: "72px", width: "min(430px, calc(100vw - 36px))",
        maxHeight: "calc(100vh - 96px)", overflow: "auto", zIndex: "12000", padding: "16px",
        borderRadius: "14px", background: "rgba(5,18,28,.96)", color: "#eefcff",
        border: "1px solid rgba(124,224,255,.55)", boxShadow: "0 18px 55px rgba(0,0,0,.45)",
        fontFamily: "system-ui, sans-serif"
      });
      const header = doc.createElement("div");
      header.style.display = "flex"; header.style.justifyContent = "space-between"; header.style.gap = "12px";
      const title = doc.createElement("strong");
      title.textContent = `Échanges · ${civilizationId === "rocky" ? "Civilisation rocheuse" : "Civilisation translucide"}`;
      const close = doc.createElement("button"); close.type = "button"; close.textContent = "×";
      close.addEventListener("click", () => panel.remove());
      header.append(title, close); panel.appendChild(header);
      const status = doc.createElement("p");
      status.textContent = `Réputation : ${relation.rank.toUpperCase()} · score ${relation.score}`;
      panel.appendChild(status);

      const blueprint = this.blueprint(civilizationId);
      const bp = doc.createElement("article");
      bp.style.padding = "10px"; bp.style.marginBottom = "14px"; bp.style.border = "1px solid rgba(255,255,255,.18)"; bp.style.borderRadius = "10px";
      const bpTitle = doc.createElement("strong"); bpTitle.textContent = blueprint.label;
      const bpDesc = doc.createElement("p"); bpDesc.textContent = blueprint.description; bpDesc.style.margin = "6px 0";
      const bpCost = doc.createElement("small");
      const provenance = blueprint.purchase.provenance === "prismatic_orchid" ? ` · orchidées disponibles ${this.orchidBalance()}` : "";
      bpCost.textContent = `Prix du savoir : ${blueprint.purchase.quantity} × ${blueprint.purchase.label}${provenance}`;
      const bpButton = doc.createElement("button"); bpButton.type = "button";
      const owned = this.blueprintUnlocked(civilizationId);
      bpButton.textContent = owned ? "Blueprint acquis" : relation.rank === "honored" ? "Acquérir le Blueprint" : "Réservé au rang HONORÉ";
      bpButton.disabled = owned || relation.rank !== "honored";
      bpButton.style.display = "block"; bpButton.style.marginTop = "8px";
      if (relation.rank !== "honored") bp.style.opacity = ".55";
      bpButton.addEventListener("click", () => {
        const result = this.purchaseBlueprint(civilizationId);
        if (result.ok) this.openTrade(event, civilizationId);
        else BF.currentEngine?.callbacks?.onAction?.(`Échange impossible : ${result.reason}.`);
      });
      bp.append(bpTitle, bpDesc, bpCost, bpButton); panel.appendChild(bp);

      const barterTitle = doc.createElement("strong");
      barterTitle.textContent = "Troc de ressources";
      panel.appendChild(barterTitle);

      const inventory = BF.getProgressionState?.().inventory || {};
      const offerEntries = catalog.filter((entry) => (Number(inventory[entry.key]) || 0) > 0);
      const receiveEntries = catalog.filter((entry) => (Number(stock[entry.key]) || 0) > 0);
      const selection = { offerKey: null, receiveKey: null };

      const selectionGrid = doc.createElement("div");
      Object.assign(selectionGrid.style, {
        display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px"
      });

      const makeResourceList = (titleText, entries, source, quantityFor) => {
        const wrapper = doc.createElement("div");
        const heading = doc.createElement("small");
        heading.textContent = titleText;
        const grid = doc.createElement("div");
        grid.dataset.tradeSource = source;
        Object.assign(grid.style, {
          display: "grid", gap: "5px", maxHeight: "150px", overflow: "auto",
          padding: "6px", marginTop: "4px", border: "1px solid rgba(255,255,255,.12)",
          borderRadius: "8px"
        });
        entries.forEach((entry) => {
          const item = doc.createElement("button");
          item.type = "button";
          item.draggable = true;
          item.dataset.tradeKey = entry.key;
          item.dataset.tradeSource = source;
          item.textContent = `${entry.label} ×${quantityFor(entry.key)} · v${entry.value}`;
          item.addEventListener("dragstart", (dragEvent) => {
            dragEvent.dataTransfer?.setData("text/bluefox-trade-key", entry.key);
            dragEvent.dataTransfer?.setData("text/bluefox-trade-source", source);
          });
          item.addEventListener("click", () => {
            if (source === "bag") selection.offerKey = entry.key;
            else selection.receiveKey = entry.key;
            renderSelection();
          });
          grid.appendChild(item);
        });
        wrapper.append(heading, grid);
        return wrapper;
      };

      const offerZone = doc.createElement("div");
      const receiveZone = doc.createElement("div");
      [offerZone, receiveZone].forEach((zone) => Object.assign(zone.style, {
        minHeight: "46px", padding: "8px", border: "1px dashed rgba(124,224,255,.55)",
        borderRadius: "8px", marginTop: "8px"
      }));

      const offerQty = doc.createElement("input");
      offerQty.type = "number"; offerQty.min = "1"; offerQty.value = "1";
      const receiveQty = doc.createElement("input");
      receiveQty.type = "number"; receiveQty.min = "1"; receiveQty.value = "1";
      [offerQty, receiveQty].forEach((input) => { input.step = "1"; input.inputMode = "numeric"; input.style.width = "72px"; });

      const labelFor = (key) => catalog.find((entry) => entry.key === key)?.label || key || "—";
      const renderSelection = () => {
        offerZone.textContent = selection.offerKey
          ? `Offre BlueFox : ${labelFor(selection.offerKey)}`
          : "Déposez ici une ressource du Sac";
        receiveZone.textContent = selection.receiveKey
          ? `Demande : ${labelFor(selection.receiveKey)}`
          : "Déposez ici une ressource du stock civilisation";
      };
      const installTradeDrop = (zone, expectedSource, targetKey) => {
        zone.addEventListener("dragover", (dragEvent) => {
          const source = dragEvent.dataTransfer?.getData("text/bluefox-trade-source");
          if (!source || source === expectedSource) dragEvent.preventDefault();
        });
        zone.addEventListener("drop", (dragEvent) => {
          const source = dragEvent.dataTransfer?.getData("text/bluefox-trade-source");
          const key = dragEvent.dataTransfer?.getData("text/bluefox-trade-key");
          if (source !== expectedSource || !key) return;
          dragEvent.preventDefault();
          selection[targetKey] = key;
          renderSelection();
        });
      };
      installTradeDrop(offerZone, "bag", "offerKey");
      installTradeDrop(receiveZone, "stock", "receiveKey");

      selectionGrid.append(
        makeResourceList("Sac de BlueFox", offerEntries, "bag", (key) => Number(inventory[key]) || 0),
        makeResourceList("Stock civilisation", receiveEntries, "stock", (key) => Number(stock[key]) || 0)
      );
      panel.appendChild(selectionGrid);

      const chosen = doc.createElement("div");
      Object.assign(chosen.style, { display: "grid", gridTemplateColumns: "1fr 80px", gap: "8px" });
      chosen.append(offerZone, offerQty, receiveZone, receiveQty);
      panel.appendChild(chosen);
      renderSelection();

      const trade = doc.createElement("button");
      trade.type = "button";
      trade.textContent = "Confirmer l’échange";
      trade.style.marginTop = "10px";
      trade.disabled = !offerEntries.length || !receiveEntries.length;
      trade.addEventListener("click", () => {
        if (!selection.offerKey || !selection.receiveKey) {
          BF.currentEngine?.callbacks?.onAction?.("Sélectionnez une ressource du Sac et une ressource du stock civilisation.");
          return;
        }
        const result = this.tradeResource(
          civilizationId, selection.offerKey, offerQty.value, selection.receiveKey, receiveQty.value
        );
        if (result.ok) this.openTrade(event, civilizationId);
        else BF.currentEngine?.callbacks?.onAction?.(`Troc impossible : ${result.reason}.`);
      });
      panel.appendChild(trade);
      doc.body?.appendChild(panel);
      this.speakFor(event, `${CIVILIZATIONS[civilizationId]?.glyph || "⌁"} … échange … ressources …`);
      global.dispatchEvent?.(new CustomEvent("bluefox:civilization-trade-opened", { detail: { civilizationId, rank: relation.rank } }));
      return true;
    }

    onObjectEvent(event) {
      if (this.disposed) return false;
      this.noteOrchidCollected(event);
      const expected = String(BF.ObjectEvents?.types?.NPC_CONTACTED || "NPC_CONTACTED");
      if (String(event?.type || "") !== expected) return false;
      if (String(event?.detail?.interactionSource || "manual") !== "manual") return false;
      const civilizationId = String(event?.detail?.civilizationId || "").toLowerCase();
      if (String(event?.detail?.contactMode || "").toLowerCase() === "symbols-only") {
        this.speakFor(event, CIVILIZATIONS[civilizationId]?.glyph || "⌁ ⋔ ∆ ⟟");
        return true;
      }
      if (String(event?.detail?.npcRole || "").toLowerCase() === "merchant") {
        return this.openTrade(event, civilizationId);
      }
      return this.offerService(event, civilizationId);
    }

    reconcileServiceRewards() {
      let changed = false;
      SERVICE_DEFINITIONS.forEach((definition) => {
        const lifecycle = this.manager?.memory?.state?.missionLifecycle?.[definition.id];
        if (lifecycle?.status !== "completed") return;
        const service = definition.npcService;
        const receipt = serviceRewardReceipt(definition.id, lifecycle.completedAt);
        if (this.manager.memory?.hasEffectReceipt?.(receipt)) return;
        const granted = BF.grantInventory?.(
          service.rewardInventoryKey,
          service.rewardQuantity,
          {
            source: "npc-service-reward",
            missionId: definition.id,
            civilizationId: service.civilizationId
          }
        );
        if (!granted) return;
        const relation = this.getRelation(service.civilizationId);
        this.setRelation(service.civilizationId, relation.rank, {
          completedMissions: relation.completedMissions + 1
        });
        this.manager.memory?.recordEffectReceipt?.(receipt, {
          missionId: definition.id,
          civilizationId: service.civilizationId,
          inventoryKey: service.rewardInventoryKey,
          quantity: service.rewardQuantity
        });
        changed = true;
      });
      if (changed) this.manager?.memory?.save?.();
      return changed;
    }

    schedule() {
      return this.reconcileServiceRewards();
    }

    evaluate() {
      return this.reconcileServiceRewards();
    }

    dispose() {
      if (this.disposed) return;
      this.disposed = true;
      this.unsubscribeObjectEvents?.();
      this.unsubscribeObjectEvents = null;
      global.removeEventListener?.("bluefox:mission-state", this.onMissionState);
      global.removeEventListener?.("bluefox:progression-changed", this.onProgressionChanged);
      this.closeTradePanel();
    }
  }

  Missions.MissionCatalogController = MissionCatalogController;
  BF.CivilizationRelationConfig = Object.freeze({
    version: VERSION,
    honoredAcceptedThreshold: HONORED_ACCEPTED_THRESHOLD,
    civilizations: Object.freeze(Object.keys(CIVILIZATIONS)),
    serviceMissionIds: SERVICE_IDS
  });
  BF.getCivilizationRelation = (civilizationId) =>
    BF.currentEngine?.missionManager?.catalogController?.getRelation?.(civilizationId) || null;
  BF.setCivilizationRelation = (civilizationId, rank, detail = {}) =>
    BF.currentEngine?.missionManager?.catalogController?.setRelation?.(
      civilizationId,
      rank,
      detail
    ) || false;
  BF.CivilizationTrade = Object.freeze({
    version: VERSION,
    cities: CIVILIZATION_CITIES,
    blueprints: BLUEPRINTS,
    open: (civilizationId) =>
      BF.currentEngine?.missionManager?.catalogController?.openTrade?.(
        { detail: { civilizationId, npcRole: "merchant", interactionSource: "manual" } },
        civilizationId
      ) || false,
    trade: (civilizationId, offerKey, offerQuantity, receiveKey, receiveQuantity) =>
      BF.currentEngine?.missionManager?.catalogController?.tradeResource?.(
        civilizationId, offerKey, offerQuantity, receiveKey, receiveQuantity
      ) || { ok: false, reason: "controller" },
    purchaseBlueprint: (civilizationId) =>
      BF.currentEngine?.missionManager?.catalogController?.purchaseBlueprint?.(civilizationId) ||
      { ok: false, reason: "controller" },
    orchidBalance: () =>
      BF.currentEngine?.missionManager?.catalogController?.orchidBalance?.() || 0
  });

  BF.getMissionCatalogState = () => Object.freeze({
    version: VERSION,
    definitionCount: Object.keys(Missions.definitions || {}).length,
    definitions: Object.keys(Missions.definitions || {}),
    npcServiceDefinitions: SERVICE_DEFINITIONS.map((definition) => definition.id)
  });
})(window);
