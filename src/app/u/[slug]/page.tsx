'use client';

import { useEffect, useState } from "react";
import { redirect } from 'next/navigation'
import * as dbHelp from '../../../server/dbHelpers'
import { validate_user}  from '../../../server/validate_user'



export interface member {
    first_name: string ;
    last_name: string ;
    tier: number;
  }

const UserPage = ({ params }: { params: { slug: string } }) => {
    const [member, setmember] = useState<member>();


    useEffect (() => {
        const updateViews = async () => {
            const memberData = await validate_user()
            setmember(JSON.parse(JSON.stringify(memberData)))
          }
          updateViews()
    }, [])

    console.log(member)

    const loading = (
            <div>loading page</div>
        )

    const member_content = (
        <div>
        <h1>Welcome to your SFA Membership Page</h1>
        <p>{member ? member.first_name : ''} {member? member.last_name : ''}</p>
        <p>You are a tier {member ? member.tier : ''} member</p>
        </div>
     )

    return (<div>
        {member ? member_content : loading}
    </div>)
}



export default UserPage