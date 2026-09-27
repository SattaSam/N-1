(function (global) {
  "use strict";
  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const current = BF.MicroScenes;
  if (!current || current.get?.("MSC-BIBLE-RELIC-001")) return;

  const relic = Object.freeze({
    id: "MSC-BIBLE-RELIC-001",
    biomes: Object.freeze(["magnetic","crystalline","ruins"]),
    rarity: "story",
    radius: 7,
    objects: Object.freeze([
      Object.freeze({ type: "tech_relic", offset: Object.freeze([0,0,0]), variant: 0 }),
      Object.freeze({ type: "magnetic_ore", offset: Object.freeze([-2.2,0,1.5]), variant: 1 }),
      Object.freeze({ type: "crystal", offset: Object.freeze([2.0,0,-1.4]), variant: 1 })
    ])
  });

  const data = Object.freeze({ ...current.data, bible_relic: relic });
  BF.MicroScenes = Object.freeze({
    ...current,
    data,
    get(id) {
      return data[id] || Object.values(data).find((scene) => scene.id === id) || null;
    },
    list(biome) {
      return Object.values(data).filter((scene) =>
        !biome || scene.biomes.includes("all") || scene.biomes.includes(biome)
      );
    },
    plan(id, origin = {x:0,y:0,z:0}, rotation = 0) {
      const template = this.get(id);
      if (!template) throw new Error(`Micro-scène inconnue : ${id}`);
      const cos = Math.cos(rotation), sin = Math.sin(rotation);
      return template.objects.map((entry) => {
        const [x,y,z] = entry.offset;
        const [rotationX=0, rotationY=0, rotationZ=0] = entry.rotation || [];
        return Object.freeze({
          type: entry.type,
          variant: entry.variant || 0,
          position: Object.freeze({
            x: origin.x + x*cos - z*sin,
            y: origin.y + y,
            z: origin.z + x*sin + z*cos
          }),
          rotation: rotationY + rotation,
          rotationX,
          rotationY: rotationY + rotation,
          rotationZ
        });
      });
    }
  });
})(window);
