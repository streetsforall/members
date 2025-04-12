'use client'

import React, { useEffect } from "react";

const StripePricingTable = () => {
    useEffect(() => {
        const script = document.createElement("script");
        script.src = "https://js.stripe.com/v3/pricing-table.js";
        script.async = true;
        document.body.appendChild(script);
        return () => {
            document.body.removeChild(script);
        };
    }, []);
    return React.createElement("stripe-pricing-table", {
        "pricing-table-id": 'prctbl_1PW0vZGTVLZX8vLXQnAHuMWf',
        "publishable-key": 'pk_live_9zzvz0nxBXs8xxFEoGgRs2ud009BJlhHV3',
    });
};

export default StripePricingTable;