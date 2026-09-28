import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import { useState, useEffect } from 'react'

function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved !== null) {
      setSidebarCollapsed(saved === 'true')
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', sidebarCollapsed.toString())
  }, [sidebarCollapsed])

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar collapsed={sidebarCollapsed} onCollapseChange={setSidebarCollapsed} />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        <Header />
        <main
          className="flex-1 overflow-y-auto p-4 lg:p-6"
          style={{ marginLeft: sidebarCollapsed ? '4rem' : '16rem' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AppLayout