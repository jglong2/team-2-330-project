namespace api.Models
{
    public class SessionBooking
    {
        public int BookingID { get; set; }
        public int clientid { get; set; }
        public int TrainerID { get; set; }
        public int paymentID { get; set; }
        public string Booking_Day { get; set; } = string.Empty; // e.g., "Monday"
        public TimeSpan Booking_Time { get; set; }
        public string bookingStatus { get; set; } = "Scheduled";
        public DateTime statusUpdateTime { get; set; }
    }
}

