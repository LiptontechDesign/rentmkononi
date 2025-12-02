import { PublicPageLayout } from '@/components/layout/PublicPageLayout'
import { MapPin, Clock, ArrowRight } from 'lucide-react'

export default function CareersPage() {
  const positions = [
    {
      title: "Senior Frontend Engineer",
      department: "Engineering",
      location: "Nairobi (Remote)",
      type: "Full-time"
    },
    {
      title: "Customer Success Specialist",
      department: "Support",
      location: "Nairobi",
      type: "Full-time"
    },
    {
      title: "Product Designer",
      department: "Design",
      location: "Remote",
      type: "Contract"
    }
  ]

  return (
    <PublicPageLayout 
      title="Careers" 
      subtitle="Join us in modernizing the real estate industry in Africa."
    >
      <div className="animate-on-scroll opacity-0 translate-y-8 mb-16 text-center bg-white rounded-3xl p-8 sm:p-12 shadow-lg border" style={{animationDelay: '0.2s'}}>
        <div className="text-4xl mb-4">🚀</div>
        <h3 className="text-2xl font-bold text-slate-900 mb-4">Join Our Mission</h3>
        <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
          We are a small but ambitious team solving real problems for thousands of landlords and tenants. 
          We believe in shipping quality software, putting customers first, and maintaining a healthy work-life balance.
        </p>
      </div>

      <div className="animate-on-scroll opacity-0 translate-y-8 mb-8" style={{animationDelay: '0.3s'}}>
        <h2 className="text-4xl font-bold text-slate-900 mb-6 flex items-center gap-3">
          <span className="text-3xl">💼</span>
          Open Positions
        </h2>
      </div>
      
      <div className="not-prose space-y-6">
        {positions.map((role, index) => (
          <div key={index} className={`animate-on-scroll opacity-0 translate-y-8`} style={{animationDelay: `${0.4 + index * 0.1}s`}}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-8 bg-white border rounded-3xl hover:border-primary/50 hover:shadow-xl transition-all cursor-pointer group hover:-translate-y-1">
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-3">{role.title}</h3>
                <div className="flex flex-wrap items-center gap-4 text-base">
                  <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    {role.department}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <MapPin className="h-4 w-4" />
                    {role.location}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600">
                    <Clock className="h-4 w-4" />
                    {role.type}
                  </div>
                </div>
              </div>
              <div className="mt-6 sm:mt-0 sm:ml-6">
                <div className="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-xl font-semibold group-hover:bg-blue-600 transition-colors shadow-lg">
                  Apply Now <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="animate-on-scroll opacity-0 translate-y-8 mt-20" style={{animationDelay: '0.8s'}}>
        <div className="bg-linear-to-br from-emerald-50 via-blue-50 to-purple-50 p-12 rounded-3xl border text-center">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="text-3xl font-bold text-slate-900 mb-4">Don't see the right role?</h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            We are always looking for talented individuals to join our team. Send your CV and portfolio and tell us how you can contribute to our mission.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="mailto:careers@rentmkononi.com" className="inline-flex items-center justify-center px-8 py-3 bg-primary text-white font-semibold rounded-xl hover:bg-blue-600 transition-colors shadow-lg">
              Send Your CV
            </a>
            <a href="/about" className="inline-flex items-center justify-center px-8 py-3 bg-white text-slate-700 font-semibold rounded-xl border hover:bg-slate-50 transition-colors">
              Learn More About Us
            </a>
          </div>
        </div>
      </div>
    </PublicPageLayout>
  )
}
