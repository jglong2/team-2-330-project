// Authentication Management

let currentUser = null;

/**
 * Initialize authentication - check if user is logged in
 */
function initAuth() {
  const storedUser = localStorage.getItem('currentUser');
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser);
    } catch (e) {
      localStorage.removeItem('currentUser');
      currentUser = null;
    }
  }
  return currentUser;
}

/**
 * Get current user
 */
function getCurrentUser() {
  if (!currentUser) {
    currentUser = initAuth();
  }
  return currentUser;
}

/**
 * Check if user is logged in
 */
function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Check if user is a client
 */
function isClient() {
  const user = getCurrentUser();
  return user && user.role === 'Client';
}

/**
 * Check if user is a trainer
 */
function isTrainer() {
  const user = getCurrentUser();
  return user && user.role === 'Trainer';
}

/**
 * Login user
 */
async function login(email, password) {
  try {
    const response = await apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (response.success) {
      // Validate that required IDs are present based on role
      if (response.user.role === 'Client' && !response.clientId) {
        return { 
          success: false, 
          message: 'Client record not found. Please contact support or try registering again.' 
        };
      }
      
      if (response.user.role === 'Trainer' && !response.trainerId) {
        return { 
          success: false, 
          message: 'Trainer record not found. The trainer account may not be properly linked. Please try registering again or contact support.' 
        };
      }
      
      currentUser = {
        userId: response.user.userID,
        email: response.user.email,
        role: response.user.role,
        clientId: response.clientId || null,
        trainerId: response.trainerId || null,
      };
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
      return { success: true, user: currentUser };
    } else {
      return { success: false, message: response.message || 'Login failed' };
    }
  } catch (error) {
    return { success: false, message: error.message || 'Login failed' };
  }
}

/**
 * Register user
 */
async function register(registerData) {
  try {
    const response = await apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify(registerData),
    });

    if (response.success) {
      // Auto-login after registration
      return await login(registerData.email, registerData.password);
    } else {
      return { success: false, message: response.message || 'Registration failed' };
    }
  } catch (error) {
    return { success: false, message: error.message || 'Registration failed' };
  }
}

/**
 * Logout user
 */
function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
}

