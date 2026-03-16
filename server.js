const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

const rooms = {}

function getTime(){

const now = new Date()

let h = now.getHours()
let m = now.getMinutes()

if(m < 10) m = "0" + m

return h + ":" + m

}

io.on("connection",(socket)=>{

socket.on("joinRoom",(data)=>{

const room = data.roomName
const name = data.userName

socket.join(room)

socket.room = room
socket.name = name

if(!rooms[room]){

rooms[room] = {
users:[],
messages:[]
}

}

rooms[room].users.push({
id:socket.id,
name:name
})

rooms[room].messages.forEach(msg=>{
socket.emit("chatMessage",msg)
})

})

socket.on("chatMessage",(text)=>{

const room = socket.room
if(!room) return

const msg = {
id: Date.now() + Math.random(),
user: socket.name,
text: text,
time: getTime()
}

rooms[room].messages.push(msg)

io.to(room).emit("chatMessage",msg)

})

socket.on("deleteMessage",(id)=>{

const room = socket.room
if(!room) return

rooms[room].messages =
rooms[room].messages.filter(m=>m.id!==id)

io.to(room).emit("messageDeleted",{id:id})

})

/* typing */

socket.on("typing",()=>{

socket.to(socket.room).emit("typing",{
user:socket.name
})

})

socket.on("stopTyping",()=>{

socket.to(socket.room).emit("stopTyping")

})

socket.on("disconnect",()=>{

const room = socket.room
if(!room) return

if(!rooms[room]) return

rooms[room].users =
rooms[room].users.filter(u=>u.id!==socket.id)

if(rooms[room].users.length===0){

delete rooms[room]

}

})

})

server.listen(process.env.PORT || 3000)