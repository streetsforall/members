"use server"

import { NextApiRequest, NextApiResponse } from "next";
const nodemailer = require("nodemailer");
import sql from "./db";
import * as dbHelp from './dbHelpers'


// this is used to send emails to members

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: 465,
  secure: true, // Use `true` for port 465, `false` for all other ports
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

const new_token_email = async (to_email: string) => {

  // make sure email is valid
  const member = await sql`
			SELECT * FROM members
			WHERE email = ${to_email}
			`

  console.log('valid_email', member)

  if (member.length > 0) {

    const verificationToken = await dbHelp.setEmailVerification(to_email)

    console.log('emailtoken', verificationToken)

    console.log(member[0].first_name)

    try {

      const mail = await transporter.sendMail({
        from: `"Streets for All Membership" ${process.env.EMAIL_FROM}`,
        to: to_email,
        subject: `Your Streets for All Membership Login Request`,
        html:
          `
        <html>
          <body>
        <div style=" 
        font-size: 1.1rem;
        padding: 1rem 2rem; 
        max-width: 30rem; 
        margin: auto; 
        font-family: Helvetica Neue, Arial, sans-serif;"">

                <a target="_blank"  
                href="https://members.streetsforall.org/">
                <img 
                style="max-width: 50%; 
                margin: auto;
                width: 15rem;
                display: block"  
                src="cid:logo">
                </a>
                
                <p>Hi ${member[0].name},</p>
                <p>Use this button to log into your membership page.</p>
    

                <button style="
                fontFamily: Helvetica Neue, Arial, sans-serif; 
                font-size: 1.1rem;
                padding: 1rem 1.5rem;
                background-color: #0032ff; 
                border-color: #183963; 
                border-radius: 1rem;
                margin: auto;
                display: block;
                border: none;">

                <a target="_blank" 
                rel="noopener noreferrer" 
                style="cursor: pointer; 
                color: white;
                text-decoration: none;" 
                href="${process.env.ROOT_URL}/link/${verificationToken}">

                LOGIN

                <a/>

                </button>

                <p>If the button does not work, try <a target="_blank" rel="noopener noreferrer" href="${process.env.ROOT_URL}/link/${verificationToken}">this link</a> or reach out to membership@streetsforall.org. This link expires in 1 day.</p></br>

                <p>Thank you for supporting our ongoing advocacy, <br/> 
                Streets for All <br/> 
                 🚎 🚲 👩🏻‍🦽🚶🏾🌳
                 </p>
                </div>
          </body>
        </html>
        `,
        attachments: [{
          filename: 'members_club_logo.png',
          path: `${process.env.ROOT_URL}/members_club_logo.png`,
          cid: 'logo'
        }],
      })

      return ("Success: email was sent")

    } catch (error) {
      console.log(error)
      return (error)
    }
  } else {

    return ("COULD NOT SEND MESSAGE")
  }

}


const new_signup_email = async (to_email: string) => {

  // make sure email is valid
  const member = await sql`
			SELECT * FROM members
			WHERE email = ${to_email}
			`

  const teir_desc = (tier: number) => {
    if (tier == 1) {
      return ('Pedestrian')
    } else if (tier == 2) {
      return ('Cargo Bike')
    } else {
      return ('Bus')
    }
  }

  const memebrship_tier = teir_desc(member[0].tier)

  console.log('valid_email', member)

  if (member.length > 0) {

    const verificationToken = await dbHelp.setEmailVerification(to_email)
    console.log('emailtoken', verificationToken)



    try {

      const mail = await transporter.sendMail({
        from: `"Streets for All Membership" ${process.env.EMAIL_FROM}`,
        to: to_email,
        subject: `Welcome to the Streets for All Membership Club`,
        html:
          `
        <html>
          <body>
        <div style=" 
        font-size: 1.1rem;
        padding: 1rem 2rem; 
        max-width: 30rem; 
        margin: auto; 
        font-family: Helvetica Neue, Arial, sans-serif;"">
                
                <a target="_blank"  
                href="https://members.streetsforall.org/">
                <img 
                style="max-width: 50%; 
                margin: auto;
                width: 15rem;
                display: block"  
                src="cid:logo">
                </a>
                
                <p>Hi ${member[0].name},</p>
                <p>Welcome to the Streets For All Membership Club! Your recurring contribution will help us continue our mission to make the streets of Los Angeles safe for all modes of transportation.
                </p>

                <p>Be sure to check out all the awesome perks included in your ${memebrship_tier} Tier membership by loging into your membership portal below:</p>
    

                <a target="_blank" 
                rel="noopener noreferrer" 
                style="cursor: pointer; 
                color: white;
                text-decoration: none;" 
                href="${process.env.ROOT_URL}/link/${verificationToken}">

                <button style="
                fontFamily: Helvetica Neue, Arial, sans-serif; 
                font-size: 1.1rem;
                padding: 1rem 1.5rem;
                background-color: #0032ff; 
                border-color: #183963; 
                border-radius: 1rem;
                margin: auto;
                display: block;
                border: none;">

                LOGIN

                </button>

                <a/>

                <p>If the button does not work, try <a target="_blank" rel="noopener noreferrer" href="${process.env.ROOT_URL}/link/${verificationToken}">this link</a> or reach out to membership@streetsforall.org. The link expires in 1 day.</p></br>

                <p>Thank you for supporting our ongoing advocacy, <br/> 
                Streets for All <br/> 
                 🚎 🚲 👩🏻‍🦽🚶🏾🌳
                </div>
          </body>
        </html>
        `,
        attachments: [{
          filename: 'members_club_logo.png',
          path: `${process.env.ROOT_URL}/members_club_logo.png`,
          cid: 'logo'
        }],
      })

      return ("Success: email was sent")

    } catch (error) {
      console.log(error)
      return (error)
    }
  } else {

    return ("COULD NOT SEND MESSAGE")
  }

}


export { new_token_email, new_signup_email };
