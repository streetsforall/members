# Membership Program

This is a web app for managing the SFA membership program. It is both the frontend application that members can sign into as well as the API endpoints for multiple utilities.

The members data lives in a Digital Ocean PostgreSQL database. 

Resources:
- [Printful API](https://developers.printful.com/docs/#tag/Orders-API/operation/createOrder)
- [Stripe API](https://docs.stripe.com/api/subscriptions)
- [Mailchimp API](https://github.com/mailchimp/mailchimp-marketing-node/)


## Simplified New Member Lifecycle
1. A new member signs up. This is done using Stripe and will call `membership.streetsforall.org/api/stipe_members`
2. We check the member payment and assign them a tier (1, 2, 3). We log the user to our database (table: `members` and `member_updates`)
3. We place an API call to [Printful](https://developers.printful.com/docs/#tag/Orders-API/operation/createOrder) to order merch depending on the tier of the user. We log the order in our database (table: `merch_orders`)
4. We update the user in our [Mailchimp]((https://github.com/mailchimp/mailchimp-marketing-node/) Audience 
4. We generate an email verification and post it to our database (table: `email_verification_tokens`)
4. We fire an email to the user with their login link and welcoming them to the program.

## Setting up a development environment

(There are other variables specified in `.env.example` that are required, but this covers the more complicated ones.)

### Database

Set up a local Postgres database to hold store memberships, merch orders, email attempts, discount codes, and more. An easy way is to use [Docker](https://hub.docker.com/_/postgres). Then fill out the `DO_` environment variables.

### Email

An email server is required to send welcome and login emails. You can use your Gmail account by creating an [app password](https://support.google.com/accounts/answer/185833) and setting the `EMAIL_` environment variables.

### Zapier

A Zapier webhook is used for triggering notifications. For development purposes, you can create a dummy webhook using [webhook.site](https://webhook.site). Update the `MEMBER_ZAP` environment variable with the webhook URL.

### Stripe

1. Create a [sandbox](https://docs.stripe.com/sandboxes).

2. Install the [Stripe CLI](https://docs.stripe.com/stripe-cli).

3. Connect your CLI to Stripe by logging in:

   ```sh
   stripe login
   ```

   This should provide you with the necessary `STRIPE_SECRET_KEY`.

4. Open the Developer Workbench in the Stripe sandbox, then go to **Webhooks**.

5. Create two webhooks:

   Name|URL|Events
   -|-|-
   **subscriptions**|https://test.members.streetsforall.org/api/subscriptions|`customer.subscription.created`,`customer.subscription.deleted`,`customer.subscription.updated`
   **sessions**|https://test.members.streetsforall.org/api/sessions|`checkout.sessions.completed`

   > [!NOTE]
   > The `test` subdomain isn't actually real. But we use it in the sandbox to make sure no webhook calls affect our production instance. (They will be redirected in a subsequent step.)

6. For the **subscriptions** and **sessions** webhooks, get the **Signing secret** from the Developer Workbench and update the `STRIPE_SUBSCRIPTIONS_HOOK_SECRET` and `STRIPE_SESSIONS_HOOK_SECRET` environment variables, respectively.

7. Start the listener to redirect webooks requests to your local machine:

   ```sh
   stripe listen --load-from-webhooks-api --forward-to localhost:3000
   ```

   This will route requests in the sandbox to the `/api/subscriptions` and `/api/sessions` endpoints to your local machine. And your local machine will appear as a new destination in developer workbench.

   > [!IMPORTANT]
   > You will need to keep this running to forward the requests, so it's best to do so in a separate terminal window.

### Next.js

Install dependencies:
```sh
npm Install
```

Then start the local development server:
```sh
npm run dev
```

### Creating test transactions

You can perform test transactions in the Stripe sandbox UI, which should call the webhook in the local destination.

> [!TIP]
> Stripe provides [dummy credit card numbers](https://docs.stripe.com/testing) you can use to create test transactions in the sandbox.

Alternatively, you can [trigger](https://docs.stripe.com/cli/trigger) specific webhook events directly by running the following (in a _different_ terminal window).:

```sh
stripe trigger <event>
```

This will send the event to the sandbox, which should then forward it back to your local machine if you've set everything up correctly.

> [!CAUTION]
> We currently do not have non-production environments for Printful or Mailchimp. So be sure to immediately cancel any orders that are created in Printful, and archive any contacts that are created in Mailchimp.

## Critical checklist for testing any code changes
- does the members table receive update?
- does the member_updates table receive changes?
- does the merch_orders table receive changes?
- can users still login?
- does Printful build orders?
- does mailchimp update user?
