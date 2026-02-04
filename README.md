# Membership Program

This is a webapp for managing the SFA membership program. It is both the front facing application that members can sign into and also acts as an API endpoint for multiple utilities.

The members data lives in a Digital Ocean PostgreSQL database. 

Resources:

[Printful API](https://developers.printful.com/docs/#tag/Orders-API/operation/createOrder)

[Stripe API](https://docs.stripe.com/api/subscriptions)

[Mailchimp API](https://github.com/mailchimp/mailchimp-marketing-node/)



### Simplified New Member Lifecycle
1. A new member signs up. This is done using Stripe and will call `membership.streetsforall.org/api/stipe_members`
2. We check the member payment and assign them a tier (1, 2, 3). We log the user to our database (table: `members` and `member_updates`)
3. We place an API call to [Printful](https://developers.printful.com/docs/#tag/Orders-API/operation/createOrder) to order merch depending on the tier of the user. We log the order in our database (table: `merch_orders`)
4. We update the user in our [Mailchimp]((https://github.com/mailchimp/mailchimp-marketing-node/) Audience 
4. We generate an email verification and post it to our database (table: `email_verification_tokens`)
4. We fire an email to the user with their login link and welcoming them to the program.


### Critical checklist for testing any code changes
- does the members table receive update?
- does the member_updates table receive changes?
- does the merch_orders table receive changes?
- can users still login?
- does Printful build orders?
- does mailchimp update user?


### 4/25 - TO DOs
* [ ] Improve logging of errors
* [ ] integrate testing locally (not sure the path)

### 2/26 - TO DOs
**High priority**
1. Definitely better logging to help detect and investigate issues. This consists of the following:
   a. Having a separate, searchable logging system (I see you've set up Logtail already.)
   b. Adding a more structured logging [library](library) to the code (A more organized JSON-structured log allows for easier searching/categorization.)
   c. Configuring alerts in the logging system when something goes wrong (I'd like to set up email/Slack messages for when specific errors are detected.)
2. Add error handling for `new_order()` in `stripe_members.ts` - I think is how this issue went undetected for so long.

**Lower priority**
1. Configuring a separate Printful "store" for orders coming via the membership program. This would be like a separate sales "channel" that we'd be able to filter by, allowing for better troubleshooting on the Printful side.
2. Switch to using an ORM (I like [Prisma](Prisma)), so that we don't need to worry about writing SQL queries. It would just allow us to write JS and handle a lot of performance and security stuff for us.
3. Restructuring things on the DB side with primary/secondary keys to link tables together - One example is making `email` in the `member_updates` table a secondary key that links to the `members` table
4. Refactor and reuse code where possible to make things simpler
