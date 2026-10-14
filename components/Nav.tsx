'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'

const links = [
  { href: '/',               label: 'Summary' },
  { href: '/campaigns',      label: 'Campaigns' },
  { href: '/adsets',         label: 'Ad Sets' },
  { href: '/ads',            label: 'Ads' },
  { href: '/low-performers', label: 'Low Performers' },
]

export default function Nav() {
  const path = usePathname()
  const { data: session } = useSession()
  return (
    <nav className="border-b border-gray-800 bg-gray-950 sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-12">
        <div className="flex items-center gap-1">
          <span className="text-sm font-semibold text-gray-300 mr-3">Meta Ads</span>
          {links.map(l => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded text-sm transition ${
                path === l.href
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-900'
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        {session && (
          <button onClick={() => signOut()} className="text-xs text-gray-500 hover:text-gray-300">
            Sign out
          </button>
        )}
      </div>
    </nav>
  )
}
