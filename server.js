const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

let users = {} // socket.id → {name, room}

/* 接続 */
io.on("connection",(socket)=>{

    /* 入室 */
    socket.on("joinRoom",({roomName,userName})=>{

        socket.join(roomName)

        users[socket.id]={
            name:userName,
            room:roomName
        }

    })

    /* メッセージ送信 */
    socket.on("chatMessage",(text)=>{

        const user=users[socket.id]
        if(!user) return

        const msg={
            id: Date.now().toString(),
            user: user.name,
            text: text,
            time: new Date().toLocaleTimeString()
        }

        io.to(user.room).emit("chatMessage",msg)

    })

    /* メッセージ削除 */
    socket.on("deleteMessage",(id)=>{

        const user=users[socket.id]
        if(!user) return

        io.to(user.room).emit("messageDeleted",{id})

    })

    /* typing */
    socket.on("typing",()=>{

        const user=users[socket.id]
        if(!user) return

        socket.to(user.room).emit("typing")

    })

    /* stopTyping */
    socket.on("stopTyping",()=>{

        const user=users[socket.id]
        if(!user) return

        socket.to(user.room).emit("stopTyping")

    })

    /* 切断 */
    socket.on("disconnect",()=>{

        delete users[socket.id]

    })

})

server.listen(3000,()=>{
    console.log("server running")
})