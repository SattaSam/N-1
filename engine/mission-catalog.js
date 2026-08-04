(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};

  /*
   * Catalogue volontairement vide.
   *
   * Le moteur de missions reste chargé, mais aucune mission historique
   * (Camp, Refuge, Base, Fondation, Énergie, Flore, Contact, exploration,
   * collecte, recherche, ingénierie, voyage ou survie) n'est enregistrée.
   *
   * Les futures missions CUM devront être enregistrées avec :
   *   BlueFox3D.registerMissionDefinition(definition)
   * ou :
   *   BlueFox3D.registerMissionDefinitions(definitions)
   */

  class EmptyMissionCatalogController {
    constructor(manager) {
      this.manager = manager;
    }

    schedule() {
      return false;
    }

    evaluate() {
      return false;
    }

    dispose() {}
  }

  Missions.MissionCatalogController = EmptyMissionCatalogController;
  BF.getMissionCatalogState = () => Object.freeze({
    version: "empty-catalog-v1",
    definitionCount: Object.keys(Missions.definitions || {}).length,
    definitions: Object.keys(Missions.definitions || {})
  });
})(window);
