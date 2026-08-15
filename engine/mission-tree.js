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
      return {
        id: this.id,
        title: this.title,
        description: this.description,
        type: this.type,
        target: this.target,
        progress: this.progress,
        status: this.status,
        params: { ...this.params },
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
      return this.root.find(id);
    }

    refresh() {
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
      return new MissionTree(data);
    }
  }

  Missions.MissionNode = MissionNode;
  Missions.MissionTree = MissionTree;
})(window);
