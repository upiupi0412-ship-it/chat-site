const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

let users = {}
let messages = []

io.on("connection",(socket)=>{

    socket.on("joinRoom",({userName,roomName})=>{
        socket.join(roomName)

        users[socket.id]={name:userName,room:roomName}

        const list = Object.values(users)
            .filter(u=>u.room===roomName)
            .map(u=>u.name)

        io.to(roomName).emit("userList",list)
    })

    socket.on("chatMessage",(text)=>{
        const user = users[socket.id]
        if(!user) return

        const msg={
            id: Date.now().toString(),
            user:user.name,
            text,
            time:new Date().toLocaleTimeString("ja-JP",{
                timeZone:"Asia/Tokyo",
                hour:"2-digit",
                minute:"2-digit",
                hour12:false
            })
        }

        messages.push(msg)

        io.to(user.room).emit("chatMessage",msg)
    })

    socket.on("deleteMessage",(id)=>{
        const user = users[socket.id]
        if(!user) return

        messages = messages.filter(m=>m.id!==id)

        io.to(user.room).emit("messageDeleted",{id})
    })

    socket.on("typing",()=>{
        const user = users[socket.id]
        if(user) socket.to(user.room).emit("typing")
    })

    socket.on("stopTyping",()=>{
        const user = users[socket.id]
        if(user) socket.to(user.room).emit("stopTyping")
    })

    socket.on("disconnect",()=>{
        const user = users[socket.id]
        if(!user) return

        const room = user.room
        delete users[socket.id]

        const list = Object.values(users)
            .filter(u=>u.room===room)
            .map(u=>u.name)

        io.to(room).emit("userList",list)
    })

    socket.on("editMessage",({id,text})=>{

        const user = users[socket.id]
        if(!user) return
    
        const msg = messages.find(m=>m.id===id)
        if(!msg) return
    
        if(msg.user !== user.name) return
    
        msg.text = text
        msg.edited = true
    
        io.to(user.room).emit("messageEdited",{
            id,
            text
        })
    
    })

})

server.listen(3000,()=>{
    console.log("server running")
})