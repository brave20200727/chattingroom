$(function () {
  function insertcontent(
    chattingContentObj,
    userName,
    getUserName,
    getTime,
    message
  ) {
    // 加入新的對話語句
    let nowTime = new Date(getTime);
    let formatDateTime = function (date) {
      // 將日期格式轉換為想要的形狀
      let month = date.getMonth() + 1;
      month = month < 10 ? "0" + month : month;
      let day = date.getDate();
      day = day < 10 ? "0" + day : day;
      let hour = date.getHours();
      hour = hour < 10 ? "0" + hour : hour;
      let minute = date.getMinutes();
      minute = minute < 10 ? "0" + minute : minute;
      return month + "/" + day + " " + hour + ":" + minute;
    };
    if (getUserName == userName) {
      chattingContentObj.append(
        `<p class="oneTalkMe"><strong>${getUserName}:</strong><br><span class="timestamp">${formatDateTime(
          nowTime
        )}</span> ${message}</p>`
      );
    } else {
      chattingContentObj.append(
        `<p class="oneTalkOther"><strong>${getUserName}:</strong><br>${message}<span class="timestamp"> ${formatDateTime(
          nowTime
        )}</span></p>`
      );
    }
    $("#chattingRoomBody").scrollTop($("#chattingContent").height()); // 使頁面處於置底狀態
  }
  function login(userName, socket) {
    // 登入判斷
    if (userName == "") {
      alert("請輸入名字");
    } else {
      socket.emit("login", { userName: userName, roomId: roomId });
    }
  }
  function sendMessage(userInputObj) {
    // 訊息送出判斷
    let message = userInputObj.prop("value");
    let nowTimestamp = Date.now();
    if (message != "") {
      socket.emit("sendMessage", {
        userName: userName,
        message: message,
        roomId: roomId,
        nowTimestamp: nowTimestamp,
      });
    } else {
      alert("沒有輸入聊天內容喔！");
    }
  }

  const url = "http://127.0.0.1";
  let userName = null; // 使用者名稱
  let userId = null;  // 使用者ID
  let roomId = '0'; // 聊天室ID，預設為0，也就是大廳
  let userNameObj = $("#userName"); // 使用者輸入匡
  let loginButtonObj = $("#loginButton"); // 登入按鍵
  let loginBoxObj = $("#loginBox"); // 登入的區塊
  let chattingBoxObj = $("#chattingBox"); // 聊天室的區塊
  let sendButtonObj = $("#sendButton"); // 送出按鍵
  let chattingRoomHeaderObj = $("#chattingRoomHeader"); // 聊天室標題
  let chattingContentObj = $("#chattingContent"); // 聊天內容
  let userInputObj = $("#userInput"); // 使用者輸入框
  let onlineUsersObj = $("#onlineUsers"); // 在線使用者
  let makeRoomButtonObj = $("#makeRoomButton"); // 創建聊天室按鈕
  let makeRoomModalObj = $("#makeRoomModal"); // 建立聊天室的modal
  let makeButtonObj = $("#makeButton"); // 創建的按鈕
  let cancelButtonObj = $("#cancelButton"); // 創建取消的按鈕
  let chooseUserListObj = $("#chooseUserList"); // 可加入的使用者列表
  let roomNameObj = $("#roomName"); // 房間名稱的inputbox

  let socket = io.connect(url); // 建立socket連線

  // 登入區塊事件
  loginButtonObj.on("click", function () {
    // 按下登入按鍵做的事情
    userName = userNameObj.prop("value").trim();
    login(userName, socket);
  });
  userNameObj.keypress(function (event) {
    // 使用者名稱直接按enter做的事情
    userName = userNameObj.prop("value").trim();
    if (event.keyCode == 13) {
      login(userName, socket);
    }
  });

  // 聊天室區塊事件
  sendButtonObj.on("click", function () {
    // 按下送出按鍵做的事情
    sendMessage(userInputObj);
    userInputObj.prop("value", "");
  });
  userInputObj.keypress(function (event) {
    // 輸入框直接按enter做的事情
    if (event.keyCode == 13) {
      sendMessage(userInputObj);
      userInputObj.prop("value", "");
    }
  });
  makeRoomButtonObj.on("click", function () {
    // 按下後彈出modal輸入創建房間的必要資訊
    socket.emit('getUsers');
  });
  makeButtonObj.on("click", function () {
    let checkedUsers = new Array();
    $("input:checkbox:checked[name=allUsers]").each(function () {
      checkedUsers.push(this.value);
    });
    let data2Server = {
      roomName: roomNameObj.prop("value"),
      checkedUsers: checkedUsers,
    };
    socket.emit('makeRoom', data2Server);

  });
  cancelButtonObj.on("click", function () {
    // 按下創立房間的modal中的取消按鍵取消建立房間
    makeRoomModalObj.modal("hide");
  });

  // socket事件
  socket.on("loginSuccess", function (data) {
    // 登入區塊隱藏，聊天室區塊顯示
    userId = data.userId;
    loginBoxObj.hide("slow");
    chattingBoxObj.show("slow");
    onlineUsersObj.empty();
    onlineUsersObj.append(
      `<li class="list-group-item" name="${userName}">${userName}</li>`
    );
    for (let user of data.userGroup) {
      if (user.userName != userName) {
        onlineUsersObj.append(
          `<li class="list-group-item" name="${user.userName}">${user.userName}</li>`
        );
      }
    }
    if (data.userName == userName) {
      $("#labby").on('click', function(){
        chattingRoomHeaderObj.text("陌生大廳");
        chattingContentObj.empty();
        data2Server = {
          userName: userName,
          oldRoomId: roomId,
          roomId: '0'
        }
        roomId = '0';
        socket.emit('getChatContents', data2Server);
      });
      for(let room of data.userRooms) {
        let idStr = "room" + room.roomId;
        let button = $(`<button type="button" class="list-group-item list-group-item-action" data-toggle="list" id="${idStr}" value="${room.roomId}">${room.roomName}</button>`);
        button.on('click', {roomId: button.prop('value'), roomName: room.roomName}, function(event){
          chattingRoomHeaderObj.text(event.data.roomName);
          chattingContentObj.empty();
          data2Server = {
            userName: userName,
            oldRoomId: roomId,
            roomId: event.data.roomId
          }
          roomId = event.data.roomId;
          socket.emit('getChatContents', data2Server);
        });
        makeRoomButtonObj.before(button);
      }      
      for (let content of data.userContents) {
        insertcontent(
          chattingContentObj,
          userName,
          content.userName,
          content.sendTime,
          content.content
        );
      }
    }
  });
  socket.on("getError", function (data) {
    // server回傳錯誤
    if (data.err == "userNameDuplicate") {
      alert("這個名字已經被其他人登入了喔！");
    }
  });
  socket.on("receiveMessage", function (data) {
    // 接收訊息
    insertcontent(
      chattingContentObj,
      userName,
      data.userName,
      data.nowTimestamp,
      data.message
    );
  });
  socket.on("oneLeave", function (data) {
    onlineUsersObj.find($(`li[name='${data.userName}']`)).remove();
  });
  socket.on('getUsersSuccess', function(data) {
    $("#roomName").prop('value', '');
    $("#chooseUserList").empty();
    for(let oneData of data) {
      let idStr = "user" + oneData.userId; // 用來把user這個字串與使用者得流水編號相接，作為checkbox的id
      chooseUserListObj.append(
        `<div class="form-check">
          <input class="form-check-input" type="checkbox" name="allUsers" id="${idStr}" value="${oneData.userId}">
          <label class="form-check-label" for="${idStr}">${oneData.userName}</label>
        </div>`
      );
    }
    makeRoomModalObj.modal({ backdrop: "static" });
  });
  socket.on("makeRoomSuccess", function (data) {
    makeRoomModalObj.modal('hide');
    for(let one of data.checkedUsers) {
      if(one == userId) {
        let idStr = "room" + data.roomId;
        makeRoomButtonObj.before(
          `<button type="button" class="list-group-item list-group-item-action" data-toggle="list" id="${idStr}">${data.roomName}</button>`
        );        
      }
    }
    makeRoomButtonObj.removeClass('active');
    $("#labby").addClass('active');
  });
  socket.on('getChatContentsSuccess', function(data) {
    if(data.userName = userName) {
      for(let one of data.results) {
        insertcontent(chattingContentObj, userName, one.userName, one.sendTime, one.content);
      }
    }
  });
});