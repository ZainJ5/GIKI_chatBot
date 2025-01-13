import { createContext, useState, useCallback } from "react";

const API_URL = 'http://localhost:5000';

export const Context = createContext(null);

const ContextProvider = ({ children }) => {
    const [state, setState] = useState({
        input: "",
        recentInput: "",
        conversationId: null,
        messages: [],
        showResult: false,
        loading: false,
        resultData: "",
        error: null
    });

    const updateState = useCallback((updates) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    const extractContent = (text) => {
        const patterns = [
            /content=['"](.+?)['"](\s|$)/,  
            /content=(.+?)(\s|$)/         
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }
        return text; 
    };

    const parseResponse = (response) => {
        console.log("Response is: ", response);
        if (!response) return "No response received.";
        
        try {
            let content = response;
    
            if (typeof response === 'string' && response.includes('content=')) {
                const singleQuoteMatch = response.match(/content='([\s\S]*?)'(\s|$)/);
                const doubleQuoteMatch = response.match(/content="([\s\S]*?)"(\s|$)/);
                
                if (singleQuoteMatch) {
                    content = singleQuoteMatch[1];
                } else if (doubleQuoteMatch) {
                    content = doubleQuoteMatch[1];
                } else {
                    const basicMatch = response.match(/content=([\s\S]*?)(\s|$)/);
                    if (basicMatch) {
                        content = basicMatch[1];
                    }
                }
            }
            else if (typeof response === 'object' && response.content) {
                content = response.content;
            }
    

            content = content.replace(/\\(['"])/g, '$1');
            
            content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            
            const paragraphs = content.split(/\\n/)
                .filter(para => para.trim())
                .map(para => `<p>${para.trim()}</p>`)
                .join('');
    
            console.log("Parsed content:", paragraphs);
            return paragraphs;
        } catch (error) {
            console.error('Error parsing response:', error);
            return "Error parsing response content.";
        }
    };

    const loadConversationHistory = useCallback(async (conversationId) => {
        try {
            updateState({ loading: true });
            
            const response = await fetch(`${API_URL}/conversations/${conversationId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const conversation = await response.json();
            
            const formattedMessages = conversation.messages.map(msg => ({
                ...msg,
                content: msg.sender === 'bot' ? parseResponse(msg.content) : msg.content
            }));

            updateState({
                conversationId,
                messages: formattedMessages,
                showResult: true,
                loading: false,
                input: "" 
            });
        } catch (error) {
            console.error('Error loading conversation history:', error);
            updateState({
                loading: false,
                error: `Error loading conversation: ${error.message}`
            });
        }
    }, []);

    const newChat = useCallback(async () => {
        updateState({ 
            loading: false,
            showResult: false,
            resultData: "",
            input: "",
            conversationId: null,
            messages: [],
            error: null
        });
    }, []);

    const onSent = useCallback(async (prompt) => {
        const questionPrompt = prompt || state.input;
        if (!questionPrompt.trim()) {
            updateState({
                error: "Please enter a valid question.",
                loading: false
            });
            return;
        }

        const userMessage = {
            sender: 'user',
            content: questionPrompt,
            timestamp: new Date().toISOString()
        };

        updateState({
            messages: [...state.messages, userMessage],
            resultData: "",
            loading: true,
            showResult: true,
            input: "",
            recentInput: questionPrompt,
            error: null
        });

        try {
            const response = await fetch(`${API_URL}/ask`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question: questionPrompt,
                    conversationId: state.conversationId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            const formattedContent = parseResponse(data.answer);
            const newConversationId = data.conversationId;

            if (!state.conversationId) {
                updateState({ conversationId: newConversationId });
            }

            await loadConversationHistory(newConversationId);

        } catch (error) {
            console.error('Error in onSent:', error);
            updateState({
                error: `Error: ${error.message}. Please try again.`,
                loading: false
            });
        } finally {
            updateState({ loading: false });
        }
    }, [state.conversationId, state.input, state.messages, loadConversationHistory]);

    const contextValue = {
        ...state,
        setInput: (input) => updateState({ input }),
        newChat,
        onSent,
        loadConversationHistory
    };

    return (
        <Context.Provider value={contextValue}>
            {children}
        </Context.Provider>
    );
};

export default ContextProvider;