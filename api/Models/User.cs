namespace api.Models
{
    public class User
    {
        public int UserID { get; set; }
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // 'Client', 'Trainer', or 'Admin'
        public DateTime CreatedAt { get; set; }
    }

    public class RegisterRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty; // 'Client' or 'Trainer'
        public string? Name { get; set; }
        public string? Phone { get; set; }
        public string? CardNumber { get; set; } // For clients
        public decimal? HourlyRate { get; set; } // For trainers
        public string? Certifications { get; set; } // For trainers
    }

    public class LoginRequest
    {
        public string Email { get; set; } = string.Empty;
        public string Password { get; set; } = string.Empty;
    }

    public class AuthResponse
    {
        public bool Success { get; set; }
        public string? Token { get; set; } // For future JWT implementation
        public User? User { get; set; }
        public int? ClientId { get; set; }
        public int? TrainerId { get; set; }
        public string? Message { get; set; }
    }
}

