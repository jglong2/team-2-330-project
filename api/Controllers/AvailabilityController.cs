using Microsoft.AspNetCore.Mvc;
using api.DataAccess;
using api.Models;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AvailabilityController : ControllerBase
    {
        private readonly DatabaseService _dbService;

        public AvailabilityController(DatabaseService dbService)
        {
            _dbService = dbService;
        }

        // POST: api/availability
        [HttpPost]
        public async Task<ActionResult<object>> SetAvailability([FromBody] AvailabilityRequest request)
        {
            try
            {
                if (request.TrainerID <= 0)
                {
                    return BadRequest(new { error = "Invalid trainer ID" });
                }

                if (string.IsNullOrEmpty(request.DaysAvailable))
                {
                    return BadRequest(new { error = "Days available is required" });
                }

                // Check if availability record already exists for this trainer
                string checkQuery = @"
                    SELECT AvailabilityID FROM Trainer_Availability 
                    WHERE TrainerID = @trainerId";

                var existingRecord = await _dbService.ExecuteScalarAsync(
                    checkQuery, 
                    new MySqlParameter("@trainerId", request.TrainerID)
                );

                if (existingRecord != null)
                {
                    // Update existing record
                    string updateQuery = @"
                        UPDATE Trainer_Availability 
                        SET DaysAvailable = @daysAvailable 
                        WHERE TrainerID = @trainerId";

                    await _dbService.ExecuteNonQueryAsync(updateQuery, new[]
                    {
                        new MySqlParameter("@trainerId", request.TrainerID),
                        new MySqlParameter("@daysAvailable", request.DaysAvailable)
                    });

                    return Ok(new
                    {
                        success = true,
                        message = "Availability updated successfully",
                        action = "updated"
                    });
                }
                else
                {
                    // Insert new record
                    string getMaxAvailabilityIdQuery = "SELECT COALESCE(MAX(AvailabilityID), 0) + 1 FROM Trainer_Availability";
                    var availabilityId = Convert.ToInt32(await _dbService.ExecuteScalarAsync(getMaxAvailabilityIdQuery));

                    string insertQuery = @"
                        INSERT INTO Trainer_Availability (AvailabilityID, TrainerID, DaysAvailable)
                        VALUES (@availabilityId, @trainerId, @daysAvailable)";

                    await _dbService.ExecuteNonQueryAsync(insertQuery, new[]
                    {
                        new MySqlParameter("@availabilityId", availabilityId),
                        new MySqlParameter("@trainerId", request.TrainerID),
                        new MySqlParameter("@daysAvailable", request.DaysAvailable)
                    });

                    return Ok(new
                    {
                        success = true,
                        message = "Availability added successfully",
                        action = "created"
                    });
                }
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while setting availability", message = ex.Message });
            }
        }

        // GET: api/availability/{trainerId}
        [HttpGet("{trainerId}")]
        public async Task<ActionResult<IEnumerable<TrainerAvailability>>> GetAvailability(int trainerId)
        {
            try
            {
                string query = @"
                    SELECT AvailabilityID, TrainerID, DaysAvailable 
                    FROM Trainer_Availability 
                    WHERE TrainerID = @trainerId";

                var dataTable = await _dbService.ExecuteQueryAsync(query, new MySqlParameter("@trainerId", trainerId));
                var availabilities = new List<TrainerAvailability>();

                foreach (DataRow row in dataTable.Rows)
                {
                    availabilities.Add(new TrainerAvailability
                    {
                        AvailabilityID = Convert.ToInt32(row["AvailabilityID"]),
                        TrainerID = Convert.ToInt32(row["TrainerID"]),
                        DaysAvailable = row["DaysAvailable"].ToString() ?? string.Empty
                    });
                }

                return Ok(availabilities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while fetching availability", message = ex.Message });
            }
        }
    }
}

