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
  const [isDarkMode, setIsDarkMode] = useState(false)
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

  // Theme toggle function
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
    localStorage.setItem('darkMode', !isDarkMode)
  }

  // Load theme preference on app start
  useEffect(() => {
    const savedTheme = localStorage.getItem('darkMode')
    if (savedTheme !== null) {
      setIsDarkMode(savedTheme === 'true')
    }
  }, [])

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

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                required
                className="border-purple-300 focus:border-purple-500"
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
                  className="border-purple-300 focus:border-purple-500"
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
                className="border-purple-300 focus:border-purple-500"
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm text-center">{error}</div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? 'Please wait...' : (showLogin ? 'Login' : 'Register')}
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Main chat UI (same as before but with authentication)
  return (
    <div className={`min-h-screen flex ${isDarkMode ? 'bg-gradient-to-br from-gray-900 to-gray-800' : 'bg-gradient-to-br from-purple-50 to-pink-50'}`}>
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 overflow-hidden ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-purple-200'} border-r flex flex-col`}>
        {/* Sidebar Header */}
        <div className={`p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-purple-200'}`}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T3</span>
            </div>
            <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>T3 Chat</span>
          </div>
          
          <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={handleNewChat}>
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        {/* Search */}
        <div className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
            <Input 
              placeholder="Search your threads..." 
              className="pl-10 bg-purple-50 border-purple-200"
            />
          </div>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4">
          {chatHistory.map((chat) => (
            <div 
              key={chat.id} 
              className="p-3 rounded-lg hover:bg-purple-50 cursor-pointer mb-2"
              onClick={() => loadMessages(chat.id)}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-900 truncate">{chat.title}</span>
              </div>
              <span className="text-xs text-gray-500 ml-6">
                {new Date(chat.updated_at).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-purple-600" />
              <span className="text-sm text-gray-900">{user?.username}</span>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={toggleTheme}>
                {isDarkMode ? <Sun className="w-4 h-4 text-purple-600" /> : <Moon className="w-4 h-4 text-purple-600" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
                <Settings className="w-4 h-4 text-purple-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="w-4 h-4 text-purple-600" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-purple-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu className="w-4 h-4" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              How can I help you?
            </h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleTheme}
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-purple-50 to-pink-50">
          {messages.length === 0 ? (
            <div className="max-w-4xl mx-auto">
              {/* Category Buttons */}
              <div className="flex gap-4 justify-center mb-8">
                <Button variant="outline" className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-200">
                  ✨ Create
                </Button>
                <Button variant="outline" className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200">
                  📊 Explore
                </Button>
                <Button variant="outline" className="bg-pink-100 text-pink-700 border-pink-300 hover:bg-pink-200">
                  💻 Code
                </Button>
                <Button variant="outline" className="bg-green-100 text-green-700 border-green-300 hover:bg-green-200">
                  🎓 Learn
                </Button>
              </div>

              {/* Suggested Prompts */}
              <div className="space-y-3">
                {[
                  'How does AI work?',
                  'Are black holes real?',
                  'How many Rs are in the word "strawberry"?',
                  'What is the meaning of life?'
                ].map((prompt, index) => {
                  const colors = [
                    'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-800',
                    'border-green-300 bg-green-50 hover:bg-green-100 text-green-800', 
                    'border-pink-300 bg-pink-50 hover:bg-pink-100 text-pink-800',
                    'border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-800'
                  ]
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className={`w-full text-left justify-start h-auto p-4 ${colors[index]}`}
                      onClick={() => handlePromptClick(prompt)}
                    >
                      {prompt}
                    </Button>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl p-4 rounded-lg ${
                    message.sender === 'user' 
                      ? 'bg-purple-600 text-white' 
                      : 'bg-white border border-purple-200 text-gray-900 shadow-sm'
                  }`}>
                    {/* Attachments */}
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mb-3">
                        <div className="flex flex-wrap gap-2">
                          {message.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center bg-purple-100 rounded-lg p-2 text-sm">
                              {attachment.file_type.startsWith('image/') ? (
                                <img 
                                  src={`${API_URL}/api/attachments/file/${attachment.id}`}
                                  alt={attachment.filename}
                                  className="max-w-xs max-h-48 rounded object-cover"
                                />
                              ) : (
                                <span className="text-purple-800">📎 {attachment.filename}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <MessageRenderer text={message.text} />
                    <span className="text-xs opacity-70 mt-2 block">{message.timestamp}</span>
                  </div>
                </div>
              ))}
              
              {/* Streaming Message */}
              {isStreaming && streamingMessage && (
                <div className="flex justify-start">
                  <div className="max-w-3xl p-4 rounded-lg bg-white border border-purple-200 text-gray-900 shadow-sm">
                    <MessageRenderer text={streamingMessage} />
                    <div className="flex items-center mt-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                        <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                      </div>
                      <span className="text-xs text-purple-600 ml-2">AI sta scrivendo...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Input Area */}
        <div 
          className={`bg-white border-t border-purple-200 p-4 ${isDragging ? 'bg-purple-50 border-purple-400' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="max-w-4xl mx-auto">
            {error && (
              <div className="text-red-600 text-sm mb-2">{error}</div>
            )}
            
            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <div className="mb-4">
                <div className="bg-purple-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-purple-600 mt-1">Caricamento in corso... {uploadProgress}%</p>
              </div>
            )}

            {/* Attachments Preview */}
            {attachments.length > 0 && (
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <div key={attachment.id} className="flex items-center bg-purple-100 rounded-lg p-2 text-sm">
                      <span className="text-purple-800">{attachment.filename}</span>
                      <button 
                        onClick={() => removeAttachment(attachment.id)}
                        className="ml-2 text-purple-600 hover:text-purple-800"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isDragging && (
              <div className="mb-4 p-8 border-2 border-dashed border-purple-400 rounded-lg text-center">
                <p className="text-purple-600 font-medium">Rilascia i file qui per caricarli</p>
                <p className="text-sm text-purple-500">Supportati: immagini, PDF, documenti</p>
              </div>
            )}

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Textarea
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message here..."
                  className="min-h-[60px] resize-none border-purple-300 focus:border-purple-500 bg-purple-50"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() && attachments.length === 0}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Send className="w-4 h-4" />
                </Button>
                <label className="cursor-pointer">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    onChange={(e) => handleFileUpload(Array.from(e.target.files))}
                    accept="image/*,.pdf,.doc,.docx,.txt"
                  />
                  <Button variant="outline" size="sm" className="border-purple-300 text-purple-600 hover:bg-purple-50" asChild>
                    <span>
                      <Paperclip className="w-4 h-4" />
                    </span>
                  </Button>
                </label>
              </div>
            </div>
            
            {/* Model Selection */}
            <div className="flex items-center gap-4 mt-4">
              <select 
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-purple-100 border border-purple-300 rounded-md px-3 py-2 text-sm text-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 min-w-[200px]"
              >
                {models.map((model) => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
              <Button variant="outline" size="sm" className="border-purple-300 text-purple-600 hover:bg-purple-50">
                Search
              </Button>
              <span className="text-xs text-gray-500">Selected: {selectedModel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Impostazioni API</h2>
              <Button variant="ghost" onClick={() => setShowSettings(false)}>
                ✕
              </Button>
            </div>

            {/* Current API Keys */}
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Chiavi API Configurate</h3>
              {apiKeys.length === 0 ? (
                <p className="text-gray-500 text-sm">Nessuna chiave API configurata</p>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key) => (
                    <div key={key.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                      <div>
                        <span className="font-medium text-gray-900">{key.provider}</span>
                        <span className="text-sm text-gray-500 ml-2">{key.api_key_preview}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => deleteApiKey(key.id)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        Elimina
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New API Key */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-3">Aggiungi Nuova Chiave API</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={newApiKey.provider}
                    onChange={(e) => setNewApiKey({...newApiKey, provider: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">Seleziona provider</option>
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="anthropic">Anthropic (Claude)</option>
                    <option value="google">Google (Gemini)</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Chiave API</label>
                  <Input
                    type="password"
                    value={newApiKey.api_key}
                    onChange={(e) => setNewApiKey({...newApiKey, api_key: e.target.value})}
                    placeholder="Inserisci la tua chiave API"
                    className="w-full"
                  />
                </div>
                <Button 
                  onClick={addApiKey}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white"
                >
                  Salva Chiave API
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 rounded-md">
              <h4 className="font-medium text-blue-900 mb-2">Come ottenere le chiavi API:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>OpenAI:</strong> Vai su platform.openai.com → API keys</li>
                <li>• <strong>Anthropic:</strong> Vai su console.anthropic.com → API keys</li>
                <li>• <strong>Google:</strong> Vai su aistudio.google.com → Get API key</li>
                <li>• <strong>DeepSeek:</strong> Vai su platform.deepseek.com → API keys</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

