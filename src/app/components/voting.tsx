'use client';

import { useState } from "react";

const Voting = (member: any) => {
    const [show, setShow] = useState(true);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Member Voting</h2>
                <span>coming soon</span>

            </div>
        </div>
    )

}

export default Voting;