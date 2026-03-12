const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

const rooms = {}
const messages = {}

io.on("connection",(socket)=>{

socket.on("joinRoom",({roomName,userName})=>{

if(!rooms[roomName]){
rooms[roomName]={users:[]}
messages[roomName]=[]
}

const user={
id:socket.id,
name:userName
}

rooms[roomName].users.push(user)

socket.join(roomName)
socket.roomName=roomName
socket.userName=userName

io.to(roomName).emit(
"userList",
rooms[roomName].users.map(u=>u.name)
)

messages[roomName].forEach(msg=>{
socket.emit("chatMessage",msg)
})

io.to(roomName).emit("popup",{
type:"join",
user:userName
})

})

socket.on("chatMessage",(text)=>{

const room=socket.roomName
if(!room)return

const time=new Date().toLocaleTimeString([],{
hour:"2-digit",
minute:"2-digit"
})

const msg={
id:Date.now()+"_"+Math.random(),
user:socket.userName,
text:text,
time:time,
deleted:false
}

messages[room].push(msg)

io.to(room).emit("chatMessage",msg)

})

socket.on("deleteMessage",(id)=>{

const room=socket.roomName
if(!room)return

const msg=messages[room].find(m=>m.id===id)

if(!msg)return
if(msg.user!==socket.userName)return

msg.deleted=true
msg.text="このメッセージは削除されました"

io.to(room).emit("messageDeleted",{
id:id,
text:msg.text
})

})

socket.on("disconnect",()=>{

const room=socket.roomName
if(!room)return

rooms[room].users=
rooms[room].users.filter(u=>u.id!==socket.id)

io.to(room).emit(
"userList",
rooms[room].users.map(u=>u.name)
)

io.to(room).emit("popup",{
type:"leave",
user:socket.userName
})

})

})

const PORT=process.env.PORT||3000

server.listen(PORT,()=>{
console.log("server started")
})