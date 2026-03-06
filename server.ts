import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  const PORT = 3000;

  // In-memory store for presentations and presence
  const presentations: Record<string, any> = {};
  const rooms: Record<string, Set<string>> = {}; // presentationId -> Set of userIds
  const users: Record<string, { id: string; name: string; color: string }> = {};

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-presentation", ({ presentationId, user }) => {
      socket.join(presentationId);
      users[socket.id] = { ...user, id: socket.id };
      
      if (!rooms[presentationId]) {
        rooms[presentationId] = new Set();
      }
      rooms[presentationId].add(socket.id);

      // Send current state if exists
      if (presentations[presentationId]) {
        socket.emit("presentation-update", presentations[presentationId]);
      }

      // Broadcast presence
      const activeUsers = Array.from(rooms[presentationId]).map(id => users[id]);
      io.to(presentationId).emit("presence-update", activeUsers);
    });

    socket.on("update-presentation", ({ presentationId, presentation }) => {
      presentations[presentationId] = presentation;
      // Broadcast to others in the room
      socket.to(presentationId).emit("presentation-update", presentation);
    });

    socket.on("cursor-move", ({ presentationId, position }) => {
      socket.to(presentationId).emit("user-cursor-move", {
        userId: socket.id,
        position,
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
      const user = users[socket.id];
      if (user) {
        // Find which rooms they were in
        for (const presentationId in rooms) {
          if (rooms[presentationId].has(socket.id)) {
            rooms[presentationId].delete(socket.id);
            const activeUsers = Array.from(rooms[presentationId]).map(id => users[id]);
            io.to(presentationId).emit("presence-update", activeUsers);
          }
        }
        delete users[socket.id];
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
