'use client';

import { useState } from "react";

const Events = (member: any) => {
    const [show, setShow] = useState(false);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Next Member Event</h2>
                <button onClick={() => setShow(!show)} className='hider'>{!show ? '+' : '-'}</button>
           
            </div>

            <div className={!show ? 'section_content hidden' : 'section_content'}>
                <p>Fall 2024! Details coming soon!</p>
            </div>
        </div> 
    )

}

export default Events;