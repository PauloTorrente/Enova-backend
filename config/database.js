// Importing required modules
import { Sequelize } from 'sequelize'; // Sequelize is used to handle SQL databases
import dotenv from 'dotenv'; // dotenv is used to load environment variables

// Load environment variables from the .env file
dotenv.config();

// Create a Sequelize instance with the DATABASE_URL from the .env file
// This connects to the PostgreSQL database and sets the timezone to America/Bogota
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres', // Specify PostgreSQL as the database dialect
  timezone: 'America/Bogota', // Set timezone to Colombia (America/Bogota)
  logging: false, // Disable query logging (optional for cleaner logs)
  dialectOptions: {
    ssl: {
      require: true, // SSL is required for secure database connections
      rejectUnauthorized: false, // This is needed for some hosted databases like Neon
    },
  },
});

// Function to test the connection with the database
const connectDB = async () => {
  try {
    // Attempt to authenticate with the database
    await sequelize.authenticate();
    console.log('Database connected successfully'); // Connection was successful
  } catch (error) {
    // Log the error if the connection fails
    console.error('Database connection error:', error);
    process.exit(1); // Exit the process to prevent the app from running with no database
  }
};

// Export the Sequelize instance and the connection function
export { sequelize, connectDB };
