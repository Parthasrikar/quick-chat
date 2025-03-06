const express = require('express')
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require("./models/User");
const Message = require("./models/Message");
require('dotenv').config();
const app = express()
const cors = require('cors')
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const ws = require('ws');

app.use(express.json());
app.use(cors(
    {
        origin: process.env.CLIENT_URL,
        credentials: true
    }
))

app.use(cookieParser());

mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("✅ MongoDB Connected");
}).catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
});



const jwtsecret = process.env.JWT_SECRET;
app.get("/", (req, res) => {
    res.json({ success: true })
})

async function getUserDataFromRequest(req) {
  return new Promise((resolve, reject) => {
    try {
      const token = req.cookies?.token;
      if (!token) {
        return reject("No token provided");
      }

      jwt.verify(token, jwtsecret, {}, (err, userData) => {
        if (err) {
          return reject("Invalid or expired token");
        }
        resolve(userData);
      });
    } catch (error) {
      reject("Error processing token");
    }
  });
}

app.get('/all-messages', async (req, res) => {
    const messages = await Message.find();
    res.json(messages);
  });
  

app.get("/messages/:userId", async (req, res) => {
  console.log("GET /messages");

  try {
    const { userId } = req.params;
    const userData = await getUserDataFromRequest(req).catch((err) => {
      return res.status(401).json({ error: err });
    });

    if (!userData) return;

    const ourUserId = userData.id;
    console.log({ userId, ourUserId })
    const messages = await Message.find({
        $or: [
          { sender: userId },
          { recipient: userId },
          { sender: ourUserId },
          { recipient: ourUserId }
        ]
      }).sort({ createdAt: 1 });
      
      console.log("Filtered Messages:", messages);
    console.log(messages);
    

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/profile", (req, res) => {
    // Verify JWT token
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ error: "You are not authenticated" });

    jwt.verify(token, jwtsecret, (err, user) => {
        if (err) return res.status(403).json({ error: "Invalid token" });
        res.json(user);
    })

})
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Find user by username
        const foundUser = await User.findOne({ username });
        if (!foundUser) {
            return res.status(404).json({ error: "User not found" });
        }

        // Compare provided password with stored hashed password
        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (!passOk) {
            return res.status(401).json({ error: "Invalid password" });
        }

        // Generate JWT token
        jwt.sign({ id: foundUser._id, username }, jwtsecret, (err, token) => {
            if (err) {
                return res.status(500).json({ error: "Token generation failed" });
            }

            // Set cookie with JWT token
            res.cookie("token", token, { sameSite: 'none', secure: true })
                .status(200)
                .json({ id: foundUser._id });
        });

    } catch (err) {
        console.error("❌ Login Error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});



app.post("/register", async (req, res) => {
    try {
        const { username, password } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already taken" });
        }

        // Hash password
        bcrypt.genSalt(10, (err, salt) => {
            if (err) return res.status(500).json({ error: "Salt generation failed" });

            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) return res.status(500).json({ error: "Password hashing failed" });

                try {
                    // Create new user with hashed password
                    const newUser = await User.create({
                        username,
                        password: hash
                    });

                    // Generate JWT token
                    jwt.sign({ id: newUser._id, username }, jwtsecret, (err, token) => {
                        if (err) return res.status(500).json({ error: "Token generation failed" });

                        res.cookie("token", token, { sameSite: 'none', secure: true })
                            .status(201)
                            .json({ id: newUser._id });
                    });
                } catch (err) {
                    console.error("❌ Database Error:", err);
                    return res.status(500).json({ error: "Database Error" });
                }
            });
        });

    } catch (err) {
        console.error("❌ Registration Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});



const server = app.listen(3000, () => {
    console.log("Server is running on port 3000")
})

const wss = new ws.WebSocketServer({ server })

wss.on("connection", (connection, req) => {
    const cookies = req.headers?.cookie || ""; // Handle missing headers

    if (cookies) {
        const tokencookie = cookies.split(";").find((str) => str.trim().startsWith("token="));
        if (tokencookie) {
            const token = tokencookie.split("=")[1];
            jwt.verify(token, jwtsecret, (err, user) => {
                if (err) {
                    console.error("JWT verification failed:", err);
                    return;
                }

                connection.username = user.username;
                connection.id = user.id;

                // Broadcast updated online users only after authentication is successful
                broadcastOnlineUsers();
            });
        }
    }

    connection.on("message", async (data) => {
        try {
            const messageData = JSON.parse(data.toString());
            const { recipient, text } = messageData;

            if (!recipient || !text || !connection.id) {
                console.warn("Invalid message format or sender not authenticated");
                return;
            }

            const messageDoc = await Message.create({
                sender: connection.id,
                recipient: recipient,
                text,
            });

            [...wss.clients]
                .filter((c) => c.id === recipient)
                .forEach((c) =>
                    c.send(
                        JSON.stringify({
                            text,
                            sender: connection.id,
                            recipient,
                            _id: messageDoc._id,
                        })
                    )
                );
        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    function broadcastOnlineUsers() {
        if (wss.clients && typeof wss.clients.forEach === "function") {
            wss.clients.forEach((client) => {
                client.send(
                    JSON.stringify({
                        online: [...wss.clients].map((c) => ({
                            id: c.id || "Unknown",
                            username: c.username || "Guest",
                        })),
                    })
                );
            });
        } else {
            console.error("WebSocket clients set is not initialized.");
        }
    }
});

