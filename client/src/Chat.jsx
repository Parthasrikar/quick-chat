/* eslint-disable no-undef */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable no-unused-vars */
import { useContext, useEffect, useRef, useState, useCallback } from "react";
import { IoSend, IoArrowBack, IoMenu } from "react-icons/io5";
import { TfiJoomla } from "react-icons/tfi";
import Avatar from "./Avatar";
import { UserContext } from "./User";
import { uniqBy } from "lodash";
import axios from 'axios';
import Contact from "./Contact";

// Configuration for different environments
const getConfig = () => {
  const isDev = import.meta.env.DEV;
  
  // Debug logging - remove in production
  if (isDev) {
    console.log('Environment Variables:');
    console.log('VITE_API_URL:', import.meta.env.VITE_API_URL);
    console.log('VITE_WS_URL:', import.meta.env.VITE_WS_URL);
    console.log('Is Development:', isDev);
  }
  
  const config = {
    wsUrl: import.meta.env.VITE_WS_URL || (isDev ? "ws://localhost:3000" : "wss://quick-chat-backend-ddik.onrender.com"),
    apiUrl: import.meta.env.VITE_API_URL || (isDev ? "http://localhost:3000" : "https://quick-chat-backend-ddik.onrender.com")
  };

  // Ensure consistent configuration
  if (isDev) {
    console.log('Final Configuration:');
    console.log('Environment:', isDev ? 'development' : 'production');
    console.log('WebSocket URL:', config.wsUrl);
    console.log('API URL:', config.apiUrl);
  }

  return config;
};

const currentConfig = getConfig();
const isDevelopment = import.meta.env.DEV;

// Configure axios with interceptors for better error handling
axios.defaults.baseURL = currentConfig.apiUrl;
axios.defaults.withCredentials = true; // Important for authentication

// Add request interceptor to ensure consistent base URL
axios.interceptors.request.use(
  (config) => {
    // Ensure we're always using the correct base URL
    if (!config.url.startsWith('http')) {
      config.baseURL = currentConfig.apiUrl;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for better error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.log("Authentication error - user may need to log in again");
      // You might want to redirect to login or show a message
    }
    return Promise.reject(error);
  }
);

export default function Chat() {
  const [ws, setWs] = useState(null);
  const [people, setPeople] = useState({});
  const [offlinePeople, setOfflinePeople] = useState({});
  const [selectedUser, setSelectedUser] = useState(null);
  const [newMessageText, setNewMessageText] = useState("");
  const [messages, setMessages] = useState([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [error, setError] = useState(null);
  
  // Get user data from context
  const { username, id } = useContext(UserContext);
  
  // Refs
  const messagesContainer = useRef();
  const divUnderMessages = useRef();
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const maxReconnectAttempts = 5;

  // Cleanup function
  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, 'Component cleanup');
      }
      wsRef.current = null;
    }
  }, []);

  const handleMessage = useCallback((e) => {
    try {
      const message = JSON.parse(e.data);
      if (isDevelopment) {
        console.log("Received message:", message);
      }
      
      if ("online" in message) {
        showPeopleOnline(message.online);
      } else if ('text' in message) {
        setMessages((prevMessages) => [...prevMessages, { ...message }]);
      }
    } catch (error) {
      console.error("Error parsing WebSocket message:", error);
    }
  }, []);

  function showPeopleOnline(peopleArray) {
    const people = {};
    peopleArray.forEach(({ id: userId, username }) => {
      people[userId] = username;
    });
    const peopleExceptUser = { ...people };
    delete peopleExceptUser[id];
    setPeople(peopleExceptUser);
  }

  const connectToWs = useCallback(() => {
    if (!id) return;

    // Clear any existing timeout
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Close existing connection if any
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }

    setConnectionStatus('connecting');
    setError(null);
    
    if (isDevelopment) {
      console.log(`Connecting to: ${currentConfig.wsUrl}`);
    }
    
    try {
      const ws = new WebSocket(currentConfig.wsUrl);
      setWs(ws);
      wsRef.current = ws;
      
      ws.addEventListener("open", () => {
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        setError(null);
        if (isDevelopment) {
          console.log("WebSocket connected successfully");
        }
      });
      
      ws.addEventListener("message", handleMessage);
      
      ws.addEventListener("close", (event) => {
        setConnectionStatus('disconnected');
        if (isDevelopment) {
          console.log("WebSocket disconnected:", event.code, event.reason);
        }
        
        // Only reconnect if not a normal closure, user is still logged in, and we haven't exceeded max attempts
        if (event.code !== 1000 && id && reconnectAttempts < maxReconnectAttempts) {
          const attempts = reconnectAttempts + 1;
          setReconnectAttempts(attempts);
          
          // Exponential backoff with max delay
          const baseDelay = isDevelopment ? 1000 : 2000;
          const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempts - 1), 30000);
          const jitter = Math.random() * 1000;
          const reconnectDelay = exponentialDelay + jitter;
          
          if (isDevelopment) {
            console.log(`Attempting to reconnect in ${reconnectDelay}ms (attempt ${attempts})`);
          }
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (id) { // Double check user is still logged in
              connectToWs();
            }
          }, reconnectDelay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          setError("Unable to connect to chat server. Please refresh the page to try again.");
        }
      });

      ws.addEventListener("error", (error) => {
        setConnectionStatus('error');
        console.error("WebSocket error:", error);
        setError("Connection error occurred");
      });
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionStatus('error');
      setError("Failed to establish connection");
    }
  }, [id, reconnectAttempts, handleMessage]);

  useEffect(() => {
    if (id) {
      connectToWs();
    }
    
    return cleanup;
  }, [id, connectToWs, cleanup]);

  const sendMessage = useCallback((e) => {
    e.preventDefault();
    if (!newMessageText.trim() || !ws || !selectedUser || connectionStatus !== 'connected') return;
    
    if (isDevelopment) {
      console.log("Sending message:", newMessageText);
    }
    
    try {
      ws.send(JSON.stringify({
        recipient: selectedUser,
        text: newMessageText,
      }));
      
      setMessages(prev => ([...prev, {
        text: newMessageText,
        sender: id,
        recipient: selectedUser,
        _id: Date.now(),
      }]));
      
      setNewMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      setError("Failed to send message. Please try again.");
    }
  }, [newMessageText, ws, selectedUser, connectionStatus, id]);

  useEffect(() => {
    const div = divUnderMessages.current;
    const container = messagesContainer.current;
    
    if (div && container) {
      const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
      
      if (isScrolledToBottom || !isUserScrolling) {
        div.scrollIntoView({ behavior: 'smooth', block: "end" });
        setShowScrollToBottom(false);
      } else {
        setShowScrollToBottom(true);
      }
    }
  }, [messages, isUserScrolling]);

  const handleScroll = useCallback(() => {
    const container = messagesContainer.current;
    if (container) {
      const isScrolledToBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 50;
      setIsUserScrolling(!isScrolledToBottom);
      setShowScrollToBottom(!isScrolledToBottom);
    }
  }, []);

  const scrollToBottom = useCallback(() => {
    const div = divUnderMessages.current;
    if (div) {
      div.scrollIntoView({ behavior: 'smooth', block: "end" });
      setShowScrollToBottom(false);
      setIsUserScrolling(false);
    }
  }, []);

  useEffect(() => {
    if (selectedUser) {
      axios.get(`/messages/${selectedUser}`)
        .then(res => {
          if (isDevelopment) {
            console.log("Fetched messages:", res.data);
          }
          setMessages(res.data);
        })
        .catch(err => {
          console.error("Error fetching messages:", err);
          if (err.response?.status === 401) {
            setError("Authentication required. Please log in again.");
          } else if (err.response?.status >= 500) {
            setError("Server error. Please try again later.");
          } else {
            setError("Failed to load messages.");
          }
        });
    }
  }, [selectedUser]);

  useEffect(() => {
    if (id) {
      axios.get('/people')
        .then(res => {
          const offlinePeopleArr = res.data
            .filter(p => p._id !== id)
            .filter(p => !Object.keys(people).includes(p._id));
          const offlinePeople = {};
          offlinePeopleArr.forEach(p => {
            offlinePeople[p._id] = p;
          });
          setOfflinePeople(offlinePeople);
        })
        .catch(err => {
          console.error("Error fetching people:", err);
          if (err.response?.status === 401) {
            setError("Authentication required. Please log in again.");
          }
        });
    }
  }, [people, id]);

  const messagesWithoutDupes = uniqBy(messages, '_id');

  const handleContactSelect = useCallback((userId) => {
    setSelectedUser(userId);
    setShowSidebar(false);
    setError(null); // Clear any existing errors when selecting a new contact
  }, []);

  const selectedUserData = people[selectedUser] || offlinePeople[selectedUser]?.username;

  if (!id) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Error Banner */}
      {error && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-2 text-sm z-50 flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-white hover:text-gray-200">
            ✕
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div className={`${showSidebar ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:relative z-30 w-full sm:w-80 lg:w-1/3 xl:w-1/4 bg-indigo-100 transition-transform duration-300 ease-in-out h-full flex flex-col ${error ? 'mt-10' : ''}`}>
        {/* Header */}
        <div className="flex gap-2 items-center justify-between p-4 text-2xl sm:text-3xl text-indigo-700 bg-indigo-300/80 border-b border-indigo-400 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TfiJoomla />
            <h2 className="font-semibold">Quick Chat</h2>
          </div>
          <button
            onClick={() => setShowSidebar(false)}
            className="lg:hidden p-1 hover:bg-indigo-400/50 rounded-md transition-colors"
            aria-label="Close sidebar"
          >
            <IoArrowBack className="text-xl" />
          </button>
        </div>

        {/* Connection Status */}
        <div className={`px-4 py-2 text-xs font-medium flex-shrink-0 ${
          connectionStatus === 'connected' ? 'bg-green-100 text-green-800' :
          connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' :
          connectionStatus === 'error' ? 'bg-red-100 text-red-800' :
          'bg-red-100 text-red-800'
        }`}>
          {connectionStatus === 'connected' ? '🟢 Connected' :
           connectionStatus === 'connecting' ? '🟡 Connecting...' :
           connectionStatus === 'error' ? '🔴 Connection Error' :
           reconnectAttempts < maxReconnectAttempts ? 
             `🔴 Disconnected - Reconnecting... (${reconnectAttempts}/${maxReconnectAttempts})` :
             '🔴 Connection Failed'}
        </div>

        {/* Environment Indicator (only in development) */}
        {isDevelopment && (
          <div className="px-4 py-1 text-xs bg-blue-100 text-blue-800 flex-shrink-0">
            🔧 Development Mode
          </div>
        )}

        {/* Current User Info */}
        <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Avatar username={username} id={id} online={true} />
            <span className="text-sm font-medium text-indigo-800">You: {username}</span>
          </div>
        </div>

        {/* Contacts List - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Online Users */}
          {Object.keys(people).length > 0 && (
            <div className="px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50">
              ONLINE ({Object.keys(people).length})
            </div>
          )}
          {Object.keys(people).map((userId) => (
            <Contact 
              key={userId} 
              id={userId}
              username={people[userId]}
              onClick={() => handleContactSelect(userId)}
              selected={userId === selectedUser}
              online={true}
            />
          ))}
          
          {/* Offline Users */}
          {Object.keys(offlinePeople).length > 0 && (
            <div className="px-4 py-2 text-xs font-semibold text-gray-600 bg-gray-50">
              OFFLINE ({Object.keys(offlinePeople).length})
            </div>
          )}
          {Object.keys(offlinePeople).map((userId) => (
            <Contact 
              key={userId} 
              id={userId}
              username={offlinePeople[userId].username}
              onClick={() => handleContactSelect(userId)}
              selected={userId === selectedUser}
              online={false}
            />
          ))}
        </div>
      </div>

      {/* Overlay for mobile */}
      {showSidebar && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-20" 
          onClick={() => setShowSidebar(false)}
        />
      )}

      {/* Main Chat Area */}
      <div className={`flex-1 flex flex-col bg-indigo-50 h-full ${error ? 'mt-10' : ''}`}>
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-indigo-200 shadow-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSidebar(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-md transition-colors"
              aria-label="Open sidebar"
            >
              <IoMenu className="text-xl text-indigo-600" />
            </button>
            {selectedUser ? (
              <>
                <Avatar 
                  username={selectedUserData} 
                  id={selectedUser} 
                  online={!!people[selectedUser]} 
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{selectedUserData}</h3>
                  <p className="text-xs text-gray-500">
                    {people[selectedUser] ? 'Online' : 'Offline'}
                  </p>
                </div>
              </>
            ) : (
              <h3 className="font-semibold text-gray-900">Quick Chat</h3>
            )}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden min-h-0">
          {!selectedUser ? (
            <div className="flex items-center justify-center h-full text-indigo-400/60 text-center p-8">
              <div>
                <TfiJoomla className="text-6xl mb-4 mx-auto" />
                <p className="text-lg font-medium">Welcome to Quick Chat!</p>
                <p className="text-sm mt-2">Select a contact to start messaging</p>
                {isDevelopment && (
                  <p className="text-xs mt-4 text-blue-500">Running in development mode</p>
                )}
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col relative">
              <div 
                ref={messagesContainer}
                className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0"
                onScroll={handleScroll}
              >
                {messagesWithoutDupes.map((message) => (
                  <div 
                    key={message._id} 
                    className={`flex ${message.sender === id ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl px-4 py-2 rounded-2xl text-sm break-words ${
                      message.sender === id 
                        ? "bg-indigo-500 text-white rounded-br-md" 
                        : "bg-white text-gray-800 rounded-bl-md border border-gray-200"
                    }`}>
                      {message.text}
                    </div>
                  </div>
                ))}
                <div ref={divUnderMessages} />
              </div>
              
              {/* Scroll to bottom button */}
              {showScrollToBottom && (
                <button
                  onClick={scrollToBottom}
                  className="absolute bottom-4 right-4 bg-indigo-500 hover:bg-indigo-600 text-white p-3 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 z-10"
                  aria-label="Scroll to bottom"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Message Input */}
        {selectedUser && (
          <div className="p-4 bg-white border-t border-indigo-200 flex-shrink-0">
            <form className="flex gap-2" onSubmit={sendMessage}>
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
                placeholder={connectionStatus === 'connected' ? "Type your message..." : "Connecting..."}
                disabled={connectionStatus !== 'connected'}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || connectionStatus !== 'connected'}
                className="p-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                aria-label="Send message"
              >
                <IoSend className="text-lg" />
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}