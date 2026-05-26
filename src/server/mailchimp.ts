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
 * @param email - Subscriber email
 * @param merge_fields - Subscriber information
 * @returns
 */
async function addMailchimp(
  email: string,
  merge_fields: {
    FNAME: string;
    LNAME: string;
    ADD_ST: string;
    ADD_ST_2: string;
    ADD_CITY: string;
    ADD_ZIP: string;
    ADD_COUNTR: string;
    PHONE: string;
    MEMBERSHIP: number;
  },
  logger: Logger,
) {
  const childLogger = logger.child({ step: 'add_to_mailchimp' });

  childLogger.debug(merge_fields, `Adding ${email} to Mailchimp`);

  const run = async () => {
    try {
      const response = await client.lists.setListMember(
        process.env.MAILCHIMP_AUDIENCE_ID,
        email,
        {
          email_address: email,
          merge_fields: merge_fields,
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
  };

  await run();

  return;
}

/**
 * Add member to Mailchimp
 * @param email - Subscriber email
 * @param merge_fields - Subscriber information
 * @param logger - Instance used for logging
 * @returns
 */
async function addToMailingList(
  email: string,
  mergeFields: {
    FNAME: string;
    LNAME: string;
    ADD_ST: string;
    ADD_ST_2?: string | null;
    ADD_CITY: string;
    ADD_ZIP: string;
    ADD_COUNTR: string;
    PHONE: string;
    MEMBERSHIP: number;
  },
  logger: Logger = defaultLogger,
) {
  const childLogger = logger.child({ step: 'add_to_mailchimp' });

  childLogger.debug(mergeFields, `Adding ${email} to Mailchimp`);

  try {
    const response = await client.lists.setListMember(
      MAILCHIMP_AUDIENCE_ID,
      email,
      {
        email_address: email,
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

export { addMailchimp as default, addToMailingList };
