'use client';

import { useState } from "react";

export function Shirt_size() {
    return (
        <div>
            Select Shirt Size
            <div>
                <input required type="radio" name="shirt_size" value="X-S" />
                <label htmlFor="S">X-Small</label>
            </div>
            <div>
                <input type="radio" name="shirt_size" value="S" />
                <label htmlFor="S">Small</label>
            </div>
            <div>
                <input type="radio" name="shirt_size" value="M" />
                <label htmlFor="M">Medium</label>
            </div>
            <div>
                <input type="radio" name="shirt_size" value="L" />
                <label htmlFor="L">Large</label>
            </div>
            <div>
                <input type="radio" name="shirt_size" value="XL" />
                <label htmlFor="XL">X-Large</label>
            </div>
            <div>
                <input type="radio" name="shirt_size" value="XXL" />
                <label htmlFor="XXL">XX-Large</label>
            </div>
        </div>
    )
}



const Merch = (member: any) => {
    const [show, setShow] = useState(false);

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Order 2024 Merch</h2>
                <button onClick={() => setShow(!show)} className='hider'> {!show ? '+' : '-'}</button>
            </div>




            <div className={!show ? 'hidden' : 'unhidden'}>

                <form id="merch_form">
                    {member.member.tier > 1 ? <Shirt_size /> : ''}

                    {member.member.shipping_address}
                    <button type="submit">Order Merch</button>
                    </form>

            </div>

        </div>
    )

}

export default Merch;