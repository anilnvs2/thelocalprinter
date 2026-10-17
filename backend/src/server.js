const dotenv = require("dotenv");
dotenv.config();

const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (process.env.CLIENT_URL || "http://localhost:3000,http://localhost:3001,http://localhost:5173").split(","),
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

const onlineUsers = new Map();

io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const User = require("./models/User");
    const user = await User.findById(decoded.userId);
    if (!user) return next(new Error("User not found"));
    if (!user.isActive) return next(new Error("Account deactivated"));
    socket.userId = user._id.toString();
    socket.userRole = user.role;
    socket.userFullName = user.fullName;
    next();
  } catch (err) {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.userId;

  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  const allOnlineIds = [...onlineUsers.keys()];
  socket.emit("online_users", { users: allOnlineIds });
  io.emit("user_online", { userId });

  socket.on("join_conversation", (conversationId) => {
    socket.join(conversationId);
  });

  socket.on("leave_conversation", (conversationId) => {
    socket.leave(conversationId);
  });

  socket.on("send_message", async (data) => {
    try {
      const Message = require("./models/Message");
      const Conversation = require("./models/Conversation");
      const User = require("./models/User");

      const { conversationId, message } = data;
      if (!conversationId || !message?.trim()) return;

      const conversation = await Conversation.findById(conversationId);
      if (!conversation) {
        return socket.emit("error_event", { message: "Conversation not found" });
      }
      if (!conversation.participants.map(String).includes(userId)) {
        return socket.emit("error_event", { message: "Access denied" });
      }

      const otherUserId = conversation.participants.find((p) => p.toString() !== userId);
      const otherUser = await User.findById(otherUserId).lean();
      if (otherUser && socket.userRole === otherUser.role) {
        return socket.emit("error_event", { message: "Cannot chat with same role" });
      }

      const newMessage = await Message.create({
        conversationId,
        senderId: userId,
        senderRole: socket.userRole,
        message: message.trim(),
      });

      conversation.lastMessage = message.trim();
      conversation.lastMessageAt = new Date();

      const unreadMap = conversation.unreadCount instanceof Map
        ? conversation.unreadCount
        : new Map(Object.entries(conversation.unreadCount || {}));
      const currentUnread = unreadMap.get(otherUserId) || 0;
      unreadMap.set(otherUserId, currentUnread + 1);
      conversation.unreadCount = unreadMap;
      await conversation.save();

      const populated = {
        _id: newMessage._id.toString(),
        conversationId: conversationId.toString(),
        senderId: userId,
        senderRole: socket.userRole,
        message: message.trim(),
        createdAt: newMessage.createdAt,
      };

      io.to(conversationId).emit("new_message", populated);
    } catch (err) {
      console.error("send_message error:", err);
      socket.emit("error_event", { message: "Failed to send message" });
    }
  });

  socket.on("typing_start", (conversationId) => {
    socket.to(conversationId).emit("typing_start", {
      conversationId,
      userId,
      fullName: socket.userFullName,
    });
  });

  socket.on("typing_stop", (conversationId) => {
    socket.to(conversationId).emit("typing_stop", {
      conversationId,
      userId,
    });
  });

  socket.on("mark_read", async (conversationId) => {
    try {
      const Message = require("./models/Message");
      const Conversation = require("./models/Conversation");

      await Message.updateMany(
        { conversationId, senderId: { $ne: userId }, readAt: null },
        { $set: { readAt: new Date() } }
      );

      const conversation = await Conversation.findById(conversationId);
      if (conversation) {
        const unreadMap = conversation.unreadCount instanceof Map
          ? conversation.unreadCount
          : new Map(Object.entries(conversation.unreadCount || {}));
        unreadMap.set(userId, 0);
        conversation.unreadCount = unreadMap;
        await conversation.save();
      }

      socket.to(conversationId).emit("messages_read", {
        conversationId,
        readBy: userId,
      });
    } catch (err) {
      console.error("mark_read error:", err);
      socket.emit("error_event", { message: "Failed to mark messages" });
    }
  });

  socket.on("disconnect", () => {
    const userSockets = onlineUsers.get(userId);
    if (userSockets) {
      userSockets.delete(socket.id);
      if (userSockets.size === 0) {
        onlineUsers.delete(userId);
        io.emit("user_offline", { userId });
      }
    }
  });
});

io.on("connection_error", (err) => {
  console.log("Socket connection error:", err.message);
});

const startServer = async () => {
  await connectDB();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
};

startServer();
