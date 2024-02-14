//#1: Phương thức trong thư viện AgoraRTC để tạo ra một client mới
let client = AgoraRTC.createClient({mode:'rtc', codec:"vp8"})

//#2: Đây là 1 file config để chứa các thông tin cần thiết cho 1 room
let config = {
    appid:'3f2458264dc440059771400af3c4da10',
    token:null,
    uid:null,
    channel:'livestream',
}

//#3 - Setting tracks for when user joins
//Lưu các tracks audio và video của người dùng
let localTracks = {
    audioTrack:null,
    videoTrack:null
}

//#4 - Want to hold state for users audio and video so user can mute and hide
//Lưu trạng thái các tracks audio và video của người dùng
let localTrackState = {
    audioTrackMuted:false,
    videoTrackMuted:false
}

//#5 - Set remote tracks to store other users
//Tạo một set lưu thông tin các tracks của người dùng khác
let remoteTracks = {}

//Nút Join
//Bắt đầu join vào phòng
document.getElementById('join-btn').addEventListener('click', async () => {
    //Lấy tên được nhập gán vào config.uid
    config.uid = document.getElementById('username').value
    //Gọi hàm joinStreams để bắt đầu tham gia trò chuyện
    //await giúp đảm bảo khi joinStreams thực hiện xong thì code mới tiếp tục
    await joinStreams()
    //Sau khi tham gia cuộc trò chuyện, join-wrapper (trang nhập tên người dùng)
    //sẽ được ẩn đi bằng cách chuyển từ 'flex' thành 'none'
    document.getElementById('join-wrapper').style.display = 'none'
    //Sau khi tham gia cuộc trò chuyện, footer (trang chứa các nút Cam...)
    //sẽ đươc hiển thị ra bằng cách chuyển từ 'none' thành 'flex'
    document.getElementById('footer').style.display = 'flex'
})

//Điều khiển nút Mic
document.getElementById('mic-btn').addEventListener('click', async () => {
    //Check if what the state of muted currently is
    //Disable button

    //Nếu như mic mở, muốn tắt
    if(!localTrackState.audioTrackMuted){
        //Mute your audio
        await localTracks.audioTrack.setMuted(true);
        localTrackState.audioTrackMuted = true
        document.getElementById('mic-btn').style.backgroundColor ='rgb(255, 80, 80, 0.7)'
    }else{
        //Nếu như mic tắt, muốn mở
        await localTracks.audioTrack.setMuted(false)
        localTrackState.audioTrackMuted = false
        document.getElementById('mic-btn').style.backgroundColor ='#1f1f1f8e'
    }
})

//Điều khiển nút Camera
document.getElementById('camera-btn').addEventListener('click', async () => {
    //Check if what the state of muted currently is
    //Disable button

    //Nếu như cam mở, muốn tắt
    if(!localTrackState.videoTrackMuted){
        //Turn off your camera
        await localTracks.videoTrack.setMuted(true);
        localTrackState.videoTrackMuted = true
        document.getElementById('camera-btn').style.backgroundColor ='rgb(255, 80, 80, 0.7)'
    }else{
        //Nếu như cam tắt, muốn mở
        await localTracks.videoTrack.setMuted(false)
        localTrackState.videoTrackMuted = false
        document.getElementById('camera-btn').style.backgroundColor ='#1f1f1f8e'
    }
})


//Điều khiển nút Leave
document.getElementById('leave-btn').addEventListener('click', async () => {
    //Loop threw local tracks and stop them so unpublish event gets triggered, then set to undefined
    //Hide footer

    //Duyệt qua một lượt các track (audio và camera) của người dùng
    for (trackName in localTracks){
        let track = localTracks[trackName]
        if(track){ //Kiểm tra track có tồn tại không. Nếu có thì
            track.stop() //Dừng track, ngừng thu và phát dữ liệu
            track.close() //Đóng track
            localTracks[trackName] = null //Giải phóng bộ nhớ
        }
    }

    //Leave the channel
    await client.leave() //Rời khỏi phòng. Khi nào rời xong mới tiếp tục
    document.getElementById('footer').style.display = 'none' //Trang footer từ flex -> none
    document.getElementById('user-streams').innerHTML = '' //Xóa tên ở block video call
    document.getElementById('join-wrapper').style.display = 'block' //Hiển thị lại trang join-wrapper
})

//Quá trình tham gia và rời phòng
//Method will take all my info and set user stream in frame
let joinStreams = async () => {
    //Is this place hear strategicly or can I add to end of method?
    
    //Cho hàm xử lí 1 user tham gia phòng
    client.on("user-published", handleUserJoined);
    //Cho hàm xử lí 1 user rời khỏi phòng
    client.on("user-left", handleUserLeft);

    client.enableAudioVolumeIndicator(); // Triggers the "volume-indicator" callback event every two seconds.
    //Vòng lặp cập nhật icon volume của các user dựa trên mức độ âm thanh
    //Nếu vẫn có âm thanh -> On
    //Không có âm thanh -> Off
    client.on("volume-indicator", function(evt){
        for (let i = 0; evt.length > i; i++){
            let speaker = evt[i].uid
            let volume = evt[i].level
            if(volume > 0){
                document.getElementById(`volume-${speaker}`).src = './assets/volume-on.svg'
            }else{
                document.getElementById(`volume-${speaker}`).src = './assets/volume-off.svg'
            } 
        }
    });

    //#6 - Set and get back tracks for local user
    [config.uid, localTracks.audioTrack, localTracks.videoTrack] = await Promise.all([
        //Hàm này dùng để tham gia kênh truyền với các thông số như ở dưới
        client.join(config.appid, config.channel, config.token || null, config.uid || null),
        //Tạo luồng âm thanh từ mic của người dùng
        AgoraRTC.createMicrophoneAudioTrack(),
        //Tạo luồng video từ camera của người dùng
        AgoraRTC.createCameraVideoTrack()
        //Kết quả của 2 hoạt động trên đều được chờ đợi bằng Promise.all()
        //Kết quả được gán vào các biến trong ngoặc [...]
    ])
    
    //#7 - Create player and add it to player list
    let player = `<div class="video-containers" id="video-wrapper-${config.uid}">
                        <p class="user-uid"><img class="volume-icon" id="volume-${config.uid}" src="./assets/volume-on.svg" /> ${config.uid}</p>
                        <div class="video-player player" id="stream-${config.uid}"></div>
                </div>`

    document.getElementById('user-streams').insertAdjacentHTML('beforeend', player);
    //#8 - Player user stream in div
    localTracks.videoTrack.play(`stream-${config.uid}`)
    

    //#9 Add user to user list of names/ids

    //#10 - Publish my local video tracks to entire channel so everyone can see it
    await client.publish([localTracks.audioTrack, localTracks.videoTrack])

    //Làm sao để có thể vào phòng thì luôn tắt camera, và vẫn tháy được người khác?

}

//Khi user tham gia phòng
let handleUserJoined = async (user, mediaType) => {
    //Console trên trang web sẽ hiển thị thông báo như ở dưới
    console.log('Handle user joined')

    //#11 - Add user to list of remote users
    //Thêm người dùng vào set remoteTracks
    remoteTracks[user.uid] = user

    //#12 Subscribe ro remote users
    //Các luồng video và âm thanh của họ cần được đăng kí để hiển thị
    await client.subscribe(user, mediaType)
   
    //Hiển thị video của người dùng mới
    if (mediaType === 'video'){
        //Kiểm tra đã có video chứa user.uid vừa nhập hay chưa?
        let player = document.getElementById(`video-wrapper-${user.uid}`)
        //Console thông báo player
        console.log('player:', player)
        //Nếu như có rồi thì loại bỏ
        if (player != null){
            player.remove()
        }
        
        //Nếu như chưa có thì tạo ra một video của user
        player = `<div class="video-containers" id="video-wrapper-${user.uid}">
                        <p class="user-uid"><img class="volume-icon" id="volume-${user.uid}" src="./assets/volume-on.svg" /> ${user.uid}</p>
                        <div  class="video-player player" id="stream-${user.uid}"></div>
                </div>`
        document.getElementById('user-streams').insertAdjacentHTML('beforeend', player);
        //Phát video của người dùng mới vào.
        user.videoTrack.play(`stream-${user.uid}`)
    }
    
    //Phát âm thanh của người dùng
    if (mediaType === 'audio') {
        user.audioTrack.play();
    }

    //Làm sao để có thể vào phòng thì luôn tắt camera, và vẫn tháy được người khác?
}

//Khi user rời khỏi phòng
let handleUserLeft = (user) => {
    //console thông báo user rời đi
    console.log('Handle user left!')
    //Remove from remote users and remove users video wrapper
    delete remoteTracks[user.uid]
    document.getElementById(`video-wrapper-${user.uid}`).remove()
}

