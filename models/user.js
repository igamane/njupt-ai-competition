
const mongoose = require('mongoose');
const schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');
const { ObjectId } = require('mongoose').Types;

 
const UserSchema = new schema({
    username: {
        type: String, 
        require: true,
        unique: true,
    },
    firstName: {
        type: String,
        require: true,
    }, 
    lastName: {
        type: String,
        require: true,
    },
    phoneNumber: {
        type: String,
        require: true,
    },
    profileImage: {
        url: String,
        filename: String
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
},
    { timestamps: true }
)

UserSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model('Userm', UserSchema);
