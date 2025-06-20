require("dotenv").config();
const express = require("express");

const cors = require("cors");

const app = express();
const port = process.env.PORT || 8666;

// Sử dụng CORS middleware để cho phép ReactJS gọi từ cổng khác
app.use(cors());
app.use(express.json()); // Để parse JSON body từ ReactJS

app.get("/", (req, res) => {
  res.status(200).json("Hello My App Server");
});

app.listen(port, () => {
  console.log(`Proxy server đang chạy tại http://localhost:${port}`);
  console.log("Đảm bảo đã cài đặt các biến môi trường trong .env");
});
