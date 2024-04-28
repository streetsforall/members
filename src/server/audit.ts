import * as csvModule from "./csv";
import sql from './db.ts'

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

  console.log(csv)

  async function getUsersOver(age) {
    const users = await sql`
      select
        name,
        age
      from users
      where age > ${ age }
    `
    // users = Result [{ name: "Walter", age: 80 }, { name: 'Murray', age: 68 }, ...]
    return users
  }
}
