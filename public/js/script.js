var database = firebase.database().ref();
var myId = Math.floor(Math.random() * 1000000000);

/** @type{RTCPeerConnection} */
var peerConn = null;
/**
 * @return RTCPeerConnection
 */
function createPeerConnection() {
  function registerPeerConnectionListeners(peerConnection) {
    peerConnection.addEventListener('icegatheringstatechange', () => {
      console.log(`ICE gathering state changed: ${peerConnection.iceGatheringState}`);
    });
  
    peerConnection.addEventListener('connectionstatechange', () => {
      console.log(`Connection state change: ${peerConnection.connectionState}`);
    });
  
    peerConnection.addEventListener('signalingstatechange', () => {
      console.log(`Signaling state change: ${peerConnection.signalingState}`);
    });
  
    peerConnection.addEventListener('iceconnectionstatechange ', () => {
      console.log(`ICE connection state change: ${peerConnection.iceConnectionState}`);
    });
  }
  const configuration = {
    'iceServers': [
      {
        'urls': [
          'stun:stun.services.mozilla.com',
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
        ]
      },
      {
        'urls': 'turn:numb.viagenie.ca',
        credential: "v3r!Rand0",
        username: "sumit@hotmail.com",
      }],
    // iceCandidatePoolSize: 10,
  };  
  peerConn = new RTCPeerConnection(configuration);
  registerPeerConnectionListeners(peerConn);
}

/**
 * @param {RTCPeerConnectionIceEvent} event
 * https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnectionIceEvent
 */
function deliverICEmessage(event) {
  // invoked as result of RTCPeerConnection.setLocalDescription()
  if (event.candidate) {
    // console.log('10. Send newly gatherd ICE Candidate to peer: ', event.candidate)
    sendMessage(myId, JSON.stringify({ 'ice': event.candidate }))
  } else {
    // console.log('End of a generation of candidates');
  }
}

/**
 * @param {RTCSessionDescriptionInit} sdp
 */
async function handleOffer(sdp) {
  console.log('8. Add that Offer to the PeerConnection on your friend’s computer')
  await peerConn.setRemoteDescription(new RTCSessionDescription(sdp))

  // 12. Create an Answer on your friend’s computer
  let answer = await peerConn.createAnswer()
  // 13. Add that Answer to the PeerConnection on your friend’s computer
  await peerConn.setLocalDescription(answer)
  // 14. Send that Answer to your computer
  sendMessage(myId, JSON.stringify({ 'sdp': peerConn.localDescription }));
}

function readMessage(data) {
  var msg = JSON.parse(data.val().message);
  var sender = data.val().sender;
  if (sender == myId) {
    // console.log("rejecting my own message")
    return
  }

  if (msg.ice != undefined) {
    // console.log('Add peer ICE Candidate to candidate pool: ', msg.ice)
    peerConn.addIceCandidate(new RTCIceCandidate(msg.ice));
  } else if (msg.sdp.type == "offer") {
    handleOffer(msg.sdp)
  } else if (msg.sdp.type == "answer") {
    console.log('15. Add that Answer to the PeerConnection on your computer')
    peerConn.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  }
};

function getMessages() {
  database.on('child_added', readMessage);
}

function sendMessage(senderId, data) {
  const msg = database.push({ sender: senderId, message: data });
  msg.remove();
}

async function showMyFace() {
  console.log('1/2: Display local MediaStream video');
  const myVideo = document.getElementById("myVideo");
  const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  myVideo.srcObject = localStream

  console.log('3/4: Create PeerConnection')
  createPeerConnection();

  localStream.getTracks().forEach(track => {
    console.log('adding my track to peer connection: ', track)
    peerConn.addTrack(track, localStream);
  });

  // peerConn.addEventListener('track', getRemoteTrack);
  peerConn.ontrack = getRemoteTrack;

  peerConn.onicecandidate = deliverICEmessage;
  getMessages();
}

/**
 * @param {RTCTrackEvent} event
 */
function getRemoteTrack(event) {
  console.log('Got remote stream:', event.streams[0]);
  var friendsVideo = document.getElementById("friendsVideo");
  friendsVideo.srcObject = event.streams[0];

  // const remoteStream = new MediaStream();
  // friendsVideo.srcObject = remoteStream;
  // event.streams[0].getTracks().forEach(track => {
  //   console.log('Adding track to remoteStream:', track);
  //   remoteStream.addTrack(track);
  // })
}

async function callPeer() {
  console.log('5: Create an Offer on this device');
  let offer = await peerConn.createOffer();
  console.log('6: Add that Offer to the PeerConnection on your computer')
  await peerConn.setLocalDescription(offer)
  console.log('7: Send  Offer to peer')
  sendMessage(myId, JSON.stringify({ 'sdp': peerConn.localDescription }));
}
