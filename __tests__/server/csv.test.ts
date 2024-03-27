import { create } from "../../src/server/csv";
import nock from "nock";

describe("CSV Module", () => {
  describe("create function", () => {
    it("should successfully create a CSV", async () => {
      const mockResponse = {
        csv_type: "paid_contributions",
        date_range_start: "2022-01-01",
        date_range_end: "2022-12-31",
      };

      nock("https://secure.actblue.com")
        .post("/api/v1/csvs")
        .reply(200, mockResponse);

      const result = await create("test_auth");
      expect(result).toEqual(mockResponse);
    });

    it("should throw an error when the request fails", async () => {
      nock("https://secure.actblue.com")
        .post("/api/v1/csvs")
        .replyWithError("Something went wrong");

      await expect(create("test_auth")).rejects.toThrow(
        "Error fetching from ActBlue API: Something went wrong"
      );
    });
  });
});
