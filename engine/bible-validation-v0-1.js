(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const contract = BF.BibleContractV01;

  if (!contract) {
    console.error("[BlueFox] Bible Validation V0.1 : contrat indisponible.");
    return;
  }

  const strictReport = () =>
    contract.validateCatalog(
      BF.BibleCatalog,
      BF.BiblePatterns,
      { compatibility: "strict" }
    );

  const compatibilityReport = () =>
    contract.validateCatalog(
      BF.BibleCatalog,
      BF.BiblePatterns,
      { compatibility: "legacy-v0" }
    );

  const publish = () => {
    const strict = strictReport();
    const compatibility = compatibilityReport();

    BF.BibleValidationV01 = Object.freeze({
      version: "0.1",
      strict,
      compatibility,
      validateMission: (mission, options = {}) =>
        contract.validateMission(
          mission,
          BF.BiblePatterns,
          options
        ),
      validateCatalog: (options = {}) =>
        contract.validateCatalog(
          BF.BibleCatalog,
          BF.BiblePatterns,
          options
        ),
      schema: contract
    });

    global.dispatchEvent(new CustomEvent("bluefox:bible-validation-v0-1", {
      detail: {
        strict,
        compatibility
      }
    }));

    const method = compatibility.ok ? "info" : "error";
    console[method](
      "[BlueFox] Bible Validation V0.1 — compatibilité catalogue actuel",
      compatibility
    );

    if (!strict.ok || strict.warnings.length) {
      console.info(
        "[BlueFox] Bible Validation V0.1 — écarts à migrer vers le contrat strict",
        strict
      );
    }

    return { strict, compatibility };
  };

  const reports = publish();

  // Garde-fou : on ne remplace pas encore le validate() historique du runtime
  // pendant cette première phase. Les trois missions V0 restent jouables.
  // Après migration des fiches, le runtime basculera sur strictReport().
  if (BF.bibleRuntime) {
    BF.bibleRuntime.contractV01Report = reports;
  }

  BF.getBibleV01Validation = () => publish();
  BF.validateBibleMissionV01 = (mission, options = {}) =>
    contract.validateMission(
      mission,
      BF.BiblePatterns,
      options
    );

  console.info(
    "[BlueFox] Batch de validation Bible Runtime V0.1 actif. " +
    "Aucune logique mission existante n'a été remplacée."
  );
})(window);
