const mongoose = require("mongoose")
const registerSchema = new mongoose.Schema({
    fullName : {type : String, required : true}, 
    email : {type : String, required : true}, 
    mobile : {type : Number, required : true},
    password : {type : String, required : true},
});
module.exports = mongoose.model('register', registerSchema)