import React, { useState, useContext, useEffect } from 'react';
import { Context } from "../../../Context/Context.jsx";
import { MessageSquare, Settings, History, HelpCircle, Plus, ChevronLeft, Clock } from 'lucide-react';

const Sidebar = () => {
    const [extended, setExtended] = useState(true);
    const [conversations, setConversations] = useState([]);
    const { loadConversationHistory, newChat, conversationId } = useContext(Context);

    const fetchConversations = async () => {
        try {
            const response = await fetch('http://localhost:5000/conversations');
            const data = await response.json();
            setConversations(data);
        } catch (error) {
            console.error('Error fetching conversations:', error);
        }
    };

    useEffect(() => {
        fetchConversations();
        const interval = setInterval(fetchConversations, 30000);
        return () => clearInterval(interval);
    }, []);

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
        
        if (diffInHours < 24) {
            return diffInHours === 0 
                ? 'Just now'
                : `${diffInHours}h ago`;
        } else {
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric'
            });
        }
    };

    const getFirstMessage = (messages) => {
        const userMessage = messages.find(msg => msg.sender === 'user');
        return userMessage ? userMessage.content : 'New Conversation';
    };

    const menuItems = [
        { label: 'Help & Resources', icon: HelpCircle, onClick: () => window.open('https://giki.edu.pk/', '_blank') },
        { label: 'Chat History', icon: History },
        { label: 'Preferences', icon: Settings }
    ];

    const loadConversation = async (id) => {
        try {
            await loadConversationHistory(id);
        } catch (error) {
            console.error('Error loading conversation:', error);
        }
    };

    return (
        <div className={`${
            extended ? 'w-64' : 'w-20'
        } bg-gradient-to-b from-[#081159] to-[#060c3d] min-h-screen flex flex-col justify-between p-3 transition-all duration-300 ease-in-out relative group`}>
            <div className="space-y-6"
            							style={{
                                            '--scrollbar-width': 'none',
                                            '--scrollbar-track-bg': 'transparent',
                                            '--scrollbar-thumb-bg': 'transparent',
                                            '--scrollbar-thumb-hover-bg': 'transparent',
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: 'var(--scrollbar-thumb-bg) var(--scrollbar-track-bg)',
                                        }}
            >
                <div className="flex items-center space-x-3">
                    <button 
                        onClick={() => setExtended(!extended)}
                        className={`w-10 h-10 bg-[#e5ad3a] rounded-lg flex items-center justify-center transform transition-all duration-300 hover:bg-[#c99732] hover:scale-105 hover:shadow-lg ${extended ? '' : 'rotate-180'}`}
                        aria-label="Toggle Sidebar"
                    >
                        <ChevronLeft className="w-6 h-6 text-[#081159]" />
                    </button>
                    {extended && <span className="text-lg font-semibold text-white">GIKI Chat</span>}
                </div>

                <button
                    onClick={newChat}
                    className={`w-full flex items-center ${extended ? 'justify-start px-4' : 'justify-center'} space-x-3 py-3 bg-[#e5ad3a] hover:bg-[#c99732] rounded-xl transition-all duration-200 relative group/new`}
                >
                    <Plus className={`${extended ? 'w-5 h-5' : 'w-6 h-6'} text-[#081159]`} />
                    {extended ? (
                        <span className="text-[#081159] font-medium">New Chat</span>
                    ) : (
                        <div className="absolute left-20 bg-[#081159] text-white px-4 py-2 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/new:opacity-100 transition-opacity z-50">
                            New Chat
                        </div>
                    )}
                </button>

                {conversations.length > 0 && (
                    <div className="space-y-2 overflow-y-scroll h-[310px] pr-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-300 hover:scrollbar-thumb-slate-400">
                        {extended && <p className="text-sm font-medium text-[#e5ad3a] px-4">Recent Chats</p>}
                        <div className="space-y-1">
                            {conversations.map((conv) => (
                                <button
                                    key={conv._id}
                                    onClick={() => loadConversation(conv._id)}
                                    className={`w-full flex items-center ${extended ? 'justify-start px-4' : 'justify-center'} py-3 rounded-lg ${
                                        conversationId === conv._id ? 'bg-[#0a1873]/50' : 'hover:bg-[#0a1873]/50'
                                    } transition-all duration-200 group/item relative`}
                                >
                                    <MessageSquare className={`${extended ? 'w-5 h-5' : 'w-6 h-6'} ${
                                        conversationId === conv._id ? 'text-[#e5ad3a]' : 'text-gray-400 group-hover/item:text-[#e5ad3a]'
                                    } transition-colors`} />
                                    {extended ? (
                                        <div className="ml-3 flex-1 overflow-hidden">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm text-gray-300 truncate">
                                                    {getFirstMessage(conv.messages)}
                                                </span>
                                            </div>
                                            <div className="flex items-center mt-1">
                                                <Clock className="w-3 h-3 text-gray-400 mr-1" />
                                                <span className="text-xs text-gray-400">
                                                    {formatDate(conv.lastUpdated)}
                                                </span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="absolute left-20 bg-[#081159] text-white px-4 py-2 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/item:opacity-100 transition-opacity z-50">
                                            {getFirstMessage(conv.messages)}
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            <div className="space-y-1 pt-4 border-t border-[#0a1873]">
                {menuItems.map((item, index) => (
                    <button
                        key={index}
                        onClick={item.onClick}
                        className={`w-full flex items-center ${extended ? 'justify-start px-4' : 'justify-center'} py-3 rounded-lg hover:bg-[#0a1873]/50 transition-all duration-200 group/menu relative`}
                    >
                        <item.icon className={`${extended ? 'w-5 h-5' : 'w-6 h-6'} text-gray-400 group-hover/menu:text-[#e5ad3a] transition-colors`} />
                        {extended ? (
                            <span className="text-gray-300 ml-3 text-sm">{item.label}</span>
                        ) : (
                            <div className="absolute left-20 bg-[#081159] text-white px-4 py-2 rounded-md whitespace-nowrap opacity-0 pointer-events-none group-hover/menu:opacity-100 transition-opacity z-50">
                                {item.label}
                            </div>
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Sidebar;