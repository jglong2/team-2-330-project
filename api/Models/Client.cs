namespace api.Models
{
    public class Client
    {
        public int clientid { get; set; }
        public string cardnumber { get; set; } = string.Empty;
        public string? clientphone { get; set; }
        public string clientname { get; set; } = string.Empty;
        public int? UserID { get; set; }
    }
}

