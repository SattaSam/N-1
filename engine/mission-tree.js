(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  class MissionNode {
    constructor(definition, parent = null) {
      if (!definition?.id) {
        throw new Error("Chaque nœud de mission doit posséder un identifiant.");
      }
      this.id = definition.id;
      this.title = definition.title || definition.id;
      this.description = definition.description || "";
      this.type = definition.type || "objective";
      this.target = Math.max(1, Number(definition.target) || 1);
      this.progress = Math.max(0, Number(definition.progress) || 0);
      this.status = definition.status || Missions.MissionStatus.LOCKED;
      this.params = { ...(definition.params || {}) };
      this.distinctValues = Array.isArray(definition.distinctValues)
        ? [...new Set(definition.distinctValues.map((value) => String(value)))]
        : [];
      this.historyValues = Array.isArray(definition.historyValues)
        ? definition.historyValues.map((value) => String(value))
        : [];
      this.requires = [...(definition.requires || [])];
      this.optional = Boolean(definition.optional);
      this.parent = parent;
      this.children = (definition.children || []).map(
        (child) => new MissionNode(child, this)
      );
      this.createdAt = Number(definition.createdAt) || Date.now();
      this.startedAt = Number(definition.startedAt) || 0;
      this.completedAt = Number(definition.completedAt) || 0;
    }

    get isLeaf() {
      return this.children.length === 0;
    }

    get isComplete() {
      return this.status === Missions.MissionStatus.COMPLETED;
    }

    useRuntimeDefinition(definition) {
      // Le contrat d'exécution vient de la définition compilée, pas de la
      // copie historique dans la sauvegarde. Ne reconstruire aucun nœud et
      // ne toucher ni aux preuves, ni à la progression, ni aux étapes finies.
      if (!this.isLeaf || this.isComplete || !definition ||
          definition.id !== this.id || (definition.children || []).length ||
          this.params.biblePattern !== "SEQUENCE_ACTIONS" ||
          definition.params?.biblePattern !== "SEQUENCE_ACTIONS" ||
          this.params.sequenceSlot !== definition.params.sequenceSlot ||
          this.target !== Math.max(1, Number(definition.target) || 1) ||
          this.optional !== Boolean(definition.optional) ||
          JSON.stringify(this.requires) !== JSON.stringify(definition.requires || [])) return;

      const params = JSON.parse(JSON.stringify(definition.params || {}));
      // Ces champs sont écrits par MissionManager après résolution du travel.
      // Ils ne sont pas des critères du catalogue et doivent survivre au reload.
      if (!params.toMapId && (this.params.targetMapResolvedFromKnownDestination === true ||
          this.params.targetMapResolvedFromFact === true)) {
        params.toMapId = this.params.toMapId;
        for (const key of ["targetMapResolvedFromKnownDestination", "targetMapResolvedFromFact"]) {
          if (this.params[key] === true) params[key] = true;
        }
      }
      const type = definition.type || this.type;
      const title = definition.title || this.title;
      const description = definition.description || "";
      if (this.type === type && this.title === title && this.description === description &&
          JSON.stringify(this.params) === JSON.stringify(params)) return;
      if (!this._savedContract) {
        this._savedContract = {
          type: this.type, title: this.title, description: this.description,
          params: { ...this.params }
        };
      }
      this.type = type;
      this.title = title;
      this.description = description;
      this.params = params;
    }

    walk(visitor) {
      visitor(this);
      this.children.forEach((child) => child.walk(visitor));
    }

    find(id) {
      if (this.id === id) return this;
      for (const child of this.children) {
        const found = child.find(id);
        if (found) return found;
      }
      return null;
    }

    prerequisitesMet(root) {
      const ownRequirementsMet = this.requires.every(
        (id) => root.find(id)?.isComplete
      );
      return ownRequirementsMet && (
        !this.parent || this.parent.prerequisitesMet(root)
      );
    }

    refresh(root = this) {
      this.children.forEach((child) => child.refresh(root));
      if (this.isLeaf) {
        if (this.progress >= this.target) {
          this.progress = this.target;
          this.status = Missions.MissionStatus.COMPLETED;
          if (!this.completedAt) this.completedAt = Date.now();
        } else if (this.prerequisitesMet(root)) {
          if (
            this.status === Missions.MissionStatus.LOCKED ||
            this.status === Missions.MissionStatus.PAUSED
          ) {
            this.status = Missions.MissionStatus.AVAILABLE;
          }
        } else if (this.status !== Missions.MissionStatus.COMPLETED) {
          this.status = Missions.MissionStatus.LOCKED;
        }
        return this.status;
      }

      const requiredChildren = this.children.filter((child) => !child.optional);
      if (
        requiredChildren.length &&
        requiredChildren.every((child) => child.isComplete)
      ) {
        this.progress = this.target;
        this.status = Missions.MissionStatus.COMPLETED;
        if (!this.completedAt) this.completedAt = Date.now();
      } else if (this.children.some((child) =>
        child.status === Missions.MissionStatus.ACTIVE
      )) {
        this.status = Missions.MissionStatus.ACTIVE;
      } else if (this.prerequisitesMet(root)) {
        this.status = Missions.MissionStatus.AVAILABLE;
      }
      return this.status;
    }

    increment(amount = 1) {
      if (!this.isLeaf || this.isComplete) return false;
      this.progress = Math.min(this.target, this.progress + Math.max(0, amount));
      if (!this.startedAt) this.startedAt = Date.now();
      this.status = this.progress >= this.target
        ? Missions.MissionStatus.COMPLETED
        : Missions.MissionStatus.ACTIVE;
      if (this.isComplete && !this.completedAt) this.completedAt = Date.now();
      return true;
    }

    incrementDistinct(value, amount = 1) {
      if (!this.isLeaf || this.isComplete) return false;
      const identity = String(value ?? "").trim();
      if (!identity || this.distinctValues.includes(identity)) return false;
      this.distinctValues.push(identity);
      return this.increment(amount);
    }

    hasDistinctValue(value) {
      const identity = String(value ?? "").trim();
      return Boolean(identity) && this.distinctValues.includes(identity);
    }

    pushHistoryValue(value, maximum = 32) {
      const item = String(value ?? "").trim();
      if (!item) return false;
      this.historyValues.push(item);
      const limit = Math.max(2, Number(maximum) || 32);
      if (this.historyValues.length > limit) {
        this.historyValues = this.historyValues.slice(-limit);
      }
      return true;
    }

    availableLeaves(root = this) {
      const leaves = [];
      this.walk((node) => {
        if (
          node.isLeaf &&
          !node.isComplete &&
          node.prerequisitesMet(root) &&
          node.status !== Missions.MissionStatus.FAILED &&
          node.status !== Missions.MissionStatus.PAUSED
        ) {
          leaves.push(node);
        }
      });
      return leaves;
    }

    toJSON() {
      // L'application du contrat courant est exclusivement runtime : aucune
      // migration de la sauvegarde. Seules les résolutions de destination
      // produites en jeu sont persistées, comme pour un arbre non restauré.
      const params = { ...(this._savedContract?.params || this.params) };
      if (this._savedContract && (this.params.targetMapResolvedFromKnownDestination === true ||
          this.params.targetMapResolvedFromFact === true)) {
        for (const key of ["toMapId", "targetMapResolvedFromKnownDestination", "targetMapResolvedFromFact"]) {
          if (this.params[key] != null) params[key] = this.params[key];
        }
      }
      return {
        id: this.id,
        title: this._savedContract?.title ?? this.title,
        description: this._savedContract?.description ?? this.description,
        type: this._savedContract?.type || this.type,
        target: this.target,
        progress: this.progress,
        status: this.status,
        params,
        distinctValues: [...this.distinctValues],
        historyValues: [...this.historyValues],
        requires: [...this.requires],
        optional: this.optional,
        createdAt: this.createdAt,
        startedAt: this.startedAt,
        completedAt: this.completedAt,
        children: this.children.map((child) => child.toJSON())
      };
    }

    static fromJSON(data) {
      return new MissionNode(data);
    }
  }

  class MissionTree {
    constructor(definition) {
      this.id = definition.id;
      this.title = definition.title || definition.id;
      this.description = definition.description || "";
      this.priority = Number(definition.priority) || 0;
      this.root = new MissionNode(definition.root);
      this.root.refresh();
    }

    find(id) {
      this.useCurrentDefinition();
      return this.root.find(id);
    }

    useCurrentDefinition() {
      if (!this._restoredFromSave) return;
      const baseId = String(this.id).split("@")[0];
      const source = Missions.definitions?.[this.id] || Missions.definitions?.[baseId];
      // Les définitions peuvent arriver après la restauration. Une fois
      // enregistrées, ne refaire le raccord que si leur référence change.
      if (!source || source === this._definitionSource) return;
      const definition = Missions.getDefinition?.(this.id) || source;
      if (definition?.id !== this.id || !definition.root) return;
      this._definitionSource = source;
      const nodes = new Map();
      const collect = (node) => {
        nodes.set(node.id, node);
        (node.children || []).forEach(collect);
      };
      collect(definition.root);
      this.root.walk((node) => node.useRuntimeDefinition(nodes.get(node.id)));
    }

    findSequenceSlot(slot) {
      this.useCurrentDefinition();
      const key = String(slot || "").trim();
      if (!key) return null;
      const matches = [];
      this.root.walk((node) => {
        if (String(node.params?.sequenceSlot || "") === key) matches.push(node);
      });
      if (matches.length) return matches.length === 1 ? matches[0] : null;
      // Les patrons hors SEQUENCE_ACTIONS conservent leur identifiant canonique.
      return this.find(`${this.id}:${key}`);
    }

    refresh() {
      this.useCurrentDefinition();
      return this.root.refresh(this.root);
    }

    availableLeaves() {
      this.refresh();
      return this.root.availableLeaves(this.root);
    }

    toJSON() {
      return {
        id: this.id,
        title: this.title,
        description: this.description,
        priority: this.priority,
        root: this.root.toJSON()
      };
    }

    static fromJSON(data) {
      const tree = new MissionTree(data);
      tree._restoredFromSave = true;
      tree.useCurrentDefinition();
      return tree;
    }
  }

  Missions.MissionNode = MissionNode;
  Missions.MissionTree = MissionTree;
})(window);
