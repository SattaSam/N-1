(function (global) {
  "use strict";

  const BF = global.BlueFox3D = global.BlueFox3D || {};

  BF.damp = (current, target, lambda, dt) =>
    current + (target - current) * (1 - Math.exp(-lambda * dt));

  BF.dampAngle = (current, target, lambda, dt) => {
    const delta = Math.atan2(Math.sin(target - current), Math.cos(target - current));
    return current + delta * (1 - Math.exp(-lambda * dt));
  };

  BF.clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  BF.disposeObject = (object) => {
    object.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (!child.material) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value && value.isTexture) value.dispose();
        });
        material.dispose();
      });
    });
    object.removeFromParent();
  };

  BF.makeLabel = (THREE, text) => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 96;
    const context = canvas.getContext("2d");
    context.fillStyle = "rgba(2, 12, 28, .86)";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#64e6ff";
    context.lineWidth = 3;
    context.strokeRect(3, 3, canvas.width - 6, canvas.height - 6);
    context.fillStyle = "#eaf8ff";
    context.font = "600 27px Arial";
    context.textAlign = "center";
    context.fillText(text, canvas.width / 2, 60);
    const texture = new THREE.CanvasTexture(canvas);
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    }));
    sprite.scale.set(7.5, 1.4, 1);
    return sprite;
  };
})(window);
