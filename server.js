const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

/* 部屋データ */

const rooms = {}

/*
rooms構造

{
 roomName:{
   users:[{id,name}],
   messages:[]
 }
}
*/

/* 時刻生成 */

function getTime(){

const now = new Date()

let hour = now.getHours()
let min = now.getMinutes()

if(min < 10) min = "0" + min

return hour + ":" + min

}

/* 接続 */

io.on("connection",(socket)=>{

/* 入室 */

socket.on("joinRoom",(data)=>{

const room = data.roomName
const name = data.userName

socket.join(room)

socket.roomName = room
socket.userName = name

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

/* 既存メッセージ送信 */

rooms[room].messages.forEach(msg=>{
socket.emit("chatMessage",msg)
})

})

/* メッセージ */

socket.on("chatMessage",(text)=>{

const room = socket.roomName

if(!rooms[room]) return

const msg = {
id: Date.now() + Math.random(),
user: socket.userName,
text: text,
time: getTime()
}

rooms[room].messages.push(msg)

io.to(room).emit("chatMessage",msg)

})

/* 削除 */

socket.on("deleteMessage",(id)=>{

const room = socket.roomName

if(!rooms[room]) return

rooms[room].messages =
rooms[room].messages.filter(m=>m.id!==id)

io.to(room).emit("messageDeleted",{id:id})

})

/* typing */

socket.on("typing",(room)=>{

socket.to(room).emit("typing",{
user:socket.userName
})

})

socket.on("stopTyping",(room)=>{

socket.to(room).emit("stopTyping",{
user:socket.userName
})

})

/* 切断 */

socket.on("disconnect",()=>{

const room = socket.roomName
if(!room) return
if(!rooms[room]) return

rooms[room].users =
rooms[room].users.filter(u=>u.id!==socket.id)

/* 誰もいなくなったら履歴削除 */

if(rooms[room].users.length === 0){

delete rooms[room]

}

})

})

/* サーバー起動 */

const PORT = process.env.PORT || 3000

server.listen(PORT,()=>{

console.log("Server running on port",PORT)

})