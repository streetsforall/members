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
    const [slide, setSlide] = useState(1)

    // set total number of slides
    const maxSlides = 4

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


    const nextSlide = (move : number) => {


        var newSlide = move + slide
        if (newSlide > maxSlides) {
            newSlide = 1
        } else if (newSlide < 1) {
            newSlide = maxSlides
        }
        setSlide(newSlide)

        var slides = document.getElementsByClassName("slide") as HTMLCollectionOf<HTMLElement>;
        for (let slide of slides) {
            parseInt(slide.getAttribute('data-key') as string) == newSlide ? slide.hidden = false : slide.hidden = true
        }
       
    }





    // could proably clean this up with a map inctead of duplicate JSX Divs
    // but seems easier to manage/read as they need custom functions

    return (
        <div className='user_section'>
            <div className='section_header'>
                <h2>Store Discounts</h2>
                <button onClick={() => setShow(!show)} className='hider'>{!show ? '+' : '-'}</button>
            </div>
            
            <div className={!show ? 'hidden' : 'unhidden'}>

           



                <div className="slider">

                    <button className="slide_controler" id='s_left' onClick={() => nextSlide(-1)}> &lt; </button>
                    <button className="slide_controler"  id='s_right' onClick={() => nextSlide(1)}> &gt;  </button>

                    <div data-key={1} className="slide">
                        {/* Peak Design */}
                        <img src='/peak_design.jpg'/>

                        <p><a target="_blank" rel="noopener noreferrer" href="https://www.peakdesign.com/"> Peak Design</a>  <Tooltip>You can only request a Peak Design code every 2 weeks</Tooltip></p>
                        <p>Peak Design makes premium bags, camera gear, and phone cases. Get 15% off all orders.</p>
                        <p>{!code ?
                            <button className='light_butt' onClick={() => getCode(member.member.email)}>
                                Request Discount Code
                            </button> : <span>Discount Code:  <Copyblock>{code}</Copyblock></span>}

                            <span style={{marginLeft: '.5rem'}}>{timeout ? <button className='light_butt' onClick={() => getCode(member.member.email)}>
                                Get New Code
                            </button> : ''}</span>
                        </p>
                    </div>

                    <div hidden data-key={2} className="slide">
                        {/* // Thousand */}
                        <img src='/thousand.jpeg'/>

                        <p><a target="_blank" rel="noopener noreferrer" href="https://explorethousand.com/">Thousand</a></p>
                        <p>Thousand makes incredibly comfortable and safe helmets. Get 15% off all orders.</p>
                        <p>Discount Code: <Copyblock>StreetsForAll</Copyblock></p>
                    </div>

                    <div hidden data-key={3} className="slide">
                        {/* // Cleverhood */}
                        <img src='/Cleverhood.jpeg'/>
                        <p><a target="_blank" rel="noopener noreferrer" href="https://cleverhood.com/pages/streets-for-all">Cleverhood</a></p>
                        <p>Cleverhood makes high quality jackets and gear for biking and walking. 15% off select merch.</p>
                        <p><a className="light_butt" href="https://cleverhood.com/pages/streets-for-all">Discount Link</a></p>
                    </div>

                    <div hidden data-key={4} className="slide">
                        {/* // SFA */}
                        <img src="/bdsm.jpg"/>
                        <p><a target="_blank" rel="noopener noreferrer" href="https://www.streetsforall.org/merch">Streets for All</a></p>
                        <p>Get 15% off all orders through the SFA merch store including shirts, hats, and tote bags.</p>
                        <p>Discount Code: <Copyblock>STREETS_MEMBERS_CLUB</Copyblock></p>
                    </div>

                    <p style={{textAlign:'right'}}>{slide}/{maxSlides}</p>
                </div>

            </div>
        </div>

    )

}

export default Discounts;