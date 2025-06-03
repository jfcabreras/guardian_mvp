
import React, { useState, useEffect } from 'react';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, orderBy, onSnapshot } from 'firebase/firestore';

const Messages = ({ setSelectedSection, user }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      const unsubscribe = onSnapshot(
        query(
          collection(db, "messages"),
          where("conversationId", "==", selectedConversation.id),
          orderBy("timestamp", "asc")
        ),
        (snapshot) => {
          const messagesList = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setMessages(messagesList);
        }
      );

      return () => unsubscribe();
    }
  }, [selectedConversation]);

  const fetchConversations = async () => {
    try {
      const q = query(
        collection(db, "conversations"),
        where("participants", "array-contains", user.uid)
      );
      const snapshot = await getDocs(q);
      const convs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConversations(convs);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await addDoc(collection(db, "messages"), {
        conversationId: selectedConversation.id,
        senderId: user.uid,
        senderEmail: user.email,
        text: newMessage.trim(),
        timestamp: new Date(),
        read: false
      });
      setNewMessage('');
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  if (loading) {
    return (
      <div className="messages-section">
        <div className="loading">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="messages-section">
      <div className="messages-header">
        <button onClick={() => setSelectedSection('main')} className="back-btn">
          ← Back
        </button>
        <h2>Messages</h2>
      </div>

      <div className="messages-container">
        {/* Conversations List */}
        <div className="conversations-list">
          <h3>Conversations</h3>
          {conversations.length === 0 ? (
            <div className="empty-conversations">
              <p>No conversations yet</p>
              <p>Send someone a message to start chatting!</p>
            </div>
          ) : (
            conversations.map(conv => (
              <div 
                key={conv.id}
                className={`conversation-item ${selectedConversation?.id === conv.id ? 'active' : ''}`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className="conversation-avatar">
                  {conv.participantEmails?.find(email => email !== user.email)?.[0] || '?'}
                </div>
                <div className="conversation-info">
                  <div className="conversation-name">
                    {conv.participantEmails?.find(email => email !== user.email) || 'Unknown'}
                  </div>
                  <div className="conversation-preview">
                    {conv.lastMessage || 'No messages yet'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Messages View */}
        <div className="messages-view">
          {selectedConversation ? (
            <>
              <div className="messages-header-chat">
                <h4>
                  💬 {selectedConversation.participantEmails?.find(email => email !== user.email) || 'Unknown'}
                </h4>
              </div>
              
              <div className="messages-list">
                {messages.map(message => (
                  <div 
                    key={message.id}
                    className={`message-item ${message.senderId === user.uid ? 'own' : 'other'}`}
                  >
                    <div className="message-content">
                      <div className="message-text">{message.text}</div>
                      <div className="message-time">
                        {message.timestamp?.toDate?.()?.toLocaleTimeString() || 'Just now'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="message-input-container">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="message-input"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                    }
                  }}
                />
                <button 
                  onClick={sendMessage}
                  className="send-message-btn"
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </div>
            </>
          ) : (
            <div className="no-conversation-selected">
              <p>Select a conversation to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;
