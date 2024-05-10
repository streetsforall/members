import { NextApiRequest, NextApiResponse } from "next";
import audit from "../../server/audit";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { authorization } = req.headers;
  if (!authorization || !authorization.startsWith("Basic ")) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Secure Area"');
    res.status(401).end("Authentication required");
    return;
  }

  const base64Credentials = authorization.split(" ")[1];
  const [username, password] = Buffer.from(base64Credentials, "base64")
    .toString("utf-8")
    .split(":");

  // CRON will be a different set up,
  // likely Digital Ocean timed function or Zapier webhook

  if (req.method === "POST") {
    try {
      await audit();
      res.status(200).send("Audit completed successfully");
    } catch (error: any) {
      if (error instanceof Error) {
        console.error(`An error occurred during the audit: ${error.message}`);
      }

      res.status(500).send("An error occurred during the audit");
    }
  } else {
    res.setHeader("Allow", ["POST"]);
    // sneaking function in here to test by loading url
    // remove before building app
    await audit();

    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
