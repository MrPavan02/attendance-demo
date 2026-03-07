
import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  user: { name: string; id: string } | null;
  onLogout: () => void;
  isLoginStage?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, user, onLogout, isLoginStage = false }) => {
  return (
    <div className="min-h-screen flex flex-col bg-[#F1F6F9] text-[#14274E] device-shell fluid-typography desktop-zoom">
      <header className="bg-white border-b border-[#9BA4B4] shadow-sm sticky top-0 z-50">
        <div className="responsive-container py-3 sm:py-4 header-shell">
          <div className="header-brand-block">
            <div className="header-logo bg-[#14274E] p-2 rounded-lg">
              <i className="fas fa-shield-halved text-white text-xl"></i>
            </div>
            <div className="header-brand-copy">
              <h1 className="font-bold text-lg tracking-tight text-[#14274E]">Vayu Puthra</h1>
              <p className="text-[10px] uppercase font-bold tracking-widest text-[#394867]">Attendance Intelligence</p>
            </div>
          </div>
          
          {user && (
            <>
              <div className="header-user-info text-sm font-semibold text-[#14274E]">
                <p className="leading-tight">{user.name}</p>
                <p className="text-[10px] font-bold text-[#394867] uppercase tracking-tighter">ID: {user.id}</p>
              </div>
              <button 
                onClick={onLogout}
                className="header-signout-btn bg-[#F1F6F9] hover:bg-[#D6E4F0] text-[#394867] transition-colors px-4 py-2 rounded-lg text-[11px] font-bold border border-[#9BA4B4] flex items-center justify-center"
              >
                <i className="fas fa-sign-out-alt mr-2"></i> Sign Out
              </button>
            </>
          )}
        </div>
      </header>
      
      <main className={`flex-grow w-full responsive-container py-6 sm:py-8 mobile-safe-area fluid-main fluid-responsive ${isLoginStage ? 'login-stage-main' : ''}`}>
        {children}
      </main>
      
      {user && (
        <footer className="bg-white border-t border-[#9BA4B4] py-3">
          <div className="responsive-container text-center text-[#394867] text-[10px] font-bold uppercase tracking-widest">
            &copy; 2024 Enterprise Secure Identity Solutions. All systems monitored. 
            <span className="ml-4 px-3 py-1 bg-[#D6E4F0] text-[#14274E] rounded-full border border-[#9BA4B4]">System Status: Optimal</span>
          </div>
        </footer>
      )}
    </div>
  );
};

export default Layout;
