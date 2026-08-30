const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  ticketId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderRole: { type: String, enum: ['CUSTOMER', 'AGENT'], required: true },
  message: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Message', MessageSchema);