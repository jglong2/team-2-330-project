using Microsoft.AspNetCore.Mvc;
using api.DataAccess;
using api.Models;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BookingsController : ControllerBase
    {
        private readonly DatabaseService _dbService;

        public BookingsController(DatabaseService dbService)
        {
            _dbService = dbService;
        }

        // GET: api/bookings/sessions/5
        [HttpGet("sessions/{trainerId}")]
        public async Task<ActionResult<IEnumerable<SessionBooking>>> GetSessions(int trainerId)
        {
            try
            {
                string query = @"
                    SELECT BookingID, clientid, TrainerID, paymentID, Booking_Day, 
                           Booking_Time, bookingStatus, statusUpdateTime 
                    FROM Session_Booking 
                    WHERE TrainerID = @trainerId 
                    ORDER BY Booking_Day, Booking_Time";

                var dataTable = await _dbService.ExecuteQueryAsync(query, new MySqlParameter("@trainerId", trainerId));
                var sessions = new List<SessionBooking>();

                foreach (DataRow row in dataTable.Rows)
                {
                    sessions.Add(new SessionBooking
                    {
                        BookingID = Convert.ToInt32(row["BookingID"]),
                        clientid = Convert.ToInt32(row["clientid"]),
                        TrainerID = Convert.ToInt32(row["TrainerID"]),
                        paymentID = Convert.ToInt32(row["paymentID"]),
                        Booking_Day = row["Booking_Day"].ToString() ?? string.Empty,
                        Booking_Time = TimeSpan.Parse(row["Booking_Time"].ToString() ?? "00:00:00"),
                        bookingStatus = row["bookingStatus"].ToString() ?? "Scheduled",
                        statusUpdateTime = Convert.ToDateTime(row["statusUpdateTime"])
                    });
                }

                return Ok(sessions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while fetching sessions", message = ex.Message });
            }
        }

        // GET: api/bookings/available-slots/{trainerId}/{day}?clientId={clientId}
        [HttpGet("available-slots/{trainerId}/{day}")]
        public async Task<ActionResult<object>> GetAvailableSlots(int trainerId, string day, [FromQuery] int? clientId)
        {
            try
            {
                // Get trainer's available days
                string availabilityQuery = @"
                    SELECT DaysAvailable 
                    FROM Trainer_Availability 
                    WHERE TrainerID = @trainerId";
                
                var availabilityTable = await _dbService.ExecuteQueryAsync(
                    availabilityQuery, 
                    new MySqlParameter("@trainerId", trainerId)
                );

                if (availabilityTable.Rows.Count == 0)
                {
                    return Ok(new { 
                        available = false, 
                        message = "Trainer has not set availability",
                        timeSlots = new List<object>()
                    });
                }

                string daysAvailable = availabilityTable.Rows[0]["DaysAvailable"].ToString() ?? "";
                var availableDays = daysAvailable.Split(',').Select(d => d.Trim()).ToList();

                // Check if the requested day is in trainer's availability (case-insensitive)
                if (!availableDays.Any(d => d.Equals(day, StringComparison.OrdinalIgnoreCase)))
                {
                    return Ok(new { 
                        available = false, 
                        message = $"Trainer is not available on {day}",
                        timeSlots = new List<object>()
                    });
                }

                // Normalize day name for database query (use the actual day name from availability)
                string normalizedDay = availableDays.First(d => d.Equals(day, StringComparison.OrdinalIgnoreCase));

                // Get all bookings for this trainer on this day (case-insensitive day matching)
                string trainerBookingsQuery = @"
                    SELECT Booking_Time 
                    FROM Session_Booking 
                    WHERE TrainerID = @trainerId 
                    AND UPPER(Booking_Day) = UPPER(@day)
                    AND bookingStatus != 'Cancelled'";

                var trainerBookingsTable = await _dbService.ExecuteQueryAsync(
                    trainerBookingsQuery,
                    new MySqlParameter("@trainerId", trainerId),
                    new MySqlParameter("@day", day)
                );

                var bookedTimes = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
                foreach (DataRow row in trainerBookingsTable.Rows)
                {
                    try
                    {
                        var timeValue = row["Booking_Time"];
                        if (timeValue == null || timeValue == DBNull.Value)
                            continue;

                        TimeSpan timeSpan;
                        if (timeValue is TimeSpan ts)
                        {
                            timeSpan = ts;
                        }
                        else if (timeValue is DateTime dt)
                        {
                            timeSpan = dt.TimeOfDay;
                        }
                        else
                        {
                            string timeString = timeValue.ToString() ?? "00:00:00";
                            if (!TimeSpan.TryParse(timeString, out timeSpan))
                            {
                                System.Diagnostics.Debug.WriteLine($"Warning: Could not parse time '{timeString}' for trainer booking");
                                continue;
                            }
                        }
                        // Format as HH:mm (e.g., "12:00" for noon)
                        string timeKey = $"{timeSpan.Hours:00}:{timeSpan.Minutes:00}";
                        bookedTimes.Add(timeKey);
                        System.Diagnostics.Debug.WriteLine($"Added booked time for trainer: {timeKey}");
                    }
                    catch (Exception ex)
                    {
                        System.Diagnostics.Debug.WriteLine($"Error parsing trainer booking time: {ex.Message}");
                        continue;
                    }
                }

                // Get client's bookings on this day (if clientId provided)
                if (clientId.HasValue && clientId.Value > 0)
                {
                    string clientBookingsQuery = @"
                        SELECT Booking_Time 
                        FROM Session_Booking 
                        WHERE clientid = @clientId 
                        AND UPPER(Booking_Day) = UPPER(@day)
                        AND bookingStatus != 'Cancelled'";

                    var clientBookingsTable = await _dbService.ExecuteQueryAsync(
                        clientBookingsQuery,
                        new MySqlParameter("@clientId", clientId.Value),
                        new MySqlParameter("@day", day)
                    );

                    foreach (DataRow row in clientBookingsTable.Rows)
                    {
                        try
                        {
                            var timeValue = row["Booking_Time"];
                            if (timeValue == null || timeValue == DBNull.Value)
                                continue;

                            TimeSpan timeSpan;
                            if (timeValue is TimeSpan ts)
                            {
                                timeSpan = ts;
                            }
                            else if (timeValue is DateTime dt)
                            {
                                timeSpan = dt.TimeOfDay;
                            }
                            else
                            {
                                string timeString = timeValue.ToString() ?? "00:00:00";
                                if (!TimeSpan.TryParse(timeString, out timeSpan))
                                {
                                    System.Diagnostics.Debug.WriteLine($"Warning: Could not parse time '{timeString}' for client booking");
                                    continue;
                                }
                            }
                            // Format as HH:mm (e.g., "12:00" for noon)
                            string timeKey = $"{timeSpan.Hours:00}:{timeSpan.Minutes:00}";
                            bookedTimes.Add(timeKey);
                            System.Diagnostics.Debug.WriteLine($"Added booked time for client: {timeKey}");
                        }
                        catch (Exception ex)
                        {
                            System.Diagnostics.Debug.WriteLine($"Error parsing client booking time: {ex.Message}");
                            continue;
                        }
                    }
                }

                // Generate all time slots from 4 AM to 10 PM (hourly)
                var allTimeSlots = new List<object>();
                for (int hour = 4; hour <= 22; hour++)
                {
                    string timeSlot = $"{hour:00}:00";
                    bool isBooked = bookedTimes.Contains(timeSlot);
                    System.Diagnostics.Debug.WriteLine($"Time slot {timeSlot}: isBooked={isBooked}, bookedTimes contains: {bookedTimes.Contains(timeSlot)}");
                    
                    // Format display time (12-hour format with AM/PM)
                    int displayHour = hour == 0 ? 12 : (hour > 12 ? hour - 12 : hour);
                    string amPm = hour < 12 ? "AM" : "PM";
                    string displayTime = $"{displayHour}:00 {amPm}";
                    
                    allTimeSlots.Add(new
                    {
                        time = timeSlot,
                        displayTime = displayTime,
                        isBooked = isBooked,
                        isAvailable = !isBooked
                    });
                }

                return Ok(new
                {
                    available = true,
                    day = day,
                    timeSlots = allTimeSlots
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"GetAvailableSlots Error: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { 
                    error = "An error occurred while fetching available slots", 
                    message = ex.Message,
                    innerException = ex.InnerException?.Message,
                    stackTrace = ex.StackTrace
                });
            }
        }

        // GET: api/bookings/client/{clientId}
        [HttpGet("client/{clientId}")]
        public async Task<ActionResult<IEnumerable<object>>> GetClientSessions(int clientId)
        {
            try
            {
                string query = @"
                    SELECT 
                        sb.BookingID, 
                        sb.clientid, 
                        sb.TrainerID, 
                        sb.paymentID, 
                        sb.Booking_Day, 
                        sb.Booking_Time, 
                        sb.bookingStatus, 
                        sb.statusUpdateTime,
                        t.trainername,
                        t.HourlyRate,
                        fp.amount as PaymentAmount,
                        fp.paymentdate as PaymentDate
                    FROM Session_Booking sb
                    INNER JOIN Trainer t ON sb.TrainerID = t.TrainerID
                    INNER JOIN Fee_Payment fp ON sb.paymentID = fp.paymentID
                    WHERE sb.clientid = @clientId 
                    ORDER BY sb.Booking_Day, sb.Booking_Time";

                var dataTable = await _dbService.ExecuteQueryAsync(query, new MySqlParameter("@clientId", clientId));
                var sessions = new List<object>();

                foreach (DataRow row in dataTable.Rows)
                {
                    sessions.Add(new
                    {
                        bookingID = Convert.ToInt32(row["BookingID"]),
                        clientid = Convert.ToInt32(row["clientid"]),
                        trainerID = Convert.ToInt32(row["TrainerID"]),
                        paymentID = Convert.ToInt32(row["paymentID"]),
                        bookingDay = row["Booking_Day"].ToString() ?? string.Empty,
                        bookingTime = TimeSpan.Parse(row["Booking_Time"].ToString() ?? "00:00:00").ToString(@"hh\:mm"),
                        bookingStatus = row["bookingStatus"].ToString() ?? "Scheduled",
                        statusUpdateTime = Convert.ToDateTime(row["statusUpdateTime"]),
                        trainerName = row["trainername"].ToString() ?? "Unknown",
                        hourlyRate = Convert.ToDecimal(row["HourlyRate"]),
                        paymentAmount = Convert.ToDecimal(row["PaymentAmount"]),
                        paymentDate = Convert.ToDateTime(row["PaymentDate"]).ToString("yyyy-MM-dd")
                    });
                }

                return Ok(sessions);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while fetching client sessions", message = ex.Message });
            }
        }

        // POST: api/bookings
        [HttpPost]
        public async Task<ActionResult<object>> CreateBooking([FromBody] BookingRequest request)
        {
            try
            {
                // Check if request is null
                if (request == null)
                {
                    return BadRequest(new { error = "Request body is required" });
                }

                // Log the incoming request for debugging
                System.Diagnostics.Debug.WriteLine($"Booking Request: clientid={request.clientid}, TrainerID={request.TrainerID}, Booking_Day={request.Booking_Day}, Booking_Time={request.Booking_Time}");

                // Validate request
                if (request.clientid <= 0)
                {
                    return BadRequest(new { error = "Invalid client ID" });
                }

                if (request.TrainerID <= 0)
                {
                    return BadRequest(new { error = "Invalid trainer ID" });
                }

                if (string.IsNullOrEmpty(request.Booking_Day))
                {
                    return BadRequest(new { error = "Booking day is required" });
                }

                if (string.IsNullOrEmpty(request.Booking_Time))
                {
                    return BadRequest(new { error = "Booking time is required" });
                }

                // Parse Booking_Time from string to TimeSpan
                TimeSpan bookingTime;
                try
                {
                    bookingTime = TimeSpan.Parse(request.Booking_Time);
                }
                catch (Exception ex)
                {
                    return BadRequest(new { error = $"Invalid booking time format: {request.Booking_Time}. Use HH:mm or HH:mm:ss format.", details = ex.Message });
                }

                // Check for duplicate booking - trainer already booked at this time
                string checkTrainerBookingQuery = @"
                    SELECT COUNT(*) 
                    FROM Session_Booking 
                    WHERE TrainerID = @trainerId 
                    AND UPPER(Booking_Day) = UPPER(@day)
                    AND Booking_Time = @bookingTime
                    AND bookingStatus != 'Cancelled'";
                
                var trainerBookingCount = Convert.ToInt64(await _dbService.ExecuteScalarAsync(
                    checkTrainerBookingQuery,
                    new MySqlParameter("@trainerId", request.TrainerID),
                    new MySqlParameter("@day", request.Booking_Day),
                    new MySqlParameter("@bookingTime", bookingTime)
                ));

                if (trainerBookingCount > 0)
                {
                    return BadRequest(new { error = $"Trainer is already booked at {request.Booking_Time} on {request.Booking_Day}. Please select a different time." });
                }

                // Check for duplicate booking - client already booked at this time
                string checkClientBookingQuery = @"
                    SELECT COUNT(*) 
                    FROM Session_Booking 
                    WHERE clientid = @clientId 
                    AND UPPER(Booking_Day) = UPPER(@day)
                    AND Booking_Time = @bookingTime
                    AND bookingStatus != 'Cancelled'";
                
                var clientBookingCount = Convert.ToInt64(await _dbService.ExecuteScalarAsync(
                    checkClientBookingQuery,
                    new MySqlParameter("@clientId", request.clientid),
                    new MySqlParameter("@day", request.Booking_Day),
                    new MySqlParameter("@bookingTime", bookingTime)
                ));

                if (clientBookingCount > 0)
                {
                    return BadRequest(new { error = $"You already have a booking at {request.Booking_Time} on {request.Booking_Day}. Please select a different time." });
                }

                // Get trainer's hourly rate
                string trainerQuery = "SELECT HourlyRate FROM Trainer WHERE TrainerID = @trainerId";
                var trainerTable = await _dbService.ExecuteQueryAsync(trainerQuery, new MySqlParameter("@trainerId", request.TrainerID));

                if (trainerTable.Rows.Count == 0)
                {
                    return NotFound(new { error = "Trainer not found" });
                }

                decimal hourlyRate = Convert.ToDecimal(trainerTable.Rows[0]["HourlyRate"]);
                // Assume 1 hour session for fee calculation (since schema doesn't have duration)
                decimal totalFee = hourlyRate;

                // Create payment record first (simulated payment - always successful)
                string getMaxPaymentIdQuery = "SELECT COALESCE(MAX(paymentID), 0) + 1 FROM Fee_Payment";
                var paymentId = Convert.ToInt32(await _dbService.ExecuteScalarAsync(getMaxPaymentIdQuery));

                string paymentQuery = @"
                    INSERT INTO Fee_Payment (paymentID, amount, paymentdate)
                    VALUES (@paymentId, @amount, CURDATE())";

                var paymentParams = new[]
                {
                    new MySqlParameter("@paymentId", paymentId),
                    new MySqlParameter("@amount", totalFee)
                };

                await _dbService.ExecuteNonQueryAsync(paymentQuery, paymentParams);

                // Create booking
                string getMaxBookingIdQuery = "SELECT COALESCE(MAX(BookingID), 0) + 1 FROM Session_Booking";
                var bookingId = Convert.ToInt32(await _dbService.ExecuteScalarAsync(getMaxBookingIdQuery));

                string bookingQuery = @"
                    INSERT INTO Session_Booking (BookingID, clientid, TrainerID, paymentID, Booking_Day, Booking_Time, bookingStatus, statusUpdateTime)
                    VALUES (@bookingId, @clientid, @trainerId, @paymentId, @bookingDay, @bookingTime, 'Scheduled', NOW())";

                var bookingParams = new[]
                {
                    new MySqlParameter("@bookingId", bookingId),
                    new MySqlParameter("@clientid", request.clientid),
                    new MySqlParameter("@trainerId", request.TrainerID),
                    new MySqlParameter("@paymentId", paymentId),
                    new MySqlParameter("@bookingDay", request.Booking_Day),
                    new MySqlParameter("@bookingTime", bookingTime)
                };

                await _dbService.ExecuteNonQueryAsync(bookingQuery, bookingParams);

                // Create facility usage record if facility is specified
                if (request.FacilityID.HasValue && request.FacilityID.Value > 0)
                {
                    try
                    {
                        // Verify facility exists
                        string checkFacilityQuery = "SELECT FacilityID FROM Facility WHERE FacilityID = @facilityId";
                        var facilityExists = await _dbService.ExecuteScalarAsync(
                            checkFacilityQuery, 
                            new MySqlParameter("@facilityId", request.FacilityID.Value)
                        );

                        if (facilityExists == null)
                        {
                            System.Diagnostics.Debug.WriteLine($"Warning: Facility {request.FacilityID.Value} does not exist. Skipping facility usage record.");
                        }
                        else
                        {
                            string getMaxUsageIdQuery = "SELECT COALESCE(MAX(usageID), 0) + 1 FROM Facility_Usage";
                            var usageId = Convert.ToInt32(await _dbService.ExecuteScalarAsync(getMaxUsageIdQuery));

                            // Assume 1 hour session
                            var endTime = bookingTime.Add(TimeSpan.FromHours(1));
                            
                            // Use CURDATE() for UsageDate to match the booking day
                            string facilityUsageQuery = @"
                                INSERT INTO Facility_Usage (usageID, FacilityID, BookingID, TrainerID, Start_Time, End_Time, UsageDate)
                                VALUES (@usageId, @facilityId, @bookingId, @trainerId, @startTime, @endTime, CURDATE())";

                            var facilityUsageParams = new[]
                            {
                                new MySqlParameter("@usageId", usageId),
                                new MySqlParameter("@facilityId", request.FacilityID.Value),
                                new MySqlParameter("@bookingId", bookingId),
                                new MySqlParameter("@trainerId", request.TrainerID),
                                new MySqlParameter("@startTime", bookingTime),
                                new MySqlParameter("@endTime", endTime)
                            };

                            await _dbService.ExecuteNonQueryAsync(facilityUsageQuery, facilityUsageParams);
                        }
                    }
                    catch (Exception facilityEx)
                    {
                        // Log facility usage error but don't fail the booking
                        System.Diagnostics.Debug.WriteLine($"Warning: Could not create facility usage record: {facilityEx.Message}");
                        System.Diagnostics.Debug.WriteLine($"Stack Trace: {facilityEx.StackTrace}");
                        // Continue - the booking was created successfully
                    }
                }

                return Ok(new
                {
                    success = true,
                    message = "Booking created and payment processed successfully",
                    bookingId = bookingId,
                    paymentId = paymentId,
                    totalFee = totalFee,
                    paymentStatus = "Completed"
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"Booking Error: {ex.Message}");
                System.Diagnostics.Debug.WriteLine($"Stack Trace: {ex.StackTrace}");
                if (ex.InnerException != null)
                {
                    System.Diagnostics.Debug.WriteLine($"Inner Exception: {ex.InnerException.Message}");
                }
                return StatusCode(500, new { 
                    error = "An error occurred while creating booking", 
                    message = ex.Message, 
                    innerException = ex.InnerException?.Message,
                    details = ex.StackTrace 
                });
            }
        }

        // PUT: api/bookings/{bookingId}/cancel
        [HttpPut("{bookingId}/cancel")]
        public async Task<ActionResult<object>> CancelBooking(int bookingId, [FromBody] CancelBookingRequest request)
        {
            try
            {
                if (request == null || request.clientId <= 0)
                {
                    return BadRequest(new { error = "Client ID is required" });
                }

                // Verify the booking exists and belongs to the client
                string verifyQuery = @"
                    SELECT BookingID, clientid, bookingStatus 
                    FROM Session_Booking 
                    WHERE BookingID = @bookingId 
                    AND clientid = @clientId";

                var verifyTable = await _dbService.ExecuteQueryAsync(
                    verifyQuery,
                    new MySqlParameter("@bookingId", bookingId),
                    new MySqlParameter("@clientId", request.clientId)
                );

                if (verifyTable.Rows.Count == 0)
                {
                    return NotFound(new { error = "Booking not found or you don't have permission to cancel this booking" });
                }

                string currentStatus = verifyTable.Rows[0]["bookingStatus"].ToString() ?? "";
                if (currentStatus.Equals("Cancelled", StringComparison.OrdinalIgnoreCase))
                {
                    return BadRequest(new { error = "This booking has already been cancelled" });
                }

                // Update booking status to Cancelled
                string updateQuery = @"
                    UPDATE Session_Booking 
                    SET bookingStatus = 'Cancelled', 
                        statusUpdateTime = NOW()
                    WHERE BookingID = @bookingId 
                    AND clientid = @clientId";

                int rowsAffected = await _dbService.ExecuteNonQueryAsync(
                    updateQuery,
                    new MySqlParameter("@bookingId", bookingId),
                    new MySqlParameter("@clientId", request.clientId)
                );

                if (rowsAffected == 0)
                {
                    return NotFound(new { error = "Booking not found or could not be cancelled" });
                }

                return Ok(new
                {
                    success = true,
                    message = "Booking cancelled successfully",
                    bookingId = bookingId
                });
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine($"CancelBooking Error: {ex.Message}");
                return StatusCode(500, new { error = "An error occurred while cancelling booking", message = ex.Message });
            }
        }
    }
}

