import { NextApiRequest, NextApiResponse } from "next";
import { useParams } from "next/navigation";
import * as dbHelp from "../../server/dbHelpers";
import { new_order } from "@/server/merch_order";

// returns total monthly donations

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const memberOrders = [
  ];

  // check user order tier
  const getMember = async (email: string) => {
    const member = await dbHelp.retrieveMemberByEmail(email);
    return member;
  };

  memberOrders.forEach(async (email) => {
    try {
      const member = await getMember(email);
      console.log("member", member);
      const mem_tier = member.tier;

      const address = JSON.parse(member.shipping_address)


      const order = await new_order(
        {
          size: member.shirt_size,
          name: member.name,
          address1: address.line1,
          address2: address.line2,
          city: address.city,
          state_name: address.state,
          country_name: address.country,
          zip: address.postal_code,
          phone: member.phone,
          email: member.email,
        },
        member.tier
      );

      console.log(order);

      const updateLog = "Merch ordered for " + member.name;
      const memberUpdater = {
        email: member.email,
        newTier: mem_tier,
        update: updateLog,
      };
      dbHelp.setMemberUpdate(memberUpdater);
    } catch (err: any) {
      return res.status(500).json({
        error: true,
        message: err.message || "Unknown error occurred",
        stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
      });
    }
  });
}
