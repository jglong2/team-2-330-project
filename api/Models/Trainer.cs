namespace api.Models
{
    public class Trainer
    {
        public int TrainerID { get; set; }
        public decimal HourlyRate { get; set; }
        public string? trainerphone { get; set; }
        public string trainername { get; set; } = string.Empty;
        public string? Certifications { get; set; }
        public int? UserID { get; set; }
    }
}

