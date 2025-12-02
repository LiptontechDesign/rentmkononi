import { PublicPageLayout } from '@/components/layout/PublicPageLayout'
import { Link } from 'react-router-dom'

export default function AboutPage() {
  return (
    <PublicPageLayout 
      title="About Us" 
      subtitle="Simplifying property management for Kenyan landlords."
    >
      <div className="animate-on-scroll opacity-0 translate-y-8 mb-16 text-center bg-white rounded-3xl p-8 sm:p-12 shadow-lg border" style={{animationDelay: '0.2s'}}>
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="h-12 w-12 rounded-full bg-linear-to-br from-primary to-blue-600 flex items-center justify-center">
            <span className="text-white font-bold text-xl">🏠</span>
          </div>
          <span className="text-lg font-semibold text-slate-700">Our Mission</span>
        </div>
        <p className="text-2xl font-medium text-slate-800 leading-relaxed">
          RentMkononi was built with a simple mission: to help Kenyan landlords and property managers move away from chaotic spreadsheets and notebooks to a modern, automated system that just works.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-12 items-center mb-16">
        <div className="animate-on-scroll opacity-0 translate-y-8" style={{animationDelay: '0.3s'}}>
          <h2 className="text-4xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">📖</span>
            Our Story
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-6">
            Managing rental properties in Kenya often involves a mix of manual receipts, M-Pesa messages, and Excel sheets that never quite balance. We saw landlords struggling to keep track of who had paid, who was in arrears, and when rent was actually due.
          </p>
          <p className="text-lg text-slate-700 leading-relaxed">
            We created RentMkononi to solve this specific problem. By focusing on the local market needs—especially mobile money integration and clear communication—we've built a tool that feels familiar yet powerful.
          </p>
        </div>
        <div className="animate-on-scroll opacity-0 translate-y-8" style={{animationDelay: '0.4s'}}>
          <div className="bg-linear-to-br from-emerald-50 to-blue-50 rounded-3xl p-8 border">
            <div className="text-center">
              <div className="text-6xl mb-4">🇰🇪</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Built for Kenya</h3>
              <p className="text-slate-700">Designed specifically for the Kenyan rental market with M-Pesa integration and local workflows.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="animate-on-scroll opacity-0 translate-y-8 text-center mb-12" style={{animationDelay: '0.5s'}}>
        <h2 className="text-4xl font-bold text-slate-900 mb-6 flex items-center justify-center gap-3">
          <span className="text-3xl">⚡</span>
          Why We Are Different
        </h2>
        <p className="text-xl text-slate-700 max-w-3xl mx-auto">
          Unlike generic property management software, we are laser-focused on the Kenyan context.
        </p>
      </div>
      
      <ul className="not-prose grid sm:grid-cols-2 gap-8 my-16">
        <li className="animate-on-scroll opacity-0 translate-y-8 group" style={{animationDelay: '0.6s'}}>
          <div className="flex items-start gap-4 p-8 bg-white rounded-3xl border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xl">💳</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">M-Pesa Integration</h3>
              <span className="text-slate-700 text-lg leading-relaxed">Deep M-Pesa integration for seamless payment tracking and reconciliation</span>
            </div>
          </div>
        </li>
        <li className="animate-on-scroll opacity-0 translate-y-8 group" style={{animationDelay: '0.7s'}}>
          <div className="flex items-start gap-4 p-8 bg-white rounded-3xl border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xl">📱</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Mobile-First</h3>
              <span className="text-slate-700 text-lg leading-relaxed">Simple, mobile-first design for landlords on the go</span>
            </div>
          </div>
        </li>
        <li className="animate-on-scroll opacity-0 translate-y-8 group" style={{animationDelay: '0.8s'}}>
          <div className="flex items-start gap-4 p-8 bg-white rounded-3xl border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-violet-500 to-violet-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xl">🤖</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Smart Automation</h3>
              <span className="text-slate-700 text-lg leading-relaxed">Automated rent scheduling that respects local tenancy agreements</span>
            </div>
          </div>
        </li>
        <li className="animate-on-scroll opacity-0 translate-y-8 group" style={{animationDelay: '0.9s'}}>
          <div className="flex items-start gap-4 p-8 bg-white rounded-3xl border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xl">💰</span>
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Affordable Pricing</h3>
              <span className="text-slate-700 text-lg leading-relaxed">Affordable pricing that scales with your portfolio</span>
            </div>
          </div>
        </li>
      </ul>

      <div className="grid md:grid-cols-2 gap-12 items-center my-20">
        <div className="animate-on-scroll opacity-0 translate-y-8" style={{animationDelay: '1.0s'}}>
          <div className="bg-linear-to-br from-slate-50 to-slate-100 rounded-3xl p-8 border">
            <div className="text-center">
              <div className="text-6xl mb-4">👥</div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Our Team</h3>
              <p className="text-slate-700 leading-relaxed">
                We are a team of developers, designers, and property experts based in Nairobi. We are passionate about technology and real estate, and we work every day to make RentMkononi better for our users.
              </p>
            </div>
          </div>
        </div>
        <div className="animate-on-scroll opacity-0 translate-y-8" style={{animationDelay: '1.1s'}}>
          <h2 className="text-4xl font-bold text-slate-900 mb-6 flex items-center gap-3">
            <span className="text-3xl">🚀</span>
            Join Us
          </h2>
          <p className="text-lg text-slate-700 leading-relaxed mb-8">
            Whether you have one unit or one hundred, we invite you to try RentMkononi and experience the difference. We are here to support your growth every step of the way.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link to="/signup" className="inline-flex items-center justify-center px-6 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-lg">
              Get Started Free
            </Link>
            <a href="mailto:hello@rentmkononi.com" className="inline-flex items-center justify-center px-6 py-3 bg-white text-slate-700 font-semibold rounded-xl border hover:bg-slate-50 transition-colors">
              Contact Us
            </a>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}
