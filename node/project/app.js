const express = require("express");
const app = express();
const server = require("http").Server(app);
const path = require("path");
const io = require("socket.io")(server);
const mysql = require("mysql"); // 引入Node.js的MySQL套件
const { resolve } = require("path");
const { json } = require("body-parser");
const { data, hasData, get } = require("jquery");
const con = mysql.createConnection({
  // 與MySQL的連線設定
  host: "mysql",
  user: "root",
  password: "root",
  database: "chattingroom",
});
const users = []; // 目前在線的user
let usersNum = 0; // 目前在線的user數量

async function userLogin(data) {
  let checkHasThisUser = (userName) => {
    return new Promise((resolve, reject) => {
      con.query("SELECT * FROM `users` WHERE userName = ?",[userName],function (error, results, fields) {
        if(error) {
          console.log(error);
        }
        else {
          resolve(results.length);
        }
      });
    });
  };
  let insertUser = (userName) => {
    return new Promise((resolve, reject)=>{
      con.query('INSERT INTO users(userName) VALUES (?)', [userName], function(error,results,fields){
        if(error) {
          console.log(error);
        }
        else {
          resolve();
        }
      });
    });
  };
  let selectUserId = (userName) => {
    return new Promise((resolve, reject)=>{
      con.query('SELECT userId FROM users WHERE userName = ?', [userName], function(error,results,fields){
        if(error) {
          console.log(error);
        }
        else {
          resolve(results[0].userId);
        }
      });
    });
  };
  let selectContents = (roomId) => {
    return new Promise((resolve,reject) => {
      con.query('SELECT * FROM chatContents c JOIN users u ON c.userId = u.userId WHERE roomId = ?', [roomId], function(error,results,fields){
        if(error) {
          console.log(error);
        }
        else {
          resolve(results);
        }
      });
    });
  };
  let selectUserRooms = (userName) => {
    return new Promise((resolve, reject) => {
      con.query('SELECT r.roomId, r.roomName, u.userId, u.userName FROM whoInRoom w JOIN users u ON w.userId = u.userId JOIN rooms r ON w.roomId = r.roomId WHERE u.userName = ?',[userName],function(error,results, fields){
        if(error) {
          console.log(error);
        }
        else {
          resolve(results);
        }
      });
    });
  }

  let getRows = await checkHasThisUser(data.userName);
  if(!getRows) {
    await insertUser(data.userName);
  }
  let [userId, contents, rooms] = await Promise.all([selectUserId(data.userName), selectContents(data.roomId), selectUserRooms(data.userName)]);
  let returnValues = {
    userId: userId,
    contents: contents,
    rooms: rooms
  }
  return returnValues;
}
async function makeRoom(data) {
  let insertRoom = (data) => {
    return new Promise((resolve, reject) => {
      con.query('INSERT INTO rooms(roomName) VALUES(?)', [data.roomName], function(error, results, fields) {
        resolve();
      });
    });
  }
  let selectRoomId = (data) => {
    return new Promise((resolve, reject) => {
      con.query('SELECT roomId FROM rooms WHERE roomName = ?', [data.roomName], function(error,results, fields) {
        resolve(results[0].roomId);
      })
    });
  }
  let insertWhoInRoom = (data) => {
    return new Promise((resolve, reject) => {
      let sqlCommand = 'INSERT INTO whoInRoom(roomId, userId) VALUES ';
      for(let one of data.checkedUsers) {
        sqlCommand += '(' + data.roomId + ',' + one + '),'
      }
      sqlCommand = sqlCommand.slice(0, -1);
      con.query(sqlCommand, function(error,results, fields) {
        if(error) {
          console.log(error);
        }
        resolve();
      })
    });
  }

  await insertRoom(data);
  let roomId = await selectRoomId(data);
  data.roomId = roomId;
  await insertWhoInRoom(data);
  io.emit("makeRoomSuccess", data);
}

server.listen(3000, () => {
  console.log("server is running");
});

app.get("/", (req, res) => {
  res.redirect("/public/chat.html");
});

app.use("/", express.static(__dirname));

/*socket*/
io.on("connection", (socket) => {
  usersNum++;
  console.log(`目前有${usersNum}個使用者在線`);

  socket.on("login", (data) => {
    socket.userName = data.userName;

    // 如果在線的使用者中有這個使用者名稱的話就會報錯
    for (let user of users) {
      if (user.userName === data.userName) {
        socket.emit("getError", { err: "userNameDuplicate" });
        socket.userName = null;
        break;
      }
    }
    if (socket.userName) {
      // 如果在線的使用者中沒有這個使用者的話就加入在線使用者的陣列中
      users.push({
        userName: data.userName,
        message: [],
      });
      data.userGroup = users;

      userLogin(data).then(function(returnValues){
        socket.join(data.roomId);
        data.userId = returnValues.userId;
        data.userContents = returnValues.contents;
        data.userRooms = returnValues.rooms;
        io.emit("loginSuccess", data);
      });
    }
  });

  //斷開連接後做的事情
  socket.on("disconnect", () => {
    usersNum--;
    console.log(`目前有${usersNum}個使用者在線`);

    socket.broadcast.emit("oneLeave", { userName: socket.userName });

    users.forEach(function (user, index) {
      if (user.userName === socket.userName) {
        users.splice(index, 1);
      }
    });
  });

  socket.on("sendMessage", (data) => {
    let nowTimestamp = new Date(data.nowTimestamp);
    let formatDateTime = function (date) {
      // 將日期格式轉換為想要的形狀
      let year = date.getFullYear();
      let month = date.getMonth() + 1;
      month = month < 10 ? "0" + month : month;
      let day = date.getDate();
      day = day < 10 ? "0" + day : day;
      let hour = date.getHours();
      hour = hour < 10 ? "0" + hour : hour;
      let minute = date.getMinutes();
      minute = minute < 10 ? "0" + minute : minute;
      let second = date.getSeconds();
      second = second < 10 ? "0" + second : second;
      return ( year + "-" +month +"-" +day +" " +hour +":" +minute +":" +second);
    };
    con.query(
      "INSERT INTO `chatContents`(userId, content, roomId, sendTime) VALUES((SELECT userId FROM `users` WHERE userName = ?), ?, ?, ?)",
      [data.userName, data.message, data.roomId, formatDateTime(nowTimestamp)],
      function (error, results, fields) {
        if(error) {
          console.log(error);
        }
      }
    );
    for (let _user of users) {
      if (_user.userName === data.userName) {
        _user.message.push(data.message);
        break;
      }
    }
    io.in(data.roomId).emit("receiveMessage", data);
  });
  socket.on('getUsers', () => {
    con.query('SELECT * FROM users', function(error, results, fields){
      socket.emit('getUsersSuccess', results);  
    });
    
  });
  socket.on("makeRoom", (data) => {
    makeRoom(data);
  });
  socket.on('getChatContents', (data) => {
    socket.leave(data.oldRoomId);
    socket.join(data.roomId);
    con.query('SELECT * FROM chatContents c JOIN users u ON c.userId = u.userId WHERE roomId = ?', [data.roomId], function(error,results, fields){
      if(error) {
        console.log(error);
      }
      else {
        socket.emit('getChatContentsSuccess', {userName: data.userName, results: results});
      }
    });
  });
});
