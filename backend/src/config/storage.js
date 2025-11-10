const { Storage } = require('@google-cloud/storage');
require('dotenv').config();

// Initialize GCP Storage
let storage, bucket;

try {
  storage = new Storage({
    projectId: process.env.GCP_PROJECT_ID,
    keyFilename: process.env.GCP_CREDENTIALS_PATH
  });

  bucket = storage.bucket(process.env.GCP_BUCKET_NAME);
  console.log('✅ GCP Storage initialized');
} catch (error) {
  console.warn('⚠️ GCP Storage not configured:', error.message);
}

/**
 * Upload file to GCP Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} destination - Destination path in bucket
 * @param {string} contentType - MIME type
 * @returns {Promise<string>} Public URL of uploaded file
 */
const uploadFile = async (fileBuffer, destination, contentType) => {
  if (!bucket) {
    throw new Error('GCP Storage not configured');
  }

  const file = bucket.file(destination);

  await file.save(fileBuffer, {
    contentType,
    metadata: {
      cacheControl: 'public, max-age=31536000',
    },
  });

  await file.makePublic();

  return `https://storage.googleapis.com/${process.env.GCP_BUCKET_NAME}/${destination}`;
};

/**
 * Upload proctoring media
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} attemptId - Exam attempt ID
 * @param {string} type - Media type (webcam, screen, audio)
 * @param {string} extension - File extension
 * @returns {Promise<string>} Public URL
 */
const uploadProctoringMedia = async (fileBuffer, attemptId, type, extension) => {
  const timestamp = Date.now();
  const destination = `proctoring/${attemptId}/${type}/${timestamp}.${extension}`;

  const contentTypes = {
    webcam: 'video/webm',
    screen: 'video/webm',
    audio: 'audio/webm',
    image: 'image/jpeg'
  };

  return uploadFile(fileBuffer, destination, contentTypes[type] || 'application/octet-stream');
};

/**
 * Upload question image
 * @param {Buffer} fileBuffer - Image buffer
 * @param {string} questionId - Question ID
 * @param {string} extension - File extension
 * @returns {Promise<string>} Public URL
 */
const uploadQuestionImage = async (fileBuffer, questionId, extension) => {
  const destination = `questions/${questionId}.${extension}`;
  return uploadFile(fileBuffer, destination, 'image/jpeg');
};

/**
 * Delete file from GCP Storage
 * @param {string} fileUrl - Public URL of file
 */
const deleteFile = async (fileUrl) => {
  if (!bucket) return;

  const fileName = fileUrl.split(`${process.env.GCP_BUCKET_NAME}/`)[1];
  if (fileName) {
    await bucket.file(fileName).delete();
  }
};

module.exports = {
  uploadFile,
  uploadProctoringMedia,
  uploadQuestionImage,
  deleteFile,
  bucket
};
