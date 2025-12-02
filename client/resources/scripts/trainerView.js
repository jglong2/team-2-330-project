// Trainer View - Manage Schedule and View Sessions

let currentTrainerId = null; // In a real app, this would come from authentication

/**
 * Render the trainer view (Trainer Dashboard)
 */
function renderTrainerView() {
  // Check authentication
  if (!isLoggedIn() || !isTrainer()) {
    renderLoginView();
    showAlert('Please login as a trainer to access this page', 'warning');
    return;
  }

  const user = getCurrentUser();
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="row">
      <div class="col-12">
        <h1 class="mb-4">Trainer Dashboard</h1>
      </div>
    </div>

    <!-- Dashboard Content -->
    <div id="dashboardContent">
      <div class="alert alert-info">
        Loading your dashboard...
      </div>
    </div>
  `;

  // Auto-load dashboard
  loadTrainerDashboard();
}

/**
 * Load trainer dashboard
 */
async function loadTrainerDashboard() {
  // Get trainer ID from authenticated user
  const user = getCurrentUser();
  if (!user || !user.trainerId) {
    showAlert('Trainer ID not found. Please login again.', 'danger');
    return;
  }

  const trainerId = user.trainerId;
  currentTrainerId = trainerId;

  try {
    // Load sessions and availability in parallel
    const [sessions, availability] = await Promise.all([
      getTrainerSessions(trainerId).catch((e) => { console.error('Error loading sessions:', e); return []; }),
      getTrainerAvailability(trainerId).catch((e) => { console.error('Error loading availability:', e); return []; }),
    ]);

    renderDashboardContent(sessions, availability);
    
    // Pre-select days if availability exists
    if (availability && availability.length > 0) {
      setTimeout(() => preSelectDays(availability), 100);
    }
  } catch (error) {
    showAlert('Error loading dashboard: ' + error.message, 'danger');
  }
}

/**
 * Render dashboard content
 */
function renderDashboardContent(sessions, availability) {
  const dashboardContent = document.getElementById('dashboardContent');
  dashboardContent.innerHTML = `
    <div class="row">
      <!-- Add Availability Section -->
      <div class="col-12 col-lg-6 mb-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Add Availability</h5>
          </div>
          <div class="card-body">
            <form id="availabilityForm">
              <input type="hidden" id="availabilityTrainerId" value="${currentTrainerId}" />
              
              <div class="mb-3">
                <label class="form-label">Days Available</label>
                <div class="border rounded p-3">
                  <div class="row g-2">
                    <div class="col-6 col-md-4">
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="Monday" id="dayMonday" name="daysAvailable">
                        <label class="form-check-label" for="dayMonday">Monday</label>
                      </div>
                    </div>
                    <div class="col-6 col-md-4">
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="Tuesday" id="dayTuesday" name="daysAvailable">
                        <label class="form-check-label" for="dayTuesday">Tuesday</label>
                      </div>
                    </div>
                    <div class="col-6 col-md-4">
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="Wednesday" id="dayWednesday" name="daysAvailable">
                        <label class="form-check-label" for="dayWednesday">Wednesday</label>
                      </div>
                    </div>
                    <div class="col-6 col-md-4">
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="Thursday" id="dayThursday" name="daysAvailable">
                        <label class="form-check-label" for="dayThursday">Thursday</label>
                      </div>
                    </div>
                    <div class="col-6 col-md-4">
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="Friday" id="dayFriday" name="daysAvailable">
                        <label class="form-check-label" for="dayFriday">Friday</label>
                      </div>
                    </div>
                    <div class="col-6 col-md-4">
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="Saturday" id="daySaturday" name="daysAvailable">
                        <label class="form-check-label" for="daySaturday">Saturday</label>
                      </div>
                    </div>
                    <div class="col-6 col-md-4">
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" value="Sunday" id="daySunday" name="daysAvailable">
                        <label class="form-check-label" for="daySunday">Sunday</label>
                      </div>
                    </div>
                  </div>
                </div>
                <small class="form-text text-muted">Select all days you are available</small>
              </div>

              <button type="button" class="btn btn-primary" onclick="addAvailability()">
                Update Availability
              </button>
            </form>
          </div>
        </div>
      </div>

      <!-- Current Availability -->
      <div class="col-12 col-lg-6 mb-4">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Current Availability</h5>
          </div>
          <div class="card-body">
            ${renderAvailabilityList(availability)}
          </div>
        </div>
      </div>
    </div>

    <!-- Upcoming Sessions -->
    <div class="row mt-4">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5 class="mb-0">Upcoming Sessions</h5>
          </div>
          <div class="card-body">
            ${renderSessionsTable(sessions)}
          </div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Render availability list
 */
function renderAvailabilityList(availability) {
  if (availability.length === 0) {
    return '<p class="text-muted mb-0">No availability set yet.</p>';
  }

  return `
    <div class="list-group">
      ${availability
        .map(
          (slot) => `
        <div class="list-group-item">
          <div class="d-flex w-100 justify-content-between">
            <h6 class="mb-1">Available Days</h6>
          </div>
          <p class="mb-1">
            ${slot.daysAvailable || 'Not set'}
          </p>
        </div>
      `
        )
        .join('')}
    </div>
  `;
}

/**
 * Pre-select days in checkboxes based on current availability
 */
function preSelectDays(availability) {
  if (!availability || availability.length === 0) {
    return;
  }

  // Get the days from the first availability record (assuming one record per trainer)
  const daysString = availability[0].daysAvailable;
  if (!daysString) {
    return;
  }

  // Split by comma and trim
  const days = daysString.split(',').map(d => d.trim());
  
  // Check the corresponding checkboxes
  days.forEach(day => {
    const checkbox = document.querySelector(`input[name="daysAvailable"][value="${day}"]`);
    if (checkbox) {
      checkbox.checked = true;
    }
  });
}

/**
 * Render sessions table
 */
function renderSessionsTable(sessions) {
  if (sessions.length === 0) {
    return '<p class="text-muted mb-0">No upcoming sessions scheduled.</p>';
  }

  return `
    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
              <th>Day</th>
              <th>Time</th>
              <th>Duration</th>
              <th>Client Name</th>
              <th>Card (Last 4)</th>
              <th>Status</th>
              <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${sessions
            .map(
              (session) => {
                const status = session.bookingStatus || session.booking_Status || 'Unknown';
                const statusLower = status.toLowerCase();
                const bookingId = session.bookingID || session.bookingId;
                const isPending = statusLower === 'pending';
                // Can cancel pending, confirmed, or scheduled bookings
                const canCancel = statusLower === 'pending' || statusLower === 'confirmed' || statusLower === 'scheduled';
                const isCancelled = statusLower === 'cancelled';
                
                // Determine badge color based on status
                let badgeClass = 'bg-secondary';
                if (statusLower === 'confirmed' || statusLower === 'scheduled') {
                  badgeClass = 'bg-success';
                } else if (statusLower === 'pending') {
                  badgeClass = 'bg-warning text-dark';
                } else if (statusLower === 'cancelled') {
                  badgeClass = 'bg-danger';
                } else if (statusLower === 'completed') {
                  badgeClass = 'bg-primary';
                }
                
                return `
                <tr>
              <td>${session.bookingDay || session.booking_Day}</td>
              <td>${formatTime(session.bookingTime || session.booking_Time)}</td>
              <td>1 hour</td>
              <td>${session.clientName || 'Unknown'}</td>
              <td>****${session.cardLastFour || '****'}</td>
              <td>
                <span class="badge ${badgeClass}">
                  ${status}
                </span>
              </td>
              <td>
                ${!isCancelled ? `
                  <div class="btn-group" role="group">
                    ${isPending ? `
                      <button class="btn btn-sm btn-success" onclick="handleConfirmBooking(${bookingId})" title="Confirm this booking">
                        Confirm
                      </button>
                    ` : ''}
                    ${canCancel ? `
                      <button class="btn btn-sm btn-danger" onclick="handleCancelBookingByTrainer(${bookingId})" title="Cancel this booking">
                        Cancel
                      </button>
                    ` : ''}
                  </div>
                ` : '<span class="text-muted">-</span>'}
              </td>
            </tr>
          `;
              }
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

/**
 * Add availability slot
 */
async function addAvailability() {
  const form = document.getElementById('availabilityForm');
  
  const trainerId = parseInt(document.getElementById('availabilityTrainerId').value);
  
  // Get all selected days from checkboxes
  const selectedDays = Array.from(document.querySelectorAll('input[name="daysAvailable"]:checked'))
    .map(checkbox => checkbox.value);

  if (selectedDays.length === 0) {
    showAlert('Please select at least one day', 'warning');
    return;
  }

  // Format as comma-separated string (e.g., "Monday, Wednesday, Friday")
  const daysAvailable = selectedDays.join(', ');

  const availabilityData = {
    TrainerID: trainerId,
    DaysAvailable: daysAvailable,
  };

  try {
    const result = await setTrainerAvailability(availabilityData);
    showAlert('Availability slot added successfully!', 'success');
    
    // Reset form
    form.reset();
    
    // Reload dashboard
    loadTrainerDashboard();
  } catch (error) {
    showAlert('Error adding availability: ' + error.message, 'danger');
  }
}

/**
 * Format time from TimeSpan string to readable format
 */
function formatTime(timeSpan) {
  if (!timeSpan) return 'N/A';
  const parts = timeSpan.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0]);
    const minutes = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${ampm}`;
  }
  return timeSpan;
}

/**
 * Handle confirming a pending booking
 */
async function handleConfirmBooking(bookingId) {
  const user = getCurrentUser();
  if (!user || !user.trainerId) {
    showAlert('Trainer ID not found. Please login again.', 'danger');
    return;
  }

  // Confirm action
  if (!confirm('Are you sure you want to confirm this booking?')) {
    return;
  }

  try {
    const result = await confirmBooking(bookingId, user.trainerId);
    
    if (result.success) {
      showAlert('✅ Booking confirmed successfully', 'success');
      // Reload dashboard
      loadTrainerDashboard();
    } else {
      showAlert(`Error confirming booking: ${result.message || 'Unknown error'}`, 'danger');
    }
  } catch (error) {
    showAlert(`Error confirming booking: ${error.message}`, 'danger');
  }
}

/**
 * Handle cancelling a booking by trainer
 */
async function handleCancelBookingByTrainer(bookingId) {
  const user = getCurrentUser();
  if (!user || !user.trainerId) {
    showAlert('Trainer ID not found. Please login again.', 'danger');
    return;
  }

  // Confirm cancellation
  if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
    return;
  }

  try {
    const result = await cancelBookingByTrainer(bookingId, user.trainerId);
    
    if (result.success) {
      showAlert('✅ Booking cancelled successfully', 'success');
      // Reload dashboard
      loadTrainerDashboard();
    } else {
      showAlert(`Error cancelling booking: ${result.message || 'Unknown error'}`, 'danger');
    }
  } catch (error) {
    showAlert(`Error cancelling booking: ${error.message}`, 'danger');
  }
}

// showAlert is now defined in api.js as a shared utility function

