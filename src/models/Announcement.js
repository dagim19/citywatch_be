// title, header,
// models/Report.js
const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  subcity: {
    type: String,
    required: true,
  },
  source: {
    type: Number,
    required: true,
  },
  text: {
    type: String,
    required: true
  },
  header:{
    type: String,
  },
  title:{
    type:String,
    required:true
  }


 // contains location data
  // Add more fields as needed
});
module.exports = mongoose.model("Announcement", AnnouncementSchema);
