import { NextApiRequest, NextApiResponse } from "next";
import { DonationData } from "./donations.types";

// change if i'm  misunderstanding
// this is the endpoint that fires when Actblue calls our API

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const auth = req.headers.authorization;

  if (!auth || !auth.startsWith("Basic ")) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  const [username, password] = atob(auth.split(" ")[1]).split(":");

  const expectedUsername = process.env.AB_WEBHOOK_USERNAME;
  const expectedPassword = process.env.AB_WEBHOOK_PASSWORD;

  if (username !== expectedUsername || password !== expectedPassword) {
    res.status(401).json({ message: "Unauthorized" });
    return;
  }

  if (req.method === "POST") {
    const donationData = req.body;

    if (!donationData) {
      res.status(400).json({ message: "Missing donation data" });
      return;
    }

    const { email, donationTime, validMember } =
      parseDonationData(donationData);

    // Update database
    if (validMember) {
      // Add user to members list or update their membership
      // Notify user email of donation receipt (Optional)
    }

    res.status(200).json({ message: "Webhook data received" });
  } else {
    res.status(405).json({ message: "Method not allowed" });
  }
}

const MINIMUM_VALID_DONATION = 12;

export function parseDonationData(donationData: DonationData) {
  const email = donationData.donor.email;
  const donationTime = donationData.contribution.createdAt;

  const totalAmount = donationData.lineitems.reduce(
    (sum, item) => sum + parseFloat(item.amount),
    0
  );

  const validMember =
    totalAmount >= MINIMUM_VALID_DONATION &&
    donationData.contribution.status === "approved";

  return { email, donationTime, validMember };
}
