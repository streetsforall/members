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
  const valid_email = await sql`
			SELECT * FROM members
			WHERE email = ${to_email}
			`

  console.log('valid_email', valid_email)
  if (valid_email) {

    const verificationToken = await dbHelp.setEmailVerification(to_email)

    console.log('emailtoken', verificationToken)

    try {

      const mail = await transporter.sendMail({
        from: `"Streets for All Membership" ${process.env.EMAIL_FROM}`,
        to: to_email,
        subject: `Your Streets for All Membership Page`,
        html: `<div style="fontFamily: "Helvetica Neue", Arial, sans-serif; borderColor: #183963;>
        <p>Here is your link to log into your membership page.</p></br>
        <a href="${process.env.ROOT_URL}/link/${verificationToken}">
        <button style="fontFamily: "Helvetica Neue", Arial, sans-serif; backgroundColor: none; borderColor: #183963; color: #183963" >
        Log In
        </button>
        <a/>
        </div>
        `,
      })

      return ("Success: email was sent")

    } catch (error) {
      console.log(error)
      return ("COULD NOT SEND MESSAGE")
    }
  } else {

    return ("COULD NOT SEND MESSAGE")
  }

}

export default new_token_email;
