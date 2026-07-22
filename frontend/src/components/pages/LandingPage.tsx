import { Link } from 'react-router-dom'
import { AppBar } from '../organisms/AppBar'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-base text-text-base selection:bg-primary/30">
      <AppBar />

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6">
          Monitor your infrastructure <br className="hidden md:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-500">
            with absolute clarity
          </span>
        </h1>
        <p className="text-lg md:text-xl text-text-muted max-w-2xl mb-10">
          Orchestrack provides real-time insights, metrics, and alerts for all your containers and instances in one beautiful dashboard.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/signup"
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 rounded-xl text-lg font-medium transition-all shadow-xl shadow-primary/25 hover:shadow-primary/40 active:scale-95 flex items-center justify-center gap-2"
          >
            Get Demo
          </Link>
          <a
            href="#features"
            className="bg-bg-subtle hover:bg-bg-modifier-hover text-text-base border border-border-base px-8 py-3 rounded-xl text-lg font-medium transition-colors flex items-center justify-center"
          >
            Learn More
          </a>
        </div>
      </main>
    </div>
  )
}
