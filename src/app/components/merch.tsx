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
                                <span>{item.order_status == 'fulfilled' ? <a target="_blank" rel="noopener noreferrer" href={item.delivery_status} ><button className="light_butt">Tracking Link</button></a> : 'Status: '+item.order_status}</span>
                            </div>

                            <div className="merch_grid">

                            {console.log('item.order_package', item.order_package)}

                            {item.order_package.length > 0 ? JSON.parse(item.order_package).map((pack : any) => {
                                
                                console.log('pack', pack )

                                if (pack == 'shirt') {
                                    return(
                                    <div className="merch_item">
                                        <img src="/merch_shirt.jpg" />
                                        1x Members Club T-Shirt
                                    </div>
                                    )

                                }

                                if (pack == 'hat') {
                                    return(
                                    <div className="merch_item">
                                        <img src="/merch_hat.jpg" />
                                        1x Members Club Hat
                                    </div>
                                    )

                                }

                                if (pack == 'sticker') {
                                    return(
                                    <div className="merch_item">
                                        <img src="/merch_stickers.jpg" />
                                        1x Members Club Sticker Sheet
                                    </div>
                                    )
                                }


                            }) : ''}
                            </div>

                        </div> : ''
                )) : ''}

                <button style={{marginTop: '.5rem'}} className="light_butt" onClick={() => updateMerch()}>Refresh Orders</button>

                {/* <p className="status"> */}
                {/* Order status: <span style={{color: 'green'}}>{status ? status.delivery_status != 'unknown' ? status.delivery_status : status.orderstatus : 'no order found'}</span> 
                {status.tracking_url && (status.delivery_status != 'delivered' && status.delivery_status != 'no order') ? <a target="_blank" rel="noopener noreferrer" href= {status.tracking_url} ><button>Tracking Link</button></a> : ''}</p> */}

            </div>

        </div>
    )

}

export default Merch;