namespace api.Models
{
    public class FacilityUsage
    {
        public int usageID { get; set; }
        public int FacilityID { get; set; }
        public int BookingID { get; set; }
        public int TrainerID { get; set; }
        public TimeSpan Start_Time { get; set; }
        public TimeSpan End_Time { get; set; }
        public DateTime UsageDate { get; set; }
    }
}

