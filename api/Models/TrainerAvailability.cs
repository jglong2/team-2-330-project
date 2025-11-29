namespace api.Models
{
    public class TrainerAvailability
    {
        public int AvailabilityID { get; set; }
        public int TrainerID { get; set; }
        public string DaysAvailable { get; set; } = string.Empty; // e.g., "Mon, Wed, Fri"
    }
}

