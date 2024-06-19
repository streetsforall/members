'use client';

import { getNextPeakCode } from '../../server/dbHelpers';
import { useState } from "react";



const Discounts = (email:any) => {
    const [code, setCode] = useState('');



    const getCode = async (email: string) => {
        console.log(email)
        const new_code = await getNextPeakCode(email)
        console.log(new_code)
        setCode(new_code)
    }


    return (
        <div>
            {!code ?
                <button onClick={() => getCode(email)}>Request Peak Design 15% Discount</button> :
                <p>Peak Design Code: {code}</p>
            }
        </div>
    )

}

export default Discounts;