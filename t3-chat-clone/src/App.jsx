import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { Textarea } from '@/components/ui/textarea.jsx'
import MessageRenderer from './components/MessageRenderer'
import { 
  MessageSquare, 
  Plus, 
  Search, 
  Settings, 
  Moon, 
  Sun, 
  Send,
  Paperclip,
  Menu,
  LogOut,
  User
} from 'lucide-react'
import './App.css'

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token')
    return savedToken
  })
  const [showLogin, setShowLogin] = useState(true) // true for login, false for register
  
  // Chat state
  const [messages, setMessages] = useState([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedModel, setSelectedModel] = useState('Gemini 2.5 Flash')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [chatHistory, setChatHistory] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  
  // Form state
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // API Keys state
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeys, setApiKeys] = useState([])
  const [newApiKey, setNewApiKey] = useState({ provider: '', api_key: '' })
  
  // Streaming state
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  
  // Attachments state
  const [attachments, setAttachments] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // API Configuration
  const API_URL = import.meta.env.VITE_API_URL || '${API_URL}'

  const models = [
    'Gemini 2.5 Flash',
    'GPT-4o',
    'Claude 3.5 Sonnet',
    'DeepSeek V3'
  ]

  // Check authentication on app load and token change
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('token')
      console.log('Checking saved token:', savedToken)
      
      if (savedToken) {
        setToken(savedToken)
        try {
          const response = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          })
          
          console.log('Auth check response:', response.status)
          
          if (response.ok) {
            const data = await response.json()
            console.log('Auth successful, user:', data.user)
            setUser(data.user)
            setIsAuthenticated(true)
          } else {
            console.log('Auth failed, removing token')
            localStorage.removeItem('token')
            setToken(null)
            setIsAuthenticated(false)
          }
        } catch (error) {
          console.error('Auth check failed:', error)
          localStorage.removeItem('token')
          setToken(null)
          setIsAuthenticated(false)
        }
      } else {
        console.log('No token found')
        setIsAuthenticated(false)
      }
    }
    
    initAuth()
  }, [])

  // Load chat sessions when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      loadChatSessions()
    }
  }, [isAuthenticated, token])

  const checkAuth = async () => {
    try {
      const response = await fetch('${API_URL}/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem('token')
        setToken(null)
        setIsAuthenticated(false)
      }
    } catch (error) {
      console.error('Auth check failed:', error)
      localStorage.removeItem('token')
      setToken(null)
      setIsAuthenticated(false)
    }
  }

  const handleAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = showLogin ? '/api/auth/login' : '/api/auth/register'
      const payload = showLogin 
        ? { username: formData.username, password: formData.password }
        : formData

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const data = await response.json()

      if (response.ok) {
        const newToken = data.access_token
        localStorage.setItem('token', newToken)
        setToken(newToken)
        setUser(data.user)
        setIsAuthenticated(true)
        setFormData({ username: '', email: '', password: '' })
        console.log('Authentication successful, token saved:', newToken)
      } else {
        setError(data.error || 'Authentication failed')
      }
    } catch (error) {
      setError('Network error. Please try again.')
      console.error('Auth error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    setIsAuthenticated(false)
    setMessages([])
    setChatHistory([])
    setCurrentSessionId(null)
  }

  const loadChatSessions = async () => {
    try {
      const response = await fetch('${API_URL}/api/chat/sessions', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.sessions)
      }
    } catch (error) {
      console.error('Failed to load chat sessions:', error)
    }
  }

  const loadMessages = async (sessionId) => {
    try {
      const response = await fetch(`${API_URL}/api/chat/messages/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages.map(msg => ({
          id: msg.id,
          text: msg.text,
          sender: msg.sender,
          timestamp: new Date(msg.timestamp).toLocaleTimeString()
        })))
        setCurrentSessionId(sessionId)
      }
    } catch (error) {
      console.error('Failed to load messages:', error)
    }
  }

  const handleSendMessage = async () => {
    if (inputMessage.trim() || attachments.length > 0) {
      const newMessage = {
        id: Date.now(),
        text: inputMessage,
        sender: 'user',
        timestamp: new Date().toLocaleTimeString(),
        attachments: attachments
      }
      setMessages([...messages, newMessage])
      const messageText = inputMessage
      const messageAttachments = attachments
      setInputMessage('')
      setAttachments([])
      
      // Start streaming
      setIsStreaming(true)
      setStreamingMessage('')
      
      try {
        const response = await fetch('${API_URL}/api/chat/stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            message: messageText,
            model: selectedModel,
            session_id: currentSessionId,
            attachment_ids: messageAttachments.map(att => att.id)
          })
        })
        
        if (response.ok) {
          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let fullResponse = ''
          
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            
            const chunk = decoder.decode(value)
            const lines = chunk.split('\n')
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6))
                  if (data.content) {
                    fullResponse += data.content
                    setStreamingMessage(fullResponse)
                  }
                  if (data.done) {
                    // Streaming complete
                    const aiMessage = {
                      id: data.message_id || Date.now() + 1,
                      text: fullResponse,
                      sender: 'ai',
                      timestamp: new Date().toLocaleTimeString()
                    }
                    setMessages(prev => [...prev.slice(0, -1), newMessage, aiMessage])
                    setCurrentSessionId(data.session_id)
                    setIsStreaming(false)
                    setStreamingMessage('')
                    loadChatSessions()
                    return
                  }
                } catch (e) {
                  // Ignore parsing errors for partial chunks
                }
              }
            }
          }
        } else {
          // Fallback to non-streaming
          const fallbackResponse = await fetch('${API_URL}/api/chat/send', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              message: messageText,
              model: selectedModel,
              session_id: currentSessionId,
              attachment_ids: messageAttachments.map(att => att.id)
            })
          })
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json()
            const aiMessage = {
              id: data.ai_message.id,
              text: data.ai_message.text,
              sender: 'ai',
              timestamp: new Date(data.ai_message.timestamp).toLocaleTimeString()
            }
            setMessages(prev => [...prev.slice(0, -1), newMessage, aiMessage])
            setCurrentSessionId(data.session_id)
            loadChatSessions()
          } else {
            throw new Error('Failed to send message')
          }
        }
      } catch (error) {
        console.error('Error sending message:', error)
        setError('Failed to send message. Please try again.')
      } finally {
        setIsStreaming(false)
        setStreamingMessage('')
      }
    }
  }

  const handleNewChat = async () => {
    try {
      const response = await fetch('${API_URL}/api/chat/new', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setMessages([])
        setCurrentSessionId(data.session_id)
        loadChatSessions()
      }
    } catch (error) {
      console.error('Failed to create new chat:', error)
    }
  }

  const handlePromptClick = (prompt) => {
    setInputMessage(prompt)
  }

  // API Keys management functions
  const loadApiKeys = async () => {
    try {
      const response = await fetch('${API_URL}/api/api-keys', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setApiKeys(data.api_keys)
      }
    } catch (error) {
      console.error('Failed to load API keys:', error)
    }
  }

  const addApiKey = async () => {
    if (!newApiKey.provider || !newApiKey.api_key) {
      alert('Inserisci sia il provider che la chiave API')
      return
    }

    try {
      const response = await fetch('${API_URL}/api/api-keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newApiKey)
      })

      if (response.ok) {
        setNewApiKey({ provider: '', api_key: '' })
        loadApiKeys()
        alert('Chiave API salvata con successo!')
      } else {
        const data = await response.json()
        alert(data.error || 'Errore nel salvare la chiave API')
      }
    } catch (error) {
      console.error('Failed to add API key:', error)
      alert('Errore nel salvare la chiave API')
    }
  }

  const deleteApiKey = async (keyId) => {
    if (!confirm('Sei sicuro di voler eliminare questa chiave API?')) {
      return
    }

    try {
      const response = await fetch(`${API_URL}/api/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        loadApiKeys()
        alert('Chiave API eliminata con successo!')
      } else {
        alert('Errore nell\'eliminare la chiave API')
      }
    } catch (error) {
      console.error('Failed to delete API key:', error)
      alert('Errore nell\'eliminare la chiave API')
    }
  }

  // Load API keys when settings modal opens
  useEffect(() => {
    if (showSettings && isAuthenticated) {
      loadApiKeys()
    }
  }, [showSettings, isAuthenticated])

  // Attachment handling functions
  const handleFileUpload = async (files) => {
    const formData = new FormData()
    
    for (let file of files) {
      formData.append('files', file)
    }

    try {
      setUploadProgress(0)
      const response = await fetch('${API_URL}/api/attachments/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (response.ok) {
        const data = await response.json()
        setAttachments(prev => [...prev, ...data.attachments])
        setUploadProgress(100)
        setTimeout(() => setUploadProgress(0), 1000)
      } else {
        throw new Error('Upload failed')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Errore nel caricamento del file')
      setUploadProgress(0)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const files = Array.from(e.dataTransfer.files)
    handleFileUpload(files)
  }

  const removeAttachment = (attachmentId) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId))
  }

  // Authentication UI
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-pink-50">
        <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
          <div className="flex items-center justify-center mb-6">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-3">
              <span className="text-white font-bold text-lg">T3</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">T3 Chat</h1>
          </div>

          <div className="flex mb-6">
            <Button
              variant={showLogin ? "default" : "outline"}
              className={`flex-1 mr-2 ${showLogin ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
              onClick={() => setShowLogin(true)}
            >
              Login
            </Button>
            <Button
              variant={!showLogin ? "default" : "outline"}
              className={`flex-1 ml-2 ${!showLogin ? 'bg-purple-600 hover:bg-purple-700' : ''}`}
              onClick={() => setShowLogin(false)}
            >
              Register
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                className="w-full"
              />
            </div>
            
            {!showLogin && (
              <div>
                <Input
                  type="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  required
                  className="w-full"
                />
              </div>
            )}
            
            <div>
              <Input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
                className="w-full"
              />
            </div>
            
            <Button 
              type="submit" 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Loading...' : (showLogin ? 'Login' : 'Register')}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Main Chat UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50"
         onDragOver={handleDragOver}
         onDragLeave={handleDragLeave}
         onDrop={handleDrop}>
      
      {/* Drag overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-purple-500 bg-opacity-20 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <Paperclip className="w-12 h-12 text-purple-500 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900">Drop files here to upload</p>
          </div>
        </div>
      )}

      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mr-2">
                  <span className="text-white font-bold text-sm">T3</span>
                </div>
                <h1 className="text-lg font-semibold text-gray-900">T3 Chat</h1>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
                  <Settings className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            </div>
            
            <Button 
              onClick={handleNewChat}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input 
                placeholder="Search your threads..." 
                className="pl-10 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto">
            {chatHistory.map((session) => (
              <div
                key={session.id}
                onClick={() => loadMessages(session.id)}
                className={`p-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                  currentSessionId === session.id ? 'bg-purple-50 border-l-4 border-l-purple-500' : ''
                }`}
              >
                <div className="flex items-center">
                  <MessageSquare className="w-4 h-4 text-gray-400 mr-2" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.title || 'New Chat'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* User Info */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                <User className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
            <h2 className="text-xl font-semibold text-gray-900">How can I help you?</h2>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Menu className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="max-w-4xl mx-auto">
                {/* Category Buttons */}
                <div className="flex flex-wrap gap-3 mb-8">
                  <Button 
                    variant="outline" 
                    className="bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100"
                    onClick={() => handlePromptClick("Create a marketing plan for my startup")}
                  >
                    ✨ Create
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                    onClick={() => handlePromptClick("Analyze this data and provide insights")}
                  >
                    📊 Explore
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100"
                    onClick={() => handlePromptClick("Write a Python function to solve this problem")}
                  >
                    💻 Code
                  </Button>
                  <Button 
                    variant="outline" 
                    className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
                    onClick={() => handlePromptClick("Explain quantum physics in simple terms")}
                  >
                    🎓 Learn
                  </Button>
                </div>

                {/* Suggested Prompts */}
                <div className="space-y-3">
                  <div 
                    className="p-4 bg-orange-50 border border-orange-200 rounded-lg cursor-pointer hover:bg-orange-100 transition-colors"
                    onClick={() => handlePromptClick("How does AI work?")}
                  >
                    <p className="text-orange-800 font-medium">How does AI work?</p>
                  </div>
                  
                  <div 
                    className="p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors"
                    onClick={() => handlePromptClick("Are black holes real?")}
                  >
                    <p className="text-green-800 font-medium">Are black holes real?</p>
                  </div>
                  
                  <div 
                    className="p-4 bg-pink-50 border border-pink-200 rounded-lg cursor-pointer hover:bg-pink-100 transition-colors"
                    onClick={() => handlePromptClick('How many Rs are in the word "strawberry"?')}
                  >
                    <p className="text-pink-800 font-medium">How many Rs are in the word "strawberry"?</p>
                  </div>
                  
                  <div 
                    className="p-4 bg-blue-50 border border-blue-200 rounded-lg cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => handlePromptClick("What is the meaning of life?")}
                  >
                    <p className="text-blue-800 font-medium">What is the meaning of life?</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-3xl p-4 rounded-lg ${
                      message.sender === 'user' 
                        ? 'bg-purple-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mb-3">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center mb-2">
                              <Paperclip className="w-4 h-4 mr-2" />
                              <span className="text-sm">{attachment.filename}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <MessageRenderer text={message.text} />
                      <span className="text-xs opacity-70 mt-2 block">{message.timestamp}</span>
                    </div>
                  </div>
                ))}
                
                {/* Streaming message */}
                {isStreaming && (
                  <div className="flex justify-start">
                    <div className="max-w-3xl p-4 rounded-lg bg-gray-100 text-gray-900">
                      <MessageRenderer text={streamingMessage} />
                      <div className="flex items-center mt-2">
                        <div className="animate-pulse flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                        </div>
                        <span className="text-xs text-gray-500 ml-2">AI is typing...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mb-4 flex flex-wrap gap-2">
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                    <Paperclip className="w-4 h-4 mr-2 text-gray-500" />
                    <span className="text-sm text-gray-700">{attachment.filename}</span>
                    <button
                      onClick={() => removeAttachment(attachment.id)}
                      className="ml-2 text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mb-4">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="flex items-end space-x-3">
              <div className="flex-1">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="min-h-[60px] resize-none border-gray-200 focus:border-purple-500 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                  className="hidden"
                  id="file-upload"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('file-upload').click()}
                  className="border-gray-200 hover:bg-gray-50"
                >
                  <Paperclip className="w-4 h-4" />
                </Button>
                
                <Button 
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() && attachments.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Model Selection */}
            <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
              <div className="flex items-center space-x-4">
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="bg-transparent border border-gray-200 rounded px-3 py-1 text-sm focus:outline-none focus:border-purple-500"
                >
                  {models.map((model) => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
                
                <Button variant="outline" size="sm" className="border-gray-200 hover:bg-gray-50">
                  Search
                </Button>
              </div>
              
              <span className="text-xs">Selected: {selectedModel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">API Keys Settings</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                ×
              </Button>
            </div>

            {/* Add New API Key */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Add New API Key</h4>
              <div className="space-y-3">
                <select
                  value={newApiKey.provider}
                  onChange={(e) => setNewApiKey({...newApiKey, provider: e.target.value})}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                >
                  <option value="">Select Provider</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                  <option value="google">Google</option>
                </select>
                
                <Input
                  type="password"
                  placeholder="API Key"
                  value={newApiKey.api_key}
                  onChange={(e) => setNewApiKey({...newApiKey, api_key: e.target.value})}
                  className="w-full"
                />
                
                <Button 
                  onClick={addApiKey}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                >
                  Add API Key
                </Button>
              </div>
            </div>

            {/* Existing API Keys */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Your API Keys</h4>
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div>
                      <p className="text-sm font-medium text-gray-900 capitalize">{key.provider}</p>
                      <p className="text-xs text-gray-500">••••••••{key.api_key.slice(-4)}</p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteApiKey(key.id)}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      Delete
                    </Button>
                  </div>
                ))}
                
                {apiKeys.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">No API keys configured</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

