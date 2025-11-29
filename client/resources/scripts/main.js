// Main Application Entry Point

let currentView = 'client';

/**
 * Initialize the application
 */
function init() {
  // Initialize authentication
  initAuth();
  
  // Set up navigation event listeners
  setupNavigation();
  
  // Update navbar based on auth state
  updateNavbar();
  
  // Check if user is logged in
  if (!isLoggedIn()) {
    // Show login view if not authenticated
    renderLoginView();
  } else {
    // Render appropriate view based on user role
    const user = getCurrentUser();
    if (user.role === 'Client') {
      currentView = 'client';
      renderClientView();
    } else if (user.role === 'Trainer') {
      currentView = 'trainer';
      renderTrainerView();
    }
  }
}

/**
 * Update navbar based on authentication state
 */
function updateNavbar() {
  const navClient = document.getElementById('navClient');
  const navTrainer = document.getElementById('navTrainer');
  const navLogin = document.getElementById('navLogin');
  const navUser = document.getElementById('navUser');
  const userInfo = document.getElementById('userInfo');

  if (isLoggedIn()) {
    const user = getCurrentUser();
    
    // Show appropriate nav items based on role
    if (user.role === 'Client') {
      navClient.style.display = 'inline-flex';
      const navMySessions = document.getElementById('navMySessions');
      if (navMySessions) {
        navMySessions.style.display = 'inline-flex';
      }
      navTrainer.style.display = 'none';
    } else if (user.role === 'Trainer') {
      navClient.style.display = 'none';
      const navMySessions = document.getElementById('navMySessions');
      if (navMySessions) {
        navMySessions.style.display = 'none';
      }
      navTrainer.style.display = 'inline-flex';
    }
    
    navLogin.style.display = 'none';
    if (navUser) {
      navUser.style.display = 'flex';
    }
    if (userInfo) {
      userInfo.textContent = `Logged in as: ${user.email} (${user.role})`;
      userInfo.style.display = 'inline-flex';
    }
  } else {
    navClient.style.display = 'none';
    const navMySessions = document.getElementById('navMySessions');
    if (navMySessions) {
      navMySessions.style.display = 'none';
    }
    navTrainer.style.display = 'none';
    navLogin.style.display = 'inline-flex';
    // Completely hide the user container and clear text
    if (navUser) {
      navUser.style.display = 'none';
    }
    if (userInfo) {
      userInfo.textContent = '';
      userInfo.style.display = 'none';
    }
  }
}

/**
 * Handle logout
 */
function handleLogout() {
  logout();
  // Immediately hide user info and container
  const navUser = document.getElementById('navUser');
  const userInfo = document.getElementById('userInfo');
  if (navUser) {
    navUser.style.display = 'none';
  }
  if (userInfo) {
    userInfo.textContent = '';
    userInfo.style.display = 'none';
  }
  updateNavbar();
  renderLoginView();
  showAlert('You have been logged out', 'info');
}

/**
 * Set up navigation event listeners
 */
function setupNavigation() {
  document.addEventListener('click', (e) => {
    // Handle buttons with data-view attribute
    if (e.target.matches('[data-view]') || e.target.closest('[data-view]')) {
      e.preventDefault();
      const button = e.target.closest('[data-view]') || e.target;
      const view = button.getAttribute('data-view');
      if (view) {
        switchView(view);
      }
    }
  });

  // Update active nav button
  document.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.nav-btn[data-view]').forEach((b) => b.classList.remove('active'));
      this.classList.add('active');
    });
  });
}

/**
 * Switch between views
 */
function switchView(view) {
  // Check authentication
  if (!isLoggedIn()) {
    renderLoginView();
    showAlert('Please login to access this page', 'warning');
    return;
  }

  const user = getCurrentUser();
  
  // Check role permissions
  if (view === 'client' && user.role !== 'Client') {
    showAlert('This page is only available for clients', 'warning');
    return;
  }
  
  if (view === 'mySessions' && user.role !== 'Client') {
    showAlert('This page is only available for clients', 'warning');
    return;
  }
  
  if (view === 'trainer' && user.role !== 'Trainer') {
    showAlert('This page is only available for trainers', 'warning');
    return;
  }

  currentView = view;
  
  // Update active nav button
  document.querySelectorAll('.nav-btn[data-view]').forEach((btn) => {
    btn.classList.remove('active');
    if (btn.getAttribute('data-view') === view) {
      btn.classList.add('active');
    }
  });

  // Render appropriate view
  if (view === 'client') {
    renderClientView();
  } else if (view === 'mySessions') {
    renderMySessionsView();
  } else if (view === 'trainer') {
    renderTrainerView();
  }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

