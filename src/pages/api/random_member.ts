import { NextApiRequest, NextApiResponse} from "next";
import { useParams } from 'next/navigation'
import { getValidMembers } from '../../server/db';

// returns a random existing member

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {


    if (req.method === "GET") {
        try {

            const validMembers = await getValidMembers();
            const randomMember = validMembers?.[Math.floor(Math.random() * validMembers.length)];

            res.status(200).send({
                name: randomMember?.name,
                email: randomMember?.email,
                tier: randomMember?.tier,
                branch: randomMember?.branch
            });

        } catch (error: any) {
            if (error instanceof Error) {
                console.error(`An error occurred retrieving members: ${error.message}`);
            }

            res.status(500).send("An error occurred retrieving members");
        }
    }
}