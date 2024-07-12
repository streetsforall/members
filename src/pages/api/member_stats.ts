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


            const sum = getDB.reduce((a, b) => a + b.last_amount, 0)
            const tier1 = getDB.reduce((a, b) => b.tier == 1 ? a + 1 : a, 0)
            const tier2 = getDB.reduce((a, b) => b.tier == 2 ? a + 1 : a, 0)
            const tier3 = getDB.reduce((a, b) => b.tier == 3 ? a + 1 : a, 0)

            console.log(sum)
            res.status(200).send({
                'total monthly income': sum,
                'total donations': getDB.length,
                'tier 1 donors': tier1,
                'tier 2 donors': tier2,
                'tier 3 donors': tier3
        })

        } catch (error: any) {
            if (error instanceof Error) {
                console.error(`An error occurred counting members: ${error.message}`);
            }

            res.status(500).send("An error occurred counting members");
        }
    }
}