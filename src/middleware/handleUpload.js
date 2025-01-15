const upload = require('../config/storage');

const singleUploadMiddleware = upload.single('file'); // For single file upload
const multipleUploadMiddleware = upload.array('files', 5); // For multiple file uploads

module.exports = {
    singleUploadMiddleware,
    multipleUploadMiddleware
    };