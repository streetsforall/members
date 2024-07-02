'use client';

import { useState } from "react";

const Events = (member: any) => {
    const [show, setShow] = useState(true);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Upcoming Events</h2>
                <span>coming soon</span>
            </div>
        </div>
    )

}

export default Events;