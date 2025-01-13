import React, { useContext, useRef, useEffect, useState } from 'react';
import { Context } from "../../../Context/Context.jsx";
import { Send, User, Compass, Lightbulb, Users, PlusCircle, Loader2 } from 'lucide-react';

const TypeWriter = ({ content }) => {
  const [displayContent, setDisplayContent] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [paragraphs, setParagraphs] = useState([]);
  const [currentParagraph, setCurrentParagraph] = useState(0);
  const [currentChar, setCurrentChar] = useState(0);

  useEffect(() => {
    setIsTyping(true);
    setDisplayContent('');
    
    const paraList = content.match(/<p>(.*?)<\/p>/g) || [];
    setParagraphs(paraList.map(p => p.replace(/<\/?p>/g, '')));
    setCurrentParagraph(0);
    setCurrentChar(0);
  }, [content]);

  useEffect(() => {
    if (!paragraphs.length) return;

    const timer = setInterval(() => {
      if (currentParagraph < paragraphs.length) {
        const para = paragraphs[currentParagraph];
        
        if (currentChar < para.length) {
          setDisplayContent(prev => {
            const currentContent = prev.split('</p>');
            currentContent[currentParagraph] = currentContent[currentParagraph] || '<p>';
            currentContent[currentParagraph] += para[currentChar];
            return currentContent.join('</p>');
          });
          setCurrentChar(prev => prev + 1);
        } else {
          if (currentParagraph < paragraphs.length - 1) {
            setCurrentParagraph(prev => prev + 1);
            setCurrentChar(0);
            setDisplayContent(prev => `${prev}</p><p>`);
          } else {
            setIsTyping(false);
            clearInterval(timer);
          }
        }
      }
    }, 20);

    return () => clearInterval(timer);
  }, [paragraphs, currentParagraph, currentChar]);

  const getDisplayHTML = () => {
    if (!isTyping) {
      return content;
    }
    return `${displayContent}${isTyping ? '<span class="animate-pulse">▋</span>' : ''}</p>`;
  };

  return (
    <div 
      className="prose prose-lg prose-blue max-w-none leading-relaxed"
      dangerouslySetInnerHTML={{ __html: getDisplayHTML() }}
    />
  );
};

const ConversationMessages = ({ messages, loading }) => {
  const currentTimestamp = Date.now(); 
  const isRecent = (timestamp) => currentTimestamp - new Date(timestamp).getTime() < 3000; 

  return (
    <div className="space-y-12 max-w-5xl mx-auto">
      {messages.map((message, index) => (
        message.sender === 'user' ? (
          <div key={index} className="flex justify-end items-start gap-8 animate-fade-in">
            <div className="flex-1 flex justify-end">
              <div className="bg-[#081159] text-white px-8 py-6 rounded-2xl shadow-lg transform transition-all duration-300 hover:shadow-xl min-w-[200px] max-w-[85%]">
                <p className="font-medium leading-relaxed whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
            <div className="flex flex-col items-center pt-2">
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-700 flex items-center justify-center text-white font-semibold shadow-lg">
                MS
              </div>
              <span className="text-xs text-gray-500 mt-2">Student</span>
            </div>
          </div>
        ) : (
          <div key={index} className="flex justify-start items-start gap-8 animate-fade-in">
            <div className="flex flex-col items-center pt-2">
              <img
                src="https://giki.edu.pk/wp-content/uploads/2023/03/cropped-giki-logo-updated.png"
                alt="GIKI AI"
                className="w-12 h-12 rounded-xl shadow-lg border-2 border-[#081159]/10"
              />
              <span className="text-xs text-gray-500 mt-2">AI Assistant</span>
            </div>
            <div className="flex-1 min-w-[200px] max-w-[85%]">
              <div className="bg-white px-8 py-6 rounded-2xl shadow-lg border-2 border-[#081159]/5 transform transition-all duration-300 hover:shadow-xl">
                {isRecent(message.timestamp) ? (
                  <TypeWriter content={message.content} />
                ) : (
                  <div
                    className="prose prose-lg prose-blue max-w-none leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: message.content }}
                  />
                )}
              </div>
            </div>
          </div>
        )
      ))}
      
      {loading && (
        <div className="flex justify-start items-start gap-8 animate-fade-in">
          <div className="flex flex-col items-center pt-2">
            <img
              src="https://giki.edu.pk/wp-content/uploads/2023/03/cropped-giki-logo-updated.png"
              alt="GIKI AI"
              className="w-12 h-12 rounded-xl shadow-lg border-2 border-[#081159]/10"
            />
            <span className="text-xs text-gray-500 mt-2">AI Assistant</span>
          </div>
          <div className="flex-1 min-w-[200px] max-w-[85%]">
            <div className="bg-white px-8 py-6 rounded-2xl shadow-lg border-2 border-[#081159]/5 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[#081159] animate-spin mr-2" />
              <span className="text-gray-600">Generating response...</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Main = () => {
  const {
    input,
    setInput,
    showResult,
    loading,
    messages,
    onSent,
    newChat,
    error
  } = useContext(Context);

  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const suggestions = [
    { text: "Campus Facilities", icon: Compass, description: "Learn about GIKI's facilities and locations" },
    { text: "Academic Programs", icon: Lightbulb, description: "Explore degrees and courses offered" },
    { text: "Student Life", icon: Users, description: "Discover campus activities and societies" }
  ];

  const handleSuggestionClick = (text) => {
    setInput(text);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSent();
    }
  };

  return (
    <div className="relative flex-1 h-screen overflow-hidden bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-[#081159] to-[#0a1873] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img 
                src="https://giki.edu.pk/wp-content/uploads/2023/03/cropped-giki-logo-updated.png"
                alt="GIKI Logo"
                className="h-12 w-12 rounded-xl"
              />
              <div>
                <h1 className="text-xl font-bold">GIKI ChatBot</h1>
                <p className="text-sm text-[#e5ad3a]">Your Campus Assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                onClick={newChat}
                className="flex items-center space-x-2 p-2 rounded-xl hover:bg-white/10 transition-colors duration-200"
                title="New Chat"
              >
                <PlusCircle className="w-6 h-6" />
              </button>
              <button className="p-2 rounded-xl hover:bg-white/10 transition-colors duration-200">
                <User className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div 
        ref={chatContainerRef}
        className="h-[calc(100vh-140px)] overflow-y-auto pb-24 scroll-smooth"
      >
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {error && (
            <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl border border-red-200">
              {error}
            </div>
          )}
          
          {!showResult ? (
            <div className="space-y-8">
              <div className="text-center space-y-4">
                <h2 className="text-4xl font-bold bg-gradient-to-r from-[#081159] to-[#460f0b] bg-clip-text text-transparent">
                  How can I assist you today?
                </h2>
                <p className="text-gray-600">Ask me anything about GIKI or choose from the suggestions below</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {suggestions.map((item, index) => (
                  <div
                    key={index}
                    onClick={() => handleSuggestionClick(item.text)}
                    className="group bg-white p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 cursor-pointer border border-gray-100 hover:border-[#081159]"
                  >
                    <div className="flex flex-col items-center space-y-4">
                      <div className="p-4 bg-[#081159]/10 rounded-xl group-hover:bg-[#081159]/20 transition-colors duration-300">
                        <item.icon className="w-8 h-8 text-[#081159]" />
                      </div>
                      <div className="space-y-2 text-center">
                        <p className="text-lg font-semibold text-gray-900">{item.text}</p>
                        <p className="text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <ConversationMessages messages={messages} loading={loading} />
              <div ref={messagesEndRef} />
            </>
          )}
        </main>
      </div>

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white to-transparent pt-6">
        <div className="max-w-3xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center space-x-4">
              <textarea
                rows="1"
                onChange={(e) => setInput(e.target.value)}
                value={input}
                placeholder="Type your message..."
                onKeyDown={handleKeyDown}
                className="flex-1 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#081159] focus:border-transparent outline-none transition-all resize-none overflow-hidden"
                style={{ minHeight: '56px', maxHeight: '200px' }}
              />
              <button
                onClick={() => onSent()}
                disabled={loading || !input.trim()}
                className={`p-4 bg-[#081159] text-white rounded-xl transition-all duration-200 shadow-md hover:shadow-xl ${
                  loading || !input.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#0a1873]'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="mt-3 text-xs text-center text-gray-500">
              Press Enter to send • Shift + Enter for new line
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Main;