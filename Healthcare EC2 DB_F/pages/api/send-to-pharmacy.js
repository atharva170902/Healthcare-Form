// pages/api/send-to-pharmacy.js
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { pharmacy, medications, patientInfo, doctorInfo } = req.body;

        // Validate required fields
        if (!pharmacy || !medications || !patientInfo || !doctorInfo) {
            return res.status(400).json({
                error: 'Missing required fields: pharmacy, medications, patientInfo, or doctorInfo'
            });
        }

        // Format the message for the pharmacy using the configured details
        const messageContent = {
            type: 'NEW_PRESCRIPTION',
            timestamp: new Date().toISOString(),
            pharmacy: {
                name: pharmacy.name,
                phone: pharmacy.phone,
                address: pharmacy.address
            },
            patient: {
                name: patientInfo.name,
                age: patientInfo.age || 'Not specified',
                gender: patientInfo.gender || 'Not specified',
                phone: patientInfo.phone,
                address: patientInfo.address || 'Not specified',
                prescriptionDate: new Date().toLocaleString()
            },
            doctor: {
                name: doctorInfo.name,
                qualification: doctorInfo.qualification || 'Not specified',
                specialization: doctorInfo.specialization || 'Not specified',
                phone: doctorInfo.phone || 'Not specified',
                hospital: doctorInfo.hospital
            },
            medications: medications.map((med, index) => ({
                id: index + 1,
                details: med.trim()
            })),
            medicationSummary: medications.join('\n'),
            instructions: 'Please prepare the following medications for patient pickup.',
            priority: 'NORMAL'
        };

        // Create a more detailed SMS message using configured details
        // IMPROVED FORMAT TO MATCH REQUESTED OUTPUT
        const smsMessage = `
NEW PRESCRIPTION ALERT

Patient: ${patientInfo.name}
Age: ${patientInfo.age || 'Not specified'} | Gender: ${patientInfo.gender || 'Not specified'}
Phone: ${patientInfo.phone}
Address: ${patientInfo.address || 'Not specified'}

Doctor: ${doctorInfo.name}
Hospital: ${doctorInfo.hospital || 'Not specified'}
${doctorInfo.phone ? `Contact: ${doctorInfo.phone}` : ''}

PRESCRIBED MEDICATIONS:
${medications.map(med => med.replace(/\*\*/g, '')).join('\n')}

Prescribed: ${new Date().toLocaleString()}

Please prepare for patient pickup.

-- 
${doctorInfo.hospital || 'Healthcare Management System'}
`.trim();

        // Send SMS to pharmacy
        const smsParams = {
            Message: smsMessage,
            PhoneNumber: pharmacy.phone,
            MessageAttributes: {
                'AWS.SNS.SMS.SenderID': {
                    DataType: 'String',
                    StringValue: doctorInfo.hospital ? doctorInfo.hospital.substring(0, 11) : 'HealthCare'
                },
                'AWS.SNS.SMS.SMSType': {
                    DataType: 'String',
                    StringValue: 'Transactional'
                }
            }
        };

        // If you have a specific topic ARN for pharmacy notifications
        const topicArn = process.env.PHARMACY_TOPIC_ARN;
        let snsResponse;

        if (topicArn) {
            // Send to SNS topic (for multiple subscribers)
            // FIX: Send the formatted SMS message instead of JSON
            const topicParams = {
                Message: smsMessage, // CHANGED FROM JSON TO FORMATTED TEXT
                Subject: `New Prescription - ${patientInfo.name}`,
                TopicArn: topicArn,
                MessageAttributes: {
                    'pharmacy_id': {
                        DataType: 'String',
                        StringValue: pharmacy.id.toString()
                    },
                    'patient_name': {
                        DataType: 'String',
                        StringValue: patientInfo.name
                    },
                    'doctor_name': {
                        DataType: 'String',
                        StringValue: doctorInfo.name
                    },
                    'prescription_type': {
                        DataType: 'String',
                        StringValue: 'MEDICATION_ORDER'
                    }
                }
            };

            snsResponse = await snsClient.send(new PublishCommand(topicParams));
        } else {
            // Send direct SMS
            snsResponse = await snsClient.send(new PublishCommand(smsParams));
        }

        // Enhanced logging with all details
        console.log('✅ Prescription sent to pharmacy:', {
            messageId: snsResponse.MessageId,
            pharmacy: pharmacy.name,
            patient: {
                name: patientInfo.name,
                phone: patientInfo.phone
            },
            doctor: {
                name: doctorInfo.name,
                hospital: doctorInfo.hospital
            },
            medicationCount: medications.length,
            timestamp: new Date().toISOString()
        });

        // Return success response with all relevant details
        return res.status(200).json({
            success: true,
            messageId: snsResponse.MessageId,
            pharmacy: pharmacy.name,
            patient: {
                name: patientInfo.name,
                phone: patientInfo.phone
            },
            doctor: {
                name: doctorInfo.name,
                hospital: doctorInfo.hospital
            },
            medications: medications,
            timestamp: new Date().toISOString(),
            message: 'Prescription sent successfully to pharmacy'
        });

    } catch (error) {
        console.error('❌ Error sending prescription to pharmacy:', error);

        // Handle specific AWS errors
        if (error.name === 'InvalidParameterException') {
            return res.status(400).json({
                error: 'Invalid phone number or message format',
                details: error.message
            });
        }

        if (error.name === 'ThrottledException') {
            return res.status(429).json({
                error: 'Too many requests. Please try again later.',
                details: error.message
            });
        }

        return res.status(500).json({
            error: 'Failed to send prescription to pharmacy',
            details: error.message
        });
    }
}