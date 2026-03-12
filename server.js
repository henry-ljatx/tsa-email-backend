import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting: track last alert sent time per user
const alertTimestamps = new Map();
const ALERT_COOLDOWN_MS = 15 * 60 * 1000; // 15 minutes

// Email transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASSWORD,
  },
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'tsa-email-backend' });
});

// Email alert endpoint
app.post('/alert', async (req, res) => {
  try {
    const { waitTime, threshold, recipientEmail = 'lance@ljatx.com' } = req.body;

    // Validate input
    if (typeof waitTime !== 'number' || typeof threshold !== 'number') {
      return res.status(400).json({ error: 'Invalid waitTime or threshold' });
    }

    if (waitTime <= threshold) {
      return res.status(400).json({ error: 'Wait time is not above threshold' });
    }

    // Rate limiting: check if we've sent an alert recently
    const now = Date.now();
    const lastAlertTime = alertTimestamps.get(recipientEmail) || 0;
    
    if (now - lastAlertTime < ALERT_COOLDOWN_MS) {
      return res.json({ 
        message: 'Alert cooldown active - email not sent (try again in 15 minutes)',
        alerted: false,
        nextAlertIn: Math.ceil((ALERT_COOLDOWN_MS - (now - lastAlertTime)) / 60000) + ' minutes'
      });
    }

    // Update rate limit
    alertTimestamps.set(recipientEmail, now);

    // Send email
    const currentTime = new Date().toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: true 
    });

    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: recipientEmail,
      subject: `🚨 TSA Wait Time Alert - Austin Bergstrom (AUS)`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
          <div style="background-color: white; padding: 20px; border-radius: 8px; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444; margin-top: 0;">🚨 TSA Wait Time Alert</h2>
            
            <p style="font-size: 16px; color: #333;">
              The security line wait time at <strong>Austin Bergstrom International Airport (AUS)</strong> has exceeded your alert threshold.
            </p>
            
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="margin: 5px 0; font-size: 14px; color: #666;">Current Wait Time:</p>
              <p style="margin: 5px 0; font-size: 32px; color: #ef4444; font-weight: bold;">${waitTime} minutes</p>
              <p style="margin: 5px 0; font-size: 14px; color: #666;">Your Threshold: ${threshold} minutes</p>
              <p style="margin: 5px 0; font-size: 12px; color: #999;">Time: ${currentTime}</p>
            </div>
            
            <p style="font-size: 14px; color: #666;">
              Consider adjusting your travel plans or checking back later when lines are shorter.
            </p>
            
            <div style="margin-top: 20px; text-align: center;">
              <a href="https://henry-ljatx.github.io/tsa-tracker/" 
                 style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
                View TSA Tracker
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">
              You're receiving this because you enabled wait time alerts in the TSA Tracker app.
            </p>
          </div>
        </div>
      `,
      text: `TSA WAIT TIME ALERT\n\nWait time at Austin Bergstrom (AUS): ${waitTime} minutes\nYour threshold: ${threshold} minutes\nTime: ${currentTime}\n\nView tracker: https://henry-ljatx.github.io/tsa-tracker/`
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      alerted: true,
      message: `Alert email sent to ${recipientEmail}`,
      nextAlertAvailable: new Date(now + ALERT_COOLDOWN_MS).toISOString()
    });

  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({
      error: 'Failed to send alert email',
      details: error.message
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
🚀 TSA Email Backend Service
   Port: ${PORT}
   Gmail: ${process.env.GMAIL_USER ? '✅ Configured' : '❌ Missing GMAIL_USER'}
   Password: ${process.env.GMAIL_PASSWORD ? '✅ Configured' : '❌ Missing GMAIL_PASSWORD'}
   
   POST /alert - Send wait time alert email
   GET /health - Check service status
  `);
});
