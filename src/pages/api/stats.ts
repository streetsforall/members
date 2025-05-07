import { NextApiRequest, NextApiResponse } from "next";
import * as dbHelp from '../../server/dbHelpers'
import { json } from "stream/consumers";


// returns total monthly donations

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    if (req.method === "GET") {
        try {
            const getDB = await dbHelp.retrieveValidMembers()

            // if (interval == "month") {
            //     if (payment >= 4800) {
            //       var tier = 3;
            //     } else if (payment >= 2400) {
            //       var tier = 2;
            //     } else if (payment >= 1200) {
            //       var tier = 1;
            //     }
            //   } else if (interval == "year") {
            //     if (payment >= 55000) {
            //       var tier = 3;
            //     } else if (payment >= 27000) {
            //       var tier = 2;
            //     } else if (payment >= 14000) {
            //       var tier = 1;
            //     }
            // }


            // const sum = getDB.reduce((a, b) => a + b.last_amount, 0)


            const tier1 = getDB.reduce((a, b) => b.tier == 1 ? a + 1 : a, 0)
            const tier2 = getDB.reduce((a, b) => b.tier == 2 ? a + 1 : a, 0)
            const tier3 = getDB.reduce((a, b) => b.tier == 3 ? a + 1 : a, 0)


            const tier1dollar = tier1 * 12
            const tier2dollar = tier2 * 24
            const tier3dollar = tier3 * 48

            console.log(tier1, tier2, tier3)
            console.log(tier1dollar, tier2dollar, tier3dollar)

            res.status(200).send({
                'estimated yearly income': (tier1dollar + tier2dollar + tier3dollar) * 12,
                'current monthly income': (tier1dollar + tier2dollar + tier3dollar),
                'current donations': getDB.length,
                'average donation': Math.trunc((tier1dollar + tier2dollar + tier3dollar) /  getDB.length),
                'tier 1 donors': tier1,
                'tier 2 donors': tier2,
                'tier 3 donors': tier3,
                'tier 1 income': tier1dollar,
                'tier 2 income': tier2dollar,
                'tier 3 income': tier3dollar
        })

        } catch (error: any) {
            if (error instanceof Error) {
                console.error(`An error occurred counting members: ${error.message}`);
            }

            res.status(500).send("An error occurred counting members");
        }
    }
}