const nodemailer = require("nodemailer");
require("dotenv").config(); // Đảm bảo bạn đã cấu hình dotenv

// Lấy API Key của Resend từ biến môi trường
const RESEND_API_KEY = process.env.RESEND_API_KEY;

// Cấu hình transporter với thông tin SMTP của Resend
let transporter = nodemailer.createTransport({
  host: "smtp.resend.com", // Host SMTP của Resend
  port: 587, // Port chuẩn cho STARTTLS
  secure: false, // false cho STARTTLS trên port 587
  auth: {
    user: "resend", // Tên người dùng mặc định cho SMTP của Resend (hoặc 'apikey', hoặc API Key của bạn)
    pass: RESEND_API_KEY, // Mật khẩu là chính API Key của Resend
  },
});

// Ví dụ về mailOptions và gửi email
async function sendPasswordResetEmail(toEmail, username, resetTokenUrl) {
  try {
    let mailOptions = {
      from: `"KSC88" <admin@ksc88.net>`, // Địa chỉ FROM phải là domain đã xác minh của bạn
      to: toEmail,
      subject: "Yêu cầu đặt lại mật khẩu của bạn",
      html: `
                <p>Xin chào, ${username || "bạn"}</p>
                <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
                <p>Vui lòng nhấp vào liên kết sau để đặt lại mật khẩu của bạn:</p>
                <a href="${resetTokenUrl}">Đặt lại mật khẩu</a>
                <p>Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.</p>
                <p>Lưu ý: Liên kết này sẽ hết hạn sau <strong>10 phút</strong></p>
            `,
      text:
        `Xin chào ${username || "bạn"},\n\n` +
        `Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.\n\n` +
        `Vui lòng truy cập liên kết sau để đặt lại mật khẩu của bạn:\n` +
        `${resetTokenUrl}\n\n` +
        `Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.\n\n` +
        `Lưu ý: Liên kết này sẽ hết hạn sau 10 phút.`,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log("Message sent: %s", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending email via Resend SMTP:", error);
    return { success: false, error: error };
  }
}

// Ví dụ gọi hàm trong route của bạn
// sendPasswordResetEmail('user@example.com', 'JohnDoe', 'https://ksc88.net/reset-password?token=YOUR_TOKEN');

module.exports = sendPasswordResetEmail;
