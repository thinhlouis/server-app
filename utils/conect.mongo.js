require("dotenv").config();
const { MongoClient } = require("mongodb");

const uri = process.env.URI_MONGODB;
const client = new MongoClient(uri);

// Database Name
const dbName = "cinemas";
const db = {};

async function connectDB() {
  try {
    await client.connect();
    console.log("Connected to MongoDB!");

    const database = client.db(dbName);

    db.users = database.collection("users");
    db.videos = database.collection("videos");
    db.videos_real = database.collection("videos_real");
  } catch (err) {
    console.error(err);
  }
}

module.exports = { connectDB, db };
