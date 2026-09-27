import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(scriptDirectory);
const imagesDirectory = path.join(projectRoot, "Images");
const catalogPath = path.join(imagesDirectory, "images-catalog.js");
const acceptedExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

const entries = fs.readdirSync(imagesDirectory, { withFileTypes: true })
  .filter((entry) =>
    entry.isFile() &&
    acceptedExtensions.has(path.extname(entry.name).toLocaleLowerCase("fr")) &&
    fs.statSync(path.join(imagesDirectory, entry.name)).size > 0
  )
  .filter((entry, _, all) =>
    path.extname(entry.name).toLocaleLowerCase("fr") === ".webp" ||
    !all.some((other) =>
      path.parse(other.name).name.toLocaleLowerCase("fr") ===
        path.parse(entry.name).name.toLocaleLowerCase("fr") &&
      path.extname(other.name).toLocaleLowerCase("fr") === ".webp"
    )
  )
  .map((entry) => ({
    name: entry.name,
    url: `./Images/${entry.name}`
  }))
  .sort((left, right) => left.name.localeCompare(right.name, "fr"));

const content =
  `window.BLUEFOX_MAP_ASSETS?.register(${JSON.stringify(entries)});\n`;
fs.writeFileSync(catalogPath, content, "utf8");
console.log(`Catalogue BlueFox généré : ${entries.length} image(s).`);
