import * as authService from './auth.service.js';

// Register a new user
export const register = async (req, res) => {
  const {
    email, password, role, firstName, lastName, gender, age, phone_number,
    city, residentialArea, purchaseResponsibility, childrenCount, childrenAges, educationLevel
  } = req.body;

  try {
    const newUser = await authService.register({
      email, password, role, firstName, lastName, gender, age, phone_number,
      city, residentialArea, purchaseResponsibility, childrenCount, childrenAges, educationLevel
    });

    // Only return non-sensitive fields — never the password hash or
    // confirmation token.
    res.status(201).json({
      message: 'User registered successfully! Please check your email to confirm your account.',
      user: { id: newUser.id, email: newUser.email, role: newUser.role }
    });
  } catch (error) {
    // Email only (not password/personal fields) — enough to trace a
    // specific registration attempt without logging sensitive input.
    console.error(`[auth.registration] register failed (email=${email}):`, error.message);

    if (error.message === 'This email is already registered.') {
      return res.status(409).json({ message: error.message });
    }
    if (error.message === 'Email, password, first name, and last name are required.') {
      return res.status(400).json({ message: error.message });
    }
    if (error.message === 'Error loading the email template') {
      return res.status(500).json({ message: 'Internal server error. Please try again later.' });
    }
    return res.status(500).json({ message: 'Error registering user. Please try again later.' });
  }
};
