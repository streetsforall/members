'use client';

import { useEffect, useState } from "react";
import { redirect } from 'next/navigation'
import * as dbHelp from '../../../server/dbHelpers'
import { validate_user}  from '../../../server/validate_user'
import Discounts from '../../components/discounts'
 


export interface member {
    first_name: string ;
    last_name: string ;
    tier: number;
    email: string;
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
            <div>loading user</div>
        )

    const teir_desc = (tier : number) => {
        if (tier == 1) {
            return('Pedestrian')
        } else if (tier == 2) {
            return('Cargo Bike')
        } else {
            return('Bus')
        }
    }

    const member_content = (
        member ?  
        <div>

        <img className="tier_img" src={member.tier == 1 ? '../pedestrian.png' : member.tier == 2 ? '../bike.png' : '../bus.png'}/>
        <p>Hi {member.first_name}, <br/> 
        welcome to your active {teir_desc(member.tier)} Tier membership.
        </p>
        
        
        <div className="user_table">
        <p>{member.first_name} {member.last_name}</p>
        <p>Tier {member.tier} member</p>
        </div>

        <Discounts email={member.email as string} />


        </div> : loading
     )

    return (<div className="user_page">
        {member_content}
    </div>)
}



export default UserPage