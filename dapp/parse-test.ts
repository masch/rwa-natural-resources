import { kml } from "@tmcw/togeojson";
import { readFileSync } from "fs";
import { DOMParser } from "@xmldom/xmldom";

const text = readFileSync("./public/Reserva Bosques de Agua.kml", "utf-8");
const kmlDoc = new DOMParser().parseFromString(text, "text/xml");
const geojson = kml(kmlDoc);

console.log("Total features:", geojson.features.length);
console.log(
  "Feature types:",
  new Set(geojson.features.map((f) => f.geometry?.type)),
);
