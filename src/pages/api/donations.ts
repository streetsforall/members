// import { NextApiRequest, NextApiResponse } from "next";
// import { DonationData } from "./donation.types";
// import * as dbHelp from '../../server/dbHelpers'

// // this is the endpoint that fires when Actblue calls our API

// export default async function handler(
//   req: NextApiRequest,
//   res: NextApiResponse
// ) {
//   const auth = req.headers.authorization;

//   if (!auth || !auth.startsWith("Basic ")) {
//     res.status(401).json({ message: "Unauthorized" });
//     return;
//   }

//   const [username, password] = atob(auth.split(" ")[1]).split(":");

//   const expectedUsername = process.env.AB_WEBHOOK_USERNAME;
//   const expectedPassword = process.env.AB_WEBHOOK_PASSWORD;

//   if (username !== expectedUsername || password !== expectedPassword) {
//     res.status(401).json({ message: "Incorrect credentials" });
//     return;
//   }

//   if (req.method === "POST") {
//     const donationData = req.body;

//     if (!donationData) {
//       res.status(400).json({ message: "Missing donation data" });
//       return;
//     }

//     const { email, donationTime, validMember, tier, last_amount } =
//       parseDonationData(donationData);

//     // Update database with member
//     if (validMember) {
//       dbHelp.setMember(
//         donationData.donor.firstname, 
//         donationData.donor.lastname, 
//         donationData.donor.email, 
//         true, 
//         tier,
//         last_amount
//         )

//       // create new email verification token
//       const verificationToken = dbHelp.setEmailVerification(donationData.donor.email)

//       // Notify user email of donation receipt (Optional)
//     }

//     res.status(200).json({ message: "Webhook data received" });
//   } else {
//     res.status(405).json({ message: "Method not allowed" });
//   }
// }




// export function parseDonationData(donationData: DonationData) {
//   const email = donationData.donor.email;
//   const donationTime = donationData.contribution.createdAt;

//   const totalAmount = donationData.lineitems.reduce(
//     (sum, item) => sum + parseFloat(item.amount),
//     0
//   );

//   console.log(totalAmount)

//   var validMember =
  
//     // for now, membership requires payment to be recurring and >= $12
//     totalAmount >= 12 &&
//     donationData.contribution.status === "approved" &&
//     donationData.contribution.isRecurring === true

//   var tier = 0

//   // solve for tier
//   if (totalAmount >= 48) {
//     var tier = 3
//   } else  if (totalAmount >= 24) {
//     var tier = 2
//   } else if (totalAmount >= 12) {
//     var tier = 1
//   } else {
//     validMember = false;
//   }

//   // 

//   var last_amount = totalAmount
//   return { email, donationTime, validMember, tier, last_amount};
// }
