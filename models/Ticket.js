const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    category: { type: String, default: "Electrical" },
    description: { type: String, required: true },
    customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    status: { type: String, default: "Pending" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Ticket", ticketSchema);