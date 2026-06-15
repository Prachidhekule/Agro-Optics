import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check localStorage on initial load
  useEffect(() => {
    const checkAuth = () => {
      try {
        const storedUser = localStorage.getItem('agro_optics_user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          // Validate user data structure (more flexible validation)
          if (userData && userData.email) {
            // Ensure required fields exist
            const validatedUser = {
              ...userData,
              id: userData.id || Date.now(),
              name: userData.name || userData.email.split('@')[0],
              photo: userData.photo || null,
              created_at: userData.created_at || new Date().toISOString(),
              loginTime: userData.loginTime || new Date().toISOString(),
              sessionId: userData.sessionId || `agro_session_${Date.now()}_${userData.id || Date.now()}`
            };
            
            setUser(validatedUser);
            setIsAuthenticated(true);
            // Update localStorage with validated structure
            localStorage.setItem('agro_optics_user', JSON.stringify(validatedUser));
          } else {
            console.warn('Invalid user data structure, clearing storage');
            clearStorage();
          }
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
        clearStorage();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Clear storage helper
  const clearStorage = () => {
    localStorage.removeItem('agro_optics_user');
    localStorage.removeItem('agro_optics_token');
  };

  // Login function - MORE FLEXIBLE for different user structures
  const login = useCallback((userData) => {
    if (!userData) {
      console.error('No user data provided to login');
      return false;
    }
    
    // Accept user data from different sources (API responses, demo data, etc.)
    const completeUserData = {
      // Default values
      id: userData.id || Date.now(),
      name: userData.name || userData.username || userData.email?.split('@')[0] || 'Farmer User',
      email: userData.email || 'user@example.com',
      phone: userData.phone || userData.phone_number || '',
      location: userData.location || userData.address || '',
      farmSize: userData.farmSize || userData.farm_size || userData.farm_size_acres || '',
      crops: userData.crops || userData.primary_crops || '',
      photo: userData.photo || userData.profile_picture || userData.avatar || null,
      created_at: userData.created_at || userData.createdAt || new Date().toISOString(),
      // Additional metadata
      loginTime: new Date().toISOString(),
      sessionId: `agro_session_${Date.now()}_${userData.id || Date.now()}`,
      // Preserve any other properties
      ...userData
    };
    
    try {
      setUser(completeUserData);
      setIsAuthenticated(true);
      localStorage.setItem('agro_optics_user', JSON.stringify(completeUserData));
      localStorage.setItem('agro_optics_token', completeUserData.sessionId);
      
      return true;
    } catch (error) {
      console.error('Error saving user to localStorage:', error);
      return false;
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    setUser(null);
    setIsAuthenticated(false);
    clearStorage();
    return true;
  }, []);

  // Update user function
  const updateUser = useCallback((updatedData) => {
    if (!user) {
      console.error('Cannot update - no user logged in');
      return null;
    }
    
    try {
      const newUserData = {
        ...user,
        ...updatedData,
        updatedAt: new Date().toISOString()
      };
      
      setUser(newUserData);
      localStorage.setItem('agro_optics_user', JSON.stringify(newUserData));
      
      return newUserData;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }, [user]);

  // Check if user is logged in
  const checkAuthStatus = useCallback(() => {
    return isAuthenticated && user !== null;
  }, [isAuthenticated, user]);

  // Get user info
  const getUserInfo = useCallback(() => {
    return {
      ...user,
      isAuthenticated,
      loginTime: user?.loginTime || null
    };
  }, [user, isAuthenticated]);

  // Clear user data (for debugging/testing)
  const clearUserData = useCallback(() => {
    clearStorage();
    setUser(null);
    setIsAuthenticated(false);
    return true;
  }, []);

  const contextValue = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    checkAuthStatus,
    getUserInfo,
    clearUserData
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Custom hook for using the context
export const useAppContext = () => {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }
  return context;
};