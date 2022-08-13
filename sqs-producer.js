'use strict';

const { v4: uuidv4 } = require('uuid');

const AWS = require('aws-sdk');

const sqs = new AWS.SQS();

const s3 = new AWS.S3();


exports.handler = async (event) => {
  try {

    // SQS memory limit in bytes
    const sqsMemoryLimit = 256000;
    
    // Get payload from event
    const payload = event.body;

    // Get size of payload in bytes
    const payloadMemorySize = getObjectSizeInBytes(payload);

    let queuePayload = {
      isUploadedToS3: false,
      fileKey: null,
      body: null
    }

    const queueUrl = process.env.QUEUE_ARN;

    if (payloadMemorySize >= sqsMemoryLimit) {
      const fileKey = uuidv4() + '.json';

      const bucketName = process.env.FILE_BUCKET_NAME;

      await uploadToS3(payload, bucketName, fileKey);

      queuePayload.isUploadedToS3 = true;

      queuePayload.fileKey = fileKey;

    } else {

      queuePayload.body = payload;

    }

    await sendSqsMessage(queuePayload, queueUrl);

  } catch (error) {

    console.log('Error occured', JSON.stringify(error, null, 2));

    return {
      statusCode: error.statusCode ? error.statusCode : 500,
      body: JSON.stringify({
        error: error.name ? error.name : "Exception",
        message: error.message ? error.message : "Unknown error"
      })
    };

  }

};

const getObjectSizeInBytes = (obj) => {

  let str = null;

  if (typeof obj === 'string') {

    str = obj;

  } else {

    str = JSON.stringify(obj);

  }

  // Get the length of the Uint8Array

  const bytes = new TextEncoder().encode(str).length;

  return bytes;

}

const uploadToS3 = async (payload, bucketName, fileKey) => {
  try {

    const params = {
      Body: Buffer.from(JSON.stringify(payload)),
      Bucket: bucketName,
      Key: fileKey,
      ContentType: 'application/json'
    }

    await s3.putObject(params).promise();

  } catch (error) {

    console.log('Error uploading object to S3', JSON.stringify(error, null, 2));

    throw error;

  }
}


const sendSqsMessage = async (messageBody, queueUrl) => {
  try {

    const params = {
      MessageBody: JSON.stringify(messageBody),
      QueueUrl: queueUrl
    }

    await sqs.sendMessage(params).promise();

  } catch (error) {

    console.log('Error sending sqs message', JSON.stringify(error, null, 2));

    throw error;

  }
}
