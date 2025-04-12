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
[] does the members table receive update?
[] does the member_updates table receive changes?
[] does the merch_orders table receive changes?
[] can users still login?
[] does Printful build orders?
[] does mailchimp update user?


### 4/25 - TO DOs
[] Improve logging of errors
[] integrate testing locally (not sure the path)
[] Members voting still not built out