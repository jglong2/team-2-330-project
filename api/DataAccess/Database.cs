using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace api.DataAccess
{
    public class Database
    {
        using api.Models;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace api.DataAccess
{
    public class Database
    {
        public string host { get; set; }
        public string database { get; set; }
        public string username { get; set; }
        public string password { get; set; }
        public int port { get; set; }
        public string connectionString {get; set;}

        public Database(){
            host = "l9dwvv6j64hlhpul.cbetxkdyhwsb.us-east-1.rds.amazonaws.com";
            database = "ax31jflmjpn9yf5a";
            username = "dtriiqtuan5j3yqz";
            password = "kqy84xyyxe24fkiv";
            port = 3306;
            connectionString = $"Server={host};Database={database};User Id={username};Password={password};Port={port};";
        }
    }
}
    }
}