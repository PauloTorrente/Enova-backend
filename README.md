# Enova Pulse Backend

## Overview

Enova Pulse is a SaaS solution designed to automate surveys. This backend implementation handles user authentication, registration, and management, providing robust security features like token-based authentication with JWT, email confirmation, and token refresh.

## Technologies Used

- **Node.js**: Runtime environment for server-side logic.
- **Express.js**: Web framework for building the API.
- **JWT (JSON Web Tokens)**: Used for secure user authentication and session management.
- **Sequelize ORM**: Used for interacting with the MySQL database.
- **bcryptjs**: For securely hashing passwords before storing them in the database.
- **Nodemailer**: For sending email confirmations to users.
- **Node-cron**: For scheduling tasks, such as cleaning up unconfirmed users.
- **dotenv**: For managing environment variables.

## Features

- **User Registration**: New users can register by providing necessary details like email, password, and personal information. An email confirmation is sent to validate the registration.
- **User Authentication**: Users can log in using their credentials. JWT tokens are generated to authenticate API requests.
- **Token Refresh**: Users can refresh their access tokens using a valid refresh token.
- **Email Confirmation**: After registration, users receive an email to confirm their account.
- **Unconfirmed User Cleanup**: A cron job runs every minute to clean up users who have not confirmed their email within 30 minutes.

## Implementation Details

1. **User Registration (`auth.controller.js`)**:
   - Handles user registration by accepting user details and calling the `auth.service.js` for user creation.
   - Validates the input fields, hashes passwords using bcryptjs, and generates a confirmation token.
   - Sends an email with a confirmation link using Nodemailer.

2. **User Login (`auth.controller.js`)**:
   - Allows users to log in by verifying their email and password.
   - Returns JWT access and refresh tokens upon successful login.

3. **Token Refresh (`auth.controller.js`)**:
   - Allows users to refresh their access token using a valid refresh token.

4. **Cron Job for Cleanup (`cleanUnconfirmedUsers.js`)**:
   - Periodically checks and deletes users who have not confirmed their email within 30 minutes.

5. **User Management (`users.controller.js`)**:
   - Provides endpoints for user management such as fetching user details, updating user information, and soft deleting users.

## How I Solved It

To implement this system, I focused on the following:

- **Secure Authentication**: By using JWT tokens for session management, I ensured secure communication between the client and server. The short-lived access token combined with the refresh token provides a scalable way to handle sessions.
- **Email Confirmation**: I utilized Nodemailer to send an email confirmation, ensuring that only legitimate users can log in after confirming their email.
- **Password Security**: By using bcryptjs, the users' passwords are securely hashed before being stored in the database.
- **Database Management**: Sequelize ORM was used to interact with the MySQL database. This made it easier to manage users, authenticate them, and perform CRUD operations efficiently.
- **Cron Jobs**: I scheduled a cleanup job that removes unconfirmed users after 30 minutes to ensure that the system is free of unused or invalid accounts.

