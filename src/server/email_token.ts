'use server';

const nodemailer = require('nodemailer');
import pino from 'pino';
import sql from './db';
import * as dbHelp from './dbHelpers';

const parentLogger = pino();

// Instantiate mailer
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: 465,
  secure: true, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

/**
 * Send magic link for member login
 * @param email - Member's email
 * @returns
 */
async function new_token_email(email: string) {
  // Create logger instance for request
  const logger = parentLogger.child({ step: 'login' });

  const date = new Date().toLocaleString('en-US');

  // Retrieve member from DB
  const member = (
    await sql`
    SELECT * FROM members
    WHERE UPPER(email) LIKE UPPER(${email})
	`
  )[0];

  // Return immediately if not found
  if (!member) {
    logger.debug('Member not found');

    // Record email attempt
    await sql`
      INSERT INTO emails ( date, type, email_address, success)
        VALUES( ${date}, 'login request', ${email}, false)
    `;

    // Empty return to prevent user enumeration
    return;
  }

  logger.debug(
    { customer_id: member.customer_id },
    'Retrieved member from database',
  );

  // Generate token
  const verificationToken = await dbHelp.setEmailVerification(email);

  try {
    await transporter.sendMail({
      from: `"Streets for All Membership" ${process.env.EMAIL_FROM}`,
      to: email,
      subject: `Your Streets for All Membership Login Request`,
      html: `
        <html>
          <body>
            <div
              style="
                font-size: 1.2rem;
                padding: 1rem 2rem;
                max-width: 30rem;
                margin: auto;
                font-family:
                  Helvetica Neue,
                  Arial,
                  sans-serif;
              "
            >
              <a href="https://members.streetsforall.org" target="_blank">
                <img
                  style="max-width: 50%; margin: auto; width: 15rem; display: block"
                  src="cid:logo"
                />
              </a>

              <p>Hi ${member.name},</p>
              <p>Use this button to log into your membership page.</p>

              <button
                style="
                  font-family:
                    Helvetica Neue,
                    Arial,
                    sans-serif;
                  font-size: 1.1rem;
                  padding: 1rem 1.5rem;
                  background-color: #0032ff;
                  border-color: #183963;
                  border-radius: 1rem;
                  margin: auto;
                  color: white;
                  display: block;
                  border: none;
                "
              >
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  style="cursor: pointer; color: white; text-decoration: none"
                  href="${process.env.ROOT_URL}/link/${verificationToken}"
                >
                  LOGIN
                </a>
              </button>

              <p>
                If the button does not work, try
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="${process.env.ROOT_URL}/link/${verificationToken}"
                  >this link</a
                >
                or reach out to membership@streetsforall.org. This link expires in 1
                day.
              </p>
              <br />

              <p>
                Thank you for supporting our ongoing advocacy,<br />
                Streets for All<br />
                🚎 🚲 👩🏻‍🦽🚶🏾🌳
              </p>
            </div>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: 'members_club_logo.png',
          path: `https://members.streetsforall.org/members_club_logo.png`,
          cid: 'logo',
        },
      ],
    });

    logger.info(
      { customer_id: member.customer_id },
      'Login email successfully sent',
    );

    // Record email
    await sql`
      INSERT INTO emails ( date, type, email_address, success)
        VALUES( ${date}, 'login request', ${email}, true)
    `;

    // Empty return to prevent user enumeration
    return;
  } catch (error) {
    logger.error(error);

    throw new Error(error);
  }
}

/**
 * Send welcome email with magic link for member login
 * @param email - Member's email
 * @returns
 */
async function new_signup_email(email: string) {
  // Create logger instance for request
  const logger = parentLogger.child({ step: 'signup_email' });

  const date = new Date().toLocaleString('en-US');

  // Retrieve member from DB
  const member = (
    await sql`
    SELECT * FROM members
    WHERE UPPER(email) LIKE UPPER(${email})
  `
  )[0];

  // Return immediately if not found
  if (!member) {
    logger.debug('Member not found');

    // Record email attempt
    await sql`
      INSERT INTO emails ( date, type, email_address, success)
        VALUES( ${date}, 'welcome email', ${email}, false)
    `;

    // Empty return to prevent user enumeration
    return;
  }

  logger.debug(
    { customer_id: member.customer_id },
    'Retrieved member from database',
  );

  const tierName = getTierName(member.tier);

  // Generate token
  const verificationToken = await dbHelp.setEmailVerification(email);

  try {
    await transporter.sendMail({
      from: `"Streets for All Membership" ${process.env.EMAIL_FROM}`,
      to: email,
      subject: `Welcome to the Streets for All Membership Club`,
      html: `
        <html>
          <body>
            <div
              style="
                font-size: 1.2rem;
                padding: 1rem 2rem;
                max-width: 30rem;
                margin: auto;
                font-family:
                  Helvetica Neue,
                  Arial,
                  sans-serif;
              "
            >
              <a target="_blank" href="https://members.streetsforall.org/">
                <img
                  style="max-width: 50%; margin: auto; width: 15rem; display: block"
                  src="cid:logo"
                />
              </a>

              <p>Hi ${member.name},</p>
              <p>
                Welcome to the Streets For All Membership Club! Thank you for your
                support. Your recurring contribution will directly help us continue our
                mission to make the streets of Los Angeles and California safe for all
                modes of transportation.
              </p>

              <p>
                Be sure to check out all the awesome perks included in your ${tierName}
                Tier membership by loging into your membership portal below:
              </p>

              <a
                target="_blank"
                rel="noopener noreferrer"
                style="cursor: pointer; color: white; text-decoration: none"
                href="${process.env.ROOT_URL}/link/${verificationToken}"
              >
                <button
                  style="
                    font-family:
                      Helvetica Neue,
                      Arial,
                      sans-serif;
                    font-size: 1.1rem;
                    padding: 1rem 1.5rem;
                    background-color: #0032ff;
                    border-color: #183963;
                    border-radius: 1rem;
                    margin: auto;
                    color: white;
                    display: block;
                    border: none;
                  "
                >
                  LOGIN
                </button>
              </a>

              <p>
                If the button does not work, try
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="${process.env.ROOT_URL}/link/${verificationToken}"
                  >this link</a
                >
                or reach out to membership@streetsforall.org. The link expires in 1 day.
              </p>
              <br />

              <p>
                Thank you for supporting our ongoing advocacy,<br />
                - The Streets For All team<br />
                🚎 🚲 👩🏻‍🦽🚶🏾🌳
              </p>
            </div>
          </body>
        </html>
      `,
      attachments: [
        {
          filename: 'members_club_logo.png',
          path: `${process.env.ROOT_URL}/members_club_logo.png`,
          cid: 'logo',
        },
      ],
    });

    logger.info(
      { customer_id: member.customer_id },
      'Welcome email successfully sent',
    );

    // Record email
    await sql`
      INSERT INTO emails ( date, type, email_address, success)
        VALUES( ${date}, 'welcome email', ${email}, true)
    `;

    // Empty return to prevent user enumeration
    return;
  } catch (error) {
    logger.error(error);

    throw new Error(error);
  }
}

/**
 * Get name corresponding to tier level
 * @param tier - Tier level
 * @returns Tier name
 */
function getTierName(tier: number) {
  if (tier == 1) {
    return 'Pedestrian';
  } else if (tier == 2) {
    return 'Cargo Bike';
  } else {
    return 'Bus';
  }
}

export { new_token_email, new_signup_email };
