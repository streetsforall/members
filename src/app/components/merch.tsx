'use client';

import { useEffect, useState } from "react";
import { merch_status } from "@/server/merch_status";





const Merch = (member: any) => {
    const [show, setShow] = useState(false);
    const [status, setStatus] = useState({'delivery_status' : '', 'orderstatus' : '', 'tracking_url' : '' })

    useEffect(() => {
        const getMerch = async (email:string) => {
            const order = await merch_status(email)
            console.log('order', order)
            setStatus(order)
        }

        getMerch(member.member.email)
    }, [])

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>2024 Merch</h2>
                <div className="status">order status: {status ? status.delivery_status != 'unknown' ? status.delivery_status : status.orderstatus : 'no order' }</div>
            </div>

        </div>
    )

}

export default Merch;