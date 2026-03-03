import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute.jsx';
import HomePage from './pages/HomePage';
import AboutPage from './pages/AboutPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import GroupsPage from './pages/GroupsPage';
import AdminPage from './pages/AdminPage';
import VerifyCallbackPage from './pages/VerifyCallbackPage';
import UnverifiedPage from './pages/UnverifiedPage';

function Layout({ children }) {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      <div className="flex-1">{children}</div>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/"           element={<Layout><HomePage /></Layout>} />
          <Route path="/about"      element={<Layout><AboutPage /></Layout>} />
          <Route path="/login"      element={<Layout><LoginPage /></Layout>} />
          <Route path="/register"   element={<Layout><RegisterPage /></Layout>} />
          <Route path="/verify"     element={<Layout><VerifyCallbackPage /></Layout>} />
          <Route path="/unverified" element={<Layout><UnverifiedPage /></Layout>} />
          <Route path="/dashboard"  element={<Layout><ProtectedRoute><DashboardPage /></ProtectedRoute></Layout>} />
          <Route path="/groups"     element={<Layout><ProtectedRoute><GroupsPage /></ProtectedRoute></Layout>} />
          <Route path="/admin"      element={<Layout><AdminRoute><AdminPage /></AdminRoute></Layout>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}