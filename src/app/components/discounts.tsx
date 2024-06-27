'use client';

import { getNextPeakCode, getCurrentPeakCode } from '../../server/dbHelpers';
import { useEffect, useState } from "react";
import Tooltip from './tooltip';


type Props = {
    children: string
}

const Copyblock = ({ children }: Props) => {
    const [copied, setCopied] = useState(false);

    return (
        <span tabIndex={0} className="copyblock">
            <span className={copied ? 'copied' : 'not'} onClick={() => { navigator.clipboard.writeText(children); setCopied(true) }} >
                {children}
            </span>
        </span>
    )
}

const Discounts = (member: any) => {
    const [code, setCode] = useState('');
    const [show, setShow] = useState(false);
    const [timeout, setTimeout] = useState(false);

    const getCode = async (email: string) => {
        const new_code = await getNextPeakCode(email)
        console.log(new_code)
        setCode(new_code)
        setTimeout(false)

    }

    useEffect(() => {
        const getCurrentCode = async (email: string) => {
            const current_code = await getCurrentPeakCode(email)
            console.log(member.member.email)
            if (current_code) {
                console.log(current_code)
                setCode(current_code.code)

                // set timeout 2 weeks ahead
                const date_requested = new Date(current_code.date_used);
                date_requested.setDate(date_requested.getDate() + 2 * 7);

                const now = new Date();

                console.log('now', now)
                console.log('then', date_requested)

                // check if code has been requested in the last 4 weeks
                if (now >= date_requested) {
                    setTimeout(true)
                }

            }
        }

        getCurrentCode(member.member.email);

    }, [])


    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Store Discounts</h2>
                <button onClick={() => setShow(!show)} className='hider'>{!show ? '►' : '▼'}</button>
            </div>

            {show ?
                <div>
                    <p>Use these codes to get 15% off all items. Peak Design codes are unique and can be requested every 2 weeks.</p>
                    <table className='discounts'>
                        <tbody>
                            <tr>
                                {/* Peak Design */}
                                <th><a target="_blank" rel="noopener noreferrer" href="https://www.peakdesign.com/"> Peak Design</a>  <Tooltip>You can only request a Peak Design code every 2 weeks</Tooltip>:</th>
                                <th>{!code ?
                                    <button className='light_butt' onClick={() => getCode(member.member.email)}>
                                        Request Discount Code
                                    </button> :
                                    <Copyblock>{code}</Copyblock>}

                                    <span>{timeout ? <button className='light_butt' onClick={() => getCode(member.member.email)}>
                                        Get New Code
                                    </button> : ''}</span>
                                </th>
                            </tr>
                            <tr>
                                {/* // SFA */}
                                <th><a target="_blank" rel="noopener noreferrer" href="https://www.streetsforall.org/merch">Streets for All</a>:</th>
                                <th><Copyblock>STREETS_MEMBERS_CLUB</Copyblock></th>
                            </tr>
                            <tr>
                                {/* // Thousand */}
                                <th><a target="_blank" rel="noopener noreferrer" href="https://explorethousand.com/">Thousand</a>:</th>
                                <th><Copyblock>StreetsForAll</Copyblock></th>
                            </tr>
                            <tr>
                                {/* // Cleverhood */}
                                <th><a target="_blank" rel="noopener noreferrer" href="https://cleverhood.com/pages/streets-for-all">Cleverhood</a>:</th>
                                <th><a className="light_butt" href="https://cleverhood.com/pages/streets-for-all">Use Link</a></th>
                            </tr>
                        </tbody>
                    </table> </div> : ''}

        </div>
    )

}

export default Discounts;