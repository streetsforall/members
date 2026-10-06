// @ts-nocheck
import audit from "../../src/server/audit";
import * as csvModule from "../../src/server/csv";

jest.mock("../../src/server/csv");

describe("audit", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("should throw an error if CSV creation fails", async () => {
    (csvModule.create as jest.Mock).mockRejectedValue(
      new Error("Creation error")
    );

    await expect(audit()).rejects.toThrow(
      "Error generating CSV: Creation error"
    );
  });

  it("should throw an error if fetching CSV URL fails", async () => {
    (csvModule.create as jest.Mock).mockResolvedValue("createResponse");
    (csvModule.getUrl as jest.Mock).mockRejectedValue(
      new Error("URL fetch error")
    );

    await expect(audit()).rejects.toThrow(
      "Error fetching CSV: URL fetch error"
    );
  });

  it("should throw an error if downloading CSV fails", async () => {
    (csvModule.create as jest.Mock).mockResolvedValue("createResponse");
    (csvModule.getUrl as jest.Mock).mockResolvedValue("url");
    (csvModule.download as jest.Mock).mockRejectedValue(
      new Error("Download error")
    );

    await expect(audit()).rejects.toThrow(
      "Error downloading CSV: Download error"
    );
  });

  it("should complete successfully if all CSV operations succeed", async () => {
    (csvModule.create as jest.Mock).mockResolvedValue("createResponse");
    (csvModule.getUrl as jest.Mock).mockResolvedValue("url");
    (csvModule.download as jest.Mock).mockResolvedValue("csv");

    await expect(audit()).resolves.toBeUndefined();
  });

  // More tests for processing the CSV and updating members
  // ...
});
