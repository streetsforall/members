import cal_zip from "../data/CA_ZIP.json";

// Build ZIP to chapter mapping
const zipToChapterMap: Record<string, string> = {};
(cal_zip as any).features.forEach((item: any) => {
  if (item.properties && item.properties.ZIP_CODE) {
    zipToChapterMap[item.properties.ZIP_CODE.toString()] =
      item.properties.CHAPTER;
  }
});

/**
 * Looks up the chapter/branch for a given ZIP code
 * @param zipCode - The postal code (can be string or number)
 * @returns The chapter code ("LA", "SF", "CA") or "CA" as default
 */
export function getChapterFromZip(zipCode: string | number | undefined): 'CA' | 'LA' | 'SF' {
  if (!zipCode) return "CA";

  // Clean up zip code (remove any extra characters, keep only first 5 digits)
  const cleanZip = zipCode.toString().slice(0, 5);

  // Look up the chapter for this zip code
  const chapter = zipToChapterMap[cleanZip] as 'LA' | 'SF' | undefined | null;

  // Return chapter or default to "CA"
  return chapter || "CA";
}
