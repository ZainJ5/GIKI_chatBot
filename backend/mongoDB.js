const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/chatbot', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

const messageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  sender: {
    type: String,
    required: true,
    enum: ['user', 'bot']
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const conversationSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true
  },
  messages: [messageSchema],
  startedAt: {
    type: Date,
    default: Date.now
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'ended'],
    default: 'active'
  }
});

const Conversation = mongoose.model('Conversation', conversationSchema);

const conversationManager = {
  async createConversation(userId) {
    try {
      const conversation = new Conversation({
        userId,
        messages: []
      });
      return await conversation.save();
    } catch (err) {
      console.error('Error creating conversation:', err);
      throw err;
    }
  },

  async addMessage(conversationId, content, sender) {
    try {
      return await Conversation.findByIdAndUpdate(
        conversationId,
        {
          $push: { messages: { content, sender } },
          $set: { lastUpdated: Date.now() }
        },
        { new: true }
      );
    } catch (err) {
      console.error('Error adding message:', err);
      throw err;
    }
  },

  async getConversation(conversationId) {
    try {
      return await Conversation.findById(conversationId);
    } catch (err) {
      console.error('Error retrieving conversation:', err);
      throw err;
    }
  },

  async getUserConversations(userId) {
    try {
      return await Conversation.find({ userId }).sort({ lastUpdated: -1 });
    } catch (err) {
      console.error('Error retrieving user conversations:', err);
      throw err;
    }
  },

  async endConversation(conversationId) {
    try {
      return await Conversation.findByIdAndUpdate(
        conversationId,
        { status: 'ended' },
        { new: true }
      );
    } catch (err) {
      console.error('Error ending conversation:', err);
      throw err;
    }
  }
};

module.exports = {
  connectDB,
  Conversation,
  conversationManager
};