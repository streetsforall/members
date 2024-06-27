'use client';

import { useState } from "react";


type Props = {
    children: string
}


const Tooltip = ({ children }: Props) => {

    return (
        <span className='tooltip_butt'>
            ?
            <span className='tooltip'>
                {children}
            </span>
        </span>
    )

}

export default Tooltip;