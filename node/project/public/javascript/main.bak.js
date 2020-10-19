/**
 * Created by zhouxinyu on 2017/8/6.
 */
$(function(){
    const url = 'http://127.0.0.1';
    let _username = null;
    let _$inputname = $("#name");
    let _$loginButton = $("#loginbutton");
    let _$chatinput = $("#chatinput");
    let _$sendButton = $("#sendButton");
    let _$listGroup = $(".list-group");

    let socket = io.connect(url);
 
    //設置用戶名，當用戶登錄的時候觸發
    let setUsername = function () {
        _username = _$inputname.val().trim();    //得到輸入框中用戶輸入的用戶名
 
        //判斷用戶名是否存在
        if(_username) {
            socket.emit('login',{username: _username});   //如果用戶名存在，就代表可以登錄了，我們就觸發登錄事件，就相當於告訴服務器我們要登錄了
        }
    };

    let beginChat = function (data) {
        /**
         * 1.隱藏登錄框，取消它綁定的事件
         * 2.顯示聊天界面
         */
        $("#loginBox").hide('slow');
        _$inputname.off('keyup');
        _$loginButton.off('click');
 
        /**
         * 顯示聊天界面，並顯示一行文字，歡迎用戶
         * 這里我使用了ES6的語法``中可以使用${}在里面寫的變量可以直接被瀏覽器渲染
         */
        $(`<h2 style="text-align: center">${_username}的聊天室</h2>`).insertBefore($("#content"));
        $(`<strong>歡迎你${_username}!</strong>`).insertAfter($('#myalert button'));
        $("#myalert1").hide();
        $("#myalert2").hide();
        $('#myalert').alert();
        setTimeout(function () {
            $("#myalert").hide('slow');
        },2000);
        $("#chatBox").show('slow');

        /**
        * 用户列表渲染
        * 先添加自己，在从data中找到别人添加进去
        */
        // _$listGroup.empty();
        _$listGroup.append(`<a href="#" name="${_username}" class="list-group-item">${_username}</a>`);
        //添加别人
        for(let _user of data.userGroup) {
            if (_user.username !== _username) {
                _$listGroup.append(`<a href="#" name="${_user.username}" class="list-group-item">${_user.username}</a>`);
            }
        }    
    };

        /**
     *
     * @param flag 为1代表好友上线，-1代表好友下线
     * @param data 存储用户信息
     */
    let comAndLeave = function (flag,data) {
        //上线显示警告框，用户列表添加一个
        if(flag === 1) {
            $('#myalert1 span').html(`<strong>您的好友${data.username}上線了！</strong>`);
            setTimeout(function() {
                $("#myalert1").hide('slow');
            }, 2000);
            $("#myalert1").show();
            //用户列表添加该用户
            _$listGroup.append(`<a href="#" name="${data.username}" class="list-group-item">${data.username}</a>`);
        } else {
            //下线显示警告框，用户列表删除一个
            $('#myalert2 span').html(`<strong>您的好友${data.username}下線了！</strong>`);
            setTimeout(function() {
                $("#myalert2").hide('slow');
            }, 2000);
            $("#myalert2").show();
            //找到该用户并删除
            _$listGroup.find($(`a[name='${data.username}']`)).remove();
        }
    };

    let sendMessage = function () {
        /**
         * 得到輸入框的聊天信息，如果不為空，就觸發sendMessage
         * 將信息和用戶名發送過去
         */
        let _message = _$chatinput.val();
 
        if(_message) {
            socket.emit('sendMessage',{username: _username, message: _message});
        }
    };

    let showMessage = function (data) {
        //先判斷這個消息是不是自己發出的，然後再以不同的樣式顯示
        if(data.username === _username){
            $("#content").append(
                `<div class="receiver">
                    <div>
                        <svg class="icon img-circle" aria-hidden="true" style="font-size: 2em;">
                            <use xlink:href="#icon-yonghu"></use>
                        </svg>
                        <strong style="font-size: 1.5em;">
                            ${data.username} 
                        </strong>
                    </div>
                    <div>
                        <div class="right_triangle"></div>
                        <span>  ${data.message}</span>
                    </div>
                </div>`
            );
        }else {
            $("#content").append(
                `<div class="sender">
                    <div>
                        <svg class="icon img-circle" aria-hidden="true" style="font-size: 2em;">
                            <use xlink:href="#${data.touXiangUrl}"></use>
                        </svg>
                        <strong style="font-size: 1.5em;">${data.username} </strong>
                    </div>
                    <div>
                        <div class="left_triangle"></div>
                        <span>  ${data.message}</span>
                    </div>
                    
                </div>`                
            );
        }
    };

    /*前端事件*/
    _$loginButton.on('click',function (event) {    //監聽按鈕的點擊事件，如果點擊，就說明用戶要登錄，就執行setUsername函數
        setUsername();
    });

    _$inputname.on('keyup',function (event) {     //監聽輸入框的回車事件，這樣用戶回車也能登錄。
        if(event.keyCode === 13) {                //如果用戶輸入的是回車鍵，就執行setUsername函數
            setUsername();
        }
    })

    socket.on('loginSuccess', function(data){
        /**
         * 如果服務器返回的用戶名和剛剛發送的相同的話，就登錄
         * 否則說明有地方出問題了，拒絕登錄
         */
        if(data.username == _username) {
            beginChat(data);
        }else {
            comAndLeave(1,data);
        }
    });

    /*聊天事件*/
    _$chatinput.on('keyup',function (event) {
        if(event.keyCode === 13) {
            sendMessage();
            _$chatinput.val('');
        }
    });

    _$sendButton.on('click', function() {
        sendMessage();
        _$chatinput.val('');
    })

    socket.on('receiveMessage',(data)=>{
        /**
         * 監聽到事件發生，就顯示信息
         */
        showMessage(data);
        $("html").scrollTop( $(document).height()); // 使頁面處於置底狀態
    });

    socket.on('usernameErr',(data)=>{
        alert('用戶名重覆');
    });

    socket.on('oneLeave',(data)=>{
        comAndLeave(-1,data);
    });
});