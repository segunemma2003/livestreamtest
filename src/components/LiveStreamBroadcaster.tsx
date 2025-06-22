// src/components/LiveStreamViewer.tsx - Working version with correct API
import React, { useEffect, useRef, useState } from 'react'
import { 
  Room, 
  RemoteTrack, 
  RemoteParticipant, 
  LocalParticipant,
  RoomEvent,
  Track,
  ConnectionState,
  RemoteTrackPublication
} from 'livekit-client'

interface LiveStreamViewerProps {
  roomName: string
  token: string
  serverUrl: string
  userName?: string
  onDisconnect?: () => void
}

interface ChatMessage {
  id: string
  user: string
  message: string
  timestamp: string
}

const LiveStreamViewer: React.FC<LiveStreamViewerProps> = ({
  roomName,
  token,
  serverUrl,
  userName = 'Anonymous',
  onDisconnect
}) => {
  const [room, setRoom] = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [participants, setParticipants] = useState<RemoteParticipant[]>([])
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  
  const videoContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!token || !serverUrl) return

    const connectToRoom = async () => {
      try {
        const newRoom = new Room()
        setRoom(newRoom)

        // Set up event listeners
        newRoom.on(RoomEvent.Connected, () => {
          console.log('Connected to room:', roomName)
          setConnected(true)
          setConnectionState(ConnectionState.Connected)
        })

        newRoom.on(RoomEvent.Disconnected, () => {
          console.log('Disconnected from room')
          setConnected(false)
          setConnectionState(ConnectionState.Disconnected)
          onDisconnect?.()
        })

        newRoom.on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
          console.log('Participant connected:', participant.identity)
          setParticipants(prev => [...prev, participant])
        })

        newRoom.on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
          console.log('Participant disconnected:', participant.identity)
          setParticipants(prev => prev.filter(p => p.identity !== participant.identity))
        })

        newRoom.on(RoomEvent.TrackSubscribed, (track: RemoteTrack, publication: RemoteTrackPublication, participant: RemoteParticipant) => {
          console.log('Track subscribed:', track.kind, participant.identity)
          
          if (track.kind === Track.Kind.Video && videoContainerRef.current) {
            const videoElement = track.attach()
            videoElement.style.width = '100%'
            videoElement.style.height = 'auto'
            videoElement.style.borderRadius = '8px'
            videoElement.style.objectFit = 'contain'
            videoContainerRef.current.appendChild(videoElement)
          }
        })

        newRoom.on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
          console.log('Track unsubscribed:', track.kind)
          track.detach()
        })

        newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant?: RemoteParticipant) => {
          try {
            const message = JSON.parse(new TextDecoder().decode(payload))
            
            if (message.type === 'chat_message') {
              const chatMessage: ChatMessage = {
                id: Date.now().toString(),
                user: message.data.user?.username || 'Unknown',
                message: message.data.message,
                timestamp: new Date().toLocaleTimeString()
              }
              setChatMessages(prev => [...prev, chatMessage])
            }
          } catch (error) {
            console.error('Error parsing data message:', error)
          }
        })

        newRoom.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          console.log('Connection state:', state)
          setConnectionState(state)
        })

        // Connect to room
        await newRoom.connect(serverUrl, token)
        
      } catch (error) {
        console.error('Failed to connect to room:', error)
        setConnectionState(ConnectionState.Disconnected)
      }
    }

    connectToRoom()

    return () => {
      if (room) {
        room.disconnect()
      }
    }
  }, [token, serverUrl, roomName])

  const sendChatMessage = async () => {
    if (!room || !chatInput.trim()) return

    try {
      const message = {
        type: 'chat_message',
        data: {
          user: { username: userName },
          message: chatInput.trim(),
          timestamp: new Date().toISOString()
        }
      }

      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(message))
      
      await room.localParticipant.publishData(data, { reliable: true })
      
      // Add to local chat immediately
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        user: userName,
        message: chatInput.trim(),
        timestamp: new Date().toLocaleTimeString()
      }
      setChatMessages(prev => [...prev, chatMessage])
      setChatInput('')
      
    } catch (error) {
      console.error('Failed to send chat message:', error)
    }
  }

  const sendReaction = async (reaction: string) => {
    if (!room) return

    try {
      const message = {
        type: 'reaction',
        data: {
          user: { username: userName },
          reaction_type: reaction,
          timestamp: new Date().toISOString()
        }
      }

      const encoder = new TextEncoder()
      const data = encoder.encode(JSON.stringify(message))
      
      await room.localParticipant.publishData(data, { reliable: false })
      
    } catch (error) {
      console.error('Failed to send reaction:', error)
    }
  }

  const disconnect = () => {
    if (room) {
      room.disconnect()
    }
  }

  const getConnectionStatusColor = () => {
    switch (connectionState) {
      case ConnectionState.Connected:
        return 'text-green-500'
      case ConnectionState.Connecting:
        return 'text-yellow-500'
      case ConnectionState.Disconnected:
        return 'text-red-500'
      default:
        return 'text-gray-500'
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{roomName}</h1>
          <p className={`text-sm ${getConnectionStatusColor()}`}>
            {connectionState} • {participants.length + (connected ? 1 : 0)} viewers
          </p>
        </div>
        <button
          onClick={disconnect}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded"
        >
          Disconnect
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 bg-black relative">
          <div ref={videoContainerRef} className="w-full h-full flex items-center justify-center">
            {!connected && (
              <div className="text-gray-400 text-center">
                <div className="text-6xl mb-4">📹</div>
                <p>Connecting to stream...</p>
              </div>
            )}
            {connected && participants.length === 0 && (
              <div className="text-gray-400 text-center">
                <div className="text-6xl mb-4">🎥</div>
                <p>Waiting for stream to start...</p>
                <p className="text-sm mt-2">Connected and ready to view</p>
              </div>
            )}
          </div>
          
          {/* Reactions Overlay */}
          <div className="absolute bottom-4 left-4 flex space-x-2">
            {['👍', '❤️', '😂', '😮', '👏', '🔥'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="bg-black bg-opacity-50 hover:bg-opacity-75 rounded-full p-2 text-2xl transition-all duration-200 hover:scale-110"
                disabled={!connected}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Sidebar */}
        <div className="w-80 bg-gray-800 flex flex-col">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-700">
            <h2 className="font-semibold">Live Chat</h2>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="text-blue-400 font-medium">{msg.user}</span>
                <span className="text-gray-400 text-xs ml-2">{msg.timestamp}</span>
                <p className="text-gray-200 mt-1">{msg.message}</p>
              </div>
            ))}
            {chatMessages.length === 0 && (
              <p className="text-gray-500 text-center">No messages yet...</p>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-gray-700">
            <div className="flex space-x-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
                disabled={!connected}
              />
              <button
                onClick={sendChatMessage}
                disabled={!connected || !chatInput.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-4 py-2 rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LiveStreamViewer