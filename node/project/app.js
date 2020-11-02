/* eslint-disable no-unused-vars */
/* eslint-disable no-plusplus */
/* eslint-disable no-param-reassign */
/* eslint-disable no-console */
const express = require('express');

const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
// MySQL connection setting
const mysql = require('mysql'); // 引入Node.js的MySQL套件

const con = mysql.createConnection({
  // 與MySQL的連線設定
  host: 'mysql',
  user: 'root',
  password: 'root',
  database: 'chattingroom',
  charset: 'utf8mb4',
});
// redis connection block
const redis = require('redis');

const client = redis.createClient({ host: 'redis' });
// logger - winston block
const winston = require('winston');

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    //
    // - Write all logs with level `error` and below to `error.log`
    // - Write all logs with level `info` and below to `combined.log`
    //
    new winston.transports.File({ filename: './error.log', level: 'error' }),
    new winston.transports.File({ filename: './info.log', level: 'info' }),
  ],
});
// moment block
const moment = require('moment');
// node cron
const cron = require('node-cron');
cron.schedule('*/10 * * * * *', () => {
  con.query('SELECT infoContent FROM informations WHERE informationId = ?', [parseInt(Math.random()*10+1)], function(error, results) {
    if(error) {

    }
    else {
      io.in('0').emit('getInfo', results[0].infoContent);
    }
  });
  
});

// function block
async function userLogin(data) {
  const checkHasThisUser = (userName) => new Promise((resolve) => {
    con.query('SELECT * FROM `users` WHERE userName = ?', [userName], (error, results) => {
      if (error) {
        console.log(error);
      } else {
        resolve(results.length);
      }
    });
  });
  const insertUser = (userName) => new Promise((resolve) => {
    con.query('INSERT INTO users(userName) VALUES (?)', [userName], (error) => {
      if (error) {
        console.log(error);
      } else {
        resolve();
      }
    });
  });
  const selectUserId = (userName) => new Promise((resolve) => {
    con.query('SELECT userId FROM users WHERE userName = ?', [userName], (error, results) => {
      if (error) {
        console.log(error);
      } else {
        resolve(results[0].userId);
      }
    });
  });
  const selectContents = (roomId) => new Promise((resolve) => {
    client.LRANGE(roomId, 0, -1, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        resolve(res);
      }
    });
  });
  const selectUserRooms = (userName) => new Promise((resolve) => {
    con.query('SELECT r.roomId, r.roomName, u.userId, u.userName FROM whoInRoom w JOIN users u ON w.userId = u.userId JOIN rooms r ON w.roomId = r.roomId WHERE u.userName = ?', [userName], (error, results) => {
      if (error) {
        console.log(error);
      } else {
        resolve(results);
      }
    });
  });

  const getRows = await checkHasThisUser(data.userName);
  if (!getRows) {
    await insertUser(data.userName);
  }
  // eslint-disable-next-line max-len
  const [userId, contents, rooms] = await Promise.all([selectUserId(data.userName), selectContents(data.roomId), selectUserRooms(data.userName)]);
  const returnValues = {
    userId,
    contents,
    rooms,
  };
  return returnValues;
}
async function makeRoom(data) {
  const insertRoom = (inputData) => new Promise((resolve) => {
    con.query('INSERT INTO rooms(roomName) VALUES(?)', [inputData.roomName], (error) => {
      if (error) {
        console.log(error);
      } else {
        resolve();
      }
    });
  });
  const selectRoomId = (inputData) => new Promise((resolve) => {
    con.query('SELECT roomId FROM rooms WHERE roomName = ?', [inputData.roomName], (error, results) => {
      if (error) {
        console.log(error);
      } else {
        resolve(results[0].roomId);
      }
    });
  });
  const insertWhoInRoom = (inputData) => new Promise((resolve) => {
    let sqlCommand = 'INSERT INTO whoInRoom(roomId, userId) VALUES ';
    // eslint-disable-next-line no-restricted-syntax
    for (const one of inputData.checkedUsers) {
      sqlCommand += `(${inputData.roomId},${one}),`;
    }
    sqlCommand = sqlCommand.slice(0, -1);
    con.query(sqlCommand, (error) => {
      if (error) {
        console.log(error);
      }
      resolve();
    });
  });
  
  await insertRoom(data);
  const roomId = await selectRoomId(data);
  data.roomId = roomId;
  // client.SET(data.roomName, roomId);
  await insertWhoInRoom(data);
  io.emit('makeRoomSuccess', data);
}

// server block
server.listen(3000, () => {
  console.log('server is running');
});

app.get('/', (req, res) => {
  res.redirect('/public/chat.html');
});

app.use('/', express.static(__dirname));

/* socket */
io.on('connection', (socket) => {
  console.log(socket.id + ' is connecting!');
  socket.userName = null;
  socket.on('login', (data) => {
    socket.userName = data.userName;
    // 如果在線的使用者中有這個使用者名稱的話就會報錯
    // eslint-disable-next-line no-restricted-syntax
    client.LRANGE('onlineUsers', 0, -1, (err, res) => {
      for (const user of res) {
        if (user === data.userName) {
          socket.emit('getError', { err: 'userNameDuplicate' });
          socket.userName = null;
          break;
        }
      }
      if (socket.userName) {
        client.LPUSH('onlineUsers', data.userName, (err, results) => { // 加入上線使用者
          client.LRANGE('onlineUsers', 0, -1, (err, res) => {
            data.userGroup = res;
            userLogin(data).then((returnValues) => {
              // client.SET(data.userName, returnValues.userId);
              socket.join(data.roomId);
              data.userId = returnValues.userId;
              data.userContents = returnValues.contents;
              data.userRooms = returnValues.rooms;
              io.emit('loginSuccess', data);
            });
          });
        });
        client.SET(data.userName, data.loginTime);
      }      
    });
  });

  // 斷開連接後做的事情
  socket.on('disconnect', (reason) => {
    console.log(reason);
    if(socket.userName !== null) {
      socket.broadcast.emit('oneLeave', { userName: socket.userName });
      client.LREM('onlineUsers', 0, socket.userName);
    }
  });

  socket.on('sendMessage', (data) => {
    // const nowTimestamp = new Date(data.nowTimestamp);
    const formatDateTime = moment(data.nowTimestamp).format('YYYY-MM-DD HH:mm:ss');
    con.query(
      'INSERT INTO `chatContents`(userId, content, roomId, sendTime) VALUES((SELECT userId FROM `users` WHERE userName = ?), ?, ?, ?)',
      [data.userName, data.message, data.roomId, formatDateTime],
      (error) => {
        if (error) {
          console.log(error);
        } else {
          const oneChatContent = {
            userName: data.userName,
            content: data.message,
            sendTime: data.nowTimestamp
          };
          client.LLEN(data.roomId, (err, res) => {
            if(err) {
              console.log(err);
            }
            else {
              if(res < 100) {
                client.RPUSH(data.roomId, JSON.stringify(oneChatContent));
              }
              else {
                client.LPOP(data.roomId, (err, res) => {
                  if(err) {
                    console.log(err);
                  }
                  else {
                    client.RPUSH(data.roomId, JSON.stringify(oneChatContent));
                  }
                });
              }
            }
          });        
        }
      },
    );
    switch(data.message) { // 如果是系統公告的話就要加上系統所回覆的部分
      case '!users': {
        data.official = true;
        client.LLEN('onlineUsers', (err, res) => {
          if(err) {
            console.log(err);
          }
          else {
            data.systemReturn = `總共 ${res} 位使用者在線`;
          }
          io.in(data.roomId).emit('receiveMessage', data);
        });
        break;
      }
      case '!server time': {
        data.official = true;
        const nowTime = new Date();
        const formatDateTime = moment(nowTime).format('YYYY-MM-DD HH:mm:ss');
        data.systemReturn = `現在時間為${formatDateTime}`;
        io.in(data.roomId).emit('receiveMessage', data);
        break;
      }
      case '!online time': {
        data.official = true;
        client.GET(data.userName, (err, res) => {
          const formatDateTime = moment(res).format('YYYY-MM-DD HH:mm:ss');
          data.systemReturn = `您的上線時間為${formatDateTime}`;
          io.in(data.roomId).emit('receiveMessage', data);
        });
        break;
      }
      default: {
        data.official = false;
        io.in(data.roomId).emit('receiveMessage', data);
        break;
      }
    }
  });
  socket.on('getUsers', () => {
    con.query('SELECT * FROM users', (error, results) => {
      if (error) {
        console.log(error);
      } else {
        socket.emit('getUsersSuccess', results);
      }
    });
  });
  socket.on('makeRoom', (data) => {
    makeRoom(data);
  });
  socket.on('getChatContents', (data) => {
    socket.leave(data.oldRoomId);
    socket.join(data.roomId);
    client.LRANGE(data.roomId, 0, -1, (err, res) => {
      if (err) {
        console.log(err);
      } else {
        socket.emit('getChatContentsSuccess', { userName: data.userName, res });
      }
    });
  });
});
