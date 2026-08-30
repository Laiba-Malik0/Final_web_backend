const mongoose = require('mongoose');

const TicketSchema = new mongoose.Schema(
  {
    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    customerName: { type: String, required: true },
    category: { type: String, required: true }, // Complain Related To
    assignedWorker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedWorkerName: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED'], default: 'OPEN' },
    date: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', TicketSchema);