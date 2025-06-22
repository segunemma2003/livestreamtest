// src/components/LiveStreamBroadcaster.tsx - Fixed broadcaster component
import React, { useEffect, useRef, useState } from 'react'
import { 
  Room, 
  LocalTrack,
  RoomEvent,
  Track,
  ConnectionState,
  createLocalVideoTrack,
  createLocalAudioTrack
} from 'livekit-client'

interface LiveStreamBroadcasterProps {
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

const LiveStreamBroadcaster: React.FC<LiveStreamBroadcasterProps> = ({
  roomName,
  token,
  serverUrl,
  userName = 'Broadcaster',
  onDisconnect
}) => {
  const [room, setRoom] = useState<Room | null>(null)
  const [connected, setConnected] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected)
  const [videoEnabled, setVideoEnabled] = useState(true)
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [viewerCount, setViewerCount] = useState(0)
  
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoTrack = useRef<LocalTrack | null>(null)
  const audioTrack = useRef<LocalTrack | null>(null)

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
          setIsStreaming(false)
          onDisconnect?.()
        })

        newRoom.on(RoomEvent.ParticipantConnected, () => {
          setViewerCount(prev => prev + 1)
        })

        newRoom.on(RoomEvent.ParticipantDisconnected, () => {
          setViewerCount(prev => Math.max(0, prev - 1))
        })

        newRoom.on(RoomEvent.DataReceived, (payload: Uint8Array, participant) => {
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
      if (videoTrack.current) {
        videoTrack.current.stop()
      }
      if (audioTrack.current) {
        audioTrack.current.stop()
      }
    }
  }, [token, serverUrl, roomName])

  const startStreaming = async () => {
    if (!room || !connected) return

    try {
      // Create video track
      if (videoEnabled) {
        videoTrack.current = await createLocalVideoTrack({
          resolution: {
            width: 1280,
            height: 720
          },
          facingMode: 'user'
        })
        
        if (videoRef.current) {
          videoTrack.current.attach(videoRef.current)
        }
        
        await room.localParticipant.publishTrack(videoTrack.current)
      }

      // Create audio track
      if (audioEnabled) {
        audioTrack.current = await createLocalAudioTrack()
        await room.localParticipant.publishTrack(audioTrack.current)
      }

      setIsStreaming(true)
      console.log('Started streaming')
      
    } catch (error) {
      console.error('Failed to start streaming:', error)
      alert('Failed to start streaming. Please check camera/microphone permissions.')
    }
  }

  const stopStreaming = async () => {
    if (!room) return

    try {
      // Unpublish tracks
      if (videoTrack.current) {
        await room.localParticipant.unpublishTrack(videoTrack.current)
        videoTrack.current.stop()
        videoTrack.current = null
      }

      if (audioTrack.current) {
        await room.localParticipant.unpublishTrack(audioTrack.current)
        audioTrack.current.stop()
        audioTrack.current = null
      }

      setIsStreaming(false)
      console.log('Stopped streaming')
      
    } catch (error) {
      console.error('Failed to stop streaming:', error)
    }
  }

  const toggleVideo = async () => {
    if (!videoTrack.current) return
    
    if (videoEnabled) {
      await videoTrack.current.mute()
    } else {
      await videoTrack.current.unmute()
    }
    setVideoEnabled(!videoEnabled)
  }

  const toggleAudio = async () => {
    if (!audioTrack.current) return
    
    if (audioEnabled) {
      await audioTrack.current.mute()
    } else {
      await audioTrack.current.unmute()
    }
    setAudioEnabled(!audioEnabled)
  }

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
          <h1 className="text-xl font-bold">Broadcasting: {roomName}</h1>
          <p className={`text-sm ${getConnectionStatusColor()}`}>
            {connectionState} • {viewerCount} viewers
          </p>
        </div>
        <div className="flex space-x-2">
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded flex items-center space-x-2"
            >
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span>Stop Stream</span>
            </button>
          ) : (
            <button
              onClick={startStreaming}
              disabled={!connected}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600 px-4 py-2 rounded"
            >
              Start Stream
            </button>
          )}
          <button
            onClick={disconnect}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
          >
            Disconnect
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Video Area */}
        <div className="flex-1 bg-black relative">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
            style={{ transform: 'scaleX(-1)' }} // Mirror for broadcaster
          />
          
          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-gray-400 text-center">
                <div className="text-6xl mb-4">📹</div>
                <p className="text-xl mb-2">Ready to Stream</p>
                <p className="text-sm">Click "Start Stream" to begin broadcasting</p>
              </div>
            </div>
          )}

          {/* Stream Controls */}
          <div className="absolute bottom-4 left-4 flex space-x-2">
            <button
              onClick={toggleVideo}
              disabled={!isStreaming}
              className={`p-3 rounded-full ${
                videoEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:bg-gray-600 transition-colors`}
            >
              {videoEnabled ? '📹' : '📵'}
            </button>
            <button
              onClick={toggleAudio}
              disabled={!isStreaming}
              className={`p-3 rounded-full ${
                audioEnabled 
                  ? 'bg-blue-600 hover:bg-blue-700' 
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:bg-gray-600 transition-colors`}
            >
              {audioEnabled ? '🎤' : '🔇'}
            </button>
          </div>

          {/* Live Indicator */}
          {isStreaming && (
            <div className="absolute top-4 left-4 bg-red-600 px-3 py-1 rounded-full flex items-center space-x-2">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              <span className="text-sm font-medium">LIVE</span>
            </div>
          )}
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
                placeholder="Message your viewers..."
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

export default LiveStreamBroadcaster