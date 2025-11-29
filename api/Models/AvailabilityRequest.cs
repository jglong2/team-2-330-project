namespace api.Models
{
    public class AvailabilityRequest
    {
        public int TrainerID { get; set; }
        public string DaysAvailable { get; set; } = string.Empty; // e.g., "Mon, Wed, Fri"
    }
}

