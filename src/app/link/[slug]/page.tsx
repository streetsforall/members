// landing page
'use client'

import { useEffect, useState } from "react";
import { useRouter } from 'next/router'
import { verify_token } from '../../../server/verifier'
import LoginPage from '@/app/page'


export default function Validate({ params }: { params: { slug: string } }) {
	const [user, setUser] = useState('');

	useEffect(() => {
		const updateViews = async () => {
			const updatedViews = await verify_token(params.slug)
			updatedViews ? setUser(updatedViews) : ''
		}

		updateViews()
	}, [])

	return (
		<div className="user">
			{user ?
				<>
					<p className="alert">{user}</p>
					<LoginPage />
				</>

				: 
				
				<div className="loader">
				<img src="/bus.png" />
				<p>Fetching Member</p>
				</div>
			}
		</div>

	)
}

