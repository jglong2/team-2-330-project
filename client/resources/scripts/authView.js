// Authentication UI - Login and Register Views

/**
 * Render login view
 */
function renderLoginView() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-6 col-lg-4">
        <div class="card">
          <div class="card-body">
            <h2 class="card-title text-center mb-4">Login</h2>
            <form id="loginForm">
              <div class="mb-3">
                <label for="loginEmail" class="form-label">Email</label>
                <input
                  type="email"
                  class="form-control"
                  id="loginEmail"
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div class="mb-3">
                <label for="loginPassword" class="form-label">Password</label>
                <input
                  type="password"
                  class="form-control"
                  id="loginPassword"
                  required
                  placeholder="Enter your password"
                />
              </div>
              <button type="button" class="btn btn-primary w-100 mb-3" onclick="handleLogin()">
                Login
              </button>
              <div class="text-center">
                <p class="mb-0">Don't have an account? <a href="#" onclick="renderRegisterView(); return false;">Register here</a></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render register view
 */
async function renderRegisterView() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="row justify-content-center">
      <div class="col-md-8 col-lg-6">
        <div class="card">
          <div class="card-body">
            <h2 class="card-title text-center mb-4">Create Account</h2>
            <form id="registerForm">
              <div class="mb-3">
                <label for="registerEmail" class="form-label">Email</label>
                <input
                  type="email"
                  class="form-control"
                  id="registerEmail"
                  required
                  placeholder="Enter your email"
                />
              </div>
              <div class="mb-3">
                <label for="registerPassword" class="form-label">Password</label>
                <input
                  type="password"
                  class="form-control"
                  id="registerPassword"
                  required
                  placeholder="Enter your password"
                  minlength="6"
                />
              </div>
              <div class="mb-3">
                <label for="registerRole" class="form-label">I am a...</label>
                <select class="form-select" id="registerRole" required onchange="toggleRoleFields()">
                  <option value="">Select role</option>
                  <option value="Client">Client</option>
                  <option value="Trainer">Trainer</option>
                </select>
              </div>
              
              <!-- Common fields -->
              <div class="mb-3">
                <label for="registerName" class="form-label">Name</label>
                <input
                  type="text"
                  class="form-control"
                  id="registerName"
                  required
                  placeholder="Enter your full name"
                />
              </div>
              <div class="mb-3">
                <label for="registerPhone" class="form-label">Phone (Optional)</label>
                <input
                  type="tel"
                  class="form-control"
                  id="registerPhone"
                  placeholder="Enter your phone number"
                />
              </div>

              <!-- Client-specific fields -->
              <div id="clientFields" style="display: none;">
                <div class="mb-3">
                  <label for="registerCardNumber" class="form-label">Card Number</label>
                  <input
                    type="text"
                    class="form-control"
                    id="registerCardNumber"
                    placeholder="Enter your card number"
                  />
                </div>
              </div>

              <!-- Trainer-specific fields -->
              <div id="trainerFields" style="display: none;">
                <div class="mb-3">
                  <label for="registerHourlyRate" class="form-label">Hourly Rate ($)</label>
                  <input
                    type="number"
                    class="form-control"
                    id="registerHourlyRate"
                    step="0.01"
                    min="0"
                    placeholder="Enter your hourly rate"
                  />
                </div>
                <div class="mb-3">
                  <label for="registerCertifications" class="form-label">Certification (Optional)</label>
                  <select class="form-select" id="registerCertifications">
                    <option value="">Select a certification (optional)</option>
                    <!-- Certifications will be loaded dynamically -->
                  </select>
                </div>
              </div>

              <button type="button" class="btn btn-primary w-100 mb-3" onclick="handleRegister()">
                Register
              </button>
              <div class="text-center">
                <p class="mb-0">Already have an account? <a href="#" onclick="renderLoginView(); return false;">Login here</a></p>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `;

  // Load certifications into dropdown
  await loadCertifications();
}

/**
 * Load certifications into the dropdown
 */
async function loadCertifications() {
  try {
    const certifications = await getCertifications();
    const select = document.getElementById('registerCertifications');
    
    if (select && certifications && certifications.length > 0) {
      // Add each certification as an option
      certifications.forEach(cert => {
        const option = document.createElement('option');
        option.value = cert;
        option.textContent = cert;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error loading certifications:', error);
    // If loading fails, the dropdown will just have the default "Select" option
  }
}

/**
 * Toggle role-specific fields
 */
function toggleRoleFields() {
  const role = document.getElementById('registerRole').value;
  const clientFields = document.getElementById('clientFields');
  const trainerFields = document.getElementById('trainerFields');
  const cardNumberInput = document.getElementById('registerCardNumber');
  const hourlyRateInput = document.getElementById('registerHourlyRate');

  if (role === 'Client') {
    clientFields.style.display = 'block';
    trainerFields.style.display = 'none';
    cardNumberInput.required = true;
    hourlyRateInput.required = false;
  } else if (role === 'Trainer') {
    clientFields.style.display = 'none';
    trainerFields.style.display = 'block';
    cardNumberInput.required = false;
    hourlyRateInput.required = true;
  } else {
    clientFields.style.display = 'none';
    trainerFields.style.display = 'none';
    cardNumberInput.required = false;
    hourlyRateInput.required = false;
  }
}

/**
 * Handle login
 */
async function handleLogin() {
  const form = document.getElementById('loginForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;

  const submitButton = event.target;
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Logging in...';

  const result = await login(email, password);

  if (result.success) {
    // Reset button immediately
    submitButton.disabled = false;
    submitButton.textContent = originalText;
    
    // Update navbar and redirect
    updateNavbar();
    showAlert('Login successful!', 'success');
    
    // Redirect based on role
    setTimeout(() => {
      if (result.user.role === 'Client') {
        switchView('client');
      } else if (result.user.role === 'Trainer') {
        switchView('trainer');
      }
    }, 500);
  } else {
    showAlert(result.message || 'Login failed. Please check your credentials.', 'danger');
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

/**
 * Handle register
 */
async function handleRegister() {
  const form = document.getElementById('registerForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const role = document.getElementById('registerRole').value;
  const registerData = {
    email: document.getElementById('registerEmail').value,
    password: document.getElementById('registerPassword').value,
    role: role,
    name: document.getElementById('registerName').value,
    phone: document.getElementById('registerPhone').value || null,
  };

  if (role === 'Client') {
    const cardNumber = document.getElementById('registerCardNumber').value;
    if (!cardNumber) {
      showAlert('Card number is required for clients', 'danger');
      return;
    }
    registerData.cardNumber = cardNumber;
  } else if (role === 'Trainer') {
    const hourlyRate = parseFloat(document.getElementById('registerHourlyRate').value);
    if (!hourlyRate || hourlyRate <= 0) {
      showAlert('Hourly rate is required for trainers', 'danger');
      return;
    }
    registerData.hourlyRate = hourlyRate;
    const certificationValue = document.getElementById('registerCertifications').value;
    registerData.certifications = certificationValue && certificationValue.trim() !== '' ? certificationValue : null;
  }

  const submitButton = event.target;
  const originalText = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.textContent = 'Registering...';

  const result = await register(registerData);

  if (result.success) {
    // Reset button immediately
    submitButton.disabled = false;
    submitButton.textContent = originalText;
    
    updateNavbar();
    showAlert('Registration successful! You are now logged in.', 'success');
    // Redirect based on role
    setTimeout(() => {
      if (result.user.role === 'Client') {
        switchView('client');
      } else if (result.user.role === 'Trainer') {
        switchView('trainer');
      }
    }, 500);
  } else {
    showAlert(result.message || 'Registration failed. Please try again.', 'danger');
    submitButton.disabled = false;
    submitButton.textContent = originalText;
  }
}

