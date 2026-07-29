(function (global) {
  "use strict";

  const imageExtension = "(png|jpe?g|webp)";
  const scenePattern = new RegExp(`^([1-9]\\d*)([^_\\d][^/]*)\\.${imageExtension}$`, "i");
  const terrainPattern = new RegExp(`^0([1-9]\\d?)[_-](\\d+)\\.${imageExtension}$`, "i");

  const filenameOf = (entry) => {
    const source = typeof entry === "string"
      ? entry
      : entry?.name || entry?.path || entry?.url || "";
    return decodeURIComponent(String(source).split(/[\\/]/).pop().split("?")[0]);
  };

  const urlOf = (entry) =>
    typeof entry === "string"
      ? entry
      : entry?.url || entry?.path || entry?.name || "";

  const imageUrlCandidates = (source) => {
    const value = String(source || "");
    let raw = value;
    try {
      raw = decodeURIComponent(value);
    } catch {
      raw = value;
    }
    const slash = raw.lastIndexOf("/");
    const directory = slash >= 0 ? raw.slice(0, slash + 1) : "";
    const filename = slash >= 0 ? raw.slice(slash + 1) : raw;
    const encoded = `${directory}${encodeURIComponent(filename)}`;
    return [...new Set([value, raw, encoded].filter(Boolean))];
  };

  const readableName = (value) =>
    value
      .replace(/\.[^.]+$/, "")
      .replace(/[-_]+/g, " ")
      .replace(/([a-zà-ÿ])([A-Z])/g, "$1 $2")
      .trim();

  const parseScene = (entry) => {
    const filename = filenameOf(entry);
    const match = filename.match(scenePattern);
    if (!match) return null;
    const number = Number(match[1]);
    const rawName = readableName(match[2]);
    const variantMatch = rawName.match(/^Bis\s*(.*)$/i);
    return {
      kind: "scene",
      number,
      prefix: String(number).padStart(2, "0"),
      name: variantMatch?.[1] || rawName,
      variant: variantMatch ? "bis" : "",
      filename,
      url: urlOf(entry)
    };
  };

  const parseTerrain = (entry) => {
    const filename = filenameOf(entry);
    const match = filename.match(terrainPattern);
    if (!match) return null;
    return {
      kind: "terrain",
      number: Number(match[1]),
      prefix: String(Number(match[1])).padStart(2, "0"),
      frame: Number(match[2]),
      filename,
      url: urlOf(entry),
      separator: filename.includes("_") ? "_" : "-"
    };
  };

  const buildCatalog = (entries = []) => {
    const scenes = [];
    const terrains = [];
    entries.forEach((entry) => {
      const scene = parseScene(entry);
      if (scene) {
        scenes.push(scene);
        return;
      }
      const terrain = parseTerrain(entry);
      if (terrain) terrains.push(terrain);
    });

    scenes.sort((left, right) =>
      left.number - right.number ||
      left.filename.localeCompare(right.filename, "fr")
    );
    terrains.sort((left, right) =>
      left.number - right.number ||
      left.frame - right.frame ||
      (left.separator === "_" ? 0 : 1) -
        (right.separator === "_" ? 0 : 1) ||
      left.filename.localeCompare(right.filename, "fr")
    );

    const sceneGroups = new Map();
    scenes.forEach((scene) => {
      if (!sceneGroups.has(scene.number)) sceneGroups.set(scene.number, []);
      sceneGroups.get(scene.number).push(scene);
    });
    const maps = [...sceneGroups.entries()].map(([number, sceneVariants]) => {
      const scene = sceneVariants.find((item) => !item.variant) || sceneVariants[0];
      const uniqueTerrains = new Map();
      terrains
        .filter((terrain) => terrain.number === number)
        .forEach((terrain) => {
          if (!uniqueTerrains.has(terrain.frame)) {
            uniqueTerrains.set(terrain.frame, terrain);
          }
        });
      return {
        id: `map-${scene.prefix}`,
        number,
        prefix: scene.prefix,
        name: scene.name,
        scene,
        sceneVariants,
        terrains: [...uniqueTerrains.values()]
      };
    });
    const sceneNumbers = new Set(scenes.map((scene) => scene.number));
    return {
      maps,
      orphanTerrains: terrains.filter(
        (terrain) => !sceneNumbers.has(terrain.number)
      )
    };
  };

  const registeredEntries = new Map();
  const api = {
    version: 2,
    filenameRules: {
      scene: scenePattern,
      terrain: terrainPattern,
      description:
        "NNomDuBiome = scène ; 0N_1, 0N-1… = plateaux préférentiels, facultatifs et en nombre libre."
    },
    parseScene,
    parseTerrain,
    imageUrlCandidates,
    buildCatalog,
    catalog: buildCatalog(),
    register(entries = []) {
      entries.forEach((entry) => {
        const filename = filenameOf(entry);
        if (filename) registeredEntries.set(filename.toLocaleLowerCase("fr"), entry);
      });
      this.catalog = buildCatalog([...registeredEntries.values()]);
      global.dispatchEvent?.(new CustomEvent("bluefox:image-catalog", {
        detail: this.catalog
      }));
      return this.catalog;
    },
    clearRegistered() {
      registeredEntries.clear();
      this.catalog = buildCatalog();
      return this.catalog;
    },
    maps: {
      crystal: {
        id: "crystal",
        number: 1,
        scene: "1PlaineCristaux",
        terrainFrames: ["01"],
        exits: {}
      }
    }
  };
  global.BLUEFOX_MAP_ASSETS = api;
})(window);
