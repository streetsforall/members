'use client';

import { useEffect, useState } from "react";
import { merch_status } from "@/server/merch_status";





const Merch = (member: any) => {
    const [show, setShow] = useState(false);
    const [status, setStatus] = useState({ 'delivery_status': '', 'orderstatus': '', 'tracking_url': '' })


    const teir_desc = (tier: number) => {
        if (tier == 1) {
            return (
                <div className="merch_grid">
                    <div className="merch_item">
                        <img src="/merch_stickers.jpg" />
                        ✓ Members Club Sticker Sheet
                    </div>
                </div>
            )
        } else if (tier == 2) {
            return (
                <div className="merch_grid">
                    <div className="merch_item">
                        <img src="/merch_stickers.jpg" />
                        ✓ Members Club Sticker Sheet
                    </div>
                    <div className="merch_item">
                        <img src="/merch_shirt.jpg" />
                        ✓ Members Club T-Shirt
                    </div>
                </div>
            )
        } else {
            return (
                <div className="merch_grid">
                    <div className="merch_item">
                        <img src="/merch_stickers.jpg" />
                        ✓ Members Club Sticker Sheet
                    </div>
                    <div className="merch_item">
                        <img src="/merch_shirt.jpg" />
                        ✓ Members Club T-Shirt
                    </div>
                    <div className="merch_item">
                        <img src="/merch_hat.jpg" />
                        ✓ Members Club Hat
                    </div>
                </div>
            )
        }
    }



    useEffect(() => {
        const getMerch = async (email: string) => {
            const order = await merch_status(email)
            console.log('order', order)
            setStatus(order)
        }

        getMerch(member.member.email)
    }, [])

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Member Merch</h2>
                <button onClick={() => setShow(!show)} className='hider'>{!show ? '+' : '-'}</button>

            </div>
            <div className={!show ? 'section_content hidden' : 'section_content'}>
                <p className="status">
                    Order status: <span style={{color: 'green'}}>{status ? status.delivery_status != 'unknown' ? status.delivery_status : status.orderstatus : 'no order found'}</span> 
                {status.tracking_url && status.delivery_status != 'delivered' ? <a target="_blank" rel="noopener noreferrer" href= {status.tracking_url} ><button>Tracking Link</button></a> : ''}</p>
                {teir_desc(member.member.tier)}

            </div>

        </div>
    )

}

export default Merch;