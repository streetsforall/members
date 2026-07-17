// landing page
'use client'

import { use, useEffect, useState } from "react";
import { useRouter } from 'next/navigation'
import { verify_token } from '../../../server/verifier'
import LoginPage from '@/app/(main)/page'


export default function Validate({ params }: { params: Promise<{ slug: string }> }) {
	const [user, setUser] = useState('');
	const resolvedParams = use(params);
	const router = useRouter();

	useEffect(() => {
		const updateViews = async () => {
			const result = await verify_token(resolvedParams.slug)

			if (result && typeof result === 'object' && 'success' in result && result.success) {
				// Successful login - redirect to user page
				router.push(`/u/${result.userId}`)
			} else if (result && typeof result === 'string') {
				// Error message - show it
				setUser(result)
			}
		}

		updateViews()
	}, [resolvedParams.slug, router])

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

