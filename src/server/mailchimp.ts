'use server';

import pino, { type Logger } from 'pino';

const client = require('@mailchimp/mailchimp_marketing');

// Used for any loggers not passed as arguments
const defaultLogger = pino();

const MAILCHIMP_API_KEY = process.env.MAILCHIMP_KEY;
const MAILCHIMP_AUDIENCE_ID = process.env.MAILCHIMP_AUDIENCE_ID;

client.setConfig({
  apiKey: MAILCHIMP_API_KEY,
  server: 'us4',
});

/**
 * Add member to Mailchimp
 * @param data - Subscriber information
 * @param logger - Instance used for logging
 * @returns
 */
async function addToMailingList(
  data: {
    email: string;
    firstName: string;
    lastName: string;
    address1: string;
    address2?: string;
    city: string;
    zip: string;
    countryCode: string;
    phone?: string;
    tier: number;
  },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'add_to_mailchimp' });

  const mergeFields = {
    FNAME: data.firstName,
    LNAME: data.lastName,
    ADD_ST: data.address1,
    ...(data.address2 && { ADD_ST_2: data.address2 }), // Only include property if value exists
    ADD_CITY: data.city,
    ADD_ZIP: data.zip,
    ADD_COUNTR: data.countryCode,
    ...(data.phone && { PHONE: data.phone }), // Only include property if value exists
    MEMBERSHIP: data.tier,
  };

  childLogger.debug(mergeFields, `Adding ${data.email} to Mailchimp`);

  try {
    const response = await client.lists.setListMember(
      MAILCHIMP_AUDIENCE_ID,
      data.email,
      {
        email_address: data.email,
        merge_fields: mergeFields,
        status: 'subscribed',
        tags: ['members_club'],
      },
    );

    childLogger.info(
      {
        contact_id: response.contact_id,
        list_id: response.list_id,
        status: response.status,
      },
      'Contact added/updated in Mailchimp',
    );

    return;
  } catch (error) {
    childLogger.error(error);

    return;
  }
}

export { addToMailingList };
