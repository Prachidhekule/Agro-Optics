import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import UserProfilePage from './pages/UserProfilePage';
import SignHistory from './pages/SignHistory'; // Changed from HistoryPage
import PlantDiagnostics from './components/PlantDiagnostics';
import { SoilDiagnostics } from './components/SoilDiagnostics';
import DeveloperSection from './components/DeveloperSection';
import { Landing } from './components/Landing';
import { TestAPI } from './components/TestAPI'; // Optional: For testing

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const user = JSON.parse(localStorage.getItem('agro_optics_user'));
  if (!user) {
    return <Navigate to="/login" />;
  }
  return children;
};

function App() {
  return (
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-950">
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <UserProfilePage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/history" 
              element={
                <ProtectedRoute>
                  <SignHistory /> {/* Changed from HistoryPage */}
                </ProtectedRoute>
              } 
            />
            <Route path="/plant-diagnostics" element={<PlantDiagnostics />} />
            <Route path="/soil-analysis" element={<SoilDiagnostics />} />
            <Route path="/developers" element={<DeveloperSection />} />
            <Route path="/test-api" element={<TestAPI />} /> {/* Optional testing route */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;