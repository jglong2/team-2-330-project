// API Configuration and Utility Functions
// Update this to match your backend URL (check launchSettings.json for the correct port)
// Using HTTP for easier development (no certificate issues)
const API_BASE_URL = 'http://localhost:5130/api'; // HTTP port from launchSettings.json
// Alternative for HTTPS: const API_BASE_URL = 'https://localhost:7228/api';

/**
 * Generic API fetch function with error handling
 */
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      const errorMessage = errorData.error || errorData.message || errorData.details || errorData.innerException || `HTTP error! status: ${response.status}`;
      console.error('API Error Details:', errorData);
      console.error('Full error object:', JSON.stringify(errorData, null, 2));
      throw new Error(errorMessage);
    }

    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED')) {
      throw new Error('Cannot connect to the server. Please make sure the backend API is running. Run "dotnet run" in the /api folder.');
    }
    
    throw error;
  }
}

/**
 * Get all trainers with optional filters
 */
async function getTrainers(filters = {}) {
  const params = new URLSearchParams();
  if (filters.specialty) params.append('specialty', filters.specialty);
  if (filters.maxRate) params.append('maxRate', filters.maxRate);

  const queryString = params.toString();
  const endpoint = `/trainers${queryString ? `?${queryString}` : ''}`;
  return await apiCall(endpoint);
}

/**
 * Get a specific trainer by ID
 */
async function getTrainer(trainerId) {
  return await apiCall(`/trainers/${trainerId}`);
}

/**
 * Get sessions for a specific trainer
 */
async function getTrainerSessions(trainerId) {
  return await apiCall(`/bookings/sessions/${trainerId}`);
}

/**
 * Get sessions for a specific client
 */
async function getClientSessions(clientId) {
  return await apiCall(`/bookings/client/${clientId}`);
}

/**
 * Cancel a booking
 */
async function cancelBooking(bookingId, clientId) {
  return await apiCall(`/bookings/${bookingId}/cancel`, {
    method: 'PUT',
    body: JSON.stringify({ clientId: clientId }),
  });
}

/**
 * Get available time slots for a trainer on a specific day
 */
async function getAvailableSlots(trainerId, day, clientId = null) {
  const endpoint = `/bookings/available-slots/${trainerId}/${encodeURIComponent(day)}${clientId ? `?clientId=${clientId}` : ''}`;
  return await apiCall(endpoint);
}

/**
 * Create a new booking
 */
async function createBooking(bookingData) {
  return await apiCall('/bookings', {
    method: 'POST',
    body: JSON.stringify(bookingData),
  });
}

/**
 * Get availability for a trainer
 */
async function getTrainerAvailability(trainerId) {
  return await apiCall(`/availability/${trainerId}`);
}

/**
 * Set trainer availability
 */
async function setTrainerAvailability(availabilityData) {
  return await apiCall('/availability', {
    method: 'POST',
    body: JSON.stringify(availabilityData),
  });
}

/**
 * Get all available certifications
 */
async function getCertifications() {
  return await apiCall('/certifications');
}

/**
 * Show alert message (shared utility function)
 */
function showAlert(message, type = 'info') {
  const alertHtml = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>
  `;

  const app = document.getElementById('app');
  if (app) {
    app.insertAdjacentHTML('afterbegin', alertHtml);

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      const alert = app.querySelector('.alert');
      if (alert) {
        const bsAlert = new bootstrap.Alert(alert);
        bsAlert.close();
      }
    }, 5000);
  }
}

