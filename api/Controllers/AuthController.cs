using Microsoft.AspNetCore.Mvc;
using api.DataAccess;
using api.Models;
using MySql.Data.MySqlClient;
using System.Data;
using System.Security.Cryptography;
using System.Text;
using System.Linq;

namespace api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly DatabaseService _dbService;

        public AuthController(DatabaseService dbService)
        {
            _dbService = dbService;
        }

        // POST: api/auth/register
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponse>> Register([FromBody] RegisterRequest request)
        {
            try
            {
                // Validate input
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Email and password are required" 
                    });
                }

                if (request.Role != "Client" && request.Role != "Trainer")
                {
                    return BadRequest(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Role must be 'Client' or 'Trainer'" 
                    });
                }

                // Check if email already exists
                string checkEmailQuery = "SELECT UserID FROM Users WHERE Email = @email";
                var existingUser = await _dbService.ExecuteScalarAsync(
                    checkEmailQuery, 
                    new MySqlParameter("@email", request.Email)
                );

                if (existingUser != null)
                {
                    return BadRequest(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Email already registered" 
                    });
                }

                // Hash password (using SHA256 for simplicity - in production, use BCrypt or Argon2)
                string passwordHash = HashPassword(request.Password);

                // Insert user
                string insertUserQuery = @"
                    INSERT INTO Users (Email, PasswordHash, Role, CreatedAt)
                    VALUES (@email, @passwordHash, @role, NOW())";

                await _dbService.ExecuteNonQueryAsync(insertUserQuery, new[]
                {
                    new MySqlParameter("@email", request.Email),
                    new MySqlParameter("@passwordHash", passwordHash),
                    new MySqlParameter("@role", request.Role)
                });

                // Get the new user ID
                string getUserIdQuery = "SELECT UserID FROM Users WHERE Email = @email";
                var userId = Convert.ToInt32(await _dbService.ExecuteScalarAsync(
                    getUserIdQuery, 
                    new MySqlParameter("@email", request.Email)
                ));

                int? clientId = null;
                int? trainerId = null;

                // Create Client or Trainer record based on role
                if (request.Role == "Client")
                {
                    if (string.IsNullOrEmpty(request.CardNumber))
                    {
                        return BadRequest(new AuthResponse 
                        { 
                            Success = false, 
                            Message = "Card number is required for clients" 
                        });
                    }

                    // Get next client ID
                    string getMaxClientIdQuery = "SELECT COALESCE(MAX(clientid), 0) + 1 FROM Client";
                    var newClientId = Convert.ToInt32(await _dbService.ExecuteScalarAsync(getMaxClientIdQuery));

                    string insertClientQuery = @"
                        INSERT INTO Client (clientid, cardnumber, clientphone, clientname, UserID)
                        VALUES (@clientid, @cardnumber, @clientphone, @clientname, @userid)";

                    await _dbService.ExecuteNonQueryAsync(insertClientQuery, new[]
                    {
                        new MySqlParameter("@clientid", newClientId),
                        new MySqlParameter("@cardnumber", request.CardNumber),
                        new MySqlParameter("@clientphone", request.Phone ?? (object)DBNull.Value),
                        new MySqlParameter("@clientname", request.Name ?? "Client"),
                        new MySqlParameter("@userid", userId)
                    });

                    clientId = newClientId;
                }
                else if (request.Role == "Trainer")
                {
                    if (!request.HourlyRate.HasValue)
                    {
                        return BadRequest(new AuthResponse 
                        { 
                            Success = false, 
                            Message = "Hourly rate is required for trainers" 
                        });
                    }

                    // Handle certification - single certification only
                    string? certificationValue = null;
                    if (!string.IsNullOrEmpty(request.Certifications))
                    {
                        var cert = request.Certifications.Trim();
                        
                        // Check if certification exists in Certifications table
                        string checkCertQuery = "SELECT certifications FROM Certifications WHERE certifications = @cert";
                        var existingCert = await _dbService.ExecuteScalarAsync(
                            checkCertQuery, 
                            new MySqlParameter("@cert", cert)
                        );

                        if (existingCert == null)
                        {
                            // Insert new certification into lookup table
                            try
                            {
                                string insertCertQuery = "INSERT INTO Certifications (certifications) VALUES (@cert)";
                                await _dbService.ExecuteNonQueryAsync(
                                    insertCertQuery, 
                                    new MySqlParameter("@cert", cert)
                                );
                            }
                            catch (Exception ex)
                            {
                                // If insert fails (e.g., duplicate key), continue anyway
                                // The certification might have been added by another process
                                System.Diagnostics.Debug.WriteLine($"Warning: Could not insert certification: {ex.Message}");
                            }
                        }
                        certificationValue = cert;
                    }

                    // Get next trainer ID
                    string getMaxTrainerIdQuery = "SELECT COALESCE(MAX(TrainerID), 0) + 1 FROM Trainer";
                    var newTrainerId = Convert.ToInt32(await _dbService.ExecuteScalarAsync(getMaxTrainerIdQuery));

                    string insertTrainerQuery = @"
                        INSERT INTO Trainer (TrainerID, HourlyRate, trainerphone, trainername, Certifications, UserID)
                        VALUES (@trainerid, @hourlyrate, @trainerphone, @trainername, @certifications, @userid)";

                    await _dbService.ExecuteNonQueryAsync(insertTrainerQuery, new[]
                    {
                        new MySqlParameter("@trainerid", newTrainerId),
                        new MySqlParameter("@hourlyrate", request.HourlyRate.Value),
                        new MySqlParameter("@trainerphone", request.Phone ?? (object)DBNull.Value),
                        new MySqlParameter("@trainername", request.Name ?? "Trainer"),
                        new MySqlParameter("@certifications", certificationValue ?? (object)DBNull.Value),
                        new MySqlParameter("@userid", userId)
                    });

                    trainerId = newTrainerId;
                }

                // Get the created user
                string getUserQuery = "SELECT UserID, Email, Role, CreatedAt FROM Users WHERE UserID = @userid";
                var userTable = await _dbService.ExecuteQueryAsync(
                    getUserQuery, 
                    new MySqlParameter("@userid", userId)
                );

                var userRow = userTable.Rows[0];
                var user = new User
                {
                    UserID = Convert.ToInt32(userRow["UserID"]),
                    Email = userRow["Email"].ToString() ?? string.Empty,
                    Role = userRow["Role"].ToString() ?? string.Empty,
                    CreatedAt = Convert.ToDateTime(userRow["CreatedAt"])
                };

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Registration successful",
                    User = user,
                    ClientId = clientId,
                    TrainerId = trainerId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new AuthResponse 
                { 
                    Success = false, 
                    Message = "An error occurred during registration: " + ex.Message 
                });
            }
        }

        // POST: api/auth/login
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponse>> Login([FromBody] LoginRequest request)
        {
            try
            {
                if (string.IsNullOrEmpty(request.Email) || string.IsNullOrEmpty(request.Password))
                {
                    return BadRequest(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Email and password are required" 
                    });
                }

                // Get user by email
                string getUserQuery = "SELECT UserID, Email, PasswordHash, Role, CreatedAt FROM Users WHERE Email = @email";
                var userTable = await _dbService.ExecuteQueryAsync(
                    getUserQuery, 
                    new MySqlParameter("@email", request.Email)
                );

                if (userTable.Rows.Count == 0)
                {
                    return Unauthorized(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Invalid email or password" 
                    });
                }

                var row = userTable.Rows[0];
                string storedHash = row["PasswordHash"].ToString() ?? string.Empty;
                string providedHash = HashPassword(request.Password);

                // Verify password
                if (storedHash != providedHash)
                {
                    return Unauthorized(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Invalid email or password" 
                    });
                }

                var user = new User
                {
                    UserID = Convert.ToInt32(row["UserID"]),
                    Email = row["Email"].ToString() ?? string.Empty,
                    Role = row["Role"].ToString() ?? string.Empty,
                    CreatedAt = Convert.ToDateTime(row["CreatedAt"])
                };

                int? clientId = null;
                int? trainerId = null;

                // Get Client or Trainer ID based on role
                if (user.Role == "Client")
                {
                    string getClientQuery = "SELECT clientid FROM Client WHERE UserID = @userid";
                    var clientIdObj = await _dbService.ExecuteScalarAsync(
                        getClientQuery, 
                        new MySqlParameter("@userid", user.UserID)
                    );
                    if (clientIdObj != null)
                    {
                        clientId = Convert.ToInt32(clientIdObj);
                    }
                }
                else if (user.Role == "Trainer")
                {
                    // First try to get TrainerID by UserID
                    string getTrainerQuery = "SELECT TrainerID FROM Trainer WHERE UserID = @userid";
                    var trainerIdObj = await _dbService.ExecuteScalarAsync(
                        getTrainerQuery, 
                        new MySqlParameter("@userid", user.UserID)
                    );
                    
                    if (trainerIdObj != null)
                    {
                        trainerId = Convert.ToInt32(trainerIdObj);
                    }
                    else
                    {
                        // Fallback: Try to find trainer by matching email pattern or any trainer without UserID
                        // This handles cases where trainer was created before Users table integration
                        // For now, we'll return an error message suggesting re-registration
                        // In production, you might want to add a migration script to link existing trainers
                    }
                }

                // Validate that we have the required ID for the role
                if (user.Role == "Client" && !clientId.HasValue)
                {
                    return BadRequest(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Client record not found. Please contact support." 
                    });
                }
                
                if (user.Role == "Trainer" && !trainerId.HasValue)
                {
                    return BadRequest(new AuthResponse 
                    { 
                        Success = false, 
                        Message = "Trainer record not found. The trainer account may not be properly linked. Please try registering again or contact support." 
                    });
                }

                return Ok(new AuthResponse
                {
                    Success = true,
                    Message = "Login successful",
                    User = user,
                    ClientId = clientId,
                    TrainerId = trainerId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new AuthResponse 
                { 
                    Success = false, 
                    Message = "An error occurred during login: " + ex.Message 
                });
            }
        }

        // Helper method to hash password (using SHA256 - in production, use BCrypt)
        private string HashPassword(string password)
        {
            using (var sha256 = SHA256.Create())
            {
                var hashedBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(password));
                return Convert.ToBase64String(hashedBytes);
            }
        }
    }
}

