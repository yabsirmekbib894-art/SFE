import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { LiveLesson, ClassroomParticipant, LiveChatMessage, RaisedHandRequest, CameraAccessRequest } from '../../types/index.ts';
import { SchoolLogo } from '../layout/SchoolLogo.tsx';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  PhoneOff,
  Hand,
  MessageSquare,
  Users,
  Send,
  HelpCircle,
  CheckCircle,
  Volume2,
  Radio,
  AlertCircle,
  Megaphone,
  Sparkles,
  RefreshCw,
  Maximize2,
  Minimize2,
  Monitor,
  Wifi,
  WifiOff,
  Check,
  X,
  Camera,
  PenTool,
  Bot,
  Layers,
  ChevronDown,
  BookOpen,
} from 'lucide-react';

interface LiveClassroomProps {
  lesson: LiveLesson;
  onLeave: () => void;
}

// Public STUN servers for NAT traversal across residential and institutional school networks
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
    { urls: 'stun:stun.cloudflare.com:3478' },
  ],
  iceCandidatePoolSize: 10,
};

/**
 * Resilient Video Rendering Component.
 * Binds MediaStream to HTMLVideoElement, handles browser autoplay policies,
 * synchronizes muting without audio feedback loops, and shows a placeholder when tracks are off.
 */
interface MediaVideoProps {
  stream: MediaStream | null;
  isMuted?: boolean;
  fit?: 'cover' | 'contain';
  className?: string;
  placeholder?: React.ReactNode;
}

const MediaVideo: React.FC<MediaVideoProps> = ({
  stream,
  isMuted = false,
  fit = 'cover',
  className = '',
  placeholder,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [hasLiveVideoTrack, setHasLiveVideoTrack] = useState<boolean>(() => {
    if (!stream) return false;
    return stream.getVideoTracks().some((t) => t.enabled && t.readyState === 'live');
  });

  const checkTrackStatus = useCallback(() => {
    if (!stream) {
      setHasLiveVideoTrack(false);
      return;
    }
    const vTracks = stream.getVideoTracks();
    const live = vTracks.some((t) => t.enabled && t.readyState === 'live');
    setHasLiveVideoTrack(live);
  }, [stream]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!stream) {
      if (video.srcObject) {
        video.srcObject = null;
      }
      setHasLiveVideoTrack(false);
      return;
    }

    // Attach stream to element
    if (video.srcObject !== stream) {
      console.log('[LiveCamera] Binding stream to HTMLVideoElement, streamId:', stream.id, 'tracks:', stream.getTracks().length);
      video.srcObject = stream;
    }
    video.muted = isMuted;
    video.playsInline = true;

    checkTrackStatus();

    const handleTrackChange = () => checkTrackStatus();
    stream.addEventListener('addtrack', handleTrackChange);
    stream.addEventListener('removetrack', handleTrackChange);

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise
        .then(() => checkTrackStatus())
        .catch((err) => {
          console.warn('[LiveCamera] Autoplay prevented, retrying muted:', err);
          if (!video.muted) {
            video.muted = true;
            video.play().then(() => checkTrackStatus()).catch((e) => console.warn('[LiveCamera] Play error:', e));
          }
        });
    }

    return () => {
      stream.removeEventListener('addtrack', handleTrackChange);
      stream.removeEventListener('removetrack', handleTrackChange);
    };
  }, [stream, isMuted, checkTrackStatus]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  const showVideo = !!stream && hasLiveVideoTrack;

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isMuted}
        className={`w-full h-full ${fit === 'contain' ? 'object-contain bg-black' : 'object-cover'} ${className} ${showVideo ? 'block' : 'hidden'}`}
      />
      {!showVideo && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          {placeholder || null}
        </div>
      )}
    </div>
  );
};

export const LiveClassroom: React.FC<LiveClassroomProps> = ({ lesson, onLeave }) => {
  const { currentUser, updateLiveLessonStatus } = useAuth();
  const isTeacher = currentUser?.role === 'teacher';
  const isDirector = currentUser?.role === 'director' || currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  // Media Streams State
  const [localCamStream, setLocalCamStream] = useState<MediaStream | null>(null);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const [remoteCamStreams, setRemoteCamStreams] = useState<Map<string, MediaStream>>(new Map());
  const [remoteScreenStreams, setRemoteScreenStreams] = useState<Map<string, MediaStream>>(new Map());

  // Hardware states
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(!isTeacher);
  const [isVideoOff, setIsVideoOff] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [isMediaInitializing, setIsMediaInitializing] = useState<boolean>(true);

  // Classroom states
  const [participants, setParticipants] = useState<ClassroomParticipant[]>([]);
  const [chatMessages, setChatMessages] = useState<LiveChatMessage[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHandRequest[]>([]);
  const [cameraRequests, setCameraRequests] = useState<CameraAccessRequest[]>([]);
  const [myCameraStatus, setMyCameraStatus] = useState<'none' | 'requested' | 'approved' | 'rejected'>('none');
  const [announcements, setAnnouncements] = useState<Array<{ id: string; text: string; timestamp: string }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isQuestionInput, setIsQuestionInput] = useState(false);
  const [announcementInput, setAnnouncementInput] = useState('');
  const [showAnnouncementBox, setShowAnnouncementBox] = useState(false);
  const [activeSideTab, setActiveSideTab] = useState<'chat' | 'participants' | 'hands' | 'camera'>('chat');
  const [showWhiteboard, setShowWhiteboard] = useState<boolean>(false);
  const [showAiAssistant, setShowAiAssistant] = useState<boolean>(false);
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);

  const handleAskAi = async () => {
    if (!aiQuestion.trim() || isAiLoading) return;
    const q = aiQuestion.trim();
    setIsAiLoading(true);
    setAiAnswer(null);
    try {
      const res = await fetch('/api/ask-classroom-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          subject: lesson.subject,
          grade: lesson.grade,
          lessonTitle: lesson.title,
        }),
      });
      const data = await res.json();
      if (data.success && data.answer) {
        setAiAnswer(data.answer);
      } else {
        setAiAnswer(data.error || 'AI assistant is currently unavailable. Please try again.');
      }
    } catch {
      setAiAnswer('Connection error reaching AI assistant.');
    } finally {
      setIsAiLoading(false);
    }
  };

  const [speakingNotification, setSpeakingNotification] = useState<string | null>(null);
  const [canSpeak, setCanSpeak] = useState<boolean>(isTeacher || isDirector);
  const [hasRaisedHand, setHasRaisedHand] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'reconnecting' | 'disconnected'>('connecting');
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // DOM Refs
  const classroomContainerRef = useRef<HTMLDivElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // Synchronous State Refs to prevent stale closures and avoid re-triggering connection teardown on state changes
  const localCamStreamRef = useRef<MediaStream | null>(null);
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const isVideoOffRef = useRef<boolean>(false);
  const isAudioMutedRef = useRef<boolean>(!isTeacher);
  const isScreenSharingRef = useRef<boolean>(false);
  const participantsRef = useRef<ClassroomParticipant[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const isExplicitlyLeavingRef = useRef<boolean>(false);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Sync ref values
  useEffect(() => {
    isVideoOffRef.current = isVideoOff;
  }, [isVideoOff]);

  useEffect(() => {
    isAudioMutedRef.current = isAudioMuted;
  }, [isAudioMuted]);

  useEffect(() => {
    isScreenSharingRef.current = isScreenSharing;
  }, [isScreenSharing]);

  useEffect(() => {
    participantsRef.current = participants;
  }, [participants]);

  // Audio chime generator for raised hand
  const playHandRaiseChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  /**
   * Helper: Attach active local tracks (Camera Audio, Camera Video, Screen Share Video)
   * to a given RTCPeerConnection without colliding or overwriting.
   */
  const attachTracksToPeerConnection = useCallback((pc: RTCPeerConnection) => {
    const currentSenders = pc.getSenders();

    // 1. Attach Local Camera (Audio & Video)
    const camStream = localCamStreamRef.current;
    if (camStream) {
      camStream.getTracks().forEach((track) => {
        const existingSender = currentSenders.find(
          (s) => s.track?.id === track.id || (s.track?.kind === track.kind && s.track?.id !== localScreenStreamRef.current?.getVideoTracks()[0]?.id)
        );

        if (existingSender) {
          existingSender.replaceTrack(track).catch((err) => {
            console.warn(`[WebRTC] replaceTrack error for ${track.kind}:`, err);
          });
        } else {
          try {
            console.log(`[WebRTC] Adding ${track.kind} track to peer connection`);
            pc.addTrack(track, camStream);
          } catch (err) {
            console.warn(`[WebRTC] addTrack error for ${track.kind}:`, err);
          }
        }
      });
    }

    // 2. Attach Screen Share Track if active
    const screenStream = localScreenStreamRef.current;
    if (screenStream && isScreenSharingRef.current) {
      const screenTrack = screenStream.getVideoTracks()[0];
      if (screenTrack && screenTrack.readyState === 'live') {
        const existingScreenSender = currentSenders.find((s) => s.track === screenTrack || s.track?.id === screenTrack.id);
        if (!existingScreenSender) {
          try {
            console.log('[WebRTC] Adding screen sharing track to peer connection');
            pc.addTrack(screenTrack, screenStream);
          } catch (err) {
            console.warn('[WebRTC] addTrack error for screen share:', err);
          }
        }
      }
    }
  }, []);

  /**
   * Drain buffered ICE candidates after setRemoteDescription
   */
  const drainIceCandidateQueue = useCallback(async (remoteUserId: string, pc: RTCPeerConnection) => {
    const queue = iceCandidateQueue.current.get(remoteUserId) || [];
    if (queue.length > 0) {
      console.log(`[WebRTC] Draining ${queue.length} queued ICE candidate(s) for ${remoteUserId}`);
      for (const candidate of queue) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(`[WebRTC] Error adding buffered ICE candidate for ${remoteUserId}:`, err);
        }
      }
      iceCandidateQueue.current.delete(remoteUserId);
    }
  }, []);

  /**
   * Create and configure an RTCPeerConnection for a remote participant.
   */
  const createPeerConnection = useCallback(
    async (remoteUserId: string, isInitiator: boolean) => {
      if (peerConnections.current.has(remoteUserId)) {
        return peerConnections.current.get(remoteUserId)!;
      }

      console.log(`[WebRTC] Creating RTCPeerConnection with user ${remoteUserId} (initiator: ${isInitiator})`);
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnections.current.set(remoteUserId, pc);

      // Attach any currently active local tracks
      attachTracksToPeerConnection(pc);

      // ICE Candidate gathering handler
      pc.onicecandidate = (event) => {
        if (event.candidate && wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'webrtc_signal',
              targetUserId: remoteUserId,
              fromUserId: currentUser?.id,
              signal: {
                type: 'candidate',
                candidate: event.candidate,
              },
            })
          );
        }
      };

      // Handle incoming remote media tracks (Camera video/audio vs Screen sharing)
      pc.ontrack = (event) => {
        console.log(`[WebRTC] Received remote track from ${remoteUserId}: kind=${event.track.kind}, id=${event.track.id}`);
        const stream = event.streams[0] || new MediaStream([event.track]);

        // Determine if this track is from screen sharing or camera
        const remoteParticipant = participantsRef.current.find((p) => p.userId === remoteUserId);
        const isScreenShareTrack =
          event.track.id === remoteParticipant?.screenTrackId ||
          stream.id === remoteParticipant?.screenStreamId ||
          (event.track.kind === 'video' && remoteParticipant?.isScreenSharing && remoteCamStreams.has(remoteUserId));

        if (isScreenShareTrack) {
          console.log(`[WebRTC] Detected screen share stream from ${remoteUserId}`);
          setRemoteScreenStreams((prev) => {
            const next = new Map(prev);
            next.set(remoteUserId, stream);
            return next;
          });
        } else {
          // Camera / Mic stream
          setRemoteCamStreams((prev) => {
            const next = new Map(prev);
            const existing = next.get(remoteUserId);
            if (existing && existing !== stream) {
              if (!existing.getTracks().some((t) => t.id === event.track.id)) {
                existing.addTrack(event.track);
              }
              next.set(remoteUserId, new MediaStream(existing.getTracks()));
            } else {
              next.set(remoteUserId, stream);
            }
            return next;
          });
        }

        // Listen for track ending
        event.track.onended = () => {
          if (isScreenShareTrack) {
            setRemoteScreenStreams((prev) => {
              const next = new Map(prev);
              next.delete(remoteUserId);
              return next;
            });
          }
        };
      };

      // Connection lifecycle logging & automatic recovery
      pc.onconnectionstatechange = () => {
        console.log(`[WebRTC] Connection state with ${remoteUserId}: ${pc.connectionState}`);
        if (pc.connectionState === 'failed') {
          console.warn(`[WebRTC] Peer connection failed with ${remoteUserId}. Attempting ICE restart.`);
          try {
            pc.restartIce();
            pc.createOffer().then((offer) => {
              pc.setLocalDescription(offer);
              if (wsRef.current?.readyState === WebSocket.OPEN) {
                wsRef.current.send(
                  JSON.stringify({
                    type: 'webrtc_signal',
                    targetUserId: remoteUserId,
                    fromUserId: currentUser?.id,
                    signal: offer,
                  })
                );
              }
            });
          } catch (e) {
            console.warn('[WebRTC] ICE restart error:', e);
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log(`[WebRTC] ICE state with ${remoteUserId}: ${pc.iceConnectionState}`);
      };

      // If initiator, create and send initial offer
      if (isInitiator) {
        try {
          const offer = await pc.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true,
          });
          await pc.setLocalDescription(offer);

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log(`[WebRTC] Sending initial SDP offer to ${remoteUserId}`);
            wsRef.current.send(
              JSON.stringify({
                type: 'webrtc_signal',
                targetUserId: remoteUserId,
                fromUserId: currentUser?.id,
                signal: offer,
              })
            );
          }
        } catch (err) {
          console.error(`[WebRTC] Failed to create or send offer to ${remoteUserId}:`, err);
        }
      }

      return pc;
    },
    [attachTracksToPeerConnection, currentUser?.id, remoteCamStreams]
  );

  /**
   * Handle incoming WebRTC signals with Perfect Negotiation rollback
   */
  const handleIncomingSignal = useCallback(
    async (fromUserId: string, signal: any) => {
      try {
        let pc = peerConnections.current.get(fromUserId);
        if (!pc) {
          console.log(`[WebRTC] Creating responding peer connection for incoming signal from ${fromUserId}`);
          pc = await createPeerConnection(fromUserId, false);
        }

        if (signal.type === 'offer') {
          console.log(`[WebRTC] Handling SDP offer from ${fromUserId}`);
          // Perfect negotiation: polite peer rolls back if offer collision occurs
          const isPolite = (currentUser?.id || '') < fromUserId;
          const offerCollision = pc.signalingState !== 'stable';

          if (offerCollision) {
            if (!isPolite) {
              console.log(`[WebRTC] Impolite peer ignoring colliding offer from ${fromUserId}`);
              return;
            }
            console.log(`[WebRTC] Polite peer rolling back local offer to accept offer from ${fromUserId}`);
            await pc.setLocalDescription({ type: 'rollback' });
          }

          // Ensure local tracks are attached before creating answer
          attachTracksToPeerConnection(pc);

          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          await drainIceCandidateQueue(fromUserId, pc);

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          if (wsRef.current?.readyState === WebSocket.OPEN) {
            console.log(`[WebRTC] Sending SDP answer to ${fromUserId}`);
            wsRef.current.send(
              JSON.stringify({
                type: 'webrtc_signal',
                targetUserId: fromUserId,
                fromUserId: currentUser?.id,
                signal: answer,
              })
            );
          }
        } else if (signal.type === 'answer') {
          console.log(`[WebRTC] Handling SDP answer from ${fromUserId}`);
          await pc.setRemoteDescription(new RTCSessionDescription(signal));
          await drainIceCandidateQueue(fromUserId, pc);
        } else if (signal.type === 'candidate' && signal.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
            } catch (err) {
              console.warn(`[WebRTC] Error adding ICE candidate:`, err);
            }
          } else {
            console.log(`[WebRTC] Queuing ICE candidate for ${fromUserId}`);
            const queue = iceCandidateQueue.current.get(fromUserId) || [];
            queue.push(signal.candidate);
            iceCandidateQueue.current.set(fromUserId, queue);
          }
        }
      } catch (err) {
        console.error(`[WebRTC] Signal handling error from ${fromUserId}:`, err);
      }
    },
    [attachTracksToPeerConnection, createPeerConnection, currentUser?.id, drainIceCandidateQueue]
  );

  /**
   * Close peer connection for leaving user
   */
  const closePeerConnection = useCallback((userId: string) => {
    console.log(`[WebRTC] Closing peer connection for user ${userId}`);
    const pc = peerConnections.current.get(userId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(userId);
    }
    iceCandidateQueue.current.delete(userId);
    setRemoteCamStreams((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
    setRemoteScreenStreams((prev) => {
      const next = new Map(prev);
      next.delete(userId);
      return next;
    });
  }, []);

  /**
   * Keep stable references to signal handlers to prevent WebSocket re-creation
   */
  const createPeerConnectionRef = useRef(createPeerConnection);
  createPeerConnectionRef.current = createPeerConnection;

  const handleIncomingSignalRef = useRef(handleIncomingSignal);
  handleIncomingSignalRef.current = handleIncomingSignal;

  const closePeerConnectionRef = useRef(closePeerConnection);
  closePeerConnectionRef.current = closePeerConnection;

  /**
   * 1. Initialize Local Media (Camera & Microphone)
   */
  const initMedia = useCallback(async () => {
    setIsMediaInitializing(true);
    setPermissionError(null);

    let stream: MediaStream | null = null;

    try {
      // First attempt: High-definition video + audio
      stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: true,
      });
    } catch (err1) {
      console.warn('[WebRTC Media] Video+audio request failed, attempting video-only:', err1);
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      } catch (err2) {
        console.warn('[WebRTC Media] Video-only request failed, attempting audio-only:', err2);
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        } catch (err3: any) {
          console.warn('[WebRTC Media] Both camera and microphone unavailable:', err3);
          setPermissionError(
            'Camera and microphone permissions were restricted. You can still attend the live lesson, view teacher video and screen presentations, and participate in classroom Q&A.'
          );
        }
      }
    }

    if (stream) {
      stream.getAudioTracks().forEach((track) => {
        track.enabled = !isAudioMutedRef.current;
      });
      stream.getVideoTracks().forEach((track) => {
        track.enabled = !isVideoOffRef.current;
      });

      localCamStreamRef.current = stream;
      setLocalCamStream(stream);

      // Attach tracks to all existing peer connections
      peerConnections.current.forEach((pc) => {
        attachTracksToPeerConnection(pc);
      });
    }

    setIsMediaInitializing(false);
    return stream;
  }, [attachTracksToPeerConnection]);

  // Initial media acquisition
  useEffect(() => {
    let activeStream: MediaStream | null = null;
    initMedia().then((s) => {
      if (s) activeStream = s;
    });

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((t) => t.stop());
      }
      if (localCamStreamRef.current) {
        localCamStreamRef.current.getTracks().forEach((t) => t.stop());
        localCamStreamRef.current = null;
      }
      if (localScreenStreamRef.current) {
        localScreenStreamRef.current.getTracks().forEach((t) => t.stop());
        localScreenStreamRef.current = null;
      }
    };
  }, [initMedia]);

  /**
   * Acquire camera feed for approved student and broadcast tracks to peers
   */
  const enableStudentCameraFeed = useCallback(async () => {
    try {
      console.log('[LiveCamera] Approved student requesting camera video stream...');
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 } },
        audio: false,
      });
      const videoTrack = videoStream.getVideoTracks()[0];
      if (!videoTrack) return;

      videoTrack.enabled = true;
      setIsVideoOff(false);
      isVideoOffRef.current = false;

      let combinedStream = localCamStreamRef.current;
      if (!combinedStream) {
        combinedStream = new MediaStream([videoTrack]);
      } else {
        combinedStream.getVideoTracks().forEach((t) => combinedStream?.removeTrack(t));
        combinedStream.addTrack(videoTrack);
      }
      localCamStreamRef.current = combinedStream;
      setLocalCamStream(new MediaStream(combinedStream.getTracks()));

      // Attach new video track to all active peer connections
      peerConnections.current.forEach((pc) => {
        const senders = pc.getSenders();
        const existingVideoSender = senders.find(
          (s) => s.track?.kind === 'video' || (s.track && s.track.id === videoTrack.id)
        );
        if (existingVideoSender) {
          existingVideoSender.replaceTrack(videoTrack).catch((e) => console.warn('[LiveCamera] replaceTrack error:', e));
        } else {
          try {
            console.log('[LiveCamera] Adding student video track to peer connection');
            pc.addTrack(videoTrack, combinedStream!);
          } catch (e) {
            console.warn('[LiveCamera] addTrack error:', e);
          }
        }
      });

      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'media_state',
            isVideoOff: false,
            cameraStreamId: combinedStream.id,
            cameraTrackId: videoTrack.id,
          })
        );
      }
    } catch (err) {
      console.error('[LiveCamera] Error accessing student camera:', err);
      alert('Could not access camera device. Please check browser permissions.');
    }
  }, []);

  const enableStudentCameraFeedRef = useRef(enableStudentCameraFeed);
  enableStudentCameraFeedRef.current = enableStudentCameraFeed;

  const requestCameraPermission = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[LiveCamera] Sending student camera request to teacher...');
      wsRef.current.send(
        JSON.stringify({
          type: 'request_camera',
          studentId: currentUser?.id,
          studentName: currentUser?.name,
          grade: currentUser?.grade,
          section: currentUser?.section,
        })
      );
      setMyCameraStatus('requested');
    }
  }, [currentUser]);

  const approveStudentCamera = useCallback((studentId: string) => {
    console.log('[LiveCamera] Teacher approved camera for student:', studentId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'approve_camera',
          studentId,
        })
      );
    }
    setCameraRequests((prev) => prev.filter((r) => r.studentId !== studentId));
  }, []);

  const rejectStudentCamera = useCallback((studentId: string) => {
    console.log('[LiveCamera] Teacher rejected camera for student:', studentId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'reject_camera',
          studentId,
        })
      );
    }
    setCameraRequests((prev) => prev.filter((r) => r.studentId !== studentId));
  }, []);

  const revokeStudentCamera = useCallback((studentId: string) => {
    console.log('[LiveCamera] Teacher revoking camera for student:', studentId);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'revoke_camera',
          studentId,
        })
      );
    }
  }, []);

  /**
   * 2. WebSocket Connection & Lifecycle Management
   * Stable: Runs once per lesson/user and automatically reconnects on network interruptions.
   */
  useEffect(() => {
    if (!currentUser) return;

    let socket: WebSocket | null = null;
    let isTerminated = false;

    const connectWebSocket = () => {
      if (isTerminated || isExplicitlyLeavingRef.current) return;

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live`;
      console.log('[Signaling] Establishing connection to live classroom:', wsUrl);

      socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('[Signaling] WebSocket connected for lesson room:', lesson.id);
        setConnectionStatus('connected');
        setReconnectAttempts(0);

        // Join room with current media states
        socket?.send(
          JSON.stringify({
            type: 'join_room',
            lessonId: lesson.id,
            user: {
              id: currentUser.id,
              name: currentUser.name,
              role: currentUser.role,
              grade: currentUser.grade,
              section: currentUser.section,
            },
            isAudioMuted: isAudioMutedRef.current,
            isVideoOff: isVideoOffRef.current,
            isScreenSharing: isScreenSharingRef.current,
            screenStreamId: localScreenStreamRef.current?.id,
            cameraStreamId: localCamStreamRef.current?.id,
            cameraTrackId: localCamStreamRef.current?.getVideoTracks()[0]?.id,
            screenTrackId: localScreenStreamRef.current?.getVideoTracks()[0]?.id,
          })
        );
      };

      socket.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data);
          const { type } = msg;

          switch (type) {
            case 'room_state': {
              console.log('[Signaling] Received room state with participants:', msg.participants?.length, 'cameraRequests:', msg.cameraRequests?.length);
              setParticipants(msg.participants || []);
              setChatMessages(msg.chatMessages || []);
              setRaisedHands(msg.raisedHands || []);
              setAnnouncements(msg.announcements || []);
              setCameraRequests(msg.cameraRequests || []);

              // Check if teacher in room state is sharing their screen
              const teacherInRoom = (msg.participants || []).find(
                (p: ClassroomParticipant) => p.role === 'teacher' || p.userId === lesson.teacherId
              );
              if (teacherInRoom && !isTeacher) {
                // If teacher is sharing screen, prepare to receive screen share
                console.log('[Signaling] Teacher screen sharing state:', teacherInRoom.isScreenSharing);
              }

              // Establish peer connections with all existing participants
              // Teacher always initiates; between students, higher userId initiates to avoid collision
              for (const p of msg.participants || []) {
                if (p.userId !== currentUser.id) {
                  const shouldInitiate = isTeacher || (!isTeacher && p.role !== 'teacher' && currentUser.id > p.userId);
                  createPeerConnectionRef.current(p.userId, shouldInitiate);
                }
              }
              break;
            }

            case 'camera_requested': {
              console.log('[LiveCamera] Student camera access requested:', msg.request);
              setCameraRequests((prev) => [...prev.filter((r) => r.studentId !== msg.request.studentId), msg.request]);
              if (isTeacher) {
                setSpeakingNotification(`Camera permission requested by ${msg.request.studentName}`);
                setTimeout(() => setSpeakingNotification(null), 6000);
              }
              break;
            }

            case 'camera_approved': {
              console.log('[LiveCamera] Student camera approved by teacher:', msg.studentId);
              setCameraRequests((prev) => prev.filter((r) => r.studentId !== msg.studentId));
              setParticipants((prev) =>
                prev.map((p) => (p.userId === msg.studentId ? { ...p, cameraPermission: 'approved' } : p))
              );
              if (msg.studentId === currentUser.id) {
                setMyCameraStatus('approved');
                setSpeakingNotification('Instructor approved your camera! Streaming live video...');
                setTimeout(() => setSpeakingNotification(null), 6000);
                enableStudentCameraFeed();
              }
              break;
            }

            case 'camera_rejected': {
              console.log('[LiveCamera] Student camera request declined:', msg.studentId);
              setCameraRequests((prev) => prev.filter((r) => r.studentId !== msg.studentId));
              setParticipants((prev) =>
                prev.map((p) => (p.userId === msg.studentId ? { ...p, cameraPermission: 'rejected' } : p))
              );
              if (msg.studentId === currentUser.id) {
                setMyCameraStatus('rejected');
                alert('Your camera access request was declined by the instructor.');
              }
              break;
            }

            case 'camera_revoked': {
              console.log('[LiveCamera] Student camera access revoked by teacher:', msg.studentId);
              setParticipants((prev) =>
                prev.map((p) => (p.userId === msg.studentId ? { ...p, cameraPermission: 'none', isVideoOff: true } : p))
              );
              if (msg.studentId === currentUser.id) {
                setMyCameraStatus('none');
                setIsVideoOff(true);
                isVideoOffRef.current = true;
                if (localCamStreamRef.current) {
                  localCamStreamRef.current.getVideoTracks().forEach((t) => {
                    t.stop();
                    localCamStreamRef.current?.removeTrack(t);
                  });
                }
                peerConnections.current.forEach((pc) => {
                  pc.getSenders().forEach((s) => {
                    if (s.track?.kind === 'video') {
                      s.replaceTrack(null).catch(() => {});
                    }
                  });
                });
                alert('Instructor has disabled camera broadcasting for your seat.');
              }
            }

            case 'user_joined': {
              console.log('[Signaling] Participant joined:', msg.participant.name, msg.participant.role);
              setParticipants((prev) => {
                const exists = prev.some((p) => p.userId === msg.participant.userId);
                if (exists) return prev.map((p) => (p.userId === msg.participant.userId ? msg.participant : p));
                return [...prev, msg.participant];
              });

              if (msg.participant.userId !== currentUser.id) {
                const shouldInitiate = isTeacher || (!isTeacher && msg.participant.role !== 'teacher' && currentUser.id > msg.participant.userId);
                createPeerConnectionRef.current(msg.participant.userId, shouldInitiate);
              }
              break;
            }

            case 'participant_updated': {
              setParticipants((prev) =>
                prev.map((p) => (p.userId === msg.participant.userId ? msg.participant : p))
              );
              break;
            }

            case 'webrtc_signal': {
              const { fromUserId, signal } = msg;
              handleIncomingSignalRef.current(fromUserId, signal);
              break;
            }

            case 'hand_raised': {
              setRaisedHands((prev) => [...prev.filter((h) => h.id !== msg.request.id), msg.request]);
              setParticipants((prev) =>
                prev.map((p) => (p.userId === msg.request.studentId ? { ...p, hasHandRaised: true } : p))
              );
              if (isTeacher) {
                playHandRaiseChime();
              }
              break;
            }

            case 'speaking_allowed': {
              if (msg.studentId === currentUser.id) {
                setCanSpeak(true);
                setHasRaisedHand(false);
                setSpeakingNotification(
                  'Permission to speak granted by instructor! You can now unmute your microphone to ask your question.'
                );
                setTimeout(() => setSpeakingNotification(null), 8000);
              }
              setRaisedHands((prev) => prev.filter((h) => h.studentId !== msg.studentId));
              setParticipants((prev) =>
                prev.map((p) =>
                  p.userId === msg.studentId ? { ...p, canSpeak: true, hasHandRaised: false } : p
                )
              );
              break;
            }

            case 'hand_lowered': {
              if (msg.studentId === currentUser.id) {
                setHasRaisedHand(false);
              }
              setRaisedHands((prev) => prev.filter((h) => h.studentId !== msg.studentId));
              setParticipants((prev) =>
                prev.map((p) => (p.userId === msg.studentId ? { ...p, hasHandRaised: false } : p))
              );
              break;
            }

            case 'new_chat_message': {
              setChatMessages((prev) => [...prev, msg.message]);
              setTimeout(() => {
                chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              }, 100);
              break;
            }

            case 'question_answered': {
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === msg.messageId ? { ...m, isAnswered: true, answeredAt: new Date().toISOString() } : m
                )
              );
              break;
            }

            case 'new_announcement': {
              setAnnouncements((prev) => [msg.announcement, ...prev]);
              break;
            }

            case 'lesson_ended': {
              alert('The live lesson has ended by the faculty instructor.');
              isExplicitlyLeavingRef.current = true;
              onLeave();
              break;
            }

            case 'user_left': {
              setParticipants((prev) => prev.filter((p) => p.userId !== msg.userId));
              setRaisedHands((prev) => prev.filter((h) => h.studentId !== msg.userId));
              closePeerConnectionRef.current(msg.userId);
              break;
            }
          }
        } catch (err) {
          console.error('[Signaling] Processing error:', err);
        }
      };

      socket.onclose = () => {
        if (isTerminated || isExplicitlyLeavingRef.current) return;

        console.warn('[Signaling] WebSocket closed unexpectedly. Initiating automatic recovery...');
        setConnectionStatus('reconnecting');

        // Automatic exponential backoff reconnection
        const delay = Math.min(1000 * Math.pow(1.5, reconnectAttempts), 8000);
        setReconnectAttempts((prev) => prev + 1);

        reconnectTimeoutRef.current = setTimeout(() => {
          connectWebSocket();
        }, delay);
      };

      socket.onerror = (err) => {
        console.warn('[Signaling] Socket error:', err);
      };
    };

    connectWebSocket();

    return () => {
      isTerminated = true;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
      peerConnections.current.forEach((pc) => pc.close());
      peerConnections.current.clear();
      iceCandidateQueue.current.clear();
    };
  }, [lesson.id, currentUser?.id, isTeacher, lesson.teacherId, onLeave, reconnectAttempts]);

  /**
   * Toggle Audio (Microphone)
   */
  const toggleAudio = async () => {
    if (!canSpeak && !isTeacher && !isDirector) {
      alert('You need teacher permission to unmute. Please click "Raise Hand" to request permission to speak.');
      return;
    }

    const nextState = !isAudioMuted;
    setIsAudioMuted(nextState);
    isAudioMutedRef.current = nextState;

    if (localCamStreamRef.current) {
      localCamStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !nextState;
      });
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media_state',
          isAudioMuted: nextState,
        })
      );
    }
  };

  /**
   * Toggle Video (Camera)
   */
  const toggleVideo = async () => {
    const nextState = !isVideoOff;
    setIsVideoOff(nextState);
    isVideoOffRef.current = nextState;

    // If local stream does not exist, reacquire camera
    if (!localCamStreamRef.current || localCamStreamRef.current.getVideoTracks().length === 0) {
      if (!nextState) {
        await initMedia();
      }
    } else {
      localCamStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !nextState;
      });

      // Update peer connections
      const activeVideoTrack = !nextState ? localCamStreamRef.current.getVideoTracks()[0] : null;
      peerConnections.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video' && s.track !== localScreenStreamRef.current?.getVideoTracks()[0]);
        if (sender && activeVideoTrack) {
          sender.replaceTrack(activeVideoTrack).catch((e) => console.warn('replaceTrack error:', e));
        }
      });
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media_state',
          isVideoOff: nextState,
          cameraStreamId: localCamStreamRef.current?.id,
          cameraTrackId: localCamStreamRef.current?.getVideoTracks()[0]?.id,
        })
      );
    }
  };

  /**
   * Stop Screen Sharing and restore camera focus across all peers
   */
  const handleStopScreenShare = useCallback(async () => {
    console.log('[ScreenShare] Stopping screen presentation...');
    if (localScreenStreamRef.current) {
      const screenTrack = localScreenStreamRef.current.getVideoTracks()[0];
      if (screenTrack) {
        screenTrack.stop();
      }
      localScreenStreamRef.current = null;
    }

    setLocalScreenStream(null);
    setIsScreenSharing(false);
    isScreenSharingRef.current = false;

    // Remove screen share track from all peer connections and renegotiate
    for (const [remoteId, pc] of peerConnections.current.entries()) {
      const senders = pc.getSenders();
      const screenSender = senders.find(
        (s) => s.track === null || (s.track && s.track !== localCamStreamRef.current?.getVideoTracks()[0] && s.track.kind === 'video')
      );

      if (screenSender) {
        try {
          pc.removeTrack(screenSender);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(
              JSON.stringify({
                type: 'webrtc_signal',
                targetUserId: remoteId,
                fromUserId: currentUser?.id,
                signal: offer,
              })
            );
          }
        } catch (e) {
          console.warn('[ScreenShare] Renegotiation after stop error:', e);
        }
      }
    }

    // Broadcast updated state to all students
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'media_state',
          isScreenSharing: false,
          screenTrackId: undefined,
          screenStreamId: undefined,
        })
      );
    }
  }, [currentUser?.id]);

  /**
   * Toggle Screen Sharing (Teacher Only)
   */
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      await handleStopScreenShare();
    } else {
      try {
        console.log('[ScreenShare] Requesting display media...');
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' } as any,
          audio: true,
        });

        const screenTrack = stream.getVideoTracks()[0];
        if (!screenTrack) return;

        // Native browser "Stop sharing" event listener
        screenTrack.onended = () => {
          handleStopScreenShare();
        };

        localScreenStreamRef.current = stream;
        setLocalScreenStream(stream);
        setIsScreenSharing(true);
        isScreenSharingRef.current = true;

        // Add screen track to every active peer connection and renegotiate
        for (const [remoteId, pc] of peerConnections.current.entries()) {
          try {
            console.log(`[ScreenShare] Adding screen track for peer ${remoteId}`);
            pc.addTrack(screenTrack, stream);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            if (wsRef.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'webrtc_signal',
                  targetUserId: remoteId,
                  fromUserId: currentUser?.id,
                  signal: offer,
                })
              );
            }
          } catch (err) {
            console.warn(`[ScreenShare] Error adding screen track to peer ${remoteId}:`, err);
          }
        }

        // Broadcast to all participants that screen sharing is active
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(
            JSON.stringify({
              type: 'media_state',
              isScreenSharing: true,
              screenStreamId: stream.id,
              screenTrackId: screenTrack.id,
            })
          );
        }
      } catch (err) {
        console.warn('[ScreenShare] Permission cancelled or failed:', err);
      }
    }
  };

  /**
   * Student: Raise / Lower Hand
   */
  const handleRaiseHand = () => {
    if (hasRaisedHand) {
      setHasRaisedHand(false);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'lower_hand',
            studentId: currentUser?.id,
          })
        );
      }
    } else {
      setHasRaisedHand(true);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'raise_hand',
          })
        );
      }
    }
  };

  /**
   * Teacher: Allow Student to Speak
   */
  const handleAllowStudentToSpeak = (studentId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'allow_speak',
          studentId,
        })
      );
    }
  };

  /**
   * Teacher: Lower Student Hand
   */
  const handleLowerStudentHand = (studentId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'lower_hand',
          studentId,
        })
      );
    }
  };

  /**
   * Send Chat Message or Question
   */
  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'send_chat',
          text: chatInput.trim(),
          isQuestion: isQuestionInput,
        })
      );
      setChatInput('');
      setIsQuestionInput(false);
    }
  };

  /**
   * Teacher: Mark Question as Answered
   */
  const handleMarkAnswered = (messageId: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'mark_question_answered',
          messageId,
        })
      );
    }
  };

  /**
   * Teacher: Broadcast Announcement
   */
  const handleSendAnnouncement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementInput.trim()) return;

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'send_announcement',
          text: announcementInput.trim(),
        })
      );
      setAnnouncementInput('');
      setShowAnnouncementBox(false);
    }
  };

  /**
   * Teacher: End Class for Everyone
   */
  const handleEndClass = async () => {
    if (confirm('Are you sure you want to conclude this live classroom session for all attendees?')) {
      isExplicitlyLeavingRef.current = true;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'end_lesson' }));
      }
      await updateLiveLessonStatus(lesson.id, 'ended');
      onLeave();
    }
  };

  /**
   * Student: Leave Class
   */
  const handleLeaveClass = () => {
    isExplicitlyLeavingRef.current = true;
    onLeave();
  };

  /**
   * Toggle Fullscreen Mode
   */
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      classroomContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Find Teacher Participant & Active Streams
  const teacherParticipant = participants.find(
    (p) => p.role === 'teacher' || p.userId === lesson.teacherId || p.name === lesson.teacherName
  );
  const studentParticipants = participants.filter(
    (p) => p.role === 'student' && p.userId !== teacherParticipant?.userId
  );

  // Check if screen sharing is active from teacher
  const isTeacherScreenSharingActive = isTeacher
    ? isScreenSharing
    : !!teacherParticipant?.isScreenSharing;

  // Determine Streams for Display
  const teacherCamStream = isTeacher
    ? (!isVideoOff ? localCamStream : null)
    : teacherParticipant
    ? remoteCamStreams.get(teacherParticipant.userId) || null
    : null;

  const teacherScreenStream = isTeacher
    ? localScreenStream
    : teacherParticipant
    ? remoteScreenStreams.get(teacherParticipant.userId) || null
    : null;

  // Stage content selection:
  // If screen sharing is active: Stage shows Screen Share, PiP shows Teacher Camera
  // If not screen sharing: Stage shows Teacher Camera
  const mainStageStream = isTeacherScreenSharingActive ? teacherScreenStream : teacherCamStream;
  const isMainStageMuted = isTeacher; // Local preview is always muted to prevent acoustic feedback loop

  return (
    <div
      ref={classroomContainerRef}
      className="fixed inset-0 z-50 bg-slate-950 text-white flex flex-col font-sans select-none overflow-hidden"
    >
      {/* Top Classroom Bar - Screenshot 3 Style */}
      <header className="h-14 bg-white/5 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <SchoolLogo size="sm" lightText />
          {/* Subject Badge / Dropdown from Screenshot 3 */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-semibold text-indigo-300">
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-bold">{lesson.subject || 'Algebra'} • {lesson.grade || '8 класс'}</span>
            <ChevronDown className="w-3 h-3 text-indigo-300/70" />
          </div>
        </div>

        {/* Status & Quick Toggles */}
        <div className="flex items-center gap-2.5">
          {/* Participants Count Badge */}
          <button
            onClick={() => setActiveSideTab('participants')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 transition-colors cursor-pointer"
          >
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span>Участников: {participants.length || 1}</span>
          </button>

          {/* Chat Toggle Button */}
          <button
            onClick={() => setActiveSideTab('chat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border text-xs font-medium transition-colors cursor-pointer ${
              activeSideTab === 'chat'
                ? 'bg-indigo-600 border-indigo-500 text-white'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Чат</span>
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 transition-colors cursor-pointer hidden sm:block"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Permission Warning Banner if mic/cam blocked */}
      {permissionError && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs text-amber-300 flex items-center justify-between z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{permissionError}</span>
          </div>
          <button
            onClick={() => setPermissionError(null)}
            className="text-amber-400 hover:text-white text-xs cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Speaking Permission Notification Banner */}
      {speakingNotification && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2 text-xs text-emerald-300 flex items-center justify-between animate-bounce z-20">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-bold">{speakingNotification}</span>
          </div>
          <button
            onClick={() => setSpeakingNotification(null)}
            className="text-emerald-300 hover:text-white text-xs cursor-pointer px-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Classroom Workspace: Video Canvas (Left) + Interaction Sidebar (Right) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Video Stage & Controls */}
        <div className="flex-1 p-3 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-3 bg-[#0d1117] relative">
          
          {/* Main Stage Grid - Matching Screenshot 3: Spotlight Teacher on Left (55-60%), 2x2 Student Grid on Right */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-[420px] relative">
            
            {/* Spotlight Teacher Video Canvas (Left 7 Cols on desktop) */}
            <div className="lg:col-span-7 bg-slate-900 rounded-3xl border border-slate-800/80 overflow-hidden relative shadow-2xl flex items-center justify-center min-h-[300px]">
              <MediaVideo
                stream={mainStageStream}
                isMuted={isMainStageMuted}
                fit={isTeacherScreenSharingActive ? 'contain' : 'cover'}
                placeholder={
                  <div className="flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-24 h-24 rounded-3xl bg-indigo-600/20 border-2 border-indigo-500/40 text-indigo-400 flex items-center justify-center text-3xl font-bold shadow-lg shadow-indigo-600/10">
                      {lesson.teacherName.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{lesson.teacherName}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Faculty Lead • {lesson.subject}</p>
                      <span className="inline-block mt-2 text-[10px] bg-slate-800 text-slate-300 px-3 py-1 rounded-full font-mono">
                        {isTeacher && isVideoOff
                          ? 'Camera Off (Click Camera On below to stream)'
                          : isTeacher && isMediaInitializing
                          ? 'Initializing Camera...'
                          : isTeacherScreenSharingActive
                          ? 'Screen share presentation connecting...'
                          : teacherParticipant
                          ? 'Instructor Camera Connecting / Audio Active'
                          : 'Waiting for Instructor to connect...'}
                      </span>
                    </div>
                  </div>
                }
              />

              {/* Teacher Name Tag Pill at Bottom-Left with Live Audio Wave - Screenshot 3 Style */}
              <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-950/80 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/10 text-xs font-semibold text-white shadow-lg">
                <Video className="w-3.5 h-3.5 text-indigo-400" />
                <span className="font-bold">{lesson.teacherName}</span>
                {/* Animated Audio Equalizer Bars */}
                <div className="flex items-end gap-0.5 h-3 px-1">
                  <div className="w-0.5 h-2 bg-indigo-400 animate-pulse" />
                  <div className="w-0.5 h-3.5 bg-indigo-400 animate-pulse delay-75" />
                  <div className="w-0.5 h-1.5 bg-indigo-400 animate-pulse delay-150" />
                </div>
              </div>

              {/* Screen Share Indicator if active */}
              {isTeacherScreenSharingActive && (
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-amber-950/80 backdrop-blur-md px-3 py-1 rounded-xl border border-amber-600/40 text-[11px] font-bold text-amber-300">
                  <Monitor className="w-3 h-3 text-amber-400 animate-pulse" />
                  <span>Screen Presentation Live</span>
                </div>
              )}
            </div>

            {/* 2x2 Student Video Grid (Right 5 Cols on desktop) - Screenshot 3 Style */}
            <div className="lg:col-span-5 grid grid-cols-2 gap-2.5">
              {/* If fewer than 4 students in room, display actual participants or placeholder student tiles */}
              {Array.from({ length: 4 }).map((_, idx) => {
                const student = studentParticipants[idx];
                const studentStream = student ? remoteCamStreams.get(student.userId) || null : null;
                const hasLiveVideo = student && studentStream && !student.isVideoOff;
                const mockStudentNames = ['Arman', 'Aruzhan', 'Madina', 'Erasyl'];
                const displayName = student?.name || mockStudentNames[idx % mockStudentNames.length];
                const isStudentActive = !!student;

                return (
                  <div
                    key={student ? student.userId : `slot_${idx}`}
                    className="bg-slate-900 rounded-2xl border border-slate-800/80 relative overflow-hidden flex flex-col items-center justify-center shadow-lg min-h-[140px] group"
                  >
                    {hasLiveVideo && studentStream ? (
                      <MediaVideo stream={studentStream} isMuted={false} fit="cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center p-3 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 flex items-center justify-center font-bold text-sm mb-1.5">
                          {displayName.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-slate-300 truncate max-w-[100px]">{displayName}</span>
                        <span className="text-[10px] text-slate-500">{isStudentActive ? 'Student' : 'Invited'}</span>
                      </div>
                    )}

                    {/* Student Name Pill at Bottom-Left with Audio Status - Screenshot 3 Style */}
                    <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-200">
                      <span>{displayName.split(' ')[0]}</span>
                      {student?.isAudioMuted ? (
                        <MicOff className="w-3 h-3 text-rose-400" />
                      ) : (
                        <Mic className="w-3 h-3 text-emerald-400" />
                      )}
                    </div>

                    {/* Teacher Action: Revoke Camera Button if student has camera active */}
                    {isTeacher && isStudentActive && (student.cameraPermission === 'approved' || hasLiveVideo) && (
                      <button
                        onClick={() => revokeStudentCamera(student.userId)}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 px-2 py-0.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-[10px] font-bold text-white transition-opacity cursor-pointer shadow-md"
                        title="Revoke camera broadcast for this student"
                      >
                        Revoke Cam
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Interactive Floating Whiteboard Popup Card - Matching Screenshot 3 "Доска" */}
          {showWhiteboard && (
            <div className="absolute bottom-24 right-6 w-80 sm:w-96 bg-white/95 text-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-200 backdrop-blur-md z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">Доска / Interactive Board</span>
                </div>
                <button
                  onClick={() => setShowWhiteboard(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* Math Equation & Formula Canvas Simulation matching Screenshot 3 */}
              <div className="p-3 my-2 bg-slate-50 border border-slate-200/80 rounded-2xl font-mono text-xs space-y-1.5">
                <div className="text-slate-500 font-sans text-[11px] font-semibold">Решим уравнение:</div>
                <div className="text-indigo-700 font-bold text-sm">2x + 5 = 13</div>
                <div className="text-slate-700">2x = 13 - 5</div>
                <div className="text-slate-700">2x = 8</div>
                <div className="inline-block px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 font-bold">x = 4</div>
                
                <div className="pt-2 text-rose-600 text-[11px] font-sans font-bold">
                  Формула: <span className="font-mono text-xs text-slate-900">(a + b)² = a² + 2ab + b²</span>
                </div>
              </div>

              {/* Whiteboard Toolbar from Screenshot 3 */}
              <div className="flex items-center justify-between pt-1 text-slate-500 text-xs">
                <div className="flex items-center gap-2">
                  <button className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 font-bold cursor-pointer">↖</button>
                  <button className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">✎ Pen</button>
                  <button className="p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer">T Text</button>
                </div>
                <button
                  onClick={() => alert('Board state synchronized with classroom attendees.')}
                  className="px-2 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold cursor-pointer"
                >
                  Sync Board
                </button>
              </div>
            </div>
          )}

          {/* AI Assistant Floating Card - Matching Screenshot 3 "AI-помощник" */}
          {showAiAssistant && (
            <div className="absolute bottom-24 left-6 w-80 sm:w-96 bg-white/95 text-slate-900 rounded-3xl p-4 shadow-2xl border border-indigo-100 backdrop-blur-md z-30 animate-in fade-in slide-in-from-bottom-4 duration-200">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold shadow-md shadow-indigo-500/30">
                    <Sparkles className="w-3 h-3" />
                  </div>
                  <span className="font-bold text-xs text-slate-900">AI-помощник / Classroom AI</span>
                </div>
                <button
                  onClick={() => setShowAiAssistant(false)}
                  className="text-slate-400 hover:text-slate-700 text-xs font-bold cursor-pointer p-1"
                >
                  ✕
                </button>
              </div>

              {/* AI Glowing Orb and Greeting from Screenshot 3 */}
              <div className="flex items-center gap-3 my-3 p-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl border border-indigo-100/80">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-500 p-0.5 shadow-lg shadow-indigo-500/30 flex items-center justify-center shrink-0">
                  <div className="w-full h-full rounded-full bg-indigo-950 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-indigo-300 animate-spin" style={{ animationDuration: '6s' }} />
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-slate-800 leading-snug">
                    Я помогу объяснить сложные темы и отвечу на вопросы
                  </p>
                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 font-bold mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Готов к помощи / Ready
                  </span>
                </div>
              </div>

              {/* AI Query Input & Response */}
              <div className="space-y-2">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAskAi();
                      }
                    }}
                    placeholder="Ask a question about this lesson..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-100 border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    onClick={handleAskAi}
                    disabled={isAiLoading || !aiQuestion.trim()}
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shrink-0 cursor-pointer flex items-center gap-1 shadow-md shadow-indigo-600/20"
                  >
                    {isAiLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {aiAnswer && (
                  <div className="p-3 bg-indigo-50 border border-indigo-200/80 rounded-2xl text-xs text-slate-800 max-h-48 overflow-y-auto leading-relaxed">
                    {aiAnswer}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Bottom Floating Rounded Pill Control Bar - Matching Screenshot 3 */}
          <div className="bg-white/95 text-slate-800 backdrop-blur-xl rounded-full border border-white/20 p-2 sm:px-6 sm:py-2.5 flex items-center justify-center gap-3 sm:gap-6 shrink-0 shadow-2xl mx-auto z-20">
            {/* 1. Microphone Button */}
            <button
              onClick={toggleAudio}
              className="flex flex-col items-center gap-1 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              title={isAudioMuted ? 'Unmute Microphone' : 'Mute Microphone'}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  isAudioMuted
                    ? 'bg-slate-100 text-slate-500'
                    : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                }`}
              >
                {isAudioMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </div>
              <span className="text-[10px] font-semibold">Микрофон</span>
            </button>

            {/* 2. Camera Button (Teacher direct toggle / Student request flow) */}
            {isTeacher ? (
              <button
                onClick={toggleVideo}
                className="flex flex-col items-center gap-1 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                title={isVideoOff ? 'Start Camera' : 'Stop Camera'}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isVideoOff
                      ? 'bg-slate-100 text-slate-500'
                      : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  }`}
                >
                  {isVideoOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4" />}
                </div>
                <span className="text-[10px] font-semibold">Камера</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  if (myCameraStatus === 'approved') {
                    toggleVideo();
                  } else if (myCameraStatus === 'requested') {
                    alert('Your camera request has been submitted to the teacher. Please wait for approval.');
                  } else {
                    requestCameraPermission();
                  }
                }}
                className="flex flex-col items-center gap-1 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
                title={
                  myCameraStatus === 'approved'
                    ? isVideoOff
                      ? 'Start Camera'
                      : 'Stop Camera'
                    : myCameraStatus === 'requested'
                    ? 'Camera request pending teacher approval'
                    : 'Request permission to broadcast camera'
                }
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    myCameraStatus === 'approved' && !isVideoOff
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : myCameraStatus === 'requested'
                      ? 'bg-amber-100 text-amber-700 border border-amber-300 animate-pulse'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {myCameraStatus === 'requested' ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
                  ) : myCameraStatus === 'approved' && !isVideoOff ? (
                    <Video className="w-4 h-4" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </div>
                <span className="text-[10px] font-semibold">
                  {myCameraStatus === 'approved'
                    ? !isVideoOff
                      ? 'Камера вкл'
                      : 'Камера'
                    : myCameraStatus === 'requested'
                    ? 'Ожидание...'
                    : 'Запрос камеры'}
                </span>
              </button>
            )}

            {/* 3. Screen Share (Teacher Only) */}
            {isTeacher && (
              <button
                onClick={toggleScreenShare}
                className="flex flex-col items-center gap-1 text-slate-700 hover:text-amber-600 transition-colors cursor-pointer"
                title="Share Screen Presentation"
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isScreenSharing
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <ScreenShare className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-semibold">Экран</span>
              </button>
            )}

            {/* 4. Whiteboard / Доска Toggle Button */}
            <button
              onClick={() => setShowWhiteboard(!showWhiteboard)}
              className="flex flex-col items-center gap-1 text-slate-700 hover:text-indigo-600 transition-colors cursor-pointer"
              title="Open Interactive Whiteboard"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  showWhiteboard ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <PenTool className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold">Доска</span>
            </button>

            {/* 5. AI-помощник Toggle Button */}
            <button
              onClick={() => setShowAiAssistant(!showAiAssistant)}
              className="flex flex-col items-center gap-1 text-slate-700 hover:text-purple-600 transition-colors cursor-pointer"
              title="Open AI Assistant"
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  showAiAssistant
                    ? 'bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Bot className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold">AI</span>
            </button>

            {/* 6. Leave / End Call Button - Red circle from Screenshot 3 */}
            <button
              onClick={isTeacher ? handleEndClass : handleLeaveClass}
              className="flex flex-col items-center gap-1 transition-colors cursor-pointer"
              title={isTeacher ? 'End Call for Everyone' : 'Leave Call'}
            >
              <div className="w-10 h-10 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg shadow-rose-600/30 transition-all">
                <PhoneOff className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-semibold text-rose-600">Выйти</span>
            </button>
          </div>
        </div>

        {/* Right: Interaction Sidebar (Chat, Participants, Raised Hands, Camera Requests) */}
        <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 flex flex-col shrink-0">
          {/* Sidebar Tab Header */}
          <div className="h-12 border-b border-slate-800 flex items-center justify-around px-2 bg-slate-900/60">
            <button
              onClick={() => setActiveSideTab('chat')}
              className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeSideTab === 'chat'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveSideTab('participants')}
              className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                activeSideTab === 'participants'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Roster ({participants.length})</span>
            </button>

            {isTeacher && (
              <>
                <button
                  onClick={() => setActiveSideTab('hands')}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeSideTab === 'hands'
                      ? 'bg-amber-600 text-slate-950 font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Hand className="w-3.5 h-3.5" />
                  <span>Hands ({raisedHands.length})</span>
                </button>

                <button
                  onClick={() => setActiveSideTab('camera')}
                  className={`flex items-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                    activeSideTab === 'camera'
                      ? 'bg-emerald-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Cams ({cameraRequests.length})</span>
                </button>
              </>
            )}
          </div>

          {/* Announcement Modal/Box for Teacher */}
          {showAnnouncementBox && isTeacher && (
            <form
              onSubmit={handleSendAnnouncement}
              className="p-3 bg-indigo-950/60 border-b border-indigo-800/40 space-y-2"
            >
              <label className="text-[11px] font-bold text-indigo-300 block">
                Send Announcement to All Students
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={announcementInput}
                  onChange={(e) => setAnnouncementInput(e.target.value)}
                  placeholder="e.g. Please open Chapter 4 on page 112..."
                  className="flex-1 px-3 py-1.5 text-xs rounded-xl bg-slate-950 border border-indigo-700/60 text-white placeholder-slate-500 focus:outline-hidden"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shrink-0 cursor-pointer"
                >
                  Post
                </button>
              </div>
            </form>
          )}

          {/* Content: Tab 1 - Chat & Questions */}
          {activeSideTab === 'chat' && (
            <div className="flex-1 flex flex-col justify-between overflow-hidden">
              <div className="flex-1 p-3 overflow-y-auto space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="py-12 text-center text-slate-500 text-xs">
                    No messages yet. Ask a question or post to the live class!
                  </div>
                ) : (
                  chatMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`p-3 rounded-2xl text-xs space-y-1.5 ${
                        msg.isQuestion
                          ? 'bg-amber-950/30 border border-amber-800/50 text-amber-200'
                          : msg.senderRole === 'teacher'
                          ? 'bg-indigo-950/40 border border-indigo-800/40 text-slate-200'
                          : 'bg-slate-800/60 border border-slate-750 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-bold flex items-center gap-1.5 text-slate-300">
                          {msg.senderName}
                          <span className="uppercase text-[9px] px-1 py-0.2 rounded bg-slate-800 font-mono">
                            {msg.senderRole}
                          </span>
                        </span>
                        <span>
                          {new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>

                      <div className="text-slate-100 text-xs">{msg.text}</div>

                      {msg.isQuestion && (
                        <div className="pt-1.5 border-t border-amber-900/40 flex items-center justify-between">
                          <span className="text-[10px] text-amber-400 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" />
                            {msg.isAnswered ? 'Question Answered' : 'Unanswered Question'}
                          </span>

                          {isTeacher && !msg.isAnswered && (
                            <button
                              onClick={() => handleMarkAnswered(msg.id)}
                              className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <CheckCircle className="w-3 h-3" />
                              Mark Answered
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Form */}
              <form onSubmit={handleSendChat} className="p-3 border-t border-slate-800 bg-slate-900 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isQuestionInput}
                      onChange={(e) => setIsQuestionInput(e.target.checked)}
                      className="rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                    />
                    <span className="text-amber-300 font-semibold">Mark as Question for Teacher</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder={
                      isQuestionInput
                        ? 'Type your question for the teacher...'
                        : 'Type message to class...'
                    }
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 focus:outline-hidden focus:border-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Content: Tab 2 - Participants Roster */}
          {activeSideTab === 'participants' && (
            <div className="flex-1 p-3 overflow-y-auto space-y-2 text-xs">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                Active Participants ({participants.length})
              </div>
              {participants.map((p) => (
                <div
                  key={p.userId}
                  className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-750 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-slate-700 text-white font-bold text-xs flex items-center justify-center">
                      {p.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-200 flex items-center gap-1.5">
                        {p.name}
                        {p.userId === currentUser?.id && <span className="text-[10px] text-indigo-400">(You)</span>}
                        {p.isScreenSharing && (
                          <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-bold border border-amber-500/30 flex items-center gap-1">
                            <Monitor className="w-2.5 h-2.5" />
                            Sharing Screen
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-mono">
                        {p.role} {p.section && `• ${p.section}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-400">
                    {p.hasHandRaised && <Hand className="w-3.5 h-3.5 text-amber-400 animate-bounce" />}
                    {p.isAudioMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-slate-500" />
                    ) : (
                      <Mic className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Content: Tab 3 - Raised Hands Queue (Teacher View) */}
          {activeSideTab === 'hands' && isTeacher && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Hand className="w-3.5 h-3.5" />
                Hand Raising Queue ({raisedHands.length})
              </div>

              {raisedHands.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No students currently have their hands raised.
                </div>
              ) : (
                raisedHands.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-amber-950/30 border border-amber-800/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-amber-200">{req.studentName}</div>
                        <div className="text-[10px] text-slate-400">
                          {req.grade} • {req.section}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(req.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-amber-900/40">
                      <button
                        onClick={() => handleAllowStudentToSpeak(req.studentId)}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        Allow to Speak
                      </button>
                      <button
                        onClick={() => handleLowerStudentHand(req.studentId)}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Content: Tab 4 - Student Camera Requests (Teacher View) */}
          {activeSideTab === 'camera' && isTeacher && (
            <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs">
              <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5" />
                Student Camera Requests ({cameraRequests.length})
              </div>

              {cameraRequests.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs">
                  No pending student camera access requests.
                </div>
              ) : (
                cameraRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-800/50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-emerald-200">{req.studentName}</div>
                        <div className="text-[10px] text-slate-400">
                          {req.grade} • {req.section}
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(req.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-emerald-900/40">
                      <button
                        onClick={() => approveStudentCamera(req.studentId)}
                        className="flex-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 cursor-pointer shadow-md shadow-emerald-600/20"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Camera
                      </button>
                      <button
                        onClick={() => rejectStudentCamera(req.studentId)}
                        className="py-1.5 px-3 bg-slate-800 hover:bg-rose-950/60 hover:text-rose-300 text-slate-300 font-semibold rounded-xl text-xs cursor-pointer border border-slate-700"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
