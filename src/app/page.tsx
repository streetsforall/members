'use client';

import { useRouter } from 'next/router'
import { useState, useEffect } from "react";

import { validate_user } from '../server/validate_user'
import { sendLoginEmail } from '@/server/email';

export default function LoginPage() {
  
  const [memberID, setMemberID] = useState('');
  const [emailSent, setEmailSent] = useState(true);


  // if no valid cookie
  // show form that allows to request an email

  useEffect(() => {
    const updateViews = async () => {
      const memberData = await validate_user()
      if (memberData) {
        setMemberID(memberData.id)
      } else {
        console.log('no member')
      }
    }
    updateViews()
  }, [])



  const fireEmail = (event: any) => {

    event.preventDefault()

    console.log(event.target.elements[0].value)

    const email = sendLoginEmail({ email: event.target.elements[0].value })
    console.log(email)
    setEmailSent(false)
  }



  function LoginForm() {

    return (

      <div className="login_page">

        {memberID ? <div> <a href={`/u/${memberID}`}><button>Log in to last session</button></a> </div> : ''}
        <br />

        {emailSent ?
          <form onSubmit={(event) => fireEmail(event)} >
            <div>
              <input id='email' type="email" name="email" placeholder="Email" required />
              <button type="submit">Request Login Link</button>
            </div>
          </form>
          :
          <div>
            <h2 className='alert'>Login link sent!</h2>
            If you are a verified member, check your email for a new login link.
            <br /><br />
            If you are having difficulties, reach out to membership@streetsforall.org
          </div>
        }
        <p className="sub">Don&apos;t have an account? <a href="/new">Sign up here</a></p>
      </div>
    )
  }


  return (
    <div>
      <LoginForm />
    </div>
  )

}