"use server"

import { NextApiRequest, NextApiResponse } from "next";
const nodemailer = require("nodemailer");
import sql from "./db";
import * as dbHelp from './dbHelpers'



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
                <img 
                style="max-width: 60%; 
                margin: auto;
                width: 20rem;
                display: block"  
                src="cid:logo">
                
                <p>Hi ${member[0].first_name},</p>
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
                <p>If the button does not work, try <a target="_blank" rel="noopener noreferrer" href="${process.env.ROOT_URL}/link/${verificationToken}">this link</a> or reach out to membership@streetsforall.org.</p>
                <p>Thank you for supporting our ongoing advocacy,</p>
                <p>Streets for All</p>
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

export default new_token_email;
