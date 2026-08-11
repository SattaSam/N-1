(function (global) {
  "use strict";

  const assets = global.BLUEFOX_MAP_ASSETS;
  if (!assets || assets.__mapTestAssetPathFixV20_2) return;

  const originalCandidates =
    typeof assets.imageUrlCandidates === "function"
      ? assets.imageUrlCandidates.bind(assets)
      : (source) => [source];

  const mapTestCandidates = (source) => {
    const value = String(source || "");
    const candidates = [];

    const push = (candidate) => {
      if (candidate && !candidates.includes(candidate)) {
        candidates.push(candidate);
      }
    };

    originalCandidates(value).forEach(push);

    /*
     * Les définitions du moteur sont écrites depuis la racine :
     *   ./Images/028_1.png
     *   Images/028_1.png
     *
     * MAP_Test vit dans /map-test/, donc il faut également tester :
     *   ../Images/028_1.png
     */
    const variants = [...candidates];

    variants.forEach((candidate) => {
      if (candidate.startsWith("./Images/")) {
        push(`../${candidate.slice(2)}`);
      } else if (candidate.startsWith("Images/")) {
        push(`../${candidate}`);
      } else if (candidate.startsWith("./assets/")) {
        push(`../${candidate.slice(2)}`);
      } else if (candidate.startsWith("assets/")) {
        push(`../${candidate}`);
      }
    });

    return candidates;
  };

  assets.imageUrlCandidates = mapTestCandidates;
  assets.__mapTestAssetPathFixV20_2 = true;
})(window);
