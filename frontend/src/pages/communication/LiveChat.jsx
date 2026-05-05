import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Phone, Video, MoreVertical, Smile, Paperclip } from 'lucide-react';

const LiveChat = () => {
  const { t } = useTranslation();
  const [selectedContact, setSelectedContact] = useState(0);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([
    { id: 1, sender: 'teacher', text: 'Hello! How can I help you today?', time: '10:30 AM' },
    { id: 2, sender: 'parent', text: 'I wanted to check on my child\'s progress in Mathematics', time: '10:31 AM' },
    { id: 3, sender: 'teacher', text: 'John is doing well. He scored 85% on the recent exam.', time: '10:32 AM' },
    { id: 4, sender: 'parent', text: 'That\'s great news! Thank you for the update.', time: '10:33 AM' },
  ]);
  
  const messagesEndRef = useRef(null);
  const [role, setRole] = useState('parent'); // 'parent' or 'teacher'

  const contacts = role === 'parent' 
    ? [
        { id: 1, name: 'Mr. Smith', subject: 'Mathematics', avatar: '👨‍🏫', status: 'online', unread: 0 },
        { id: 2, name: 'Mrs. Kankunda', subject: 'Biology', avatar: '👩‍🏫', status: 'offline', unread: 0 },
        { id: 3, name: 'Mr. Mugisha', subject: 'Physics', avatar: '👨‍🏫', status: 'online', unread: 2 }
      ]
    : [
        { id: 1, name: 'Jane Doe', child: 'John Doe', avatar: '👩', status: 'online', unread: 0 },
        { id: 2, name: 'Peter Smith', child: 'Alice Smith', avatar: '👨', status: 'offline', unread: 1 },
        { id: 3, name: 'Mary Johnson', child: 'Eric Johnson', avatar: '👩', status: 'online', unread: 0 }
      ];

  const currentContact = contacts[selectedContact];

  const sendMessage = () => {
    if (message.trim()) {
      setMessages([...messages, {
        id: messages.length + 1,
        sender: role,
        text: message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="h-[calc(100vh-8rem)]">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Contacts Sidebar */}
        <div className="card overflow-hidden flex flex-col lg:col-span-1">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="font-semibold">Chats</h2>
            <p className="text-sm text-gray-500 mt-1">
              {role === 'parent' ? 'Your child\'s teachers' : 'Parents'}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {contacts.map((contact, index) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(index)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  selectedContact === index ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-xl">
                    {contact.avatar}
                  </div>
                  {contact.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-success rounded-full border-2 border-white dark:border-gray-800"></div>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-sm text-gray-500">
                    {role === 'parent' ? contact.subject : contact.child}
                  </p>
                </div>
                {contact.unread > 0 && (
                  <div className="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">{contact.unread}</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Chat Area */}
        <div className="card overflow-hidden flex flex-col lg:col-span-2">
          {/* Chat Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-xl">
                {currentContact?.avatar}
              </div>
              <div>
                <p className="font-semibold">{currentContact?.name}</p>
                <p className="text-xs text-gray-500">
                  {role === 'parent' ? currentContact?.subject : currentContact?.child}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Phone className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Video className="w-4 h-4" />
              </button>
              <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender === role ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    msg.sender === role
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                  }`}
                >
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${
                    msg.sender === role ? 'text-primary-100' : 'text-gray-500'
                  }`}>
                    {msg.time}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-end gap-2">
              <div className="flex gap-1">
                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Paperclip className="w-5 h-5 text-gray-500" />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                  <Smile className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t('communication.typeMessage')}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows="1"
              />
              <button
                onClick={sendMessage}
                className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveChat;