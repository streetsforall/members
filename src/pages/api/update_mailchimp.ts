import { NextApiRequest, NextApiResponse } from "next";
import * as dbHelp from '../../server/dbHelpers'


// returns total monthly donations

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    if (req.method === "GET") {
        try {
            const getDB = await dbHelp.retrieveValidMembers()


            const sum = getDB.reduce((a, b) => a + b.last_amount, 0)
            console.log(sum)
            res.status(200).send({'total monthly donations in dollars': sum})

        } catch (error: any) {
            if (error instanceof Error) {
                console.error(`An error occurred counting members: ${error.message}`);
            }

            res.status(500).send("An error occurred counting members");
        }
    }
}