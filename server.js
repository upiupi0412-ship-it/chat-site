const express = require("express")
const http = require("http")
const { Server } = require("socket.io")

const app = express()
const server = http.createServer(app)
const io = new Server(server)

app.use(express.static("public"))

/* =========================
   データ管理
========================= */

const rooms = {}
const messages = {}

/* 掲示板 */
let boardMessages = []
let currentDate = new Date().getDate()

/* =========================
   共通関数
========================= */

function getTime(){

const now = new Date()

/* +9時間補正（日本時間） */
now.setHours(now.getHours()+9)

const h = now.getHours()
const m = now.getMinutes().toString().padStart(2,"0")

return h + ":" + m
}

/* 日付チェック（掲示板リセット） */
function checkDate(){

const now = new Date().getDate()

if(now !== currentDate){

boardMessages = []
currentDate = now

}

}

/* =========================
   Socket処理
========================= */

io.on("connection", (socket) => {

    /* =========================
       入室
    ========================= */
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

        /* ユーザー一覧 */
        io.to(roomName).emit(
            "userList",
            rooms[roomName].users.map(u => u.name)
        )

        /* 過去メッセージ */
        messages[roomName].forEach(m=>{
            socket.emit("chatMessage",m)
        })

        /* 入室通知 */
        io.to(roomName).emit("popup", {
            type: "join",
            user: userName
        })
    })


    /* =========================
       メッセージ送信
    ========================= */
    socket.on("chatMessage", (text) => {

        const room = socket.roomName
        if (!room) return

        const msg = {
            id: Date.now()+"_"+Math.random(),
            user: socket.userName,
            text: text,
            time: getTime()
        }

        messages[room].push(msg)

        io.to(room).emit("chatMessage", msg)

        /* typing終了 */
        io.to(room).emit("stopTyping", {
            user: socket.userName
        })
    })


    /* =========================
       メッセージ削除（完全削除）
    ========================= */
    socket.on("deleteMessage",(id)=>{

        const room=socket.roomName
        if(!room) return

        const msgIndex = messages[room].findIndex(m=>m.id===id)

        if(msgIndex === -1) return
        if(messages[room][msgIndex].user !== socket.userName) return

        messages[room].splice(msgIndex,1)

        io.to(room).emit("messageDeleted",{
            id:id
        })
    })


    /* =========================
       typing
    ========================= */
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

        io.to(room).emit("stopTyping", {
            user: socket.userName
        })
    })


    /* =========================
       掲示板
    ========================= */

    /* 取得 */
    socket.on("getBoard",()=>{

        checkDate()

        socket.emit("boardData",boardMessages)

    })

    /* 投稿 */
    socket.on("boardPost",(text)=>{

        checkDate()

        const msg = {
            id: Date.now() + "_" + Math.random(),
            user: socket.userName,
            text: text,
            time: getTime()
        }

        boardMessages.push(msg)

        io.emit("boardData",boardMessages)

    })

    /* 削除 */
    socket.on("deleteBoard",(id)=>{

        boardMessages = boardMessages.filter(m=>{
            if(m.id !== id) return true
            return m.user !== socket.userName
        })

        io.emit("boardData",boardMessages)

    })


    /* =========================
       切断
    ========================= */
    socket.on("disconnect", () => {

        const room = socket.roomName
        if (!room) return

        if (!rooms[room]) return

        rooms[room].users =
        rooms[room].users.filter(u => u.id !== socket.id)

        /* ユーザー一覧更新 */
        io.to(room).emit(
            "userList",
            rooms[room].users.map(u => u.name)
        )

        /* 退出通知 */
        io.to(room).emit("popup", {
            type: "leave",
            user: socket.userName
        })

        io.to(room).emit("stopTyping", {
            user: socket.userName
        })

        /* 部屋が空なら削除 */
        if(rooms[room].users.length === 0){
            delete rooms[room]
            delete messages[room]
        }

    })

})

/* =========================
   起動
========================= */

const PORT = process.env.PORT || 3000

server.listen(PORT, () => {
    console.log("server started")
})