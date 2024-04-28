import handler, { parseDonationData } from "@/pages/api/donations";
import { DonationData } from "@/pages/api/donations.types";
import { NextApiRequest, NextApiResponse } from "next";

const donationData = {
  donor: {
    firstname: "Herbert",
    lastname: "O'Hackett",
    addr1: "150 Declan Crest",
    city: "South Carlottafurt",
    state: "HI",
    zip: "58554-4467",
    country: "United States",
    isEligibleForExpressLane: false,
    employerData: {
      employer: "Wunsch-Homenick",
      occupation: "firefighter",
      employerAddr1: "123 Main St",
      employerCity: "Chicago",
      employerState: "IL",
      employerCountry: "United States",
    },
    email: "agnes_schmidt@buckridge.com",
    phone: "545-370-1537 x9178",
  },
  contribution: {
    createdAt: "2022-10-18T12:45:24-05:00",
    orderNumber: "AB233546164",
    contributionForm: "maximetemporibusnecessitatibus1",
    refcodes: {},
    refcode: null,
    refcode2: null,
    creditCardExpiration: "10/2024",
    recurringPeriod: "once",
    recurringDuration: 1,
    weeklyRecurringSunset: null,
    abTestName: null,
    isRecurring: false,
    isPaypal: false,
    isMobile: false,
    abTestVariation: null,
    isExpress: false,
    withExpressLane: false,
    expressSignup: false,
    uniqueIdentifier: "435634b4-9a61-4136-bcca-efa92a55d3d6",
    textMessageOption: "unknown",
    giftDeclined: null,
    giftIdentifier: null,
    shippingName: null,
    shippingAddr1: null,
    shippingCity: null,
    shippingState: null,
    shippingZip: null,
    shippingCountry: null,
    smartBoostAmount: null,
    customFields: [{ label: "soluta_libero_1", answer: "quis_quod_1" }],
    status: "approved",
    thanksUrl: "http://localhost:3000/thanks/AB233546164?success=true",
  },
  lineitems: [
    {
      sequence: 0,
      entityId: 141347,
      fecId: "996782081",
      committeeName: "Cmte for Evalyn O'Walter",
      amount: "25.77",
      recurringAmount: null,
      paidAt: "2022-10-18T12:45:24-05:00",
      paymentId: 293834801,
      lineitemId: 477108065,
    },
  ],
  form: {
    name: "maximetemporibusnecessitatibus1",
    kind: "page",
    ownerEmail: "dante@stokes.org",
    managingEntityName: null,
    managingEntityCommitteeName: null,
  },
};

describe("Test /api/donations endpoint", () => {
  let req: Partial<NextApiRequest>;
  let res: Partial<NextApiResponse>;
  let username = "username";
  let password = "password";

  beforeEach(() => {
    req = {
      method: "POST",
      headers: {},
      body: donationData,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  it("should handle valid donation data", async () => {
    if (req.headers) {
      req.headers.authorization =
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    }

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ message: "Webhook data received" });
  });

  it("should handle missing authorization header", async () => {
    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
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

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: "Unauthorized" });
  });

  it("should handle missing request body", async () => {
    if (req.headers) {
      req.headers.authorization =
        "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
    }

    req.body = undefined;

    await handler(req as NextApiRequest, res as NextApiResponse);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: "Missing donation data" });
  });
});

describe("parseDonationData", () => {
  it("should parse donation data correctly", () => {
    const donationDataInterface = donationData as DonationData;

    const result = parseDonationData(donationDataInterface);

    expect(result.email).toEqual(donationDataInterface.donor.email);
    expect(result.donationTime).toEqual(
      donationDataInterface.contribution.createdAt
    );
    expect(result.validMember).toEqual(true);
  });

  it("should handle donation amount less than threshold", () => {
    const donationDataInterface: DonationData = {
      ...donationData,
      lineitems: [
        {
          ...donationData.lineitems[0],
          amount: "5.00",
        },
        {
          ...donationData.lineitems[0],
          amount: "6.00",
        },
      ],
    };

    const result = parseDonationData(donationDataInterface);

    expect(result.email).toEqual(donationDataInterface.donor.email);
    expect(result.donationTime).toEqual(
      donationDataInterface.contribution.createdAt
    );
    expect(result.validMember).toEqual(false);
  });

  it("should handle contribution status not approved", () => {
    const donationDataInterface: DonationData = {
      ...donationData,
      contribution: {
        ...donationData.contribution,
        status: "declined",
      },
    };

    const result = parseDonationData(donationDataInterface);

    expect(result.email).toEqual(donationDataInterface.donor.email);
    expect(result.donationTime).toEqual(
      donationDataInterface.contribution.createdAt
    );
    expect(result.validMember).toEqual(false);
  });
});
