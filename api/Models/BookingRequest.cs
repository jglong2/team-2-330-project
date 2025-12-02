namespace api.Models
{
    public class BookingRequest
    {
        public int clientid { get; set; }
        public int TrainerID { get; set; }
        public string Booking_Day { get; set; } = string.Empty; // e.g., "Monday"
        public string Booking_Time { get; set; } = string.Empty; // e.g., "14:30:00" or "14:30"
        public int? FacilityID { get; set; }
    }

    public class CancelBookingRequest
    {
        public int clientId { get; set; }
    }

    public class ConfirmBookingRequest
    {
        public int trainerId { get; set; }
    }

    public class CancelBookingByTrainerRequest
    {
        public int trainerId { get; set; }
    }
}

