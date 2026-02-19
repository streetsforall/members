'use server';

import { type Logger } from 'pino';

const client = require('@mailchimp/mailchimp_marketing');

client.setConfig({
  apiKey: process.env.MAILCHIMP_KEY,
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

export default addMailchimp;
