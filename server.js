const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

const rooms = {}

io.on("connection", (socket) => {

    /* 入室 */

    socket.on("joinRoom", ({ roomName, userName }) => {

        if (!rooms[roomName]) {
            rooms[roomName] = { users: [] }
        }

        const room = rooms[roomName]

        const user = {
            id: socket.id,
            name: userName
        }

        room.users.push(user)

        socket.join(roomName)
        socket.roomName = roomName
        socket.userName = userName

        io.to(roomName).emit(
            "userList",
            room.users.map(u => u.name)
        )

        io.to(roomName).emit("popup", {
            type: "join",
            user: userName
        })
    })


    /* メッセージ */

    socket.on("chatMessage", (msg) => {

        const roomName = socket.roomName
        if (!roomName) return

        const time = new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })

        io.to(roomName).emit("chatMessage", {
            user: socket.userName,
            text: msg,
            time: time
        })

        /* 送信したら typing を止める */

        io.to(roomName).emit("stopTyping", {
            user: socket.userName
        })

    })


    /* タイピング開始 */

    socket.on("typing", () => {

        const roomName = socket.roomName
        if (!roomName) return

        io.to(roomName).emit("typing", {
            user: socket.userName
        })

    })


    /* タイピング停止 */

    socket.on("stopTyping", () => {

        const roomName = socket.roomName
        if (!roomName) return

        io.to(roomName).emit("stopTyping", {
            user: socket.userName
        })

    })


    /* 切断 */

    socket.on("disconnect", () => {

        const roomName = socket.roomName
        if (!roomName) return

        const room = rooms[roomName]
        if (!room) return

        room.users = room.users.filter(
            u => u.id !== socket.id
        )

        io.to(roomName).emit(
            "userList",
            room.users.map(u => u.name)
        )

        io.to(roomName).emit("popup", {
            type: "leave",
            user: socket.userName
        })

        /* typing削除 */

        io.to(roomName).emit("stopTyping", {
            user: socket.userName
        })

    })

})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log("server started")
})