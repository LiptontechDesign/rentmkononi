import { PublicPageLayout } from '@/components/layout/PublicPageLayout'
import { Calendar } from 'lucide-react'

export default function BlogPage() {
  const posts = [
    {
      title: "5 Tips for Managing Rental Arrears in Kenya",
      excerpt: "Dealing with late rent payments can be stressful. Here are proven strategies to improve collection rates without damaging tenant relationships.",
      date: "Jan 15, 2025",
      category: "Property Management"
    },
    {
      title: "Understanding the New Landlord Tax Regulations",
      excerpt: "A simple guide to what the latest KRA updates mean for residential property owners and how to stay compliant.",
      date: "Jan 10, 2025",
      category: "Legal & Tax"
    },
    {
      title: "Why You Should Move from Excel to Property Software",
      excerpt: "Spreadsheets work great until they don't. Discover the hidden costs of manual rent tracking and the benefits of automation.",
      date: "Jan 5, 2025",
      category: "Technology"
    }
  ]

  return (
    <PublicPageLayout 
      title="Blog" 
      subtitle="Insights, tips, and news for Kenyan landlords."
    >
      <div className="not-prose grid gap-12">
        {posts.map((post, index) => (
          <div key={index} className={`animate-on-scroll opacity-0 translate-y-8 group cursor-pointer`} style={{animationDelay: `${0.2 + index * 0.1}s`}}>
            <div className="bg-white rounded-3xl p-8 border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary"></span>
                  {post.category}
                </div>
                <div className="flex items-center gap-1 text-slate-500 text-sm">
                  <Calendar className="h-4 w-4" />
                  {post.date}
                </div>
              </div>
              <h2 className="text-3xl font-bold text-slate-900 group-hover:text-primary transition-colors mb-4 leading-tight">
                {post.title}
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed mb-6">
                {post.excerpt}
              </p>
              <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
                <span>Read full article</span>
                <span className="text-lg">→</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="animate-on-scroll opacity-0 translate-y-8 mt-20" style={{animationDelay: '0.8s'}}>
        <div className="bg-linear-to-br from-primary/5 via-blue-50 to-emerald-50 rounded-3xl p-12 border text-center">
          <div className="text-4xl mb-4">📧</div>
          <h3 className="text-3xl font-bold text-slate-900 mb-4">Stay Updated</h3>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">Get the latest property management tips, industry insights, and RentMkononi updates delivered to your inbox.</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
            <input 
              type="email" 
              placeholder="Enter your email address" 
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 text-base focus:ring-2 focus:ring-primary focus:outline-none focus:border-primary"
            />
            <button className="bg-primary text-white px-8 py-3 rounded-xl text-base font-semibold hover:bg-blue-600 transition-colors shadow-lg hover:shadow-xl">
              Subscribe
            </button>
          </div>
          <p className="text-sm text-slate-500 mt-4">No spam, unsubscribe anytime.</p>
        </div>
      </div>
    </PublicPageLayout>
  )
}
