// Auth utilities

// Check if user is logged in
function isUserLoggedIn() {
  const userEmail = localStorage.getItem('user_email');
  const authToken = localStorage.getItem('auth_token');
  const isLoggedIn = userEmail !== null && authToken !== null;
  console.log('[Auth] isUserLoggedIn check:', { userEmail, hasToken: authToken !== null, isLoggedIn });
  return isLoggedIn;
}

// Get logged in user info
function getUserEmail() {
  return localStorage.getItem('user_email');
}

function getUserId() {
  return localStorage.getItem('user_uid');
}

function getUserName() {
  return localStorage.getItem('user_name');
}

function getAuthToken() {
  return localStorage.getItem('auth_token');
}

// Log out user
function logoutUser() {
  localStorage.removeItem('user_email');
  localStorage.removeItem('user_uid');
  localStorage.removeItem('user_name');
  localStorage.removeItem('auth_token');
  window.location.href = 'index.html';
}

// Redirect to login if not authenticated
function requireAuth() {
  if (!isUserLoggedIn()) {
    window.location.href = 'login.html';
  }
}

// Update UI based on auth status
function updateAuthUI() {
  const userEmail = getUserEmail();
  const userName = getUserName();
  
  if (userEmail && isUserLoggedIn()) {
    // User is logged in - update UI
    const authLinks = document.querySelectorAll('.auth-link');
    let displayName = userName || userEmail.split('@')[0];
    // Get only first name
    displayName = displayName.split(' ')[0];
    authLinks.forEach(link => {
      link.innerHTML = `<a href="#" onclick="logoutUser(); return false;">Logout (${displayName})</a>`;
    });
  } else {
    // User is not logged in
    const authLinks = document.querySelectorAll('.auth-link');
    authLinks.forEach(link => {
      link.innerHTML = '<a href="login.html">Login</a> | <a href="signup.html">Sign Up</a>';
    });
  }
}

// Call on page load
document.addEventListener('DOMContentLoaded', updateAuthUI);
