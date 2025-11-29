using Microsoft.AspNetCore.Mvc;
using api.DataAccess;
using api.Models;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class TrainersController : ControllerBase
    {
        private readonly DatabaseService _dbService;

        public TrainersController(DatabaseService dbService)
        {
            _dbService = dbService;
        }

        // GET: api/trainers?specialty=Yoga&maxRate=50
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Trainer>>> GetTrainers(
            [FromQuery] string? specialty = null,
            [FromQuery] decimal? maxRate = null)
        {
            try
            {
                string query = "SELECT TrainerID, HourlyRate, trainerphone, trainername, Certifications FROM Trainer WHERE 1=1";
                var parameters = new List<MySqlParameter>();

                if (!string.IsNullOrEmpty(specialty))
                {
                    query += " AND Certifications LIKE @specialty";
                    parameters.Add(new MySqlParameter("@specialty", $"%{specialty}%"));
                }

                if (maxRate.HasValue)
                {
                    query += " AND HourlyRate <= @maxRate";
                    parameters.Add(new MySqlParameter("@maxRate", maxRate.Value));
                }

                query += " ORDER BY trainername";

                var dataTable = await _dbService.ExecuteQueryAsync(query, parameters.ToArray());
                var trainers = new List<Trainer>();

                foreach (DataRow row in dataTable.Rows)
                {
                    trainers.Add(new Trainer
                    {
                        TrainerID = Convert.ToInt32(row["TrainerID"]),
                        HourlyRate = Convert.ToDecimal(row["HourlyRate"]),
                        trainerphone = row["trainerphone"]?.ToString(),
                        trainername = row["trainername"].ToString() ?? string.Empty,
                        Certifications = row["Certifications"]?.ToString()
                    });
                }

                return Ok(trainers);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while fetching trainers", message = ex.Message });
            }
        }

        // GET: api/trainers/5
        [HttpGet("{id}")]
        public async Task<ActionResult<Trainer>> GetTrainer(int id)
        {
            try
            {
                string query = "SELECT TrainerID, HourlyRate, trainerphone, trainername, Certifications FROM Trainer WHERE TrainerID = @id";
                var dataTable = await _dbService.ExecuteQueryAsync(query, new MySqlParameter("@id", id));

                if (dataTable.Rows.Count == 0)
                {
                    return NotFound(new { error = "Trainer not found" });
                }

                var row = dataTable.Rows[0];
                var trainer = new Trainer
                {
                    TrainerID = Convert.ToInt32(row["TrainerID"]),
                    HourlyRate = Convert.ToDecimal(row["HourlyRate"]),
                    trainerphone = row["trainerphone"]?.ToString(),
                    trainername = row["trainername"].ToString() ?? string.Empty,
                    Certifications = row["Certifications"]?.ToString()
                };

                return Ok(trainer);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while fetching trainer", message = ex.Message });
            }
        }
    }
}

