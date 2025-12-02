import { Link } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle2, Smartphone, LineChart, ShieldCheck, Star, Zap, Clock, Mail, Phone, MapPin } from 'lucide-react'
import logoAsset from '@/assets/rentmkononi-logo.svg'

// Simple intersection observer hook for scroll animations
function useScrollAnimation() {
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
      const elements = ref.current.querySelectorAll('.scroll-animate')
      elements.forEach((el) => observer.observe(el))
    }
    
    return () => observer.disconnect()
  }, [])
  
  return ref
}

export default function LandingPage() {
  const scrollRef = useScrollAnimation()
  
  return (
    <div ref={scrollRef} className="min-h-screen bg-linear-to-b from-blue-50 via-white to-slate-50 flex flex-col">
      {/* Top navbar */}
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-24 w-24">
              <img
                src={logoAsset}
                alt="RentMkononi Logo"
                className="app-logo h-full w-full object-contain"
              />
            </div>
            <span className="text-2xl font-bold text-primary tracking-tight">RentMkononi</span>
          </div>
          {/* Always visible navigation - scales responsively */}
          <nav className="flex items-center gap-2 sm:gap-4 md:gap-6 lg:gap-8 text-sm sm:text-base font-medium text-slate-700">
            <a href="#features" className="hover:text-primary transition-colors whitespace-nowrap">Features</a>
            <a href="#pricing" className="hover:text-primary transition-colors whitespace-nowrap">Pricing</a>
            <Link to="/about" className="hover:text-primary transition-colors whitespace-nowrap">About</Link>
            <Link to="/blog" className="hover:text-primary transition-colors whitespace-nowrap">Blog</Link>
          </nav>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="text-sm font-medium text-primary hover:underline">Sign in</Link>
            <Button asChild size="sm" className="shadow-sm text-xs sm:text-sm">
              <Link to="/signup" className="flex items-center gap-1">
                <span className="hidden sm:inline">Get started free</span>
                <span className="sm:hidden">Start free</span>
                <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero section */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="landing-hero-blob" />
          </div>

          <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:py-16 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] md:items-center md:py-20">
            <div className="space-y-6 animate-fade-up">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-lg font-medium text-primary shadow-sm ring-1 ring-primary/10">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Smart rent collection for Kenyan landlords
              </p>

              <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
                Keep every rent payment
                <span className="block text-primary">organised, visible, and on time.</span>
              </h1>

              <p className="max-w-xl text-xl text-slate-800 font-medium">
                RentMkononi brings your tenants, properties, M-Pesa payments, and rent schedules into one clear
                dashboard. See who has paid, who is behind, and what is owed in seconds  no spreadsheets, no guesswork.
              </p>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button asChild size="lg" className="w-full sm:w-auto shadow-sm">
                  <Link to="/signup" className="flex items-center gap-2">
                    Start managing rent now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link to="/login">Already have an account? Sign in</Link>
                </Button>
              </div>

              <ul className="mt-4 grid max-w-xl gap-3 text-lg font-medium text-slate-800 sm:grid-cols-2">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Track rent due, payments, and arrears per tenant
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Automatic monthly rent charges with correct due dates
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Clear views for properties, units, tenants, and tenancies
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Built for Kenyan landlords, works beautifully on mobile
                </li>
              </ul>
            </div>

            {/* Hero preview card */}
            <div className="relative mt-2 md:mt-0">
              <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
              <div className="animate-float-slow rounded-2xl border bg-white/90 p-4 shadow-lg shadow-primary/5 backdrop-blur">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-medium text-slate-500">Overview</p>
                    <p className="text-xl font-bold text-slate-900">Current month rent status</p>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-lg font-semibold text-emerald-700">
                    92% collected
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-slate-100 p-4">
                    <p className="text-lg font-medium text-slate-800">Total expected</p>
                    <p className="mt-1 text-3xl font-bold text-slate-900">Ksh 245,000</p>
                  </div>
                  <div className="rounded-xl bg-emerald-100 p-4">
                    <p className="text-lg font-medium text-emerald-700">Collected</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-800">Ksh 225,000</p>
                  </div>
                  <div className="rounded-xl bg-amber-100 p-4">
                    <p className="text-lg font-medium text-amber-700">Outstanding</p>
                    <p className="mt-1 text-3xl font-bold text-amber-800">Ksh 20,000</p>
                  </div>
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-lg font-semibold text-slate-800">Tenants with outstanding rent</p>
                  <div className="space-y-2 text-lg">
                    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                      <span className="font-semibold text-slate-900">John Doe</span>
                      <span className="font-semibold text-amber-700">Ksh 30,000</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                      <span className="font-semibold text-slate-900">Mary Wanjiku</span>
                      <span className="font-semibold text-amber-700">Ksh 15,000</span>
                    </div>
                    <div className="flex items-center justify-between rounded-lg border bg-white px-3 py-2">
                      <span className="font-semibold text-slate-900">Peter Otieno</span>
                      <span className="font-semibold text-amber-700">Ksh 10,000</span>
                    </div>
                  </div>
                </div>

                <p className="mt-4 text-lg text-slate-800">
                  See exactly who is up to date, who is due, and who is behind  across all your properties.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Trust badges */}
        <section className="border-t bg-white py-6">
          <div className="mx-auto max-w-7xl px-4">
            <div className="flex flex-wrap items-center justify-center gap-10 text-lg font-medium text-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600" />
                <span>Bank-level security</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <span>Setup in 5 minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                <span>24/7 access</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                <span>Trusted by 100+ landlords</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t bg-linear-to-b from-slate-50 to-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-20">
            <div className="mb-12 text-center scroll-animate opacity-0 translate-y-8">
              <p className="text-lg font-semibold text-primary uppercase tracking-wider mb-3">Features</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Everything you need to manage rent</h2>
              <p className="mt-4 text-lg text-slate-800 font-medium max-w-2xl mx-auto">
                From tracking tenants to collecting payments — RentMkononi handles the complexity so you can focus on growing your portfolio.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="scroll-animate opacity-0 translate-y-8 group rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/20">
                <div className="mb-4 inline-flex rounded-xl bg-linear-to-br from-blue-500 to-blue-600 p-3 text-white shadow-lg shadow-blue-500/25">
                  <LineChart className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Live rent dashboard</h3>
                <p className="mt-3 text-lg text-slate-800 font-medium leading-relaxed">
                  See total expected rent, collected amounts, and outstanding balances per tenant, unit, and property — all in real-time.
                </p>
              </div>

              <div className="scroll-animate opacity-0 translate-y-8 group rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/20" style={{animationDelay: '0.1s'}}>
                <div className="mb-4 inline-flex rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 p-3 text-white shadow-lg shadow-emerald-500/25">
                  <Smartphone className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">M-Pesa integration ready</h3>
                <p className="mt-3 text-lg text-slate-800 font-medium leading-relaxed">
                  Built for Kenya's mobile money ecosystem. Track M-Pesa payments, match them to tenants, and reconcile automatically.
                </p>
              </div>

              <div className="scroll-animate opacity-0 translate-y-8 group rounded-2xl border bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:border-primary/20" style={{animationDelay: '0.2s'}}>
                <div className="mb-4 inline-flex rounded-xl bg-linear-to-br from-violet-500 to-violet-600 p-3 text-white shadow-lg shadow-violet-500/25">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Automatic rent charges</h3>
                <p className="mt-3 text-lg text-slate-800 font-medium leading-relaxed">
                  Monthly rent charges are generated automatically with correct due dates. No more manual spreadsheet entries.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="bg-linear-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-50 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 relative">
            <div className="mb-12 text-center scroll-animate opacity-0 translate-y-8">
              <p className="text-lg font-semibold text-primary uppercase tracking-wider mb-3">How it works</p>
              <h2 className="text-4xl font-bold tracking-tight sm:text-5xl">Get started in 3 simple steps</h2>
              <p className="mt-4 text-lg text-slate-300 font-medium max-w-2xl mx-auto">
                No complicated setup. No training required. Start managing rent in minutes.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              <div className="scroll-animate opacity-0 translate-y-8 relative rounded-2xl bg-white/5 backdrop-blur p-6 ring-1 ring-white/10 hover:ring-primary/50 transition-all duration-300">
                <div className="absolute -top-4 left-6">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-blue-600 text-lg font-bold text-white shadow-lg">
                    1
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">Add your properties</h3>
                <p className="mt-3 text-lg text-slate-200 font-medium leading-relaxed">
                  Enter your properties, units, and tenant details. Set monthly rent and due dates once — we remember everything.
                </p>
              </div>

              <div className="scroll-animate opacity-0 translate-y-8 relative rounded-2xl bg-white/5 backdrop-blur p-6 ring-1 ring-white/10 hover:ring-primary/50 transition-all duration-300" style={{animationDelay: '0.15s'}}>
                <div className="absolute -top-4 left-6">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-blue-600 text-lg font-bold text-white shadow-lg">
                    2
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">Rent charges auto-generate</h3>
                <p className="mt-3 text-lg text-slate-200 font-medium leading-relaxed">
                  Each month, rent charges are created automatically with the correct period and due date. No manual work needed.
                </p>
              </div>

              <div className="scroll-animate opacity-0 translate-y-8 relative rounded-2xl bg-white/5 backdrop-blur p-6 ring-1 ring-white/10 hover:ring-primary/50 transition-all duration-300" style={{animationDelay: '0.3s'}}>
                <div className="absolute -top-4 left-6">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-linear-to-br from-primary to-blue-600 text-lg font-bold text-white shadow-lg">
                    3
                  </span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">Track payments instantly</h3>
                <p className="mt-3 text-lg text-slate-200 font-medium leading-relaxed">
                  Record payments as they come in. Balances update in real-time. Always know who's paid and who's behind.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
            <div className="mb-12 text-center scroll-animate opacity-0 translate-y-8">
              <p className="text-lg font-semibold text-primary uppercase tracking-wider mb-3">Pricing</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">Simple, transparent pricing</h2>
              <p className="mt-4 text-lg text-slate-800 font-medium max-w-2xl mx-auto">
                Start free and upgrade as you grow. No hidden fees.
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
              {/* Free tier */}
              <div className="scroll-animate opacity-0 translate-y-8 rounded-2xl border bg-white p-6 shadow-sm">
                <h3 className="text-lg font-semibold text-slate-900">Starter</h3>
                <p className="mt-1 text-sm text-slate-800">Perfect for getting started</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">Free</span>
                </div>
                <ul className="mt-6 space-y-3 text-lg font-medium text-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Up to 5 units
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Unlimited tenants
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Basic rent tracking
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Payment recording
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full mt-6">
                  <Link to="/signup">Get started free</Link>
                </Button>
              </div>

              {/* Pro tier */}
              <div className="scroll-animate opacity-0 translate-y-8 rounded-2xl border-2 border-primary bg-white p-6 shadow-lg relative" style={{animationDelay: '0.1s'}}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white">Most Popular</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900">Professional</h3>
                <p className="mt-1 text-sm text-slate-800">For growing landlords</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">Ksh 1,500</span>
                  <span className="text-slate-800">/month</span>
                </div>
                <ul className="mt-6 space-y-3 text-lg font-medium text-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Up to 50 units
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Automatic rent charges
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    M-Pesa integration
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    SMS notifications
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Priority support
                  </li>
                </ul>
                <Button asChild className="w-full mt-6">
                  <Link to="/signup">Start free trial</Link>
                </Button>
              </div>

              {/* Enterprise tier */}
              <div className="scroll-animate opacity-0 translate-y-8 rounded-2xl border bg-white p-6 shadow-sm" style={{animationDelay: '0.2s'}}>
                <h3 className="text-lg font-semibold text-slate-900">Enterprise</h3>
                <p className="mt-1 text-sm text-slate-800">For property managers</p>
                <div className="mt-4">
                  <span className="text-4xl font-bold text-slate-900">Custom</span>
                </div>
                <ul className="mt-6 space-y-3 text-lg font-medium text-slate-800">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Unlimited units
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Multiple properties
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Custom integrations
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    Dedicated support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    White-label option
                  </li>
                </ul>
                <Button asChild variant="outline" className="w-full mt-6">
                  <a href="mailto:hello@rentmkononi.com">Contact sales</a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Why landlords love it */}
        <section id="why" className="bg-linear-to-b from-white to-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24">
            <div className="mb-12 text-center scroll-animate opacity-0 translate-y-8">
              <p className="text-lg font-semibold text-primary uppercase tracking-wider mb-3">Why RentMkononi</p>
              <h2 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                A clear picture of your rent at any moment
              </h2>
            </div>

            <div className="grid gap-10 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
              <div className="scroll-animate opacity-0 translate-y-8">
                <p className="text-lg text-slate-800 font-medium max-w-xl leading-relaxed">
                  Instead of checking different books and messages, RentMkononi gives you one trustworthy source of truth
                  for your rental income. You always know total expected rent, what has been collected, and what is still owed.
                </p>
                <ul className="mt-6 space-y-4 text-lg font-medium text-slate-800">
                  <li className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span>See outstanding amounts per tenant, including which months are unpaid.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span>Understand arrears quickly with clear status labels like paid, due, and behind.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5 h-5 w-5 rounded-full bg-emerald-100 flex items-center justify-center">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span>Designed to work for both small landlords and growing portfolios.</span>
                  </li>
                </ul>
              </div>

              <div className="scroll-animate opacity-0 translate-y-8 rounded-2xl border bg-white p-6 shadow-lg animate-float-slow">
                <p className="text-base font-bold text-slate-900 mb-4">Platform highlights</p>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="text-center p-4 rounded-xl bg-linear-to-br from-blue-50 to-blue-100/50">
                    <p className="text-3xl font-bold text-primary">50+</p>
                    <p className="mt-1 text-sm text-slate-800">Units tracked</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-linear-to-br from-emerald-50 to-emerald-100/50">
                    <p className="text-3xl font-bold text-emerald-600">8 hrs</p>
                    <p className="mt-1 text-sm text-slate-800">Saved per month</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-linear-to-br from-violet-50 to-violet-100/50">
                    <p className="text-3xl font-bold text-violet-600">100%</p>
                    <p className="mt-1 text-sm text-slate-800">Visibility</p>
                  </div>
                  <div className="text-center p-4 rounded-xl bg-linear-to-br from-amber-50 to-amber-100/50">
                    <p className="text-3xl font-bold text-amber-600">🇰🇪</p>
                    <p className="mt-1 text-sm text-slate-800">Built for Kenya</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-linear-to-br from-primary via-blue-600 to-blue-700 text-white relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
          <div className="mx-auto max-w-7xl px-4 py-16 sm:py-24 flex flex-col items-center text-center gap-6 relative">
            <h2 className="text-4xl font-bold tracking-tight sm:text-5xl max-w-2xl">
              Ready to take control of your rent collection?
            </h2>
            <p className="max-w-xl text-lg font-medium text-blue-100">
              Join hundreds of landlords who switched from spreadsheets to RentMkononi. Start free today.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center mt-2">
              <Button asChild size="lg" variant="secondary" className="w-full sm:w-auto shadow-lg text-primary font-semibold">
                <Link to="/signup" className="flex items-center gap-2">
                  Get started free
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="w-full bg-transparent border-white/40 text-white hover:bg-white/10 sm:w-auto"
              >
                <Link to="/login">Sign in to your account</Link>
              </Button>
            </div>
            <p className="text-xs text-blue-200 mt-2">No credit card required • Free plan available</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-900 text-slate-300">
        <div className="mx-auto max-w-7xl px-4 py-12">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            {/* Brand */}
            <div className="sm:col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex items-center justify-center h-16 w-16">
                  <img
                    src={logoAsset}
                    alt="RentMkononi Logo"
                    className="app-logo h-full w-full object-contain"
                  />
                </div>
                <span className="text-lg font-semibold text-white">RentMkononi</span>
              </div>
              <p className="text-base text-slate-300 leading-relaxed">
                Smart rent management for Kenyan landlords. Track tenants, payments, and arrears in one place.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-3 text-base">
                <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#how-it-works" className="hover:text-white transition-colors">How it works</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3 text-base">
                <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
                <li><a href="mailto:hello@rentmkononi.com" className="hover:text-white transition-colors">Contact us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-semibold text-white mb-4">Contact</h4>
              <ul className="space-y-3 text-base">
                <li className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <a href="mailto:hello@rentmkononi.com" className="hover:text-white transition-colors">hello@rentmkononi.com</a>
                </li>
                <li className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <span>+254 700 000 000</span>
                </li>
                <li className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-slate-500" />
                  <span>Nairobi, Kenya</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-10 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <span>&copy; {new Date().getFullYear()} RentMkononi. All rights reserved.</span>
            <div className="flex items-center gap-6">
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
