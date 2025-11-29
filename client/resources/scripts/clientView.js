// Client View - Find and Book Trainers

let currentTrainers = [];
let selectedTrainer = null;

/**
 * Render the client view (Find a Trainer)
 */
function renderClientView() {
  // Check authentication
  if (!isLoggedIn() || !isClient()) {
    renderLoginView();
    showAlert('Please login as a client to access this page', 'warning');
    return;
  }

  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="row">
      <div class="col-12">
        <h1 class="mb-4">Find a Trainer</h1>
      </div>
    </div>

    <!-- Search and Filter Section -->
    <div class="card mb-4">
      <div class="card-body">
        <h5 class="card-title">Search & Filter</h5>
        <div class="row g-3">
          <div class="col-md-4">
            <label for="specialtyFilter" class="form-label">Specialty</label>
            <input
              type="text"
              class="form-control"
              id="specialtyFilter"
              placeholder="e.g., Yoga, Strength, Cardio"
            />
          </div>
          <div class="col-md-4">
            <label for="rateFilter" class="form-label">Max Hourly Rate ($)</label>
            <input
              type="number"
              class="form-control"
              id="rateFilter"
              placeholder="e.g., 50"
              min="0"
              step="0.01"
            />
          </div>
          <div class="col-md-4 d-flex align-items-end">
            <button class="btn btn-primary w-100" onclick="searchTrainers()">
              Search Trainers
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Trainers List -->
    <div id="trainersList" class="row g-4">
      <div class="col-12">
        <p class="text-muted">Use the search filters above to find trainers.</p>
      </div>
    </div>
  `;

  // Load all trainers on initial view
  searchTrainers();
}

/**
 * Search trainers based on filters
 */
async function searchTrainers() {
  const specialty = document.getElementById('specialtyFilter')?.value.trim() || null;
  const maxRate = document.getElementById('rateFilter')?.value 
    ? parseFloat(document.getElementById('rateFilter').value) 
    : null;

  try {
    const trainers = await getTrainers({ specialty, maxRate });
    currentTrainers = trainers;
    renderTrainersList(trainers);
  } catch (error) {
    const errorMessage = error.message.includes('Cannot connect to the server') 
      ? error.message 
      : 'Error loading trainers: ' + error.message;
    showAlert(errorMessage, 'danger');
  }
}

/**
 * Render the list of trainers
 */
function renderTrainersList(trainers) {
  const trainersList = document.getElementById('trainersList');

  if (trainers.length === 0) {
    trainersList.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">
          No trainers found matching your criteria. Try adjusting your filters.
        </div>
      </div>
    `;
    return;
  }

  trainersList.innerHTML = trainers
    .map(
      (trainer) => `
      <div class="col-md-6 col-lg-4">
        <div class="card h-100">
          <div class="card-body">
            <h5 class="card-title">${trainer.trainername || 'Trainer'}</h5>
            <p class="card-text">
              ${trainer.certifications ? `<strong>Certifications:</strong> ${trainer.certifications}<br/>` : ''}
              <strong>Rate:</strong> $${trainer.hourlyRate.toFixed(2)}/hour<br/>
              ${trainer.trainerphone ? `<strong>Phone:</strong> ${trainer.trainerphone}<br/>` : ''}
            </p>
            <button class="btn btn-primary" onclick="openBookingModal(${trainer.trainerID})">
              Book Session
            </button>
          </div>
        </div>
      </div>
    `
    )
    .join('');
}

/**
 * Open booking modal for a specific trainer
 */
async function openBookingModal(trainerId) {
  try {
    const trainer = await getTrainer(trainerId);
    selectedTrainer = trainer;

    // Get trainer availability
    let availability = [];
    try {
      availability = await getTrainerAvailability(trainerId);
    } catch (error) {
      console.warn('Could not load availability:', error);
    }

    await renderBookingModal(trainer, availability);
  } catch (error) {
    showAlert('Error loading trainer details: ' + error.message, 'danger');
  }
}

/**
 * Render booking modal
 */
async function renderBookingModal(trainer, availability) {
  const user = getCurrentUser();
  const clientId = user?.clientId || null;
  const trainerId = trainer.trainerID || trainer.TrainerID;

  // Parse available days from availability
  let availableDays = [];
  if (availability && availability.length > 0) {
    const daysString = availability[0].daysAvailable || availability[0].DaysAvailable || '';
    availableDays = daysString.split(',').map(d => d.trim()).filter(d => d);
  }

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const dayOptions = availableDays.length > 0
    ? daysOfWeek.filter(day => availableDays.some(ad => ad.toLowerCase() === day.toLowerCase()))
    : [];

  if (dayOptions.length === 0) {
    showAlert('This trainer has not set their availability yet. Please try another trainer.', 'warning');
    return;
  }

  const modalHtml = `
    <div class="modal fade" id="bookingModal" tabindex="-1" aria-labelledby="bookingModalLabel" aria-hidden="true">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="bookingModalLabel">
              Book Session with ${trainer.trainername || 'Trainer'}
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <form id="bookingForm">
              <input type="hidden" id="trainerId" value="${trainerId}" />
              <input type="hidden" id="clientId" value="${clientId || ''}" />
              <input type="hidden" id="selectedTime" value="" />

              <div class="mb-3">
                <label for="bookingDay" class="form-label">Booking Day</label>
                <select class="form-select" id="bookingDay" required>
                  <option value="">Select a day</option>
                  ${dayOptions.map(day => `<option value="${day}">${day}</option>`).join('')}
                </select>
              </div>

              <div class="mb-3">
                <label class="form-label">Available Time Slots</label>
                <div id="timeSlotsContainer" class="d-flex flex-wrap gap-2 p-3 border rounded bg-light">
                  <div class="text-muted w-100 text-center">
                    Please select a day to see available time slots
                  </div>
                </div>
                <small class="form-text text-muted">
                  Grayed out times are already booked. Click an available time to select it.
                </small>
              </div>

              <div class="mb-3">
                <label for="facilityId" class="form-label">Facility (Optional)</label>
                <input
                  type="number"
                  class="form-control"
                  id="facilityId"
                  placeholder="Leave empty if no facility needed"
                  min="0"
                />
              </div>

              <div class="alert alert-info">
                <strong>Estimated Cost:</strong> 
                <span id="estimatedCost">$${((trainer.hourlyRate || trainer.HourlyRate) * 1).toFixed(2)}</span>
                <small class="d-block mt-1">(Based on 1 hour session at $${(trainer.hourlyRate || trainer.HourlyRate).toFixed(2)}/hour)</small>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" id="proceedButton" onclick="processBooking()" disabled>
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById('bookingModal');
  if (existingModal) {
    existingModal.remove();
  }

  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Show modal
  const modal = new bootstrap.Modal(document.getElementById('bookingModal'));
  modal.show();

  // Set up day change handler
  const bookingDaySelect = document.getElementById('bookingDay');
  bookingDaySelect.addEventListener('change', async function() {
    const selectedDay = this.value;
    if (selectedDay) {
      await loadTimeSlots(trainerId, selectedDay, clientId);
    } else {
      document.getElementById('timeSlotsContainer').innerHTML = `
        <div class="text-muted w-100 text-center">
          Please select a day to see available time slots
        </div>
      `;
      document.getElementById('selectedTime').value = '';
      document.getElementById('proceedButton').disabled = true;
    }
  });
}

/**
 * Load and display time slots for a selected day
 */
async function loadTimeSlots(trainerId, day, clientId) {
  const container = document.getElementById('timeSlotsContainer');
  const proceedButton = document.getElementById('proceedButton');
  
  container.innerHTML = `
    <div class="w-100 text-center">
      <div class="spinner-border spinner-border-sm text-primary" role="status">
        <span class="visually-hidden">Loading...</span>
      </div>
      <span class="ms-2">Loading available times...</span>
    </div>
  `;

  try {
    const result = await getAvailableSlots(trainerId, day, clientId);
    
    if (!result.available) {
      container.innerHTML = `
        <div class="alert alert-warning w-100 mb-0">
          ${result.message || 'No availability found for this day'}
        </div>
      `;
      proceedButton.disabled = true;
      return;
    }

    if (!result.timeSlots || result.timeSlots.length === 0) {
      container.innerHTML = `
        <div class="alert alert-info w-100 mb-0">
          No time slots available for ${day}
        </div>
      `;
      proceedButton.disabled = true;
      return;
    }

    // Render time slot buttons
    container.innerHTML = result.timeSlots.map(slot => `
      <button 
        type="button" 
        class="btn time-slot-btn ${slot.isAvailable ? 'btn-outline-primary' : 'btn-secondary'} ${slot.isBooked ? 'disabled' : ''}" 
        data-time="${slot.time}"
        ${slot.isBooked ? 'disabled title="Already booked"' : ''}
        onclick="selectTimeSlot('${slot.time}', this)"
      >
        ${slot.displayTime}
        ${slot.isBooked ? '<br><small class="text-muted">Booked</small>' : ''}
      </button>
    `).join('');

  } catch (error) {
    container.innerHTML = `
      <div class="alert alert-danger w-100 mb-0">
        Error loading time slots: ${error.message}
      </div>
    `;
    proceedButton.disabled = true;
  }
}

/**
 * Select a time slot
 */
function selectTimeSlot(time, buttonElement) {
  // Remove previous selection
  document.querySelectorAll('.time-slot-btn').forEach(btn => {
    if (!btn.disabled) {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline-primary');
    }
  });

  // Mark selected
  buttonElement.classList.remove('btn-outline-primary');
  buttonElement.classList.add('btn-primary');
  
  // Store selected time
  document.getElementById('selectedTime').value = time;
  
  // Enable proceed button
  document.getElementById('proceedButton').disabled = false;
}

/**
 * Process booking and payment
 */
async function processBooking() {
  // Check authentication
  if (!isLoggedIn() || !isClient()) {
    showAlert('Please login as a client to book a session', 'warning');
    return;
  }

  const form = document.getElementById('bookingForm');
  if (!form.checkValidity()) {
    form.reportValidity();
    return;
  }

  const user = getCurrentUser();
  const clientId = user?.clientId;
  
  if (!clientId) {
    showAlert('Client ID not found. Please login again.', 'danger');
    return;
  }

  const trainerId = parseInt(document.getElementById('trainerId').value);
  const bookingDay = document.getElementById('bookingDay').value;
  const selectedTime = document.getElementById('selectedTime').value;
  const facilityId = document.getElementById('facilityId').value 
    ? parseInt(document.getElementById('facilityId').value) 
    : null;

  // Validate required fields
  if (!trainerId || trainerId <= 0) {
    showAlert('Invalid trainer ID', 'danger');
    return;
  }

  if (!bookingDay || bookingDay.trim() === '') {
    showAlert('Please select a booking day', 'danger');
    return;
  }

  if (!selectedTime || selectedTime.trim() === '') {
    showAlert('Please select a session time', 'danger');
    return;
  }

  // Convert time to TimeSpan format (HH:mm:ss)
  const timeSpan = `${selectedTime}:00`;

  const bookingData = {
    clientid: clientId,
    TrainerID: trainerId,
    Booking_Day: bookingDay,
    Booking_Time: timeSpan,
    FacilityID: facilityId && facilityId > 0 ? facilityId : null,
  };

  // Debug logging
  console.log('Booking data being sent:', JSON.stringify(bookingData, null, 2));

  // Get the submit button
  const submitButton = document.querySelector('#bookingModal .btn-primary');
  const originalText = submitButton ? submitButton.textContent : 'Proceed to Payment';

  try {
    // Show loading state
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Processing...';
    }

    const result = await createBooking(bookingData);

    // Close modal
    const modalElement = document.getElementById('bookingModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }

    // Show success message
    showAlert(
      `✅ Payment Successful! Booking confirmed. Booking ID: ${result.bookingId || result.bookingID}`,
      'success'
    );

    // Refresh trainers list
    searchTrainers();
  } catch (error) {
    showAlert('Error creating booking: ' + error.message, 'danger');
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }
}

// showAlert is now defined in api.js as a shared utility function

/**
 * Render My Sessions view for clients
 */
async function renderMySessionsView() {
  const app = document.getElementById('app');
  const user = getCurrentUser();

  if (!user || !user.clientId) {
    showAlert('Client ID not found. Please login again.', 'danger');
    return;
  }

  app.innerHTML = `
    <div class="row">
      <div class="col-12">
        <h2 class="mb-4">My Sessions</h2>
        <div id="sessionsList" class="mt-4">
          <div class="text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  await loadClientSessions();
}

/**
 * Load and display client sessions
 */
async function loadClientSessions() {
  const user = getCurrentUser();
  const sessionsList = document.getElementById('sessionsList');

  if (!user || !user.clientId) {
    sessionsList.innerHTML = '<div class="alert alert-danger">Client ID not found. Please login again.</div>';
    return;
  }

  try {
    const sessions = await getClientSessions(user.clientId);

    if (!sessions || sessions.length === 0) {
      sessionsList.innerHTML = `
        <div class="alert alert-info">
          <h5>No sessions booked yet</h5>
          <p>Start by finding a trainer and booking your first session!</p>
          <button class="btn btn-primary" onclick="switchView('client')">Find a Trainer</button>
        </div>
      `;
      return;
    }

    sessionsList.innerHTML = `
      <div class="table-responsive">
        <table class="table table-striped table-hover">
          <thead class="table-dark">
            <tr>
              <th>Booking ID</th>
              <th>Trainer</th>
              <th>Day</th>
              <th>Time</th>
              <th>Status</th>
              <th>Amount Paid</th>
              <th>Payment Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${sessions.map(session => `
              <tr>
                <td>#${session.bookingID}</td>
                <td>${session.trainerName}</td>
                <td>${session.bookingDay}</td>
                <td>${session.bookingTime}</td>
                <td>
                  <span class="badge ${getStatusBadgeClass(session.bookingStatus)}">
                    ${session.bookingStatus}
                  </span>
                </td>
                <td>$${parseFloat(session.paymentAmount).toFixed(2)}</td>
                <td>${session.paymentDate}</td>
                <td>
                  ${session.bookingStatus.toLowerCase() !== 'cancelled' 
                    ? `<button class="btn btn-sm btn-danger" onclick="handleCancelBooking(${session.bookingID})" title="Cancel this booking">
                         Cancel
                       </button>`
                    : '<span class="text-muted">-</span>'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    sessionsList.innerHTML = `
      <div class="alert alert-danger">
        <h5>Error loading sessions</h5>
        <p>${error.message}</p>
      </div>
    `;
  }
}

/**
 * Get badge class for booking status
 */
function getStatusBadgeClass(status) {
  const statusLower = status.toLowerCase();
  if (statusLower === 'scheduled' || statusLower === 'confirmed') {
    return 'bg-success';
  } else if (statusLower === 'cancelled') {
    return 'bg-danger';
  } else if (statusLower === 'completed') {
    return 'bg-primary';
  } else {
    return 'bg-secondary';
  }
}

/**
 * Handle booking cancellation
 */
async function handleCancelBooking(bookingId) {
  const user = getCurrentUser();
  if (!user || !user.clientId) {
    showAlert('Client ID not found. Please login again.', 'danger');
    return;
  }

  // Confirm cancellation
  if (!confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
    return;
  }

  try {
    const result = await cancelBooking(bookingId, user.clientId);
    
    if (result.success) {
      showAlert('✅ Booking cancelled successfully', 'success');
      // Refresh the sessions list
      await loadClientSessions();
    } else {
      showAlert(`Error cancelling booking: ${result.message || 'Unknown error'}`, 'danger');
    }
  } catch (error) {
    showAlert(`Error cancelling booking: ${error.message}`, 'danger');
  }
}

