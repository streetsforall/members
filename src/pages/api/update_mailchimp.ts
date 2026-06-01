import { NextApiRequest, NextApiResponse } from "next";
import { getValidMembers } from '../../server/db'
import { addToMailingList } from "@/server/mailchimp";


// 

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    if (req.method === "GET") {
        try {
            const members = await getValidMembers()

            members?.map((member, id) => {

                const parsed_address = JSON.parse(member.shipping_address)

                console.log('parsed_address', parsed_address)

                const shipping  = parsed_address ? 
                {'ADDRESSYU': {
                    addr1: parsed_address.line1,
                    addr2: parsed_address.line2,
                    city: parsed_address.city,
                    state: parsed_address.state,
                    zip: parsed_address.postal_code,
                    country: parsed_address.county,
                  }} : ''

                // addToMailingList(
                //     {
                //       email: member.email,
                //       firstName:  member.name.split(" ")[0],
                //       lastName:  member.name.split(" ")[1],
                //       address1: parsed_address ? parsed_address.line1 : null,
                //       address2: parsed_address ? parsed_address.line2 : null,
                //       city: parsed_address ? parsed_address.city : null,
                //       zip: parsed_address ? parsed_address.postal_code :  null,
                //       countryCode: parsed_address ? parsed_address.county : null
                //       phone: member.phone,
                //       tier: member.tier,
                //     }
                //   )
            })

            res.status(200).end("");

        } catch (error: any) {
            if (error instanceof Error) {
                console.error(`An error occurred adding members: ${error.message}`);
            }

            res.status(500).send("An error occurred counting members");
        }
    }
}