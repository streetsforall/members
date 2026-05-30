import { NextApiRequest, NextApiResponse } from "next";
import { getValidMembers } from "../../server/dbHelpers";


// returns number of active members

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  
  if (req.method === "GET") {
    try {
        getValidMembers()
            .then(response =>  res.status(200).json(response.length ));
    } catch (error: any) {
      if (error instanceof Error) {
        console.error(`An error occurred counting members: ${error.message}`);
      }

      res.status(500).send("An error occurred counting members");
    }
  }
}