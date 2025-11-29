using Microsoft.AspNetCore.Mvc;
using api.DataAccess;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CertificationsController : ControllerBase
    {
        private readonly DatabaseService _dbService;

        public CertificationsController(DatabaseService dbService)
        {
            _dbService = dbService;
        }

        // GET: api/certifications
        [HttpGet]
        public async Task<ActionResult<IEnumerable<string>>> GetCertifications()
        {
            try
            {
                // First, ensure default certifications exist
                await EnsureDefaultCertifications();

                string query = "SELECT certifications FROM Certifications ORDER BY certifications";
                var dataTable = await _dbService.ExecuteQueryAsync(query);
                var certifications = new List<string>();

                foreach (DataRow row in dataTable.Rows)
                {
                    var cert = row["certifications"]?.ToString();
                    if (!string.IsNullOrEmpty(cert))
                    {
                        certifications.Add(cert);
                    }
                }

                return Ok(certifications);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while fetching certifications", message = ex.Message });
            }
        }

        // Helper method to ensure default certifications exist
        private async Task EnsureDefaultCertifications()
        {
            var defaultCerts = new[]
            {
                "Certified Strength and Conditioning Specialist (CSCS)",
                "Certified Corrective Exercise Specialist (CES)",
                "Certified Group Fitness Instructor",
                "Nutrition Certification",
                "Performance Enhancement Specialist"
            };

            foreach (var cert in defaultCerts)
            {
                try
                {
                    // Check if certification exists
                    string checkQuery = "SELECT certifications FROM Certifications WHERE certifications = @cert";
                    var exists = await _dbService.ExecuteScalarAsync(checkQuery, new MySqlParameter("@cert", cert));

                    if (exists == null)
                    {
                        // Insert if it doesn't exist
                        string insertQuery = "INSERT INTO Certifications (certifications) VALUES (@cert)";
                        await _dbService.ExecuteNonQueryAsync(insertQuery, new MySqlParameter("@cert", cert));
                    }
                }
                catch
                {
                    // Ignore errors (certification might already exist or constraint violation)
                }
            }
        }
    }
}

