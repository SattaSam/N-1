(function (global) {
  "use strict";

  const BF = global.BlueFox3D;

  const segmentDistanceSquared = (ax, az, bx, bz, px, pz) => {
    const abx = bx - ax;
    const abz = bz - az;
    const lengthSquared = abx * abx + abz * abz;
    const t = lengthSquared > 0
      ? BF.clamp(((px - ax) * abx + (pz - az) * abz) / lengthSquared, 0, 1)
      : 0;
    const dx = px - (ax + abx * t);
    const dz = pz - (az + abz * t);
    return dx * dx + dz * dz;
  };

  class PathPlanner {
    constructor(THREE, options = {}) {
      this.THREE = THREE;
      this.step = options.step || 1.25;
      this.bounds = options.bounds || 27;
    }

    lineIsClear(from, to, colliders, characterRadius, padding = 0.12) {
      return !colliders.some((collider) => {
        const clearance = characterRadius + collider.radius + padding;
        return segmentDistanceSquared(
          from.x,
          from.z,
          to.x,
          to.z,
          collider.position.x,
          collider.position.z
        ) < clearance * clearance;
      });
    }

    nearestClearGoal(goal, colliders, characterRadius, padding) {
      const adjusted = goal.clone();
      for (let pass = 0; pass < 10; pass += 1) {
        let correctionX = 0;
        let correctionZ = 0;
        let overlaps = 0;
        colliders.forEach((collider) => {
          const clearance = characterRadius + collider.radius + padding;
          const dx = adjusted.x - collider.position.x;
          const dz = adjusted.z - collider.position.z;
          const distance = Math.hypot(dx, dz);
          if (distance >= clearance) return;
          const fallbackAngle = ((collider.owner?.id || pass + 1) * 2.399963) %
            (Math.PI * 2);
          const nx = distance > 0.001 ? dx / distance : Math.cos(fallbackAngle);
          const nz = distance > 0.001 ? dz / distance : Math.sin(fallbackAngle);
          const penetration = clearance - distance + 0.08;
          correctionX += nx * penetration;
          correctionZ += nz * penetration;
          overlaps += 1;
        });
        if (!overlaps) break;
        adjusted.x = BF.clamp(
          adjusted.x + correctionX / overlaps,
          -this.bounds,
          this.bounds
        );
        adjusted.z = BF.clamp(
          adjusted.z + correctionZ / overlaps,
          -this.bounds,
          this.bounds
        );
      }
      return adjusted;
    }

    plan(start, goal, colliders, characterRadius, padding = 0.12) {
      let finalGoal = goal.clone();
      finalGoal.x = BF.clamp(finalGoal.x, -this.bounds, this.bounds);
      finalGoal.y = 0;
      finalGoal.z = BF.clamp(finalGoal.z, -this.bounds, this.bounds);
      finalGoal = this.nearestClearGoal(
        finalGoal,
        colliders,
        characterRadius,
        padding
      );
      if (this.lineIsClear(start, finalGoal, colliders, characterRadius, padding)) {
        return [finalGoal];
      }

      const size = Math.floor((this.bounds * 2) / this.step) + 1;
      const toCell = (point) => ({
        x: BF.clamp(Math.round((point.x + this.bounds) / this.step), 0, size - 1),
        z: BF.clamp(Math.round((point.z + this.bounds) / this.step), 0, size - 1)
      });
      const toWorld = (cell) => new this.THREE.Vector3(
        -this.bounds + cell.x * this.step,
        0,
        -this.bounds + cell.z * this.step
      );
      const key = (cell) => `${cell.x}:${cell.z}`;
      const startCell = toCell(start);
      const goalCell = toCell(finalGoal);
      const startKey = key(startCell);
      const goalKey = key(goalCell);
      const blocked = (cell) => {
        const cellKey = key(cell);
        if (cellKey === startKey || cellKey === goalKey) return false;
        const point = toWorld(cell);
        return colliders.some((collider) => {
          const clearance = characterRadius + collider.radius + padding;
          return point.distanceToSquared(collider.position) < clearance * clearance;
        });
      };
      const heuristic = (cell) => Math.hypot(
        cell.x - goalCell.x,
        cell.z - goalCell.z
      );
      const directions = [
        [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
        [1, 1, Math.SQRT2], [1, -1, Math.SQRT2],
        [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]
      ];
      const open = [{ cell: startCell, score: heuristic(startCell) }];
      const costs = new Map([[startKey, 0]]);
      const parents = new Map();
      const closed = new Set();

      while (open.length) {
        open.sort((a, b) => a.score - b.score);
        const current = open.shift().cell;
        const currentKey = key(current);
        if (closed.has(currentKey)) continue;
        if (currentKey === goalKey) {
          const cells = [current];
          let cursor = currentKey;
          while (parents.has(cursor)) {
            const parent = parents.get(cursor);
            cells.push(parent);
            cursor = key(parent);
          }
          cells.reverse();
          const raw = cells.slice(1).map(toWorld);
          raw.push(finalGoal);
          return this.smooth(start, raw, colliders, characterRadius, padding);
        }
        closed.add(currentKey);
        const currentCost = costs.get(currentKey);
        for (const [dx, dz, moveCost] of directions) {
          const next = { x: current.x + dx, z: current.z + dz };
          if (next.x < 0 || next.z < 0 || next.x >= size || next.z >= size) continue;
          const nextKey = key(next);
          if (closed.has(nextKey) || blocked(next)) continue;
          if (
            dx !== 0 &&
            dz !== 0 &&
            (
              blocked({ x: current.x + dx, z: current.z }) ||
              blocked({ x: current.x, z: current.z + dz })
            )
          ) {
            continue;
          }
          const candidateCost = currentCost + moveCost;
          if (candidateCost >= (costs.get(nextKey) ?? Infinity)) continue;
          costs.set(nextKey, candidateCost);
          parents.set(nextKey, current);
          open.push({ cell: next, score: candidateCost + heuristic(next) });
        }
      }
      return [finalGoal];
    }

    smooth(start, points, colliders, characterRadius, padding) {
      const smoothed = [];
      let anchor = start;
      let index = 0;
      while (index < points.length) {
        let furthest = index;
        for (let candidate = points.length - 1; candidate > index; candidate -= 1) {
          if (this.lineIsClear(
            anchor,
            points[candidate],
            colliders,
            characterRadius,
            padding
          )) {
            furthest = candidate;
            break;
          }
        }
        smoothed.push(points[furthest]);
        anchor = points[furthest];
        index = furthest + 1;
      }
      return smoothed;
    }
  }

  BF.PathPlanner = PathPlanner;
})(window);
