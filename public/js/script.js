async function init() {
  const localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
  showMyFace(localStream);
  const peerConn = createPeerConnection();
  localStream.getTracks().forEach(track => {
    console.log('adding my track to peer connection: ', track)
    peerConn.addTrack(track, localStream);
  });
  peerConn.onicecandidate = deliverICEmessage;
  peerConn.ontrack = getRemoteTrack;
  getSignals();
}

/**
 * @param {MediaStream} localStream
 */
function showMyFace(localStream) {
  console.log('1/2: Display local MediaStream video');
  /** @type{HTMLVideoElement} */ const myVideo = document.getElementById("myVideo");
  myVideo.srcObject = localStream
}

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
  console.log('3/4: Create PeerConnection')
  peerConn = new RTCPeerConnection(configuration);
  registerPeerConnectionListeners(peerConn);
  return peerConn;
}

const myId = Math.floor(Math.random() * 1000000000);

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
  console.log('8. Add that Offer to the remote side of PeerConnection')
  await peerConn.setRemoteDescription(new RTCSessionDescription(sdp))

  // 12. Create an Answer on your friend’s computer
  let answer = await peerConn.createAnswer()
  // 13. Add that Answer to the PeerConnection on your friend’s computer
  await peerConn.setLocalDescription(answer)
  // 14. Send that Answer to your computer
  sendMessage(myId, JSON.stringify({ 'sdp': peerConn.localDescription }));
}

function handleSignal(data) {
  const sender = data.val().sender;
  if (!sender || (sender == myId)) {
    // console.log("rejecting my own, or senderless message")
    return
  }
  const messageString = data.val().message;
  if (!messageString) {
    console.log("message missing body")
    return
  }
  const msg = JSON.parse(messageString);
  if (msg.ice != undefined) {
    // console.log('18: Add peer ICE Candidate to candidate pool: ', msg.ice)
    peerConn.addIceCandidate(new RTCIceCandidate(msg.ice));
  } else if (msg.sdp.type == "offer") {
    handleOffer(msg.sdp)
  } else if (msg.sdp.type == "answer") {
    console.log('15. Add that Answer to the remote side of PeerConnection')
    peerConn.setRemoteDescription(new RTCSessionDescription(msg.sdp));
  }
}

/**
 * @param {RTCTrackEvent} event
 */
function getRemoteTrack(event) {
  console.log('Got remote stream:', event.streams[0]);
  const peerVideo = document.getElementById("peerVideo");
  peerVideo.srcObject = event.streams[0];
}

async function callPeer() {
  console.log('5: Create an Offer on this device');
  /** @type{RTCSessionDescriptionInit} */ let offer = await peerConn.createOffer();
  console.log('6: Add that Offer to the PeerConnection on your computer: ', offer)
  await peerConn.setLocalDescription(offer)
  console.log('7: Send  Offer to peer through signaling server:', peerConn.localDescription)
  sendMessage(myId, JSON.stringify({ 'sdp': peerConn.localDescription }));
}

/*
 * Signaling functionality is not part of WebRTC, but is required
 * Here implemented using Firestore database asynchronous change notifications
*/

// const firebase = require("firebase");
// Required for side-effects
// require("firebase/firestore");
const db = firebase.firestore();
// var ref = db.collection('signals').
// collection("users").ref();

function getSignals() {
  database.on('child_added', handleSignal);
}
/**
 * @param {number} senderId
 * @param {string} data
 */
function sendMessage(senderId, data) {
  const msg = database.push({ sender: senderId, message: data });
  msg.remove();
}
function w(query) {
  return database.push(JSON.stringify(query))
}

function r(query) {
  return database.push(JSON.stringify(query))
}

function dropcall(){}

function debug(){debugger;}

function query(query){
  // read input
  eval('database.' + query)
}

function q() {
  database.once("value", function(snapshot) {
    console.log(snapshot.val())
    // debugger
  })
}

function showAll(){
firebase.database().ref('/').once('value', function(snapshot) {
  snapshot.forEach(function(childSnapshot) {
    var childKey = childSnapshot.key;
    var childData = childSnapshot.val();
    console.log(childKey, ' : ', childData);
})})
}

// .remove()
// .set()

function count() {
//firebase.database().ref('data/'+id).update({name:"new_name"});
}
