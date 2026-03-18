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

        const list = Object.values(users)
            .filter(u => u.room === roomName)
            .map(u => u.name)

        io.to(roomName).emit("userList", list)

    })

    /* メッセージ送信 */
    socket.on("chatMessage",(text)=>{

        const user=users[socket.id]
        if(!user) return

        const msg={
            id: Date.now().toString(),
            user: user.name,
            text: text,
            time: new Date().toLocaleTimeString("ja-JP", {
                timeZone: "Asia/Tokyo",
                hour: "2-digit",
                minute: "2-digit",
                hour12: false
            })
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

        const user = users[socket.id]
        if(!user) return
    
        const room = user.room
        delete users[socket.id]
    
        const list = Object.values(users)
            .filter(u => u.room === room)
            .map(u => u.name)
    
        io.to(room).emit("userList", list)
    
    })

    socket.on("userList",(list)=>{
        document.getElementById("userList").textContent = list.join(", ")
    })
    
})

server.listen(3000,()=>{
    console.log("server running")
})