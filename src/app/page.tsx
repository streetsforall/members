import { useRouter } from 'next/router'
import './global.css'

export default function LoginPage() {


  // if no valid cookie
  // show form that allows to request an email


  return (
    <div>
      <form className="login_form">
        <div>
        <input type="email" name="email" placeholder="Email" required />
        <button type="submit">Request Login Link</button>
        </div>
      </form>
    </div>
  )
}