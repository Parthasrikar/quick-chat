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

// Use PORT from environment or default to 3000
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(cors({
  origin: ['https://quick-chat-frontend-lkb2.onrender.com', 'http://localhost:5173'],
  credentials: true
}));

app.use(cookieParser());

mongoose.connect(process.env.MONGO_URL).then(() => {
    console.log("✅ MongoDB Connected");
}).catch(err => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1);
});

const jwtsecret = process.env.JWT_SECRET;

// Validate required environment variables
if (!jwtsecret) {
    console.error("❌ JWT_SECRET is required");
    process.exit(1);
}

if (!process.env.MONGO_URL) {
    console.error("❌ MONGO_URL is required");
    process.exit(1);
}

app.get("/", (req, res) => {
    res.json({ 
        success: true,
        message: "Chat API is running!",
        timestamp: new Date().toISOString()
    });
});

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
    try {
        const messages = await Message.find();
        res.json(messages);
    } catch (error) {
        console.error("Error fetching all messages:", error);
        res.status(500).json({ error: "Failed to fetch messages" });
    }
});

app.get("/messages/:userId", async (req, res) => {
    console.log("GET /messages");

    try {
        const { userId } = req.params;

        if (!userId || userId.trim() === '') {
            return res.status(400).json({ error: "User ID is required" });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ error: "Invalid User ID format" });
        }

        const userData = await getUserDataFromRequest(req).catch((err) => {
            return res.status(401).json({ error: err });
        });

        if (!userData) return;

        const ourUserId = userData.id;
        console.log({ userId, ourUserId });
        
        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: ourUserId },
                { sender: ourUserId, recipient: userId }
            ]
        }).sort({ createdAt: 1 });
          
        console.log("Filtered Messages:", messages);
        res.json(messages);
    } catch (error) {
        console.error("Error fetching messages:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get("/profile", (req, res) => {
    try {
        const token = req.cookies?.token;
        if (!token) {
            return res.status(401).json({ error: "You are not authenticated" });
        }

        jwt.verify(token, jwtsecret, (err, user) => {
            if (err) {
                console.error("JWT verification error:", err);
                return res.status(403).json({ error: "Invalid token" });
            }
            res.json(user);
        });
    } catch (error) {
        console.error("Profile error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: "Username and password must be strings" });
        }

        if (username.trim().length < 1) {
            return res.status(400).json({ error: "Username cannot be empty" });
        }

        if (password.length < 1) {
            return res.status(400).json({ error: "Password cannot be empty" });
        }

        const foundUser = await User.findOne({ username });
        if (!foundUser) {
            return res.status(404).json({ error: "User not found" });
        }

        const passOk = bcrypt.compareSync(password, foundUser.password);
        if (!passOk) {
            return res.status(401).json({ error: "Invalid password" });
        }

        jwt.sign({ id: foundUser._id, username }, jwtsecret, (err, token) => {
            if (err) {
                console.error("Token generation error:", err);
                return res.status(500).json({ error: "Token generation failed" });
            }

            // Updated cookie settings for production
            const cookieOptions = {
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                secure: process.env.NODE_ENV === 'production',
                httpOnly: false // Keep false for client-side access
            };

            res.cookie("token", token, cookieOptions)
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

        if (!username || !password) {
            return res.status(400).json({ error: "Username and password are required" });
        }

        if (typeof username !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: "Username and password must be strings" });
        }

        if (username.trim().length < 3) {
            return res.status(400).json({ error: "Username must be at least 3 characters long" });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: "Password must be at least 6 characters long" });
        }

        const usernameRegex = /^[a-zA-Z0-9_-]+$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({ error: "Username can only contain letters, numbers, underscores, and hyphens" });
        }

        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(400).json({ error: "Username already taken" });
        }

        bcrypt.genSalt(10, (err, salt) => {
            if (err) {
                console.error("Salt generation error:", err);
                return res.status(500).json({ error: "Salt generation failed" });
            }

            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) {
                    console.error("Password hashing error:", err);
                    return res.status(500).json({ error: "Password hashing failed" });
                }

                try {
                    const newUser = await User.create({
                        username: username.trim(),
                        password: hash
                    });

                    jwt.sign({ id: newUser._id, username }, jwtsecret, (err, token) => {
                        if (err) {
                            console.error("Token generation error:", err);
                            return res.status(500).json({ error: "Token generation failed" });
                        }

                        const cookieOptions = {
                            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
                            secure: process.env.NODE_ENV === 'production',
                            httpOnly: false
                        };

                        res.cookie("token", token, cookieOptions)
                            .status(201)
                            .json({ id: newUser._id });
                    });
                } catch (err) {
                    console.error("❌ Database Error:", err);
                    if (err.code === 11000) {
                        return res.status(400).json({ error: "Username already exists" });
                    }
                    return res.status(500).json({ error: "Database Error" });
                }
            });
        });

    } catch (err) {
        console.error("❌ Registration Error:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/people', async(req, res) => {
    try {
        const users = await User.find({}, {'_id':1 , username:1});
        res.json(users);
    } catch (error) {
        console.error("Error fetching people:", error);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Global error handler
app.use((error, req, res, next) => {
    console.error("Unhandled error:", error);
    res.status(500).json({ error: "Something went wrong!" });
});

// Handle 404 routes
app.use((req, res) => {
    res.status(404).json({ error: "Route not found" });
});

// Updated server listen - Render assigns the PORT
const server = app.listen(PORT, '0.0.0.0', () => { 
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

server.on('error', (error) => {
    console.error('Server error:', error);
});

const wss = new ws.WebSocketServer({ server });

wss.on("connection", (connection, req) => {
    console.log("New WebSocket connection");
    
    try {
        const cookies = req.headers?.cookie || "";

        if (cookies) {
            const tokencookie = cookies.split(";").find((str) => str.trim().startsWith("token="));
            if (tokencookie) {
                const token = tokencookie.split("=")[1];
                if (token) {
                    jwt.verify(token, jwtsecret, (err, user) => {
                        if (err) {
                            console.error("JWT verification failed:", err);
                            connection.close(1008, "Invalid token");
                            return;
                        }

                        if (!user.id || !user.username) {
                            console.error("Invalid user data in token");
                            connection.close(1008, "Invalid user data");
                            return;
                        }

                        connection.username = user.username;
                        connection.id = user.id;

                        console.log(`User ${user.username} connected`);
                        broadcastOnlineUsers();
                    });
                } else {
                    console.warn("Empty token in cookie");
                    connection.close(1008, "No token provided");
                }
            } else {
                console.warn("No token cookie found");
                connection.close(1008, "No token provided");
            }
        } else {
            console.warn("No cookies in WebSocket connection");
            connection.close(1008, "No authentication");
        }
    } catch (error) {
        console.error("Error processing WebSocket connection:", error);
        connection.close(1011, "Server error");
    }

    connection.on("message", async (data) => {
        try {
            if (!connection.id || !connection.username) {
                console.warn("Message from unauthenticated connection");
                return;
            }

            let messageData;
            try {
                messageData = JSON.parse(data.toString());
            } catch (parseError) {
                console.error("Invalid JSON in message:", parseError);
                return;
            }

            const { recipient, text } = messageData;

            if (!recipient || !text) {
                console.warn("Invalid message format: missing recipient or text");
                return;
            }

            if (typeof recipient !== 'string' || typeof text !== 'string') {
                console.warn("Invalid message format: recipient and text must be strings");
                return;
            }

            if (text.trim().length === 0) {
                console.warn("Empty message text");
                return;
            }

            if (text.length > 1000) {
                console.warn("Message too long");
                return;
            }

            if (!mongoose.Types.ObjectId.isValid(recipient)) {
                console.warn("Invalid recipient ID format");
                return;
            }

            const messageDoc = await Message.create({
                sender: connection.id,
                recipient: recipient,
                text: text.trim(),
            });

            const recipientConnections = [...wss.clients].filter((c) => c.id === recipient);
            recipientConnections.forEach((c) => {
                try {
                    if (c.readyState === ws.OPEN) {
                        c.send(
                            JSON.stringify({
                                text: text.trim(),
                                sender: connection.id,
                                recipient,
                                _id: messageDoc._id,
                            })
                        );
                    }
                } catch (sendError) {
                    console.error("Error sending message to recipient:", sendError);
                }
            });

        } catch (error) {
            console.error("Error processing message:", error);
        }
    });

    connection.on("close", () => {
        console.log(`User ${connection.username || 'unknown'} disconnected`);
        broadcastOnlineUsers();
    });

    connection.on("error", (error) => {
        console.error("WebSocket connection error:", error);
    });

    function broadcastOnlineUsers() {
        try {
            if (!wss.clients || typeof wss.clients.forEach !== "function") {
                console.error("WebSocket clients set is not initialized.");
                return;
            }

            const onlineUsers = [...wss.clients]
                .filter(c => c.readyState === ws.OPEN && c.id && c.username)
                .map((c) => ({
                    id: c.id,
                    username: c.username,
                }));

            const message = JSON.stringify({ online: onlineUsers });

            wss.clients.forEach((client) => {
                try {
                    if (client.readyState === ws.OPEN) {
                        client.send(message);
                    }
                } catch (sendError) {
                    console.error("Error broadcasting to client:", sendError);
                }
            });
        } catch (error) {
            console.error("Error in broadcastOnlineUsers:", error);
        }
    }
});

wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Received SIGINT. Graceful shutdown...');
    server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Graceful shutdown...');
    server.close(() => {
        console.log('HTTP server closed.');
        mongoose.connection.close(false, () => {
            console.log('MongoDB connection closed.');
            process.exit(0);
        });
    });
});