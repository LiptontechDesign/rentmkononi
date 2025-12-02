import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import logoAsset from '@/assets/rentmkononi-logo.svg'

// Animation hook for public pages
function usePageAnimation() {
  const ref = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fade-up')
            entry.target.classList.remove('opacity-0', 'translate-y-8')
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    )
    
    if (ref.current) {
      const elements = ref.current.querySelectorAll('.animate-on-scroll')
      elements.forEach((el) => observer.observe(el))
    }
    
    return () => observer.disconnect()
  }, [])
  
  return ref
}

interface PageLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
}

export function PublicPageLayout({ title, subtitle, children }: PageLayoutProps) {
  const animationRef = usePageAnimation()
  
  return (
    <div ref={animationRef} className="min-h-screen bg-linear-to-b from-blue-50 via-white to-slate-50 flex flex-col">
      {/* Header with navigation */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-3">
              <div className="flex items-center justify-center h-24 w-24">
                <img
                  src={logoAsset}
                  alt="RentMkononi Logo"
                  className="app-logo h-full w-full object-contain"
                />
              </div>
              <span className="text-2xl font-bold text-primary tracking-tight">RentMkononi</span>
            </Link>
          </div>
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-sm sm:text-base font-medium text-slate-700">
            <Link to="/#features" className="hover:text-primary transition-colors whitespace-nowrap">Features</Link>
            <Link to="/#pricing" className="hover:text-primary transition-colors whitespace-nowrap">Pricing</Link>
            <Link to="/about" className="hover:text-primary transition-colors whitespace-nowrap">About</Link>
            <Link to="/blog" className="hover:text-primary transition-colors whitespace-nowrap">Blog</Link>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">Sign in</Link>
            <Button asChild size="sm" className="shadow-sm text-xs sm:text-sm">
              <Link to="/signup">
                <span className="hidden sm:inline">Get started</span>
                <span className="sm:hidden">Start</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero section for page */}
        <section className="relative overflow-hidden bg-linear-to-br from-blue-50 via-white to-slate-50 py-20 sm:py-32">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-40"></div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 relative">
            <div className="text-center animate-on-scroll opacity-0 translate-y-8">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-primary shadow-sm ring-1 ring-primary/10 mb-8">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                RentMkononi
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl md:text-7xl">{title}</h1>
              {subtitle && <p className="mt-8 text-2xl text-slate-700 font-medium max-w-4xl mx-auto leading-relaxed">{subtitle}</p>}
            </div>
          </div>
        </section>

        {/* Content section */}
        <section className="py-16 sm:py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6">
            <div className="mx-auto max-w-4xl">
              <div className="prose prose-slate prose-lg max-w-none prose-headings:font-bold prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-p:text-slate-700 prose-p:leading-relaxed prose-li:text-slate-700 prose-li:leading-relaxed">
                {children}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-slate-900 text-slate-300 py-12">
        <div className="mx-auto max-w-7xl px-4 text-center">
          <p>&copy; {new Date().getFullYear()} RentMkononi. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
