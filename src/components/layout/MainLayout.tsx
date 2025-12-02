import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import logoAsset from '@/assets/rentmkononi-logo.svg'

export function MainLayout() {
  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col">
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header - can be expanded later */}
        <header className="flex h-16 items-center gap-3 border-b bg-card px-4 md:hidden">
          <img 
            src={logoAsset} 
            alt="RentMkononi Logo" 
            className="app-logo h-16 w-16 object-contain"
          />
          <span className="text-lg font-bold text-primary">RentMkononi</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
