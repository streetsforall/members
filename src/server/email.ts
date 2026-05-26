import pino, { type Logger } from 'pino';
import sql from './db';
import { getTierName } from './email_token';
import { setEmailVerification } from './dbHelpers';

const nodemailer = require('nodemailer');

// Used for any loggers not passed as arguments
const defaultLogger = pino();

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
 * Send welcome email with magic link for member login
 * @param membership - Membership data
 * @param logger - Instance used for logging
 * @returns
 */
async function sendWelcomeEmail(
  membership: { email: string; name: string; tier: number },
  logger: Logger = defaultLogger,
) {
  // Create logger instance for request
  const childLogger = logger.child({ step: 'send_welcome_email' });

  const { email, name, tier } = membership;

  const date = new Date().toLocaleString('en-US');
  const tierName = getTierName(tier);

  // Generate token
  const verificationToken = await setEmailVerification(email);

  try {
    await transporter.sendMail({
      from: `"Streets For All Membership" ${process.env.EMAIL_FROM}`,
      to: email,
      subject: `Welcome to the Streets For All Membership Club`,
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

              <p>Hi ${name},</p>
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

    childLogger.info('Welcome email successfully sent');

    // Record email
    await sql`
      INSERT INTO emails ( date, type, email_address, success)
        VALUES( ${date}, 'welcome email', ${email}, true)
    `;

    // Empty return to prevent user enumeration
    return;
  } catch (error) {
    childLogger.error(error);

    throw error;
  }
}

export { sendWelcomeEmail };
