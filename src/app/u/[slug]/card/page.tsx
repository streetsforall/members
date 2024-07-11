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
    if (diff_days == 1) {
        elapsed = `SUPPORTER FOR ${diff_days} DAY`
    } else if (diff_month < 1) {
        elapsed = `SUPPORTER FOR ${diff_days} DAYS`
    } else if (diff_month == 1) {
        elapsed = `SUPPORTER FOR 1 MONTH`
    } else {
        elapsed = `SUPPORTER FOR ${diff_month}  MONTHS`
    }



    const readbleDate = date.toDateString()

    const teir_desc = (tier: number) => {
        if (tier == 0) {
            return ('CANCELED MEMBERSHIP')
        } else if (tier == 1) {
            return ('PEDESTRIAN ADVOCATE')
        } else if (tier == 2) {
            return ('CARGO BIKE ADVOCATE')
        } else if (tier == 10) {
            return ('VOLUNTEER ADVOCATE')
        } else {
            return ('BUS ADVOCATE')
        }
    }


    return (
        <>
            <div className="card_page">





                <div className={'user_card ' + (member.tier == 0 ? 'canceled_member' : '')}>
                    <div>
                        <img className="card_tier_img" src={member.tier == 0 ? '' : member.tier == 1 ? '/pedestrian.png' : member.tier == 2 ? '/bike.png' : '/bus.png'} />
                        <span>{teir_desc(member.tier)}</span>
                    </div>

                    <div style={{flexDirection: 'column'}}>
                        <img style={{ margin: 'auto' }} src="/members_logo_white.png" />
                        <p style={{ margin: 'auto' }}>CLUB MEMBER</p>
                    </div>


                    <div>
                        <span>                    {member.name}</span>
                        <span>{member.tier != 0 ? elapsed : ''}</span>
                    </div>
                </div>

                <p style={{ maxWidth: 'max-content', margin: 'auto', marginTop: '2rem' }}>
                    <a href={'../' + memberData.id}>
                        User Page
                    </a>
                </p>

            </div>
        </>

    )
}

export default updateViews