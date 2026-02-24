import { NextApiRequest, NextApiResponse } from "next";
import pino from "pino";
import { retrieveValidMembers } from '../../server/dbHelpers'

const parentLogger = pino();

/**
 * Main request handler - returns total monthly donations
 * @param req - Request object
 * @param res - Response object
 */
export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method === "GET") {
        // Create logger instance for request
        const logger = parentLogger.child({
            request_type: 'stats',
        });

        logger.info({ step: 'incoming_request' }, 'Incoming request');

        try {
            const validMembers = await retrieveValidMembers()

            // TODO: Refactor into centralized string literal type
            const chapters = ["LA", "SF", "CA"] as const

            /**
             * Calculate stats for a particular chapter
             * @param chapter - The chapter to calculate
             * @returns Subscriber counts and dollar amounts
             */
            function calculateChapterTotals(chapter: typeof chapters[number]) {
                // Count members in each tier for the specified chapter
                const tier1Members = validMembers.reduce((a, b) => b.tier == 1 && b.branch == chapter ? a + 1 : a, 0)
                const tier2Members = validMembers.reduce((a, b) => b.tier == 2 && b.branch == chapter ? a + 1 : a, 0)
                const tier3Members = validMembers.reduce((a, b) => b.tier == 3 && b.branch == chapter ? a + 1 : a, 0)
  
                // Calculate equivalent cdollar amounts
                const tier1Dollars = tier1Members * 12
                const tier2Dollars = tier2Members * 24
                const tier3Dollars = tier3Members * 48

                // Calculate totals
                const totalMembers = tier1Members + tier2Members + tier3Members
                const totalDollarsMonthly = tier1Dollars + tier2Dollars + tier3Dollars
                const totalDollarsAnnual = (tier1Dollars + tier2Dollars + tier3Dollars) * 12

                return({
                    tier1: tier1Members,
                    tier2: tier2Members,
                    tier3: tier3Members,
                    total_count: totalMembers,
                    tier1dollar: tier1Dollars,
                    tier2dollar: tier2Dollars,
                    tier3dollar: tier3Dollars,
                    total_monthly: totalDollarsMonthly,
                    total_annual: totalDollarsAnnual
                })
            }

            const caTotals = calculateChapterTotals("CA")
            const laTotals = calculateChapterTotals("LA")
            const sfTotals = calculateChapterTotals("SF")

            logger.info({ stats: { caTotals, laTotals, sfTotals }}, 'Calculated membership stats')

            return res.status(200).send({
                'CA': caTotals,
                'LA': laTotals,
                'SF': sfTotals,
                'total monthly': laTotals.total_monthly +  sfTotals.total_monthly + caTotals.total_monthly,
                'total annual estimate': laTotals.total_annual +  sfTotals.total_annual + caTotals.total_annual,
                'LA cut monthly': laTotals.total_monthly + (caTotals.total_monthly / 2),
                'SF cut monthly': sfTotals.total_monthly + (caTotals.total_monthly / 2),
                'current donations': laTotals.total_count +  sfTotals.total_count + caTotals.total_count,
            })
        } catch (error) {
            logger.error(error, 'An error occurred calculating membership stats');

            return res.status(500).send("An error occurred calculating membership stats");
        }
    } else {
        res.setHeader('Allow', 'POST');
        return res.status(405).send('Method Not Allowed');
    }
}