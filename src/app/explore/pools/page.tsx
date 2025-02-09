'use client'

import Explore from '@/components/Explore'

export default function ExplorePage() {
	return (
		<div className="flex justify-center items-center min-h-screen pt-14">
			<div className="container mx-auto px-4">
				<Explore activeTab={2} />
			</div>
		</div>
	)
}
