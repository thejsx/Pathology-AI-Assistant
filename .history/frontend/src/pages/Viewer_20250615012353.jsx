import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer/simplepeer.min.js';
import { openSignallingSocket } from '../webrtc/signalling';
import VideoControls from '../components/VideoControls';
import ViewerLayout from '../components/ViewerLayout';
// import SideBar from '../components/SideBar';

export default function Viewer() {
    const videoRef = useRef(null);
    const peerRef = useRef(null);
    const sockRef = useRef(null);
    const [status, setStatus] = useState('waiting for phone…');

    useEffect(() => {
        sockRef.current = openSignallingSocket(handleSignal);
        const wait = setInterval(() => {
            const me = sockRef.current.peerId();
            if (!me) return;
            clearInterval(wait);
            sockRef.current.send({ type: 'ready', from: me });
        }, 50);

        return () => {
            peerRef.current?.destroy();
            sockRef.current?.send({ type: 'hangup' });
            sockRef.current = null;
        };
    }, []);

    function handleSignal(msg) {
        if (msg.type === 'offer') {
            const meId = sockRef.current.peerId();
            peerRef.current = new Peer({
                initiator: false,
                config: { iceServers: [], iceCandidatePoolSize: 0 },
            });
            peerRef.current.signal(msg.data);

            peerRef.current.on('signal', (data) => {
                sockRef.current.send({
                    type: data.type ?? 'candidate',
                    target: msg.from,
                    from: meId,
                    data,
                });
            });

            peerRef.current.on('stream', (stream) => {
                videoRef.current.srcObject = stream;
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current.play().catch(console.warn);
                };
                setStatus('🟢 receiving video');
            });
        } else if (msg.type === 'candidate') {
            peerRef.current?.signal(msg.data);
        }
    }

    const videoStream = (
        <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className="stream-video"
        />
    );

    // const sidebarContent = SideBar;
    // const bottomBarContent = <div> {/* Add your LLM input/output here */} </div>;

    return (
        <ViewerLayout
            videoStream={videoStream}
            videoControls={<VideoControls streamRef={videoRef} />}
            // sidebarContent={sidebarContent}
            // bottomBarContent={bottomBarContent}
        />
    );
}