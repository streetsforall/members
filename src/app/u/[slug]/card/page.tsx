'use server';

import { validate_user } from '@/server/validate_user'


export interface member {
    first_name: string;
    last_name: string;
    tier: number;
    email: string;
}


const updateViews = async () => {

    // validating user cookies
    const memberData = await validate_user()

    // retrieve member data
    const member = (JSON.parse(JSON.stringify(memberData)))

    const date = new Date(member.joined_date) as any
    const today = new Date() as any

    var diff_month = today.getMonth() - date.getMonth();
    var diff_days = today.getDate() - date.getDate();

    var elapsed = ''
    if (diff_month < 1) {
        elapsed = `MEMBER FOR ${diff_days} DAYS`
    }  else if (diff_month == 1) {
        elapsed = `MEMBER FOR 1 MONTH`
    } else {
        elapsed = `MEMBER FOR ${diff_month}  MONTHS`
    }



    const readbleDate = date.toDateString()

    const teir_desc = (tier: number) => {
        if (tier == 0) {
            return ('CANCELED')
        } else if (tier == 1) {
            return ('PEDESTRIAN')
        } else if (tier == 2) {
            return ('CARGO BIKE')
        } else {
            return ('BUS')
        }
    }


    return (
        <>
            <div className="user">



                <p style={{ maxWidth: 'max-content', margin: 'auto', marginBottom: '2rem' }}>
                    <a href={'../' + memberData.id}>
                        User Page
                    </a>
                </p>

                    <div className={'user_card ' + (member.tier == 0 ? 'canceled_member' : '')}>
                        <div>
                            <img className="card_tier_img" src={member.tier == 0 ? '' : member.tier == 1 ? '/pedestrian.png' : member.tier == 2 ? '/bike.png' : '/bus.png'} />
                            <span>{teir_desc(member.tier)} MEMBER </span>
                        </div>

                        <div>
                            <img style={{ margin: 'auto' }} src="/members_logo_white.png" />
                        </div>


                        <div>
                            <span>                    {member.name}</span>
                            <span>{ member.tier != 0 ? elapsed : ''}</span>
                        </div>
                    </div>

            </div>
        </>

    )
}

export default updateViews