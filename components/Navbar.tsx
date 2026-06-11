'use client'

import Link from 'next/link'
import { Trophy, User, LogOut } from 'lucide-react'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 50,
      background: scrolled ? 'var(--glass-bg)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: scrolled ? '1px solid var(--glass-border)' : '1px solid transparent',
      transition: 'all 0.3s ease',
      padding: '16px 0'
    }}>
      <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Trophy color="var(--primary)" size={24} />
          <span style={{ fontSize: '1.25rem', fontWeight: 800, letterSpacing: '-0.5px' }} className="text-gradient">
            PollaMundial
          </span>
        </Link>
        
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link href="/predictions" style={{
            color: pathname === '/predictions' ? 'var(--primary)' : 'var(--text-muted)',
            fontWeight: 600,
            fontSize: '0.95rem'
          }}>
            Pronósticos
          </Link>
          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }}></div>
          <Link href="/login" style={{ display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}>
            <User size={20} />
          </Link>
        </div>
      </div>
    </nav>
  )
}
