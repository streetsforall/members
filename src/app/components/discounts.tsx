'use client';

import { getNextPeakCode } from '../../server/dbHelpers';
import { useState } from "react";


const Discounts = (member: any) => {
    const [code, setCode] = useState('');
    const [show, setShow] = useState(true);

    const getCode = async (email: string) => {
        const new_code = await getNextPeakCode(email)
        console.log(new_code)
        setCode(new_code)
    }


    return (
            <div  className='user_section'>
                <h2>Store Discounts 
                    <button onClick={() => setShow(!show)} className='hider'>{!show ? '►' : '▼'}</button>
                </h2>
                {show ? 
                <table className='discounts'>
                    <tbody>
                        <tr>
                            {/* Peak Design */}
                            <th><a target="_blank" rel="noopener noreferrer" href="https://www.peakdesign.com/"> Peak Design</a> (15% off):</th>
                            <th>{!code ?
                                <button className='light_butt' onClick={() => getCode(member.member.email)}>
                                    Request Discount Code
                                </button> : code}</th>
                        </tr>
                        <tr>
                            {/* // SFA */}
                            <th><a target="_blank" rel="noopener noreferrer" href="https://www.streetsforall.org/merch">Streets for All</a> (15% off):</th>
                            <th>STREETS_MEMBERS_CLUB</th>
                        </tr>
                        <tr>
                            {/* // Thousand */}
                            <th><a target="_blank" rel="noopener noreferrer" href="https://explorethousand.com/">Thousand</a> (15% off):</th>
                            <th>StreetsForAll</th>
                        </tr>
                        <tr>
                            {/* // Cleverhood */}
                            <th><a target="_blank" rel="noopener noreferrer" href="https://cleverhood.com/pages/streets-for-all">Cleverhood</a> (15% off):</th>
                            <th><a href="https://cleverhood.com/pages/streets-for-all">Use Link</a></th>
                        </tr>
                    </tbody>
                </table> : ''}

            </div>
    )

}

export default Discounts;