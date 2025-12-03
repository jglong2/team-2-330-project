## Vital Core Fitness – Trainer Marketplace

Vital Core Fitness is a full‑stack trainer marketplace built for MIS 330. Clients can discover personal trainers, view availability, and book training sessions, while trainers manage their schedules and upcoming sessions.

### Tech Stack
- **Frontend**: Single‑page app in vanilla HTML/CSS/JavaScript with **Bootstrap 5** via CDN (`client/`).
- **Backend**: **ASP.NET Core Web API (.NET 8)** in C# (`api/`).
- **Database**: **MySQL** accessed with raw SQL via `MySql.Data` (no ORM).

### Project Structure
- **`client/`** – Static frontend
  - `index.html` – Entry point with a single `div#app` where all views are rendered.
  - `resources/styles/main.css` – Custom styling on top of Bootstrap.
  - `resources/scripts/api.js` – API base URL and helper functions for calling the backend (trainers, bookings, availability, facilities, certifications, etc.).
  - `resources/scripts/auth.js` – Login/registration logic and simple client‑side session handling.
  - `resources/scripts/authView.js` – Renders login and registration UI into `#app`.
  - `resources/scripts/clientView.js` – Client‑side UI: find trainers, pick time slots, book sessions, view “My Sessions”.
  - `resources/scripts/trainerView.js` – Trainer dashboard: view upcoming sessions, confirm/cancel bookings, manage availability.
  - `resources/scripts/main.js` – App bootstrap, navigation handling, and view switching based on role.
- **`api/`** – ASP.NET Core Web API
  - `Controllers/`
    - `AuthController.cs` – Register/login, creates associated `Client` or `Trainer` records, hashes passwords, and returns role plus IDs.
    - `TrainersController.cs` – List trainers with optional specialty and max‑rate filters; get a specific trainer by ID.
    - `BookingsController.cs` – Create sessions, prevent double‑booking, manage client/trainer views of sessions, confirm/cancel bookings, and compute fees.
    - `AvailabilityController.cs` – Set and fetch trainer availability (days/time slots).
    - `FacilitiesController.cs` – Facilities lookup for booking locations.
    - `CertificationsController.cs` – Lookup table for trainer certifications.
    - `ToDoController.cs` – Simple example/test controller.
  - `DataAccess/Database.cs` – `DatabaseService` for executing SQL commands and queries against MySQL.
  - `Models/` – C# models/DTOs for users, clients, trainers, availability, bookings, facilities, and payments.
  - `appsettings.json` – Contains the MySQL connection string (edit this for your environment).

### Core Features
- **Authentication & Roles**
  - Email/password registration and login via `api/auth`.
  - Two roles: **Client** and **Trainer**.
  - Registration automatically creates related `Client` / `Trainer` records linked to the `Users` table.
- **Client Experience**
  - Browse trainers with filters (e.g., certifications/specialty, hourly rate).
  - See trainer availability and available time slots by day.
  - Book sessions, selecting trainer, date, time, and optionally a facility.
  - View “My Sessions” with booking status and payment details.
  - Cancel bookings (subject to simple validation rules).
- **Trainer Experience**
  - Set recurring availability (days of week and time window).
  - See upcoming and pending sessions with client details (name and masked card last‑four).
  - Confirm or cancel bookings directly from the dashboard.
- **Bookings & Payments**
  - Prevents double‑booking for both trainers and clients at the same date/time.
  - Automatically calculates session fee from the trainer’s hourly rate.
  - Simulates payment by inserting into `Fee_Payment` and linking to `Session_Booking`.
  - Optionally creates `Facility_Usage` records when a facility is selected.

### Running the Backend (API)
1. **Install prerequisites**
   - .NET 8 SDK or later.
   - MySQL server with a database created for this project.
2. **Configure the connection string**
   - Open `api/appsettings.json`.
   - Update the `"DefaultConnection"` (or similarly named) connection string to point to your MySQL instance.
3. **Ensure the database schema exists**
   - Create required tables (`Users`, `Client`, `Trainer`, `Trainer_Availability`, `Session_Booking`, `Fee_Payment`, `Facility`, `Facility_Usage`, `Certifications`, etc.) to match the SQL used in the controllers.
   - If this is pulled from class materials, you can reuse the provided schema script.
4. **Run the API**
   - From the `api` folder:
     - `dotnet restore`
     - `dotnet run`
   - Note the base URL from the console output (e.g. `http://localhost:5130`).
5. **Verify Swagger (optional)**
   - Navigate to the URL shown in the console (often `http://localhost:5130/swagger`) to explore the REST endpoints.

### Running the Frontend
1. From the repo root, serve the `client` folder as static files (any simple static server is fine), or:
   - Open `client/index.html` directly in a modern browser, **or**
   - Use a simple HTTP server (e.g., VS Code Live Server, Python `http.server`, or similar).
2. Make sure `resources/scripts/api.js` has `API_BASE_URL` pointing at your running backend, e.g.:
   - `const API_BASE_URL = 'http://localhost:5130/api';`
3. In the browser:
   - You’ll be prompted to **Log in** or **Register**.
   - Use the navbar buttons (`Find a Trainer`, `My Sessions`, `Trainer Dashboard`) after logging in as the appropriate role.

### REST API Overview (High Level)
- **Auth**
  - `POST /api/auth/register` – Register as client or trainer; creates related records.
  - `POST /api/auth/login` – Returns user info and role plus `ClientId` or `TrainerId`.
- **Trainers**
  - `GET /api/trainers` – List trainers with optional `specialty` and `maxRate` query parameters.
  - `GET /api/trainers/{id}` – Get a single trainer.
- **Bookings**
  - `GET /api/bookings/sessions/{trainerId}` – Sessions for a trainer.
  - `GET /api/bookings/client/{clientId}` – Sessions for a client.
  - `GET /api/bookings/available-slots/{trainerId}/{day}?clientId={clientId}` – All time slots with availability for a given day.
  - `POST /api/bookings` – Create a new session; validates double‑booking and creates payment (and optionally facility usage).
  - `PUT /api/bookings/{bookingId}/confirm` – Confirm (trainer only).
  - `PUT /api/bookings/{bookingId}/cancel` – Cancel (client).
  - `PUT /api/bookings/{bookingId}/cancel-trainer` – Cancel (trainer).
- **Availability**
  - `GET /api/availability/{trainerId}` – Get availability.
  - `POST /api/availability` – Set/update availability.
- **Facilities & Certifications**
  - `GET /api/facilities` – List facilities.
  - `GET /api/certifications` – List available certifications.

### Development Notes & Constraints
- Frontend uses **only** vanilla JS + Bootstrap 5 via CDN (no React/Vue/Angular, no bundlers).
- All dynamic content is rendered by JS into the `#app` container.
- Backend uses **direct SQL** via `MySql.Data` and avoids ORMs like Entity Framework.
- Error handling surfaces friendly messages in the UI via `showAlert` in `api.js`.

### How to Contribute
- Fork the repository and create a feature branch.
- Keep frontend changes vanilla JS and Bootstrap only; follow existing patterns in `client/resources/scripts`.
- For backend changes:
  - Follow ASP.NET Core naming conventions.
  - Use parameterized SQL through `DatabaseService` to avoid SQL injection.
  - Return appropriate HTTP status codes and JSON error messages.


