using Microsoft.AspNetCore.Mvc;
using api.DataAccess;
using api.Models;
using MySql.Data.MySqlClient;
using System.Data;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class FacilitiesController : ControllerBase
    {
        private readonly DatabaseService _dbService;

        public FacilitiesController(DatabaseService dbService)
        {
            _dbService = dbService;
        }

        // GET: api/facilities
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Facility>>> GetFacilities()
        {
            try
            {
                string query = @"
                    SELECT FacilityID, Address, Room_Number, Equipment_Set 
                    FROM Facility 
                    ORDER BY Address, Room_Number";

                var dataTable = await _dbService.ExecuteQueryAsync(query);
                var facilities = new List<Facility>();

                foreach (DataRow row in dataTable.Rows)
                {
                    facilities.Add(new Facility
                    {
                        FacilityID = Convert.ToInt32(row["FacilityID"]),
                        Address = row["Address"].ToString() ?? string.Empty,
                        Room_Number = row["Room_Number"].ToString() ?? string.Empty,
                        Equipment_Set = row["Equipment_Set"]?.ToString()
                    });
                }

                return Ok(facilities);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { error = "An error occurred while fetching facilities", message = ex.Message });
            }
        }
    }
}

