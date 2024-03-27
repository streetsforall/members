import * as csvModule from "./csv";

export default async function audit() {
  const auth = Buffer.from(
    `${process.env.AB_CLIENT_UUID}:${process.env.AB_CLIENT_SECRET}`
  ).toString("base64");

  let createResponseBody;
  try {
    createResponseBody = await csvModule.create(auth);
  } catch (error: any) {
    if (error instanceof Error) {
      throw new Error(`Error generating CSV: ${error.message}`);
    } else {
      throw new Error("Unknown error generating CSV");
    }
  }

  let downloadUrl;
  try {
    downloadUrl = await csvModule.getUrl(createResponseBody, auth);
  } catch (error: any) {
    if (error instanceof Error) {
      throw new Error(`Error fetching CSV: ${error.message}`);
    } else {
      throw new Error("Unknown error fetching CSV");
    }
  }

  let csv;
  try {
    csv = await csvModule.download(downloadUrl);
  } catch (error: any) {
    if (error instanceof Error) {
      throw new Error(`Error downloading CSV: ${error.message}`);
    } else {
      throw new Error("Unknown error downloading CSV");
    }
  }

  // Process the CSV and update your members
  // ...
}
