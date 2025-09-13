// email_worker.js

const mysql = require('mysql2');
const sendEmail = require('./utils/send_email'); // <== nodemailer-based sender

// === 1. Create DB connection ===
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'project2'
});

// === 2. Function to process pending notifications ===
function processPendingNotifications() {
  const sql = `
    SELECT notification_id, to_email, subject, message, is_html
    FROM notifications
    WHERE status = 'pending' AND attempts < 3
    LIMIT 1
  `;

  db.query(sql, async (err, results) => {
    if (err) return console.error('DB error:', err);

    if (results.length === 0) {
      return console.log('[✓] No pending emails.');
    }

    const notif = results[0];
    const { notification_id, to_email, subject, message, is_html } = notif;

    const result = await sendEmail({
      to: to_email,
      subject: subject,
      body: message,
      isHtml: is_html === 1
    });

    if (result.success) {
      console.log(`[✓] Email sent to: ${to_email}`);

      const updateSQL = `
        UPDATE notifications
        SET status = 'sent',
            attempts = attempts + 1,
            sent_at = NOW(),
            last_error = NULL
        WHERE notification_id = ?
      `;
      db.query(updateSQL, [notification_id]);

    } else {
      console.error('[X] Email failed:', result.error);

      const updateSQL = `
        UPDATE notifications
        SET status = CASE WHEN attempts >= 2 THEN 'failed' ELSE 'pending' END,
            attempts = attempts + 1,
            last_error = ?
        WHERE notification_id = ?
      `;
      db.query(updateSQL, [result.error || 'Unknown error', notification_id]);
    }
  });
}

// === 3. Run it every 10 seconds ===
setInterval(processPendingNotifications, 10 * 1000);

console.log('📬 Email worker started... Checking every 10 seconds');
