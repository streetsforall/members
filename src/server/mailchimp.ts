"use server";

import pino from "pino";

const client = require("@mailchimp/mailchimp_marketing");

// Used for any loggers not passed as arguments
const parentLogger = pino();

client.setConfig({
  apiKey: process.env.MAILCHIMP_KEY,
  server: "us4",
});

const addMailchimp = async (email: string, merge_fields: any) => {
  parentLogger.info(merge_fields, email);

  const run = async () => {
    const response = await client.lists.setListMember("948112d831", email, {
      email_address: email,
      merge_fields: merge_fields,
      status: "subscribed",
      tags: ["members_club"],
    });
    parentLogger.info(response);
  };

  run();
};

export default addMailchimp;
