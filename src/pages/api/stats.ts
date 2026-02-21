import { NextApiRequest, NextApiResponse } from "next";
import pino from "pino";
import * as dbHelp from '../../server/dbHelpers'
import { json } from "stream/consumers";

const logger = pino();

// returns total monthly donations

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {

    


// const getCoords = async (address: string): Promise<void> => {
//     const body = {
//         string: address,
//     };
//     const jsonBody = JSON.stringify(body);
//     const response = await fetch(
//         "https://plaza.streetsforall.org/api/geo",
//         {
//             method: "POST",
//             body: jsonBody,
//             headers: {
//                 "Content-Type": "application/json",
//             },
//         },
//     );
//     const potentialAddresses = await response.json();

//     return(potentialAddresses);
// };


    if (req.method === "GET") {
        try {
            const getDB = await dbHelp.retrieveValidMembers()

           


            getDB.map((memb) => {


                logger.info(memb.branch)
                

            })


            // const sum = getDB.reduce((a, b) => a + b.last_amount, 0)


            const branches = ["LA", "SF", "CA"]

            const getBranchTotals = (branch : string) => {
                const tier1 = getDB.reduce((a, b) => b.tier == 1 && b.branch == branch ? a + 1 : a, 0)
                const tier2 = getDB.reduce((a, b) => b.tier == 2 && b.branch == branch ? a + 1 : a, 0)
                const tier3 = getDB.reduce((a, b) => b.tier == 3 && b.branch == branch ? a + 1 : a, 0)
  
                const tier1dollar = tier1 * 12
                const tier2dollar = tier2 * 24
                const tier3dollar = tier3 * 48

                const total_count= tier1 + tier2 + tier3
                const total_monthly = tier1dollar + tier2dollar + tier3dollar
                const total_annual = (tier1dollar + tier2dollar + tier3dollar) * 12

                return({'tier1': tier1, 'tier2': tier2, 'tier3': tier3, 'total_count': total_count, 'tier1dollar': tier1dollar, 'tier2dollar': tier2dollar, 'tier3dollar': tier3dollar, 'total_monthly':total_monthly, 'total_annual': total_annual})
            }

            var total: any = {};

            branches.map((branch) => {
            total[branch] = getBranchTotals(branch);
            });

            logger.info(total)
            
        

            const LA_totals = getBranchTotals("LA")
            const SF_totals = getBranchTotals("SF")
            const CA_totals = getBranchTotals("CA")


            logger.info({ LA_totals, SF_totals, CA_totals })

            // logger.info(`${tier1} ${tier2} ${tier3}`)
            // logger.info(`${tier1dollar} ${tier2dollar} ${tier3dollar}`)

            res.status(200).send({
                // 'estimated yearly income': (tier1dollar + tier2dollar + tier3dollar) * 12,
                // 'current donations': getDB.length,
                // 'average donation': Math.trunc((tier1dollar + tier2dollar + tier3dollar) /  getDB.length),
                // 'tier 1 donors': tier1,
                // 'tier 2 donors': tier2,
                // 'tier 3 donors': tier3,
                // 'tier 1 income': tier1dollar,
                // 'tier 2 income': tier2dollar,
                // 'tier 3 income': tier3dollar,
                'LA': LA_totals,
                'SF': SF_totals,
                'CA': CA_totals,

                'total monthly': LA_totals.total_monthly +  SF_totals.total_monthly + CA_totals.total_monthly,
                'total annual estimate': LA_totals.total_annual +  SF_totals.total_annual + CA_totals.total_annual,
                'SF cut monthly': SF_totals.total_monthly + CA_totals.total_monthly/2,
                'LA cut monthly': LA_totals.total_monthly + CA_totals.total_monthly/2,
                'current donations': LA_totals.total_count +  SF_totals.total_count + CA_totals.total_count,
        })

        } catch (error: any) {
            if (error instanceof Error) {
                logger.error(`An error occurred counting members: ${error.message}`);
            }

            res.status(500).send("An error occurred counting members");
        }
    }
}