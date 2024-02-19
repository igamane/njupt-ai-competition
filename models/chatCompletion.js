
const mongoose = require('mongoose');
const schema = mongoose.Schema;

 
const chatSchema = new schema({
    chatPhoto: {
        url: String,
        filename: String
    },
    chatName: {
        type: String,
        require: true,
    }, 
    model: {
        type: String,
        require: true,
    },
    chatSystemPrompt: {
        type: String,
        require: true,
    },
    chatDescription: {
        type: String,
        require: true,
    }, 
    usageLimit: {
        type: Number,
        require: true
    }
},
    { timestamps: true }
)

module.exports = mongoose.model('Chats', chatSchema);