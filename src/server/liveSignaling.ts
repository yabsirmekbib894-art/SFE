import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

export interface ParticipantInfo {
  userId: string;
  name: string;
  role: 'super_admin' | 'director' | 'teacher' | 'student' | 'admin';
  grade?: string;
  section?: string;
  isAudioMuted: boolean;
  isVideoOff: boolean;
  isScreenSharing: boolean;
  screenStreamId?: string;
  cameraStreamId?: string;
  cameraTrackId?: string;
  screenTrackId?: string;
  canSpeak: boolean;
  hasHandRaised: boolean;
  joinedAt: string;
  lastActiveAt?: string;
}

interface PeerConnection {
  ws: WebSocket;
  info: ParticipantInfo;
}

interface RoomData {
  lessonId: string;
  peers: Map<string, PeerConnection>;
  chatMessages: Array<{
    id: string;
    lessonId: string;
    senderId: string;
    senderName: string;
    senderRole: string;
    text: string;
    isQuestion: boolean;
    isAnswered?: boolean;
    answeredAt?: string;
    timestamp: string;
  }>;
  raisedHands: Array<{
    id: string;
    lessonId: string;
    studentId: string;
    studentName: string;
    grade: string;
    section: string;
    timestamp: string;
    status: 'pending' | 'approved' | 'declined' | 'lowered';
  }>;
  announcements: Array<{
    id: string;
    text: string;
    timestamp: string;
  }>;
  createdAt: string;
}

const rooms = new Map<string, RoomData>();
// Grace period timers for empty rooms to survive network interruptions or page reloads
const emptyRoomGraceTimers = new Map<string, NodeJS.Timeout>();

export function setupLiveSignaling(httpServer: HttpServer) {
  const wss = new WebSocketServer({ server: httpServer, path: '/ws/live' });

  wss.on('connection', (ws: WebSocket) => {
    let currentLessonId: string | null = null;
    let currentUserId: string | null = null;

    // Send heartbeat ping to keep connection alive across corporate/school firewalls
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    }, 25000);

    ws.on('message', (raw: string) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { type } = msg;

        switch (type) {
          case 'join_room': {
            const { lessonId, user } = msg;
            currentLessonId = lessonId;
            currentUserId = user.id;

            // Cancel any pending room pruning timer
            if (emptyRoomGraceTimers.has(lessonId)) {
              clearTimeout(emptyRoomGraceTimers.get(lessonId)!);
              emptyRoomGraceTimers.delete(lessonId);
            }

            if (!rooms.has(lessonId)) {
              rooms.set(lessonId, {
                lessonId,
                peers: new Map(),
                chatMessages: [],
                raisedHands: [],
                announcements: [],
                createdAt: new Date().toISOString(),
              });
            }

            const room = rooms.get(lessonId)!;

            // Check if peer is already registered (reconnection)
            const existingPeer = room.peers.get(user.id);
            const isReconnect = !!existingPeer;

            const participant: ParticipantInfo = {
              userId: user.id,
              name: user.name,
              role: user.role,
              grade: user.grade,
              section: user.section,
              isAudioMuted: msg.isAudioMuted ?? (user.role === 'student'),
              isVideoOff: msg.isVideoOff ?? false,
              isScreenSharing: existingPeer?.info.isScreenSharing ?? (msg.isScreenSharing ?? false),
              screenStreamId: existingPeer?.info.screenStreamId ?? msg.screenStreamId,
              cameraStreamId: existingPeer?.info.cameraStreamId ?? msg.cameraStreamId,
              cameraTrackId: existingPeer?.info.cameraTrackId ?? msg.cameraTrackId,
              screenTrackId: existingPeer?.info.screenTrackId ?? msg.screenTrackId,
              canSpeak: user.role === 'teacher' || user.role === 'director' || user.role === 'super_admin' || (existingPeer?.info.canSpeak ?? false),
              hasHandRaised: existingPeer?.info.hasHandRaised ?? false,
              joinedAt: existingPeer?.info.joinedAt || new Date().toISOString(),
              lastActiveAt: new Date().toISOString(),
            };

            // Update peer socket
            room.peers.set(user.id, { ws, info: participant });

            // Send full room state to the joining peer
            const existingParticipants = Array.from(room.peers.values()).map((p) => p.info);
            ws.send(
              JSON.stringify({
                type: 'room_state',
                participants: existingParticipants,
                chatMessages: room.chatMessages,
                raisedHands: room.raisedHands.filter((h) => h.status === 'pending'),
                announcements: room.announcements,
                isReconnect,
              })
            );

            // Broadcast to other peers in the room
            broadcastToRoom(
              lessonId,
              {
                type: 'user_joined',
                participant,
                isReconnect,
              },
              user.id
            );
            break;
          }

          case 'webrtc_signal': {
            // Forward offer / answer / ice-candidate directly to target peer
            const { targetUserId, signal, fromUserId } = msg;
            if (!currentLessonId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const targetPeer = room.peers.get(targetUserId);
            if (targetPeer && targetPeer.ws.readyState === WebSocket.OPEN) {
              targetPeer.ws.send(
                JSON.stringify({
                  type: 'webrtc_signal',
                  fromUserId,
                  signal,
                })
              );
            }
            break;
          }

          case 'media_state': {
            if (!currentLessonId || !currentUserId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const peer = room.peers.get(currentUserId);
            if (peer) {
              if (typeof msg.isAudioMuted === 'boolean') peer.info.isAudioMuted = msg.isAudioMuted;
              if (typeof msg.isVideoOff === 'boolean') peer.info.isVideoOff = msg.isVideoOff;
              if (typeof msg.isScreenSharing === 'boolean') peer.info.isScreenSharing = msg.isScreenSharing;
              if (msg.screenStreamId !== undefined) peer.info.screenStreamId = msg.screenStreamId;
              if (msg.cameraStreamId !== undefined) peer.info.cameraStreamId = msg.cameraStreamId;
              if (msg.cameraTrackId !== undefined) peer.info.cameraTrackId = msg.cameraTrackId;
              if (msg.screenTrackId !== undefined) peer.info.screenTrackId = msg.screenTrackId;

              peer.info.lastActiveAt = new Date().toISOString();

              broadcastToRoom(currentLessonId, {
                type: 'participant_updated',
                participant: peer.info,
              });
            }
            break;
          }

          case 'raise_hand': {
            if (!currentLessonId || !currentUserId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const peer = room.peers.get(currentUserId);
            if (peer) {
              peer.info.hasHandRaised = true;
              const handReq = {
                id: `hand_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                lessonId: currentLessonId,
                studentId: peer.info.userId,
                studentName: peer.info.name,
                grade: peer.info.grade || '',
                section: peer.info.section || '',
                timestamp: new Date().toISOString(),
                status: 'pending' as const,
              };

              room.raisedHands.push(handReq);

              broadcastToRoom(currentLessonId, {
                type: 'hand_raised',
                request: handReq,
                participant: peer.info,
              });
            }
            break;
          }

          case 'allow_speak': {
            if (!currentLessonId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const { studentId } = msg;
            const targetPeer = room.peers.get(studentId);
            if (targetPeer) {
              targetPeer.info.canSpeak = true;
              targetPeer.info.hasHandRaised = false;

              room.raisedHands = room.raisedHands.filter((h) => h.studentId !== studentId);

              broadcastToRoom(currentLessonId, {
                type: 'speaking_allowed',
                studentId,
                participant: targetPeer.info,
              });
            }
            break;
          }

          case 'lower_hand': {
            if (!currentLessonId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const { studentId } = msg;
            const targetPeer = room.peers.get(studentId);
            if (targetPeer) {
              targetPeer.info.hasHandRaised = false;
            }
            room.raisedHands = room.raisedHands.filter((h) => h.studentId !== studentId);

            broadcastToRoom(currentLessonId, {
              type: 'hand_lowered',
              studentId,
            });
            break;
          }

          case 'send_chat': {
            if (!currentLessonId || !currentUserId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const peer = room.peers.get(currentUserId);
            if (peer) {
              const chatMsg = {
                id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                lessonId: currentLessonId,
                senderId: peer.info.userId,
                senderName: peer.info.name,
                senderRole: peer.info.role,
                text: msg.text,
                isQuestion: !!msg.isQuestion,
                timestamp: new Date().toISOString(),
              };

              room.chatMessages.push(chatMsg);

              broadcastToRoom(currentLessonId, {
                type: 'new_chat_message',
                message: chatMsg,
              });
            }
            break;
          }

          case 'mark_question_answered': {
            if (!currentLessonId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const { messageId } = msg;
            const foundMsg = room.chatMessages.find((m) => m.id === messageId);
            if (foundMsg) {
              foundMsg.isAnswered = true;
              foundMsg.answeredAt = new Date().toISOString();

              broadcastToRoom(currentLessonId, {
                type: 'question_answered',
                messageId,
              });
            }
            break;
          }

          case 'send_announcement': {
            if (!currentLessonId) return;
            const room = rooms.get(currentLessonId);
            if (!room) return;

            const announcement = {
              id: `ann_${Date.now()}`,
              text: msg.text,
              timestamp: new Date().toISOString(),
            };

            room.announcements.unshift(announcement);

            broadcastToRoom(currentLessonId, {
              type: 'new_announcement',
              announcement,
            });
            break;
          }

          case 'end_lesson': {
            if (!currentLessonId) return;
            broadcastToRoom(currentLessonId, {
              type: 'lesson_ended',
            });
            if (emptyRoomGraceTimers.has(currentLessonId)) {
              clearTimeout(emptyRoomGraceTimers.get(currentLessonId)!);
              emptyRoomGraceTimers.delete(currentLessonId);
            }
            rooms.delete(currentLessonId);
            break;
          }
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    });

    ws.on('close', () => {
      clearInterval(pingInterval);
      if (currentLessonId && currentUserId) {
        const room = rooms.get(currentLessonId);
        if (room) {
          // If the socket in the room belongs to this connection, remove it
          const peer = room.peers.get(currentUserId);
          if (peer && peer.ws === ws) {
            room.peers.delete(currentUserId);
            room.raisedHands = room.raisedHands.filter((h) => h.studentId !== currentUserId);

            broadcastToRoom(currentLessonId, {
              type: 'user_left',
              userId: currentUserId,
            });

            // If room is now empty, set a 120-second grace period before deleting
            // to allow teachers or students to refresh or recover without losing the room
            if (room.peers.size === 0) {
              if (emptyRoomGraceTimers.has(currentLessonId)) {
                clearTimeout(emptyRoomGraceTimers.get(currentLessonId)!);
              }
              const timer = setTimeout(() => {
                const r = rooms.get(currentLessonId!);
                if (r && r.peers.size === 0) {
                  console.log(`[Signaling] Pruning empty room ${currentLessonId} after grace period`);
                  rooms.delete(currentLessonId!);
                }
                emptyRoomGraceTimers.delete(currentLessonId!);
              }, 120000);
              emptyRoomGraceTimers.set(currentLessonId, timer);
            }
          }
        }
      }
    });
  });

  function broadcastToRoom(lessonId: string, data: any, excludeUserId?: string) {
    const room = rooms.get(lessonId);
    if (!room) return;
    const payload = JSON.stringify(data);

    for (const [userId, peer] of room.peers.entries()) {
      if (excludeUserId && userId === excludeUserId) continue;
      if (peer.ws.readyState === WebSocket.OPEN) {
        peer.ws.send(payload);
      }
    }
  }

  return {
    getActiveRoomStats: () => {
      const stats: Record<string, { participantCount: number; hasTeacher: boolean; isScreenSharing: boolean }> = {};
      for (const [lessonId, room] of rooms.entries()) {
        const teacherPeer = Array.from(room.peers.values()).find((p) => p.info.role === 'teacher');
        stats[lessonId] = {
          participantCount: room.peers.size,
          hasTeacher: !!teacherPeer,
          isScreenSharing: teacherPeer?.info.isScreenSharing || false,
        };
      }
      return stats;
    },
  };
}
