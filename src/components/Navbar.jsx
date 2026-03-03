import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Leaf } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  const handleAuthClick = () => {
    if (user) {
      navigate('/dashboard');
    } else {
      navigate('/login');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? 'navbar-scrolled' : 'bg-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 bg-moss rounded-xl flex items-center justify-center group-hover:bg-leaf transition-colors duration-300 shadow-sm">
              <Leaf className="w-5 h-5 text-cream" strokeWidth={2} />
            </div>
            <div>
              <span className="font-display font-bold text-moss text-lg tracking-tight">ECHO</span>
              <span className="hidden sm:block font-body text-xs text-leaf -mt-1">by Enactus NSUT</span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link
              to="/"
              className={`nav-link font-display font-medium text-sm tracking-wide transition-colors duration-200 ${
                isActive('/') ? 'text-moss active' : 'text-bark/70 hover:text-moss'
              }`}
            >
              Home
            </Link>
            <Link
              to="/about"
              className={`nav-link font-display font-medium text-sm tracking-wide transition-colors duration-200 ${
                isActive('/about') ? 'text-moss active' : 'text-bark/70 hover:text-moss'
              }`}
            >
              About
            </Link>
            {user && (
              <Link
                to="/dashboard"
                className={`nav-link font-display font-medium text-sm tracking-wide transition-colors duration-200 ${
                  isActive('/dashboard') ? 'text-moss active' : 'text-bark/70 hover:text-moss'
                }`}
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-3">
                <span className="font-body text-sm text-bark/60">Hi, {user.name?.split(' ')[0]}</span>
                <button
                  onClick={handleLogout}
                  className="font-display font-semibold text-sm text-moss border-2 border-moss px-5 py-2 rounded-full hover:bg-moss hover:text-cream transition-all duration-300"
                >
                  Log Out
                </button>
              </div>
            ) : (
              <button
                onClick={handleAuthClick}
                className="btn-primary text-sm py-2.5 px-6"
              >
                Login
              </button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl text-moss hover:bg-eco-100 transition-colors duration-200"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <div className={`md:hidden transition-all duration-300 overflow-hidden ${
        isOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'
      }`}>
        <div className="bg-cream/95 backdrop-blur-md border-t border-eco-100 px-6 py-4 space-y-1">
          <Link to="/" className="block font-display font-medium text-moss py-3 border-b border-eco-100">Home</Link>
          <Link to="/about" className="block font-display font-medium text-bark/70 py-3 border-b border-eco-100 hover:text-moss">About</Link>
          {user && (
            <Link to="/dashboard" className="block font-display font-medium text-bark/70 py-3 border-b border-eco-100 hover:text-moss">Dashboard</Link>
          )}
          <div className="pt-3">
            {user ? (
              <button onClick={handleLogout} className="btn-secondary w-full justify-center text-sm">
                Log Out
              </button>
            ) : (
              <button onClick={handleAuthClick} className="btn-primary w-full justify-center text-sm">
                Login
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
