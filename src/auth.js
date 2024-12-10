const admin = require('firebase-admin');

// Fungsi registrasi pengguna baru
async function registerUser(email, password, name) {
  try {
    // Validasi input
    if (!email || !password || !name) {
      throw new Error("Email, password, and name are required.");
    }

    const userRecord = await admin.auth().createUser({
      email,
      password,
      displayName: name,
    });

    return { 
      message: 'User registered successfully', 
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        name: userRecord.displayName,
      },
    };
  } catch (error) {
    console.error('Error registering user:', error.message);
    throw new Error(error.message || "An error occurred during registration.");
  }
}

// Fungsi login pengguna
async function loginUser(email, password) {
  try {
    // Validasi input
    if (!email || !password) {
      throw new Error("Email and password are required.");
    }

    const user = await admin.auth().getUserByEmail(email);

    // Custom token untuk login
    const customToken = await admin.auth().createCustomToken(user.uid, { role: 'user' });

    return { 
      message: 'Login successful', 
      token: customToken,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.displayName,
      },
    };
  } catch (error) {
    console.error('Error logging in user:', error.message);
    throw new Error(error.message || "An error occurred during login.");
  }
}

// Fungsi reset password
async function resetPassword(email) {
  try {
    if (!email) {
      throw new Error("Email is required.");
    }
    const resetLink = await admin.auth().generatePasswordResetLink(email);
    return { 
      message: 'Password reset email sent successfully', 
      resetLink 
    };
  } catch (error) {
    console.error('Error resetting password:', error.message);
    throw new Error(error.message || "An error occurred while resetting the password.");
  }
}

module.exports = { registerUser, loginUser, resetPassword };