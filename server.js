require("dotenv").config();
const express = require("express");

const { connectDB } = require("./utils/conect.mongo");
const routers = require("./router/index");

const cors = require("cors");

const app = express();
const port = process.env.PORT || 5000;

// Sử dụng CORS middleware để cho phép ReactJS gọi từ cổng khác
app.use(
  cors({
    origin: [
      "https://ksc88.net/",
      "https://ksc88.net",
      "http://ksc88.net",
      "http://localhost:3000",
      "http://192.168.1.237:3000",
    ],
    credentials: true,
  })
);

app.use(express.json()); // Để parse JSON body từ ReactJS
app.use(express.urlencoded({ extended: true }));

app.use("/api/v1", routers);

app.get("/", (req, res) => {
  res.status(200).json("Hello My App Server");
});

app.listen(port, "0.0.0.0", () => {
  connectDB();
  console.log(`Proxy server đang chạy tại http://0.0.0.0:${port}`);
  console.log("Đảm bảo đã cài đặt các biến môi trường trong .env");
});
