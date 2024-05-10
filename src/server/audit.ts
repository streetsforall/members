import * as csvModule from "./csv";
import * as dbHelp from './dbHelpers'
const fs = require("fs");
const { parse } = require("csv-parse");
const csvparser=require('csvtojson')

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


  // print out all donations in the csv 
  console.log(csv)


  fs.writeFile('donations.csv', csv, 'utf8', function (err:any) {
    if (err) {
      console.log('Some error occured - file either not saved or corrupted file saved.');
    } else{
      console.log('It\'s saved!');
    }
  });

// create a reference date 32 days ago
var today = new Date();
var validWindow = new Date(new Date().setDate(today.getDate() - 31));

const csvFilePath='donations.csv'
// iterate through CSV
csvparser()
  .fromFile(csvFilePath)
  .then((jsonObj:any)=>{
    console.log(jsonObj)

    for (const key in jsonObj) {
       var row = jsonObj[key]

      
      var donateDate = new Date(row['Date'])

      // skip if invalid date for donation

      if (donateDate.valueOf() - validWindow.valueOf() < 1) {
        console.log('old date')
        continue;
      }

      //right now this is only additive - we need a way to check it against active members

      var tier = 0

      if (row['Monthly Recurring Amount'] == '') {
        console.log('not recuring')
        continue;
      } else if (row['Monthly Recurring Amount'] >= 50) {
        var tier = 3
      } else  if (row['Monthly Recurring Amount'] >= 25) {
        var tier = 2
      } else if (row['Monthly Recurring Amount'] >= 12) {
        var tier = 1
      } else {
        continue;
      }

      var first_name = row['Donor First Name']
      var last_name = row['Donor Last Name']
      var email = row['Donor Email']
      var active = true
      var last_amount = Number(row['Amount'])
      

      dbHelp.setMember(first_name, last_name, email, active, tier, last_amount)

    }

})



}
