import { getChapterFromZip } from "@/server/utils";

describe("getChapterFromZip", () => {
  it("should return 'LA' for Los Angeles area ZIP codes", () => {
    // Test various LA ZIP codes
    expect(getChapterFromZip("90001")).toBe("LA"); // Downtown LA
    expect(getChapterFromZip("90210")).toBe("LA"); // Beverly Hills
    expect(getChapterFromZip("91001")).toBe("LA"); // Pasadena
    expect(getChapterFromZip("92801")).toBe("LA"); // Anaheim
  });

  it("should return 'SF' for San Francisco Bay Area ZIP codes", () => {
    // Test various SF ZIP codes
    expect(getChapterFromZip("94102")).toBe("SF"); // San Francisco
    expect(getChapterFromZip("94301")).toBe("SF"); // Palo Alto
    expect(getChapterFromZip("94501")).toBe("SF"); // Alameda
    expect(getChapterFromZip("94701")).toBe("SF"); // Berkeley
  });

  it("should return 'CA' for other California ZIP codes", () => {
    // Test various other CA ZIP codes
    expect(getChapterFromZip("95101")).toBe("CA"); // San Jose
    expect(getChapterFromZip("93101")).toBe("CA"); // Santa Barbara
    expect(getChapterFromZip("96001")).toBe("CA"); // Redding
  });

  it("should return 'CA' for undefined or null ZIP codes", () => {
    expect(getChapterFromZip(undefined)).toBe("CA");
    expect(getChapterFromZip("")).toBe("CA");
  });

  it("should handle ZIP codes with extra characters", () => {
    // Should extract first 5 digits
    expect(getChapterFromZip("90210-1234")).toBe("LA");
    expect(getChapterFromZip("94102-5678")).toBe("SF");
  });

  it("should handle numeric ZIP codes", () => {
    expect(getChapterFromZip(90210)).toBe("LA");
    expect(getChapterFromZip(94102)).toBe("SF");
  });

  it("should return 'CA' for invalid ZIP codes", () => {
    expect(getChapterFromZip("abcde")).toBe("CA");
    expect(getChapterFromZip("xxxxx")).toBe("CA");
  });

  it("should return appropriate chapter for known ZIP codes from CA_ZIP.json", () => {
    // This tests actual data from the CA_ZIP.json file
    // ZIP code 00018 (Los Padres Ntl Forest) is marked as "LA" in the dataset
    expect(getChapterFromZip("00018")).toBe("LA");
  });
});
