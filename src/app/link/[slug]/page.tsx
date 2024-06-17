// landing page
'use client'

import {useEffect, useState}  from "react";
import { useRouter } from 'next/router'
import { verify_token } from '../../../server/verifier'


export default function validate({ params }: { params: { slug: string } }) {
	const [user, setUser] = useState('');

	useEffect(()=> {
		const updateViews = async () => {
			const updatedViews = await verify_token(params.slug)
			updatedViews ? setUser(updatedViews) : ''
		}
	   
		  updateViews()
	})

	return <div>{user}</div>

  }
	
