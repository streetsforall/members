import * as csvModule from "./csv";
import * as dbHelp from './dbHelpers'

const fs = require("fs");
const { parse } = require("csv-parse");

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

  let members;
  try {
    members = await dbHelp.retrieveMembers();
  } catch (error: any) {
    if (error instanceof Error) {
      throw new Error(`Error downloading CSV: ${error.message}`);
    } else {
      throw new Error("Unknown error downloading CSV");
    }
  }


  // print out all members in our database 
  console.log(members)

  // print out all donations in the csv 
  console.log(csv)

  // read csv
  fs.createReadStream(csv)
    .pipe(parse({ delimiter: ",", from_line: 2 }))
    .on("data", function (row) {
      console.log(row);
    })
    .on("error", function (error) {
      console.log(error.message);
    })
    .on("end", function () {
      console.log("finished");
    });


}
