namespace api.Models
{
    public class Facility
    {
        public int FacilityID { get; set; }
        public string Address { get; set; } = string.Empty;
        public string Room_Number { get; set; } = string.Empty;
        public string? Equipment_Set { get; set; }
    }
}

