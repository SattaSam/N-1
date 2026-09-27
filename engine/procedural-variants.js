(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  if (!BF.ObjectLibrary?.create) {
    console.error("[BlueFox P2.5] ObjectLibrary doit être chargé avant les variantes procédurales.");
    return;
  }

  const VERSION = "P2.5-r1";
  const states = new WeakMap();

  const hash = (value) => {
    const text = String(value ?? "");
    let result = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      result ^= text.charCodeAt(index);
      result = Math.imul(result, 16777619);
    }
    return result >>> 0;
  };

  const randomFrom = (seed) => {
    let value = seed >>> 0;
    return () => {
      value += 0x6D2B79F5;
      let t = value;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const shouldSkip = (definition, type) => {
    if (!definition) return true;
    if (["npc_translucent", "npc_rocky", "scout_drone", "harvest_drone"].includes(type)) return true;
    if (definition.tags?.includes?.("unique")) return true;
    if (definition.spawn?.tags?.includes?.("unique")) return true;
    return false;
  };

  const snapshotMaterial = (material) => ({
    material,
    color: material?.color?.clone?.() || null,
    roughness: Number(material?.roughness ?? 0),
    metalness: Number(material?.metalness ?? 0),
    emissiveIntensity: Number(material?.emissiveIntensity ?? 0)
  });

  const capture = (root) => {
    const materials = new Set();
    root.traverse?.((child) => {
      if (!child.isMesh || child.userData?.interactable) return;
      if (Array.isArray(child.material)) child.material.forEach((item) => materials.add(item));
      else if (child.material) materials.add(child.material);
    });
    return {
      position: root.position.clone(),
      rotation: root.rotation.clone(),
      scale: root.scale.clone(),
      materials: [...materials].map(snapshotMaterial)
    };
  };

  const restore = (root) => {
    const state = states.get(root);
    if (!state) return false;
    root.position.copy(state.snapshot.position);
    root.rotation.copy(state.snapshot.rotation);
    root.scale.copy(state.snapshot.scale);
    state.snapshot.materials.forEach(({ material, color, roughness, metalness, emissiveIntensity }) => {
      if (color && material?.color?.copy) material.color.copy(color);
      if ("roughness" in material) material.roughness = roughness;
      if ("metalness" in material) material.metalness = metalness;
      if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
    });
    return true;
  };

  const apply = (root, type, definition, variant = 0) => {
    if (!root || shouldSkip(definition, type)) return false;

    const seed = hash([
      definition.id || type,
      variant,
      root.position.x.toFixed?.(2) || 0,
      root.position.z.toFixed?.(2) || 0
    ].join(":"));
    const rnd = randomFrom(seed);
    const snapshot = capture(root);

    const sizeClass = definition.size || "M";
    const scaleRange = {
      XS: 0.08,
      S: 0.1,
      M: 0.12,
      L: 0.1,
      XL: 0.08
    }[sizeClass] || 0.1;

    const uniform = 1 + (rnd() - 0.5) * 2 * scaleRange;
    const stretchX = 1 + (rnd() - 0.5) * 0.12;
    const stretchY = 1 + (rnd() - 0.5) * 0.16;
    const stretchZ = 1 + (rnd() - 0.5) * 0.12;

    root.scale.set(
      snapshot.scale.x * uniform * stretchX,
      snapshot.scale.y * uniform * stretchY,
      snapshot.scale.z * uniform * stretchZ
    );

    root.rotation.y = snapshot.rotation.y + (rnd() - 0.5) * Math.PI * 2;
    root.rotation.x = snapshot.rotation.x + (rnd() - 0.5) * 0.08;
    root.rotation.z = snapshot.rotation.z + (rnd() - 0.5) * 0.08;

    const tags = new Set([
      ...(definition.tags || []),
      ...(definition.spawn?.tags || []),
      ...(definition.spawnProfile?.tags || []),
      ...(definition.situation?.tags || [])
    ]);

    snapshot.materials.forEach(({ material, color, roughness, metalness, emissiveIntensity }, index) => {
      if (!material) return;

      if (color && material.color?.setHSL && material.color?.getHSL) {
        const hsl = {};
        color.getHSL(hsl);
        const hueShift = (rnd() - 0.5) * (tags.has("glowing") ? 0.025 : 0.05);
        const satShift = (rnd() - 0.5) * 0.08;
        const lightShift = (rnd() - 0.5) * 0.1;
        material.color.setHSL(
          (hsl.h + hueShift + 1) % 1,
          clamp(hsl.s + satShift, 0, 1),
          clamp(hsl.l + lightShift, 0.03, 0.95)
        );
      }

      if ("roughness" in material) {
        const wear = tags.has("technology") || tags.has("metal")
          ? (rnd() - 0.5) * 0.16
          : (rnd() - 0.5) * 0.1;
        material.roughness = clamp(roughness + wear, 0.08, 1);
      }

      if ("metalness" in material && (tags.has("technology") || tags.has("metal") || definition.category === "technology")) {
        material.metalness = clamp(metalness + (rnd() - 0.5) * 0.14, 0, 1);
      }

      if ("emissiveIntensity" in material && emissiveIntensity > 0) {
        material.emissiveIntensity =
          emissiveIntensity * (0.85 + rnd() * 0.3);
      }
    });

    root.userData.proceduralVariant = Object.freeze({
      version: VERSION,
      seed,
      uniformScale: uniform,
      rotationY: root.rotation.y,
      variant
    });

    states.set(root, {
      snapshot,
      type,
      definition,
      seed,
      variant
    });
    return true;
  };

  BF.ObjectLibrary.registerCreateHook((instance, context = {}) => {
    const root = instance?.root;
    const definition = instance?.definition || context.definition ||
      BF.ObjectLibrary.get?.(context.type || root?.userData?.libraryType);
    const type = context.type || definition?.type || root?.userData?.libraryType;
    if (!root || !type) return;
    const variant = Number(context.variant ?? root.userData?.variant ?? 0);
    const attach = () => apply(root, type, definition, variant);
    if (root.parent) attach();
    else global.requestAnimationFrame?.(attach) || attach();
  });

  BF.ProceduralVariants = Object.freeze({
    version: VERSION,
    apply,
    restore,
    get(root) {
      const state = states.get(root);
      return state ? Object.freeze({
        type: state.type,
        seed: state.seed,
        variant: state.variant
      }) : null;
    }
  });

  console.info("[BlueFox P2.5] Variantes procédurales actives.");
})(window);
