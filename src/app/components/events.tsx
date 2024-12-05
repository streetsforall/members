'use client';

import { useState } from "react";

const Events = (member: any) => {
    const [show, setShow] = useState(false);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Next Member Event: Dec 13</h2>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSf2STS8VltZT0ew3QpnBkS2-NMZGXnEAJz6OWftZKKB3FJV6g/viewform?usp=sf_link">RSVP</a>
           
            </div>

            <div className={!show ? 'section_content hidden' : 'section_content'}>
                <p>December 13th</p>
                <p>More details will go out by email.</p>
            </div>
        </div> 
    )

}

export default Events;