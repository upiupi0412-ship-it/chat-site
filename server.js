const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

const rooms = {}
const messages = {}

io.on("connection", (socket) => {

    socket.on("joinRoom", ({ roomName, userName }) => {

        if (!rooms[roomName]) {
            rooms[roomName] = { users: [] }
            messages[roomName] = []
        }

        const user = {
            id: socket.id,
            name: userName
        }

        rooms[roomName].users.push(user)

        socket.join(roomName)
        socket.roomName = roomName
        socket.userName = userName

        io.to(roomName).emit(
            "userList",
            rooms[roomName].users.map(u => u.name)
        )

        // 過去メッセージ送信
        messages[roomName].forEach(m=>{
            socket.emit("chatMessage",m)
        })

        io.to(roomName).emit("popup", {
            type: "join",
            user: userName
        })
    })


    socket.on("chatMessage", (text) => {

        const room = socket.roomName
        if (!room) return

        const now = new Date()

        const hour = now.getHours()
        const minute = now.getMinutes().toString().padStart(2,"0")

        const time = `${hour}:${minute}`

        const msg = {
            id: Date.now()+"_"+Math.random(),
            user: socket.userName,
            text: text,
            time: time
        }

        messages[room].push(msg)

        io.to(room).emit("chatMessage", msg)

        socket.to(room).emit("stopTyping", {
            user: socket.userName
        })
    })


    // メッセージ削除
    socket.on("deleteMessage",(id)=>{

        const room = socket.roomName
        if (!room) return

        const index = messages[room].findIndex(m => m.id === id)

        if (index === -1) return

        const msg = messages[room][index]

        if (msg.user !== socket.userName) return

        // 配列から削除
        messages[room].splice(index,1)

        // クライアントに削除通知
        io.to(room).emit("messageDeleted",{
            id:id
        })

    })


    socket.on("typing", () => {

        const room = socket.roomName
        if (!room) return

        socket.to(room).emit("typing", {
            user: socket.userName
        })
    })


    socket.on("stopTyping", () => {

        const room = socket.roomName
        if (!room) return

        socket.to(room).emit("stopTyping", {
            user: socket.userName
        })
    })


    socket.on("disconnect", () => {

        const room = socket.roomName
        if (!room) return
        if (!rooms[room]) return

        rooms[room].users =
        rooms[room].users.filter(u => u.id !== socket.id)

        io.to(room).emit(
            "userList",
            rooms[room].users.map(u => u.name)
        )

        io.to(room).emit("popup", {
            type: "leave",
            user: socket.userName
        })

        io.to(room).emit("stopTyping", {
            user: socket.userName
        })

        // 部屋が空なら完全削除
        if (rooms[room].users.length === 0) {

            delete rooms[room]
            delete messages[room]

            console.log("room reset:",room)

        }

    })

})

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log("server started")
})