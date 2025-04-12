'use client'

import { sign_out_user } from "@/server/validate_user"

export function SignOut() {
    return(
        <button className='light_butt' onClick={() => sign_out_user()}>sign out</button>
        )
}

