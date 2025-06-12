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
    const maxSlides = 6

    const getCode = async (email: string) => {
        const new_code = await getNextPeakCode(email)
        console.log(new_code)
        setCode(new_code)
        setTimeout(false)
    }

    useEffect(() => {
        const getCurrentCode = async (email: string) => {
            const current_code = await getCurrentPeakCode(email)
            if (current_code) {
                setCode(current_code.code)

                // set timeout 2 weeks ahead
                const date_requested = new Date(current_code.date_used);
                date_requested.setDate(date_requested.getDate() + 2 * 7);

                const now = new Date();


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
            
            <div className={!show ? 'section_content hidden' : 'section_content'}>

           



                <div className="slider">

                    <button className="slide_controler" id='s_left' onClick={() => nextSlide(-1)}> &lt; </button>
                    <button className="slide_controler"  id='s_right' onClick={() => nextSlide(1)}> &gt;  </button>


                    <div data-key={1} className="slide">
                        {/* // Thousand */}
                        <img src='/thousand.jpeg'/>

                        <p><a target="_blank" rel="noopener noreferrer" href="https://explorethousand.com/">Thousand</a></p>
                        <p>Thousand makes incredibly comfortable and safe helmets. Get 15% off all orders.</p>
                        <p>Discount Code: <Copyblock>StreetsForAll</Copyblock></p>
                    </div>


                    <div hidden data-key={2} className="slide">
                        {/* Peak Design */}
                        <img src='/peak_design.jpg'/>

                        <p><a target="_blank" rel="noopener noreferrer" href="https://www.peakdesign.com/"> Peak Design</a>  </p>
                        <p>Peak Design makes premium bags, camera gear, and phone cases. Get 15% off all orders.</p>
                        <p>{!code ?
                            <button className='light_butt' onClick={() => getCode(member.member.email)}>
                                Request Discount Code
                            </button> : <span>Discount Code:  <Copyblock>{code}</Copyblock></span>}

                            <span style={{marginLeft: '.5rem'}}>{timeout ? <button className='light_butt' onClick={() => getCode(member.member.email)}>
                                Get New Code
                            </button> : ''}</span>
                            <Tooltip>Each Peak Design code can only be used once. You can request a Peak Design code every 2 weeks</Tooltip>
                        </p>
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

                    <div hidden data-key={5} className="slide">
                        {/* // SHYED */}
                        <img src="/shyed.jpg"/>
                        <p><a target="_blank" rel="noopener noreferrer" href="https://www.sheydbags.com">SHYED Bags</a></p>
                        <p>Get 10% off all SHYED convertable panier backpacks.</p>
                        <p><a className="light_butt" href="https://www.amazon.com/promocode/A3IB6TCMYSRDSR">Discount Link</a></p>
                    </div>

                    <div hidden data-key={6} className="slide">
                        {/* // RED SHIFT SPORTS */}
                        <img src="/redshiftsports.jpg"/>
                        <p><a target="_blank" rel="noopener noreferrer" href="https://redshiftsports.com/discount/SFA15">RED SHIFT SPORTS</a></p>
                        <p>Get 15% off at Red Shift Sports high quality bike components including LED pedals.</p>
                        <p><a className="light_butt" href="https://redshiftsports.com/discount/SFA15">Discount Link</a></p>
                    </div>

                    <div hidden data-key={7} className="slide">
                        {/* // WOMBI */}
                        <img src="/wombi.png"/>
                        <p><a target="_blank" rel="noopener noreferrer" href="https://wombi.us/pages/refer-a-friend?f=fZstHIjQasUGDfQ48Ay3pcc1G9nXPmTZh8ncUawyv2Ra3uw9v_Ua1kVBaGJEGgxvID75uh0RSXJpL2lB-ilSew">WOMBI DISCOUNT</a></p>
                        <p>Get 50% off your first month of an e-bike subscription through Wombi!</p>
                        <p><a className="light_butt" href="https://wombi.us/pages/refer-a-friend?f=fZstHIjQasUGDfQ48Ay3pcc1G9nXPmTZh8ncUawyv2Ra3uw9v_Ua1kVBaGJEGgxvID75uh0RSXJpL2lB-ilSew">Discount Link</a></p>
                    </div>
                  

                    <p style={{textAlign:'right'}}>{slide}/{maxSlides}</p>
                </div>

            </div>
        </div>

    )

}

export default Discounts;