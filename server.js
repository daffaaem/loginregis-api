const express = require("express");
const bodyParser = require("body-parser");
const firebaseAdmin = require("firebase-admin");
const axios = require("axios");
const { resetPassword } = require('./src/auth');
const fs = require("fs"); // Mengimpor fs module
require("dotenv").config();

const app = express();

firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(
    require(process.env.GOOGLE_CLOUD_CREDENTIALS)
  ),
});

const db = firebaseAdmin.firestore();

// Middleware
app.use(bodyParser.json());

const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
if (!FIREBASE_API_KEY) {
  console.error("FIREBASE_API_KEY tidak ditemukan. Tambahkan di file .env.");
  process.exit(1);
}

// Fungsi untuk menambahkan data ke file JSON
const saveToJSONFile = (data) => {
  const filePath = './users.json'; 
  fs.readFile(filePath, (err, content) => {
    if (err && err.code === 'ENOENT') {
      // Jika file tidak ditemukan, buat file baru dengan array kosong
      fs.writeFile(filePath, JSON.stringify([data], null, 2), (err) => {
        if (err) console.error('Error writing to file:', err);
      });
    } else if (err) {
      console.error('Error reading file:', err);
    } else {
      // Jika file ada, parse konten dan tambahkan data baru
      const users = JSON.parse(content);
      users.push(data);
      // Menyimpan data yang sudah diperbarui ke file JSON
      fs.writeFile(filePath, JSON.stringify(users, null, 2), (err) => {
        if (err) console.error('Error writing to file:', err);
      });
    }
  });
};

// regis
app.post("/api/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ message: "Email, password, dan name diperlukan." });
  }

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const newUser = {
      id: response.data.localId,
      email: response.data.email,
      name,
      token: response.data.idToken,
    };

    // Menyimpan data pengguna ke Firebase
    await db.collection("users").doc(response.data.localId).set({ name, email });

    // Menyimpan data pengguna ke file JSON
    saveToJSONFile(newUser);

    res.status(201).json({
      message: "Registrasi berhasil",
      user: newUser,
    });
  } catch (error) {
    console.error("Error registering user:", error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.error?.message || "Internal Server Error" });
  }
});

// login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email dan password diperlukan." });
  }

  try {
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    res.status(200).json({
      message: "Login berhasil",
      user: {
        id: response.data.localId,
        email: response.data.email,
        token: response.data.idToken,
      },
    });
  } catch (error) {
    console.error("Error logging in user:", error.response?.data || error.message);
    res.status(500).json({ message: error.response?.data?.error?.message || "Internal Server Error" });
  }
});

// Mendapatkan Semua user
app.get("/api/users", async (req, res) => {
  const nameQuery = req.query.name;

  try {
    let snapshot;
    if (nameQuery) {
      snapshot = await db.collection("users").where("name", "==", nameQuery).get();
    } else {
      snapshot = await db.collection("users").get();
    }

    if (snapshot.empty) {
      return res.status(404).json({ message: "No users found." });
    }

    const users = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ message: "Error fetching users" });
  }
});

// lupa password
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;
  try {
    // Validasi input
    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }
    
    const response = await resetPassword(email);
    res.status(200).json(response);
  } catch (error) {
    console.error('Error in /api/forgot-password:', error.message);
    res.status(500).json({ message: error.message });
  }
});

// Jalankan server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
