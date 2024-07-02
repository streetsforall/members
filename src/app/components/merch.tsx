'use client';

import { useState } from "react";



const Merch = (member: any) => {
    const [show, setShow] = useState(false);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>2024 Merch</h2>
                <div className="status">✔ Delivered</div>
            </div>


        </div>
    )

}

export default Merch;