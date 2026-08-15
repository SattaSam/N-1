(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const original = BF.ObjectLibrary;
  const TYPE = "lunar_vine";

  if (!original?.data || !original?.create) {
    BF.CUOCatalogConsistency = Object.freeze({
      version: "cuo-catalog-r4",
      source: "engine/ObjectLibrary",
      lunarVineDecorative: false,
      error: "ObjectLibrary unavailable"
    });
    return;
  }

  const base = original.get?.(TYPE) || original.data?.[TYPE] || null;
  if (!base) {
    BF.CUOCatalogConsistency = Object.freeze({
      version: "cuo-catalog-r4",
      source: "engine/ObjectLibrary",
      lunarVineDecorative: false,
      error: "lunar_vine absent"
    });
    return;
  }

  const interaction = Object.freeze({
    ...(base.interaction || {}),
    actions: Object.freeze(["observe"]),
    defaultAction: "observe",
    acquisitionAction: null,
    afterInspectionAction: null,
    collectable: false,
    inspectable: false
  });

  const definition = Object.freeze({
    ...base,
    category: "decors_nature",
    actions: Object.freeze(["observe"]),
    defaultAction: "observe",
    acquisitionAction: null,
    afterInspectionAction: null,
    collectable: false,
    inspectable: false,
    traversable: true,
    respawn: null,
    inventoryKey: null,
    exploitability: "decorative",
    harvest: 0,
    interaction,
    resource: null,
    tags: Object.freeze([
      ...new Set([
        ...(base.tags || []),
        "decor",
        "plant",
        "glowing",
        "vine"
      ].filter((tag) => tag !== "resource"))
    ]),
    production: Object.freeze({
      ...(base.production || {}),
      decision: "validated",
      gameplayRole: "decorative-observable"
    })
  });

  const data = Object.freeze({ ...original.data, [TYPE]: definition });
  const byId = Object.freeze(Object.values(data).reduce((index, item) => {
    if (item?.id) index[item.id] = item;
    return index;
  }, {}));

  const attach = (instance) => {
    if (!instance) return instance;
    instance.definition = definition;
    instance.catalogId = definition.id || instance.catalogId;

    const apply = (node) => {
      if (!node?.userData) return;
      Object.assign(node.userData, {
        libraryType: TYPE,
        objectType: TYPE,
        catalogId: definition.id,
        category: definition.category,
        functional: definition,
        interaction,
        resource: null
      });
      delete node.userData.inventoryKey;
      delete node.userData.collectable;
    };

    apply(instance.root);
    apply(instance.hitbox);
    instance.root?.traverse?.((child) => {
      if (child?.userData?.interactable) apply(child);
    });
    return instance;
  };

  BF.ObjectLibrary = Object.freeze({
    ...original,
    data,
    get: (type) => data[type] || null,
    getById: (id) => byId[id] || null,
    list(filters = {}) {
      return Object.values(data).filter((item) => {
        if (filters.category && item.category !== filters.category) return false;
        if (filters.size && item.size !== filters.size) return false;
        if (filters.rarity && item.rarity !== filters.rarity) return false;
        if (filters.status && item.status !== filters.status) return false;
        if (
          filters.biome &&
          !item.biomes?.includes?.("all") &&
          !item.biomes?.includes?.(filters.biome)
        ) return false;
        return true;
      });
    },
    create(THREE, type, palette, variant = 0) {
      const instance = original.create(THREE, type, palette, variant);
      return type === TYPE ? attach(instance) : instance;
    }
  });

  BF.CUOCatalogConsistency = Object.freeze({
    version: "cuo-catalog-r4",
    source: "engine/ObjectLibrary",
    floraPatchExpected: true,
    lunarVineDecorative: true,
    validatedTypes: Object.freeze(["lantern_mushrooms", "fern", "lunar_vine"])
  });
})(window);
