
from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import logging
from datetime import datetime
from bson import ObjectId
from pymongo import MongoClient
from langchain.schema import Document
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain_community.vectorstores import FAISS
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnablePassthrough
from dotenv import load_dotenv


load_dotenv()


logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('chatbot.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class ChatbotApp:
    def __init__(self):
        self.app = Flask(__name__)
        self.setup_cors()
        self.setup_mongodb()
        self.setup_config()
        self.retriever = None
        self.setup_routes()
        
        
        self.load_data()

    def setup_cors(self):
        CORS(self.app, resources={
            r"/*": {
                "origins": ["http://localhost:5174"],
                "methods": ["GET", "POST", "OPTIONS"],
                "allow_headers": ["Content-Type", "Authorization"]
            }
        })

    def setup_mongodb(self):
        try:
            self.client = MongoClient('mongodb://localhost:27017/')
            self.db = self.client.chatbot
            self.client.admin.command('ping')
            logger.info("Successfully connected to MongoDB")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")
            raise

    def setup_config(self):
        self.OPENAI_API_KEY = "Open_AI-API-KEY"
        if not self.OPENAI_API_KEY:
            logger.error("OpenAI API key not found in environment variables")
            raise ValueError("OpenAI API key not set in environment variables")

        self.JSON_PATH = os.path.join(os.path.dirname(__file__), "data.json")
        if not os.path.exists(self.JSON_PATH):
            logger.error(f"Data file not found at {self.JSON_PATH}")
            raise FileNotFoundError(f"Data file not found at {self.JSON_PATH}")

    def create_document(self, source, post):
        document_mappings = {
            "Instagram": lambda: Document(
                page_content=f"Instagram Post: {post.get('caption', '')}",
                metadata={
                    "source": "Instagram",
                    "date": post.get("date"),
                    "type": post.get("type"),
                    "image_url": post.get("image_url"),
                    "extracted_text": post.get("extracted_text")
                }
            ),
            "Reddit": lambda: Document(
                page_content=f"Reddit Post: {post.get('title', '')} - {post.get('content', '')}",
                metadata={
                    "source": "Reddit",
                    "date": post.get("date"),
                    "type": post.get("type"),
                    "author": post.get("author"),
                    "url": post.get("url"),
                    "comments": post.get("comments", [])
                }
            ),
            
        }
        return document_mappings.get(source, lambda: None)()

    def process_documents(self, documents, chunk_size=500, chunk_overlap=50):
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len
        )
        chunks = []
        for doc in documents:
            if len(doc.page_content) > chunk_size:
                chunks.extend(text_splitter.split_documents([doc]))
            else:
                chunks.append(doc)
        return chunks

    def load_data(self):
        try:
            logger.info("Loading data from JSON file")
            with open(self.JSON_PATH, 'r', encoding='utf8') as f:
                data = json.load(f)

            documents = []
            for source_obj in data:
                source = source_obj.get("source")
                for post in source_obj.get("data", []):
                    if doc := self.create_document(source, post):
                        documents.append(doc)

            processed_chunks = self.process_documents(documents)
            embeddings = OpenAIEmbeddings(openai_api_key=self.OPENAI_API_KEY)
            vectorstore = FAISS.from_documents(processed_chunks, embeddings)
            self.retriever = vectorstore.as_retriever()
            
            logger.info(f"Data loaded successfully. Total chunks: {len(processed_chunks)}")
            return True
        except Exception as e:
            logger.error(f"Error loading data: {str(e)}")
            return False

    def setup_routes(self):
        @self.app.route('/health')
        def health_check():
            return jsonify({
                "status": "healthy",
                "retriever_status": "initialized" if self.retriever else "not initialized",
                "timestamp": datetime.utcnow().isoformat()
            })

        @self.app.route('/ask', methods=['POST'])
        def ask_question():
            try:
                data = request.json
                question = data.get("question")
                conversation_id = data.get("conversationId")

                if not question:
                    return jsonify({"error": "Question is required"}), 400

                if not conversation_id:
                    
                    result = self.db.conversations.insert_one({
                        'messages': [],
                        'startedAt': datetime.utcnow(),
                        'lastUpdated': datetime.utcnow()
                    })
                    conversation_id = str(result.inserted_id)

                
                self.db.conversations.update_one(
                    {"_id": ObjectId(conversation_id)},
                    {
                        "$push": {"messages": {
                            "content": question,
                            "sender": "user",
                            "timestamp": datetime.utcnow()
                        }},
                        "$set": {"lastUpdated": datetime.utcnow()}
                    }
                )

                
                template = """
                Question: {question}
                Context: {context}
                
                Instructions:
                1. Comprehensive Analysis:
                   - Carefully analyze the provided context
                   - Identify key information directly relevant to the question
                   - Extract precise, factual details
                
                2. Answer Evaluation:
                   - If context provides sufficient information:
                     * Construct a concise, accurate answer
                     * Directly cite source information
                     * Use clear, precise language
                   
                   - If context is insufficient or irrelevant:
                     * Use your dataset to answer the question
                     * Answer that question on your own
                     * Use web to get the most rellevant information 
                     * Clearly state "Insufficient contextual information"
                     * Provide a disclaimer about potential limitations
                     * Offer guidance on seeking additional sources
                
                3. Response Formatting:
                   - Begin with a direct, clear answer
                   - Use bullet points or numbered lists if explaining complex information
                   - Include source credibility indicators when possible
                   - Maintain objectivity and neutrality
                
                4. Additional Guidance:
                   - Recommend verification for time-sensitive or rapidly changing information
                   - Suggest consulting domain experts or primary sources for critical decisions
                
                Answer Template:
                [Concise Direct Answer]
                            
                Detailed Explanation:
                [Optional expanded context and reasoning]

                Don't start the answer with Answer heading just give answer that I can directly show on UI
                """

                prompt = ChatPromptTemplate.from_template(template)
                llm = ChatOpenAI(openai_api_key=self.OPENAI_API_KEY, model_name="gpt-4o-mini")
                rag_chain = (
                    {"context": self.retriever, "question": RunnablePassthrough()}
                    | prompt
                    | llm
                )

                response = rag_chain.invoke(question)
                answer = str(response)

                
                self.db.conversations.update_one(
                    {"_id": ObjectId(conversation_id)},
                    {
                        "$push": {"messages": {
                            "content": answer,
                            "sender": "bot",
                            "timestamp": datetime.utcnow()
                        }},
                        "$set": {"lastUpdated": datetime.utcnow()}
                    }
                )

                return jsonify({
                    "answer": answer,
                    "conversationId": conversation_id
                })

            except Exception as e:
                logger.error(f"Error processing question: {str(e)}")
                return jsonify({"error": str(e)}), 500

        @self.app.route('/conversations/<conversation_id>', methods=['GET'])
        def get_conversation(conversation_id):
            try:
                conversation = self.db.conversations.find_one(
                    {"_id": ObjectId(conversation_id)}
                )
                if not conversation:
                    return jsonify({"error": "Conversation not found"}), 404
                
                conversation['_id'] = str(conversation['_id'])
                return jsonify(conversation)
            except Exception as e:
                logger.error(f"Error retrieving conversation: {str(e)}")
                return jsonify({"error": str(e)}), 500

        @self.app.route('/conversations', methods=['GET'])
        def get_all_conversations():
            try:
                conversations = list(self.db.conversations.find().sort("lastUpdated", -1))
                for conv in conversations:
                    conv['_id'] = str(conv['_id'])
                return jsonify(conversations)
            except Exception as e:
                logger.error(f"Error retrieving conversations: {str(e)}")
                return jsonify({"error": str(e)}), 500

    def run(self):
        port = int(os.getenv("PORT", 5000))
        self.app.run(host='0.0.0.0', port=port)

if __name__ == "__main__":
    chatbot = ChatbotApp()
    chatbot.run()
