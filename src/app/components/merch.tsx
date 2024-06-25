'use client';

import { useState } from "react";

const Merch = (member: any) => {
    const [show, setShow] = useState(true);

return (
            <div className='user_section'>
                <h2>Order Merch 
                    <button onClick={() => setShow(!show)} className='hider'>{!show ? '►' : '▼'}</button>

                    
                </h2>

            </div>
    )

}

export default Merch;