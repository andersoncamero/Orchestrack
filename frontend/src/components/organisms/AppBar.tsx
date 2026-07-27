import { Link } from 'react-router-dom'
import { Activity, Menu, X } from 'lucide-react'
import { useState } from 'react'

export function AppBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border-base bg-bg-base/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand - Left */}
          <div className="flex items-center gap-2.5">
            <img src="/logo-dark.png" alt="Orchestrack" className="h-7 w-auto dark:block hidden" />
            <img src="/logo-light.png" alt="Orchestrack" className="h-7 w-auto dark:hidden block" />
            <span className="text-xl font-bold tracking-tight">Orchestrack</span>
          </div>

          {/* Desktop Menu - Center */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Features</a>
            <a href="#solutions" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Solutions</a>
            <a href="#pricing" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">Pricing</a>
            <a href="#about" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">About Us</a>
          </div>

          {/* CTA Button - Right */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-sm font-medium text-text-muted hover:text-primary transition-colors">
              Login
            </Link>
            <Link
              to="/signup"
              className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95"
            >
              Get Demo
            </Link>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-text-muted hover:text-text-base focus:outline-none"
            >
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden border-t border-border-base bg-bg-base">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#features" className="block px-3 py-2 rounded-md text-base font-medium text-text-muted hover:text-primary hover:bg-bg-subtle transition-colors">Features</a>
            <a href="#solutions" className="block px-3 py-2 rounded-md text-base font-medium text-text-muted hover:text-primary hover:bg-bg-subtle transition-colors">Solutions</a>
            <a href="#pricing" className="block px-3 py-2 rounded-md text-base font-medium text-text-muted hover:text-primary hover:bg-bg-subtle transition-colors">Pricing</a>
            <a href="#about" className="block px-3 py-2 rounded-md text-base font-medium text-text-muted hover:text-primary hover:bg-bg-subtle transition-colors">About Us</a>
            <div className="mt-4 pt-4 border-t border-border-base flex flex-col gap-2 px-3">
              <Link to="/login" className="block text-center w-full px-4 py-2 text-base font-medium text-text-muted hover:text-primary transition-colors">
                Login
              </Link>
              <Link to="/signup" className="block text-center w-full bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded-lg text-base font-medium transition-colors">
                Get Demo
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}
