Enova Pulse - Backend Authentication and User Management System
Overview
The Enova Pulse backend system is built to provide authentication, user management, and token handling using Node.js with Express, along with a secure authentication flow leveraging JWT (JSON Web Tokens). This project aims to provide a robust system for managing user registrations, login, and session management for a scalable SaaS solution.

Technologies Used
Node.js: A JavaScript runtime for building scalable applications.
Express: A web application framework for Node.js to handle routing and middleware.
JWT: JSON Web Tokens for securely transmitting user data and handling user authentication and session management.
bcryptjs: A library for securely hashing passwords.
Sequelize ORM: To interact with the relational database using models and queries.
Cron Jobs: For scheduled tasks (e.g., cleaning unconfirmed users).
Nodemailer: A module to send email notifications for user registration confirmation.
Features
1. User Registration
Users can register with essential details (email, password, first name, etc.).
The system checks if the user already exists in the database.
Passwords are hashed using bcryptjs for security.
After registration, users receive an email confirmation with a token to activate their account.
2. User Login
Users can log in using their email and password.
If valid, a JWT token and a refresh token are generated and returned to the user.
Tokens are used for authentication and authorization in further API requests.
3. Token Refresh
Users can refresh their session using a valid refresh token.
This extends their session without requiring them to log in again.
4. Email Confirmation
After user registration, an email is sent with a unique confirmation token.
Users must confirm their email by clicking the link provided in the email.
5. User Management
Users can update their profile, fetch their details, or delete their account.
Soft deletion of users is implemented, ensuring user data isn't permanently deleted by accident.
Administrators can clean up unconfirmed users using a cron job that deletes accounts that have not confirmed their email within a set timeframe (30 minutes).
Structure
The backend is organized into modular folders for better maintainability:

auth.controller.js: Manages the authentication routes and logic for registration, login, and token refresh.
auth.router.js: Defines the routes for authentication actions.
auth.service.js: Contains business logic for user registration, login, and token generation.
users.controller.js: Handles user management actions like getting user details, updating profiles, and deleting users.
users.model.js: The Sequelize model representing the User entity.
cleanUnconfirmedUsers.js: A scheduled job that runs every minute to delete unconfirmed users after 30 minutes.
How it Works
Registration Process
User submits registration data via the /register route.
The controller validates the input and checks if the email is already in use.
If valid, the password is hashed, and a confirmation token is generated.
The user is saved in the database, and a confirmation email is sent.
The email contains a link with the confirmation token.
Login and Token Generation
User submits login credentials via the /login route.
The system validates credentials and checks if the user exists and is confirmed.
If valid, a JWT access token and refresh token are generated and sent back.
Refresh Token Flow
If the access token expires, the user can submit the refresh token via the /refresh-token route.
If the refresh token is valid, a new access token is generated and returned.
Email Confirmation
The user clicks the confirmation link received via email.
The backend verifies the token and confirms the user if valid.
The user can now log in with their credentials.
How to Run the Project
Prerequisites
Node.js: Make sure you have Node.js installed. You can download it from here.
Database: This project uses Sequelize for database interaction, and you must configure your database connection.
Steps
Clone the repository:

bash
Copiar
Editar
git clone https://github.com/yourusername/enova-pulse-backend.git
cd enova-pulse-backend
Install the dependencies:

bash
Copiar
Editar
npm install
Configure your environment variables by creating a .env file and adding the following:

makefile
Copiar
Editar
DB_HOST=your_database_host
DB_USER=your_database_user
DB_PASSWORD=your_database_password
DB_NAME=your_database_name
AUTH_SECRET_KEY=your_jwt_secret_key
EMAIL_USER=your_email_user
EMAIL_PASS=your_email_password
Run the application:

bash
Copiar
Editar
npm start
The server will be running at http://localhost:5000.

Challenges and Solutions
Handling Token Expiration: One of the challenges was ensuring that expired tokens were handled securely. I implemented a refresh token system, which allows users to maintain their session without needing to re-login frequently.

Email Confirmation: The process of sending emails via Nodemailer and ensuring that the confirmation token was securely linked to the user required attention to detail, especially in handling expiration times for the token.

Scheduled Cleanup: Cleaning up unconfirmed users was done using a cron job, which runs every minute and checks for users who did not confirm their email within 30 minutes. This was important to maintain a clean and efficient user database.

