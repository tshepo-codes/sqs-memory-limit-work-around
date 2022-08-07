'use strict';

const AWS = require('aws-sdk');

const s3 = new AWS.S3();

exports.handler = async (event) => {
    try {

        // Loop through messages from sqs
        for (const record of event.Records) {

            const messageBody = JSON.parse(record.body);

            let payload = null;

            if (messageBody.isUploadedToS3) {

                const bucketName = 'YOUR BUCKET NAME' // TODO replace with bucket name

                // Read the payload from s3
                payload = await getS3Object(bucketName, messageBody.fileKey);

                // Delete the payload file from s3.
                // Alternatively you can use S3 lifecycle to delete objects from the bucket
                await deleteS3Object(bucketName, messageBody.fileKey);

            } else {

                // Get the message payload from the SQS event if the message was not sent through S3
                payload = messageBody.body;
            }

            console.log('Payload:', JSON.stringify(payload, null, 2));

            // Process the payload here
        }

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
}


const getS3Object = async (bucketName, fileKey) => {
    try {

        const params = {
            Bucket: bucketName,
            Key: fileKey
        }

        const data = await s3.getObject(params).promise();

        return JSON.parse(data.Body.toString('utf-8'));

    } catch (error) {

        console.log('Error getting object', JSON.stringify(error, null, 2));

        throw error;

    }


}

const deleteS3Object = async (bucketName, fileKey) => {
    try {
        const params = {
            Bucket: bucketName,
            Key: fileKey
        }

        await s3.deleteObject(params).promise();

    } catch (error) {

        console.log('Error deleting object', JSON.stringify(error, null, 2));

        throw error;

    }

}