import { Link, Outlet } from 'react-router-dom'
import Navbar from './Navbar'

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        <Outlet />
      </main>
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 text-center text-xs text-gray-400 flex flex-col sm:flex-row items-center justify-center gap-x-4 gap-y-1">
          <span>© 2026 Платформа стажировок</span>
          <Link to="/terms" className="hover:text-gray-600 transition-colors">Пользовательское соглашение</Link>
          <Link to="/privacy" className="hover:text-gray-600 transition-colors">Политика конфиденциальности</Link>
        </div>
      </footer>
    </div>
  )
}
