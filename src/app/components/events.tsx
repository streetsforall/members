'use client';

import { useState } from "react";

const Events = (member: any) => {
    const [show, setShow] = useState(false);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Next Member Event Coming Soon!</h2>
            
           
            </div>

            {/* <div className={!show ? 'section_content hidden' : 'section_content'}>

            </div> */}
        </div> 
    )

}

export default Events;