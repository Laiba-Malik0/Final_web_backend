const mongoose = require("mongoose");

const ticketSchema = new mongoose.Schema(
  {
    ticketNumber: { 
      type: String, 
      unique: true 
    },
    title: { 
      type: String, 
      required: true,
      trim: true 
    },
    category: { 
      type: String, 
      default: "Electrical" 
    },
    priority: { 
      type: String, 
      default: "Normal",
      enum: ["Low", "Normal", "High", "Urgent"] 
    },
    description: { 
      type: String, 
      required: true 
    },
    userName: { 
      type: String, 
      default: "Customer" 
    },
    customer: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      required: true 
    },
    assignedWorker: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User",
      default: null 
    },
    status: { 
      type: String, 
      default: "Pending",
      enum: ["Pending", "In Progress", "Approved", "Rejected", "Completed"] 
    },
  },
  { timestamps: true }
);

// Pre-save Hook: Ticket Save hone se pehle Auto ID Generate karega
ticketSchema.pre("save", function () {
  if (!this.ticketNumber) {
    const randomDigits = Math.floor(100000 + Math.random() * 900000);
    this.ticketNumber = `TKN-${randomDigits}`;
  }
});

// Vercel Serverless Re-compilation Safeguard
module.exports = mongoose.models.Ticket || mongoose.model("Ticket", ticketSchema);