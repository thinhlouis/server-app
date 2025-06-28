const express = require("express");
const { v4: uuidv4 } = require("uuid");
const { ObjectId } = require("mongodb");

const authenticateRole = require("../middleware/authenticateRole");
const getDataFromMongoDB = require("../utils/getDataFromMongoDB");
const { db } = require("../utils/conect.mongo");

const quotesRouter = express.Router();

quotesRouter.get("/all-quote", async (req, res) => {
  try {
    const quotes = await getDataFromMongoDB(db.quotes);

    console.log(totalQuote);
    res.status(200).json(quotes);
  } catch (error) {
    res.status(400).json({
      message: error.message,
    });
  }
});

quotesRouter.post("/add-quotes", authenticateRole, async (req, res) => {
  const { text, author = "Ai Mà Biết" } = req.body;
  const oid = process.env.OID_DB_QUOTES;

  if (!text) {
    return res.status(400).json({
      message: "Missing input data!",
    });
  }

  try {
    const quotes = await db.quotes.findOne({ _id: new ObjectId(oid) });
    const count = quotes.quotes?.length || 0;

    const newQuote = {
      id: count + 1,
      text: text,
      author: author,
    };

    const result = await db.quotes.updateOne(
      { _id: new ObjectId(oid) },
      { $push: { quotes: newQuote } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "Add a failed quote" });
    }

    res.status(201).json({
      success: true,
      data: newQuote,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
      success: false,
    });
  }
});

quotesRouter.delete("/delete-quote", authenticateRole, async (req, res) => {
  const { quoteid } = req.query;
  const oid = process.env.OID_DB_QUOTES;

  if (!quoteid) {
    return res.status(400).json({
      message: "Missing quote id in query!",
    });
  }
  const numberId = Number(quoteid);

  try {
    const result = await db.quotes.updateOne(
      { _id: new ObjectId(oid) },
      {
        $pull: {
          quotes: { id: numberId },
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).json({ message: "No id quote found to remove" });
    }

    res.status(201).json({
      success: true,
      message: "Quote remove successfully.",
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      message: error,
      success: false,
    });
  }
});

module.exports = quotesRouter;
