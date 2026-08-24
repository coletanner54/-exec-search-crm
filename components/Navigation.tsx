'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Users, Search, MessageSquare, AlertTriangle, LayoutDashboard, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/searches', label: 'Searches', icon: Search },
  { href: '/ask', label: 'Ask AI', icon: MessageSquare },
  { href: '/verify', label: 'Data Verification', icon: AlertTriangle },
  { href: '/sync', label: 'Sync', icon: RefreshCw },
]

export function Navigation() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen flex flex-col">
      <div className="p-6 border-b border-gray-700">
        <h1 className="text-lg font-bold text-white">Exec Search CRM</h1>
        <p className="text-xs text-gray-400 mt-1">Opal Partners</p>
      </div>
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              pathname === href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800 hover:text-white'
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
