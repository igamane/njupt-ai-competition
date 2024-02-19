
const mongoose = require('mongoose');
const schema = mongoose.Schema;

 
const assistantSchema = new schema({
    assistantPhoto: {
        url: String,
        filename: String
    },
    assistantName: {
        type: String,
        require: true,
    },
    assistantInstructions: {
        type: String,
        require: true,
    },
    assistantDescription: {
        type: String,
        require: true,
    },
    model: {
        type: String,
        require: true,
    },
    assistantFiles: {
        type: [String],
        required: true,
    },
    fileRetrieval: {
        type: Boolean,
        require: true,
    },
    codeInterpreter: {
        type: Boolean,
        require: true,
    },
    assistantId: {
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

module.exports = mongoose.model('Assistants', assistantSchema);