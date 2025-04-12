'use server';

import { redirect } from 'next/navigation'
import * as dbHelp from '../../../server/dbHelpers'
import { validate_user, sign_out_user } from '../../../server/validate_user'
import Discounts from '../../components/discounts'
import Merch from '@/app/components/merch';
import { Billing_button } from '@/app/components/billing_button';
import { Upgrade_button } from '@/app/components/upgrade_button'
import Voting from '@/app/components/voting';
import { SignOut } from '@/app/components/signout'
import Events from '@/app/components/events';



export interface member {
    first_name: string;
    last_name: string;
    tier: number;
    email: string;
}


// this needs to be a server component to preserve data

const updateViews = async ({ params }: { params: { slug: string } }) => {

    // validating user cookies
    const memberData = await validate_user()

    // retrieve member data
    const member = (JSON.parse(JSON.stringify(memberData)))

    const teir_desc = (tier: number) => {
        if (tier == 10) {
            return ('Volunteer')
        } else if (tier == 1) {
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

            <img className="tier_img" src={member.tier == 1 ? '../pedestrian.png' : member.tier == 2 ? '../bike.png' : member.tier == 0 ? '../tree.png' : member.tier == 3 ? '../bus.png' : '../walkers.png'} />
            <p>Hi {member.name}, <br /><br />
                {member.tier > 0 ? `Thank you for supporting Streets for All. Welcome to your active ${teir_desc(member.tier)} Tier membership.` :
                    'Your membership is currently canceled. Please subscribe again to access member perks.'
                }
            </p>

            {member.tier > 0 ? <a href={params.slug + '/card'}><button>Member Card</button></a> :  <a href={'../../new'}><button>Sign Up Again</button></a>}



            

           

            <br />

        

            {member.tier != 0  &&  member.tier != 10 ? <Merch member={member} /> : ''}

            {/* only show discounts on tier 2 and 3 */}
            {member.tier > 1  &&  member.tier != 10 ? <Discounts member={member} /> : ''}

            {member.tier > 0 ? < Voting /> : ''}
            {member.tier > 0 ? < Events /> : ''}

            {member.tier < 3 &&  member.tier > 0?

                <div className='user_section'>
                    <div className='section_header' style={{backgroundColor:'white'}}>
                        <h2>Want more perks?</h2>
                        <Upgrade_button member={member}/>
                    </div>

                </div>


            : ''}





            <div className="info">
                <p>Last Payment: ${member.last_amount} on {readbleDate}</p>
            </div>

<div style={{display: 'flex', justifyContent: 'space-between'}}>
            <Billing_button member={member} />
            <SignOut />
            </div>
        </div>

    )
}

export default updateViews