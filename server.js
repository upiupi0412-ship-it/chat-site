const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

const rooms = {}

io.on("connection", (socket) => {

    socket.on("joinRoom", ({roomName, userName}) => {

        if (!rooms[roomName]) {
            rooms[roomName] = { users: [] }
        }

        const room = rooms[roomName]

        room.users.push(userName)

        socket.join(roomName)
        socket.roomName = roomName
        socket.userName = userName

        io.to(roomName).emit("userList", room.users)
    })

    socket.on("chatMessage", (msg) => {

        const roomName = socket.roomName
        if (!roomName) return

        io.to(roomName).emit("chatMessage", {
            user: socket.userName,
            text: msg
        })

    })

    socket.on("disconnect", () => {

        const roomName = socket.roomName
        if (!roomName) return

        const room = rooms[roomName]
        if (!room) return

        room.users = room.users.filter(u => u !== socket.userName)

        io.to(roomName).emit("userList", room.users)
    })

})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log("server started")
})