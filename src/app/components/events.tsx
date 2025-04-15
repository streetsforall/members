'use client';

import { useState } from "react";

const Events = (member: any) => {
    const [show, setShow] = useState(false);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Next Member Event: April 17</h2>
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSeKOlQJf2uJvtam4LhDSOe86tnY2_z5jHiG0HePHr-bcxl4wQ/viewform">RSVP</a>
           
            </div>

            <div className={!show ? 'section_content hidden' : 'section_content'}>
                <p>April 17th</p>
                <p>Bar Bohemien <br/>
Culver City<br/>
6pm-8pm</p>
            </div>
        </div> 
    )

}

export default Events;