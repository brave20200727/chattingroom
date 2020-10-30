/* eslint-disable no-console */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-alert */
/* eslint-disable no-undef */
$(() => {
  const url = 'http://127.0.0.1:3000';
  let userName = null; // 使用者名稱
  let userId = null; // 使用者ID
  let roomId = '0'; // 聊天室ID，預設為0，也就是大廳
  const userNameObj = $('#userName'); // 使用者輸入匡
  const loginButtonObj = $('#loginButton'); // 登入按鍵
  const loginBoxObj = $('#loginBox'); // 登入的區塊
  const chattingBoxObj = $('#chattingBox'); // 聊天室的區塊
  const sendButtonObj = $('#sendButton'); // 送出按鍵
  const chattingRoomHeaderObj = $('#chattingRoomHeader'); // 聊天室標題
  const chattingContentObj = $('#chattingContent'); // 聊天內容
  const userInputObj = $('#userInput'); // 使用者輸入框
  const onlineUsersObj = $('#onlineUsers'); // 在線使用者
  const makeRoomModalObj = $('#makeRoomModal'); // 建立聊天室的modal
  const makeButtonObj = $('#makeButton'); // 創建的按鈕
  const cancelButtonObj = $('#cancelButton'); // 創建取消的按鈕
  const chatRoomListObj = $('#chatRoomList'); // 所有聊天室列表
  const chooseUserListObj = $('#chooseUserList'); // 可加入的使用者列表
  const roomNameObj = $('#roomName'); // 房間名稱的inputbox
  const makeRoomButtonObj = $(`<button type="button" class="list-group-item list-group-item-action" data-toggle="list" id="makeRoomButton">
                                  <svg width="1.5em" height="1.5em" viewBox="0 0 16 16" class="bi bi-plus-circle" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                                      <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                                      <path fill-rule="evenodd" d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                  </svg>
                                </button>`); // 創建聊天室按鈕

  const socket = io(url); // 建立socket連線

  function insertcontent(
    getUserName,
    getTime,
    message,
  ) {
    // 加入新的對話語句
    // const nowTime = new Date(getTime);
    const formatDateTime = moment(getTime).format('YYYY-MM-DD HH:mm');
    if (getUserName === userName) {
      chattingContentObj.append(
        `<p class="oneTalkMe"><strong>${getUserName}:</strong><br><span class="timestamp">${formatDateTime}</span> ${message}</p>`,
      );
    } else {
      chattingContentObj.append(
        `<p class="oneTalkOther"><strong>${getUserName}:</strong><br>${message}<span class="timestamp"> ${formatDateTime}</span></p>`,
      );
    }
    $('#chattingRoomBody').scrollTop($('#chattingContent').height()); // 使頁面處於置底狀態
  }
  function login() {
    // 登入判斷
    if (userName === '') {
      alert('請輸入名字');
    } else {
      socket.emit('login', { userName, roomId, loginTime: new Date() });
    }
  }
  function sendMessage() {
    // 訊息送出判斷
    const message = userInputObj.prop('value');
    const nowTimestamp = Date.now();
    if (message !== '') {
      socket.emit('sendMessage', {
        userName,
        message,
        roomId,
        nowTimestamp,
      });
    } else {
      alert('沒有輸入聊天內容喔！');
    }
  }
  function systemInformation(message) {
    chattingContentObj.append(
      `<p class="systemInfo"><strong>系統公告</strong><br>${message}</p>`,
    );
    $('#chattingRoomBody').scrollTop($('#chattingContent').height()); // 使頁面處於置底狀態
  }
  function reconnect() {

  }

  // 登入區塊事件
  loginButtonObj.on('click', () => {
    // 按下登入按鍵做的事情
    userName = userNameObj.prop('value').trim();
    login();
  });
  userNameObj.keypress((event) => {
    // 使用者名稱直接按enter做的事情
    userName = userNameObj.prop('value').trim();
    if (event.keyCode === 13) {
      login();
    }
  });

  // 聊天室區塊事件
  sendButtonObj.on('click', () => {
    // 按下送出按鍵做的事情
    sendMessage(userInputObj);
    userInputObj.prop('value', '');
  });
  userInputObj.keypress((event) => {
    // 輸入框直接按enter做的事情
    if (event.keyCode === 13) {
      sendMessage(userInputObj);
      userInputObj.prop('value', '');
    }
  });
  makeButtonObj.on('click', () => {
    const checkedUsers = [];
    // eslint-disable-next-line func-names
    $('input:checkbox:checked[name=allUsers]').each(function () {
      // eslint-disable-next-line no-unused-expressions
      checkedUsers.push(this.value);
    });

    // eslint-disable-next-line no-console
    console.log(checkedUsers);
    const data2Server = {
      roomName: roomNameObj.prop('value'),
      checkedUsers,
    };
    socket.emit('makeRoom', data2Server);
  });
  cancelButtonObj.on('click', () => {
    // 按下創立房間的modal中的取消按鍵取消建立房間
    makeRoomModalObj.modal('hide');
  });

  // socket事件
  socket.on('loginSuccess', (data) => {
    // 登入區塊隱藏，聊天室區塊顯示
    userId = data.userId.toString();
    loginBoxObj.hide('slow');
    chattingBoxObj.show('slow');
    onlineUsersObj.empty();
    onlineUsersObj.append(
      `<li class="list-group-item" name="${userName}">${userName}</li>`,
    );
    // eslint-disable-next-line no-restricted-syntax
    for (const user of data.userGroup) {
      if (user !== userName) {
        onlineUsersObj.append(
          `<li class="list-group-item" name="${user}">${user}</li>`,
        );
      }
    }
    if (data.userName === userName) {
      chatRoomListObj.empty();
      const labby = $('<button type="button" class="list-group-item list-group-item-action active" data-toggle="list" id="labby">陌生大廳</button>');
      labby.on('click', () => {
        chattingRoomHeaderObj.text('陌生大廳');
        chattingContentObj.empty();
        data2Server = {
          userName,
          oldRoomId: roomId,
          roomId: '0',
        };
        roomId = '0';
        socket.emit('getChatContents', data2Server);
      });
      makeRoomButtonObj.on('click', () => { // 按下後彈出modal輸入創建房間的必要資訊
        socket.emit('getUsers');
      });
      chatRoomListObj.append(labby);
      chatRoomListObj.append(makeRoomButtonObj);
      // eslint-disable-next-line no-restricted-syntax
      for (const room of data.userRooms) {
        const idStr = `room${room.roomId}`;
        const button = $(`<button type="button" class="list-group-item list-group-item-action" data-toggle="list" id="${idStr}" value="${room.roomId}">${room.roomName}</button>`);
        // eslint-disable-next-line no-loop-func
        button.on('click', { roomId: button.prop('value'), roomName: room.roomName }, (event) => {
          chattingRoomHeaderObj.text(event.data.roomName);
          chattingContentObj.empty();
          data2Server = {
            userName,
            oldRoomId: roomId,
            roomId: event.data.roomId,
          };
          roomId = event.data.roomId;
          socket.emit('getChatContents', data2Server);
        });
        makeRoomButtonObj.before(button);
      }
      chattingContentObj.empty();
      for (const content of data.userContents) {
        const contentObj = JSON.parse(content);
        insertcontent(
          contentObj.userName,
          contentObj.sendTime,
          contentObj.content,
        );
      }
    }
  });
  socket.on('getError', (data) => {
    // server回傳錯誤
    if (data.err === 'userNameDuplicate') {
      alert('這個名字已經被其他人登入了喔！');
      socket.close();
    }
  });
  socket.on('receiveMessage', (data) => {
    // 接收訊息
    console.log(data);
    if(data.official) {
      insertcontent(
        data.userName,
        data.nowTimestamp,
        data.message,
      );
      systemInformation(data.systemReturn);
      // insertcontent(
      //   '系統公告',
      //   data.nowTimestamp,
      //   data.systemReturn,
      // );      
    }
    else {
      insertcontent(
        data.userName,
        data.nowTimestamp,
        data.message,
      );      
    }
  });
  socket.on('oneLeave', (data) => {
    onlineUsersObj.find($(`li[name='${data.userName}']`)).remove();
  });
  socket.on('getUsersSuccess', (data) => {
    $('#roomName').prop('value', '');
    $('#chooseUserList').empty();
    for (const oneData of data) {
      const idStr = `user${oneData.userId}`; // 用來把user這個字串與使用者得流水編號相接，作為checkbox的id
      chooseUserListObj.append(
        `<div class="form-check">
          <input class="form-check-input" type="checkbox" name="allUsers" id="${idStr}" value="${oneData.userId}">
          <label class="form-check-label" for="${idStr}">${oneData.userName}</label>
        </div>`,
      );
    }
    makeRoomModalObj.modal({ backdrop: 'static' });
  });
  socket.on('makeRoomSuccess', (data) => {
    makeRoomModalObj.modal('hide');
    // eslint-disable-next-line no-console
    console.log(data);
    for (const one of data.checkedUsers) {
      if (one === userId) {
        const idStr = `room${data.roomId}`;
        const button = $(`<button type="button" class="list-group-item list-group-item-action" data-toggle="list" id="${idStr}" value="${data.roomId}">${data.roomName}</button>`);
        // eslint-disable-next-line no-loop-func
        button.on('click', { roomId: button.prop('value'), roomName: data.roomName }, (event) => {
          chattingRoomHeaderObj.text(event.data.roomName);
          chattingContentObj.empty();
          data2Server = {
            userName,
            oldRoomId: roomId,
            roomId: event.data.roomId,
          };
          roomId = event.data.roomId;
          socket.emit('getChatContents', data2Server);
        });
        makeRoomButtonObj.before(button);
      }
    }
    makeRoomButtonObj.removeClass('active');
    $('#labby').addClass('active');
  });
  socket.on('getChatContentsSuccess', (data) => {
    if (data.userName === userName) {
      for (const one of data.res) {
        const one2Json = JSON.parse(one);
        insertcontent(
          one2Json.userName,
          one2Json.sendTime,
          one2Json.content,
        );
      }
    }
  });
  socket.on('reconnecting', () => {
    login();
  });
  socket.on('getInfo', () => {
    $('.toast').toast('show');
  });
});
