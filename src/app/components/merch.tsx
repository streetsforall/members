'use client';

import { useEffect, useState } from "react";
import { merch_status } from "@/server/merch_status";
import { retrieveMerchOrders } from '@/server/dbHelpers'
import { Row } from "postgres";





const Merch = (member: any) => {
    const [show, setShow] = useState(false);
    const [status, setStatus] = useState('')
    const [merch, setMerch] = useState<Row[]>([])

    useEffect(() => {

        const retrieveAllMerch = async (email: string) => {
            const order = await retrieveMerchOrders(email)
            setMerch(order)
            console.log(order)
        }

        const merch = retrieveAllMerch(member.member.email)


        // const retrieveMerch = async (email: string) => {
        //     const order = await merch_status(email)
        //     console.log('order', order)
        //     setStatus('testin orders')
        // }

        // retrieveMerch(member.member.email)
    }, [])


    const updateMerch = async () => {

        setMerch([])

        merch_status(member.member.email)

        const retrieveAllMerch = async (email: string) => {
            const order = await retrieveMerchOrders(email)
            setMerch(order)
            console.log(order)
        }

        const merch = retrieveAllMerch(member.member.email)

    }


    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Member Merch</h2>
                <button onClick={() => setShow(!show)} className='hider'>{!show ? '+' : '-'}</button>

            </div>
            <div className={!show ? 'section_content hidden' : 'section_content'}>

                {merch ? merch.map((item) => (

                    item.order_status ?

                        <div className="order">
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Order: {item.order_id}</span>
                                <span>Status:   {item.order_status == 'fulfilled' ? <a target="_blank" rel="noopener noreferrer" href={item.delivery_status} ><button>Tracking Link</button></a> : item.order_status}</span>
                            </div>

                            <div className="merch_grid">

                            {item.order_package ? JSON.parse(item.order_package).map((pack) => {
                                
                                console.log('pack', pack )

                                if (pack == 'shirt') {
                                    return(
                                    <div className="merch_item">
                                        <img src="/merch_shirt.jpg" />
                                        ✓ Members Club T-Shirt
                                    </div>
                                    )

                                }

                                if (pack == 'hat') {
                                    return(
                                    <div className="merch_item">
                                        <img src="/merch_hat.jpg" />
                                        ✓ Members Club Hat
                                    </div>
                                    )

                                }

                                if (pack == 'sticker') {
                                    return(
                                    <div className="merch_item">
                                        <img src="/merch_stickers.jpg" />
                                        ✓ Members Club Sticker Sheet
                                    </div>
                                    )
                                }


                            }) : ''}
                            </div>

                        </div> : ''
                )) : ''}

                <button onClick={() => updateMerch()}>Refresh Orders</button>

                {/* <p className="status"> */}
                {/* Order status: <span style={{color: 'green'}}>{status ? status.delivery_status != 'unknown' ? status.delivery_status : status.orderstatus : 'no order found'}</span> 
                {status.tracking_url && (status.delivery_status != 'delivered' && status.delivery_status != 'no order') ? <a target="_blank" rel="noopener noreferrer" href= {status.tracking_url} ><button>Tracking Link</button></a> : ''}</p> */}

            </div>

        </div>
    )

}

export default Merch;