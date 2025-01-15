const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'C:/nginx/images/');
    },
    filename: function (req, file, cb) {
      cb(null, Date.now() + path.extname(file.originalname));
    }
  });


  const upload = multer({ 
    storage: storage,
    // limits: { fileSize: 1024 * 1024 * 5 } // 5MB file size limit
  });
  

module.exports = upload;
  
