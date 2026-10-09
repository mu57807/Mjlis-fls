import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";
import { brand } from "@brand";

let started = false;

/** Load the brand fonts once. Rendering waits until they are ready. */
export function ensureFonts() {
  if (started || typeof document === "undefined") return;
  started = true;
  const files = brand.fontFiles;
  const load = (family: string, url: string, weight: string) =>
    loadFont({ family, url: staticFile(url.replace(/^\//, "")), weight }).catch((e) =>
      console.warn(`Could not load font ${url}`, e),
    );
  void load(brand.fonts.latin, files.latin.regular, "400");
  void load(brand.fonts.latin, files.latin.bold, "700");
  void load(brand.fonts.arabic, files.arabic.regular, "400");
  void load(brand.fonts.arabic, files.arabic.bold, "700");
}
