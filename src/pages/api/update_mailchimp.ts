import { NextApiRequest, NextApiResponse } from "next";
import * as dbHelp from '../../server/dbHelpers'
import addMailchimp from "@/server/mailchimp";


// returns total monthly donations

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    if (req.method === "GET") {
        try {
            const members = await dbHelp.retrieveValidMembers()

            members.map((member, id) => {

                const parsed_address = JSON.parse(member.shipping_address)

                console.log(parsed_address)

                const shipping  = parsed_address ? 
                {'ADDRESSYU': {
                    addr1: parsed_address.line1,
                    addr2: parsed_address.line2,
                    city: parsed_address.city,
                    state: parsed_address.state,
                    zip: parsed_address.postal_code,
                    country: parsed_address.county,
                  }} : ''

                addMailchimp(
                    member.email,
                    {
                      FNAME:  member.name.split(" ")[0],
                      LNAME:  member.name.split(" ")[1],
                      ADDRESSYU: {
                        addr1: parsed_address ? parsed_address.line1 : null,
                        addr2: parsed_address ? parsed_address.line2 : null,
                        city: parsed_address ? parsed_address.city : null,
                        state: parsed_address ? parsed_address.state : null,
                        zip: parsed_address ? parsed_address.postal_code :  null,
                        country: parsed_address ? parsed_address.county : null
                      },
                      PHONE: member.phone,
                      MEMBERSHIP: member.tier
                    }
                  )
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