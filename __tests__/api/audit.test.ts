// @ts-nocheck
import audit from "../../src/server/audit";
import handler from "../../src/pages/api/audit";
import { NextApiRequest, NextApiResponse } from "next";

jest.mock("../../src/server/audit", () => jest.fn());

describe("handler", () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let username = "username";
  let password = "password";
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    req = {
      method: "POST",
      headers: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
      setHeader: jest.fn(),
      end: jest.fn(),
    };

    consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it("should handle POST requests", async () => {
    if (req.headers) {
      req.headers.authorization =
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    }

    (audit as jest.Mock).mockResolvedValue(undefined);

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith("Audit completed successfully");
  });

  it("should handle errors", async () => {
    if (req.headers) {
      req.headers.authorization =
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    }

    (audit as jest.Mock).mockRejectedValue(new Error("Test error"));

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith("An error occurred during the audit");
  });

  it("should handle non-POST requests", async () => {
    req.method = "GET";

    if (req.headers) {
      req.headers.authorization =
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    }

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.setHeader).toHaveBeenCalledWith("Allow", ["POST"]);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalledWith(`Method ${req.method} Not Allowed`);
  });

  it("should handle missing authorization header", async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.setHeader).toHaveBeenCalledWith(
      "WWW-Authenticate",
      'Basic realm="Secure Area"'
    );
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.end).toHaveBeenCalledWith("Authentication required");
  });

  it("should handle incorrect username/password", async () => {
    const incorrectUsername = "incorrectUsername";
    const incorrectPassword = "incorrectPassword";

    if (req.headers) {
      req.headers.authorization =
        "Basic " +
        Buffer.from(`${incorrectUsername}:${incorrectPassword}`).toString(
          "base64"
        );
    }

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.end).toHaveBeenCalledWith("Forbidden");
  });
});
