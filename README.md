# TSA Email Backend Service

Simple Node.js/Express backend that sends email alerts when TSA wait times exceed a threshold.

## Features

✅ Email alerts when wait times exceed threshold  
✅ Rate limiting (max 1 email per 15 minutes)  
✅ CORS enabled for web app integration  
✅ HTML + text email formatting  
✅ Zero dependencies beyond Express + Nodemailer  

## Setup (Local)

```bash
npm install
```

Create `.env` file:
```
GMAIL_USER=henry.ljatx@gmail.com
GMAIL_PASSWORD=your-app-password
PORT=3000
```

Run:
```bash
npm start
```

Service will be available at `http://localhost:3000`

## Gmail Setup

To send emails from Gmail, you need:

1. **Enable 2-Factor Authentication** on your Google account
2. **Create an App Password**:
   - Go to https://myaccount.google.com/apppasswords
   - Select "Mail" and "Windows Computer"
   - Google will generate a 16-character password
   - Use this as `GMAIL_PASSWORD` in `.env`

## API

### POST /alert

Send an email alert.

**Request:**
```json
{
  "waitTime": 50,
  "threshold": 45,
  "recipientEmail": "lance@ljatx.com"
}
```

**Response (Success):**
```json
{
  "success": true,
  "alerted": true,
  "message": "Alert email sent to lance@ljatx.com",
  "nextAlertAvailable": "2026-03-12T08:55:00Z"
}
```

**Response (Cooldown):**
```json
{
  "message": "Alert cooldown active - email not sent (try again in 15 minutes)",
  "alerted": false,
  "nextAlertIn": "14 minutes"
}
```

### GET /health

Check service status.

**Response:**
```json
{
  "status": "ok",
  "service": "tsa-email-backend"
}
```

## Deployment (Render)

1. Push to GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. Create new Web Service on Render:
   - GitHub repo: `henry-ljatx/tsa-email-backend`
   - Build command: `npm install`
   - Start command: `npm start`

3. Add environment variables in Render dashboard:
   - `GMAIL_USER` = henry.ljatx@gmail.com
   - `GMAIL_PASSWORD` = (your app password)

4. Deploy and get the URL (e.g., `https://tsa-email-backend.onrender.com`)

## Integration with TSA Tracker

The TSA Tracker web app calls this service when alerts trigger:

```javascript
fetch('https://tsa-email-backend.onrender.com/alert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    waitTime: currentWaitTime,
    threshold: userThreshold,
    recipientEmail: 'lance@ljatx.com'
  })
})
```

## Rate Limiting

- Maximum 1 email per 15 minutes per recipient
- Prevents spam if wait times fluctuate
- Returns cooldown status in response

## Environment Variables

| Variable | Required | Description |
|----------|----------|---|
| `GMAIL_USER` | Yes | Gmail email address |
| `GMAIL_PASSWORD` | Yes | Gmail App Password (not regular password) |
| `PORT` | No | Server port (default: 3000) |

## Troubleshooting

**"Failed to send alert email"**
- Check GMAIL_USER and GMAIL_PASSWORD in .env
- Verify Gmail App Password (not regular password)
- Ensure 2FA is enabled on Gmail account

**CORS errors**
- CORS is enabled for all origins
- Check browser console for detailed errors

**No emails arriving**
- Check spam folder
- Verify recipient email is correct
- Check server logs for errors
