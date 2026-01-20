
import React, { useState, useEffect, useRef } from 'react';
import { User, PropertyListing, ChatMessage } from '../types.ts';
import { Icons } from '../constants.tsx';

interface ChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  listing: PropertyListing;
}

const ChatOverlay: React.FC<ChatOverlayProps> = ({ isOpen, onClose, user, listing }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting from owner
      setMessages([{
        id: 'welcome',
        senderId: 'owner',
        text: `Hi ${user.name.split(' ')[0]}! Thanks for inquiring about my property "${listing.title}". How can I help you today?`,
        timestamp: Date.now()
      }]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newUserMessage: ChatMessage = {
      id: Date.now().toString(),
      senderId: user.id,
      text: inputText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputText('');

    // Simulate owner response
    setTimeout(() => {
      const responses = [
        "That sounds good. Would you like to schedule a visit this weekend?",
        "Yes, the price is slightly negotiable if you're interested in a long-term lease.",
        "The property is currently available. Can I call you to discuss details?",
        "Sure, I can send you more photos on WhatsApp if you prefer."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        senderId: 'owner',
        text: randomResponse,
        timestamp: Date.now()
      }]);
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-lg h-[600px] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-8 duration-300">
        {/* Chat Header */}
        <div className="bg-teal-600 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center font-bold text-lg">
                {listing.ownerName.charAt(0)}
             </div>
             <div>
               <h3 className="font-bold leading-none">{listing.ownerName}</h3>
               <p className="text-[10px] text-teal-100 uppercase mt-1 tracking-wider">Property Owner</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-teal-700 rounded-full transition-colors">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Listing Context */}
        <div className="bg-slate-50 p-3 border-b border-slate-100 flex items-center gap-3">
           <img src={listing.imageUrl} className="w-12 h-12 rounded-lg object-cover" alt="" />
           <div className="overflow-hidden">
             <p className="text-xs font-bold text-slate-700 truncate">{listing.title}</p>
             <p className="text-[10px] text-teal-600 font-bold">₹ {listing.price.toLocaleString()}</p>
           </div>
        </div>

        {/* Message Area */}
        <div className="flex-grow overflow-y-auto p-6 space-y-4">
          {messages.map((msg) => {
            const isMe = msg.senderId === user.id;
            return (
              <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium ${
                  isMe ? 'bg-teal-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-700 rounded-tl-none'
                }`}>
                  {msg.text}
                  <p className={`text-[9px] mt-1 ${isMe ? 'text-teal-200' : 'text-slate-400'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
           <div className="flex items-center gap-2 bg-slate-50 rounded-2xl p-2 pl-4 border border-slate-200 focus-within:border-teal-400 transition-all">
             <input 
               type="text" 
               placeholder="Type a message..."
               className="flex-grow bg-transparent outline-none text-sm font-medium py-2"
               value={inputText}
               onChange={(e) => setInputText(e.target.value)}
               onKeyPress={(e) => e.key === 'Enter' && handleSend()}
             />
             <button 
               onClick={handleSend}
               className="bg-teal-600 text-white p-2.5 rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20"
             >
               <Icons.Send />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatOverlay;
