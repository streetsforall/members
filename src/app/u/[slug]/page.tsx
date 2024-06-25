'use server';

import { redirect } from 'next/navigation'
import * as dbHelp from '../../../server/dbHelpers'
import { validate_user } from '../../../server/validate_user'
import Discounts from '../../components/discounts'
import Merch from '@/app/components/merch';
import {Billing_button} from '@/app/components/billing_button';



export interface member {
    first_name: string;
    last_name: string;
    tier: number;
    email: string;
}


// this needs to be a server component to preserve data

const updateViews = async () => {

    // validating user cookies
    const memberData = await validate_user()

    // retrieve member data
    const member = (JSON.parse(JSON.stringify(memberData)))

    const teir_desc = (tier: number) => {
        if (tier == 1) {
            return ('Pedestrian')
        } else if (tier == 2) {
            return ('Cargo Bike')
        } else {
            return ('Bus')
        }
    }
    const date = new Date(member.last_donation);
    const readbleDate = date.toDateString()

    return (
        <div className="user_page">

            <img className="tier_img" src={member.tier == 1 ? '../pedestrian.png' : member.tier == 2 ? '../bike.png' : '../bus.png'} />
            <p>Hi {member.first_name}, <br />
                welcome to your active {teir_desc(member.tier)} Tier membership.
            </p>

        <Billing_button member={member}/>



            <div className="info">
                <p>{member.first_name} {member.last_name} • Tier {member.tier} member</p>
                <p>Last Payment: ${member.last_amount} on {readbleDate}</p>
            </div>
            <Merch member={member} />

            {/* only show discounts on tier 2 and 3 */}
            {member.tier > 1 ? <Discounts member={member} /> : ''}


        </div>

    )
}

export default updateViews