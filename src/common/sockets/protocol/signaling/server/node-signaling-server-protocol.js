import {nodeProtocol, nodeFallBackInterval} from '../../../../../consts/const_global.js';

import {NodesList} from '../../../../../node/lists/nodes-list';

import {SignalingServerRoomList} from './signaling-server-room/signaling-server-room-list'
import {SignalingServerRoomConnectionObject} from './signaling-server-room/signaling-server-room-connection-object'

class NodeSignalingServerProtocol {


    constructor(){

        this.started = false;

        console.log("NodeSignalingServerProtocol constructor");
    }

    /*
        Signaling Server Service
     */

    initializeSignalingServerService(socket){

        socket.on("signals/server/register/accept-web-peer-connections", (data) =>{

            if (typeof socket.node.protocol.signaling.server.acceptingConnections === 'undefined') { //check it is for the first time
                socket.node.protocol.signaling.server.acceptingConnections = true;
            }

        });

        this.startConnectingWebPeers();

    }

    startConnectingWebPeers(){

        if (this.started === true) return;
        this.connectWebPeersInterval();
    }

    connectWebPeersInterval(){

        let listAcceptingWebPeerConnections = [] ;

        for (let i=0; i<NodesList.nodes.length; i++)
            if ( (NodesList.nodes[i].socket.node.protocol.signaling.server.acceptingConnections||false) === true )
                listAcceptingWebPeerConnections.push(NodesList.nodes[i].socket);

        //mixing users
        for (let i=0; i<listAcceptingWebPeerConnections.length; i++) {

            let client1 = listAcceptingWebPeerConnections[i];
            for (let j = 0; j < listAcceptingWebPeerConnections.length; j++){
                let client2 = listAcceptingWebPeerConnections[j];

                if ( client1.socket !== client2.socket ) {

                    let previousEstablishedConnection = SignalingServerRoomList.searchSignalingServerRoomConnection(client1, client2);

                    if (previousEstablishedConnection === null){

                        let connection = SignalingServerRoomList.registerSignalingServerRoomConnection(client1, client2, SignalingServerRoomConnectionObject.ConnectionStatus.initiatorSignalGenerating );

                        // Step1, send the request to generate the INITIATOR SIGNAL
                        client1.node.sendRequestWaitOnce("signals/client/generate-initiator-signal", {
                            id: connection.id,
                            address: client2.node.sckAddress.getAddress()
                        }, connection.id ).then ( (initiatorAnswer)=>{

                            if ( (initiatorAnswer.accepted||false) === true) {

                                SignalingServerRoomList.registerSignalingServerRoomConnection(client1, client2, SignalingServerRoomConnectionObject.ConnectionStatus.answerSignalGenerating );

                                // Step 2, send the Initiator Signal to the 2nd Peer to get ANSWER SIGNAL
                                client2.node.sendRequestWaitOnce("signals/client/generate-answer-signal", {
                                    id: connection.id,
                                    initiatorSignal: initiatorAnswer.initiatorSignal,
                                    address: client1.node.sckAddress.getAddress()
                                }, connection.id).then ((answer)=>{

                                    if ( (answer.accepted||false) === true) {

                                        SignalingServerRoomList.registerSignalingServerRoomConnection(client1, client2, SignalingServerRoomConnectionObject.ConnectionStatus.peerConnectionEstablishing );

                                        // Step 3, send the Answer Signal to the 1st Peer (initiator) to establish connection
                                        client1.node.sendRequestWaitOnce("signals/client/join-answer-signal",{
                                            id: connection.id,
                                            initiatorSignal: initiatorAnswer.initiatorSignal,
                                            answerSignal: answer.answerSignal,
                                        }, connection.id).then( (answer)=>{

                                            if ((answer.established||false) === true){

                                                SignalingServerRoomList.registerSignalingServerRoomConnection(client1, client2, SignalingServerRoomConnectionObject.ConnectionStatus.peerConnectionEstablished );
                                                connection.refreshLastTimeConnected();

                                            } else {
                                                //not connected
                                                SignalingServerRoomList.registerSignalingServerRoomConnection(client1, client2, SignalingServerRoomConnectionObject.ConnectionStatus.peerConnectionNotEstablished);
                                            }

                                        });
                                    }

                                });
                            }

                        });

                    }
                }

            }
        }


        setTimeout(()=>{this.connectWebPeersInterval()}, 2000);
    }


}

exports.NodeSignalingServerProtocol = new NodeSignalingServerProtocol();
