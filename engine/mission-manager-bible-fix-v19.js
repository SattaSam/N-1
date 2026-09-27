(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};
  const Missions = BF.Missions = BF.Missions || {};
  const Manager = Missions.MissionManager;
  if (!Manager || Manager.__bibleCleanStateV19_3) return;

  // Compatibilité de chargement : la réparation est désormais portée par le
  // propriétaire canonique MissionManager, sans réassigner son prototype.
  Manager.__bibleCleanStateV19_3 = true;
  Manager.__bibleCleanStateOwner = "mission-manager";
})(window);
