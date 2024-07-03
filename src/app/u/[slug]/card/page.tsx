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

    const date = new Date(member.joined_date);
    const readbleDate = date.toDateString()

    return (
        <>
            <div className="user">

                <a href={'../'+memberData.id}>
                    <p className="light_butt" style={{maxWidth: 'max-content', margin: 'auto', marginBottom: '2rem'}}>
                    User Page
                    </p>
                </a>

                <div className="user_card">


                    {member.name}
                    <div className='tier'>
                        <p>{member.tier}</p>
                    </div>

                    <div>
                        <span>CLUB MEMBER SINCE {readbleDate}</span>
                    </div>
                </div>
            </div>
        </>

    )
}

export default updateViews