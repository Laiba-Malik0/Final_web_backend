const Ticket = require("../models/Ticket");

// 1. Create Ticket
exports.createTicket = async (req, res) => {
  try {
    const { title, category, description, assignedWorker } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    // Auth middleware (req.user) Verification
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "User authentication failed" });
    }

    const newTicket = new Ticket({
      title,
      category: category || "Electrical",
      description,
      customer: userId,
      assignedWorker: assignedWorker || null,
      status: "Pending",
    });

    const savedTicket = await newTicket.save();

    res.status(201).json({
      success: true,
      message: "Ticket created & saved to database!",
      ticket: savedTicket,
    });
  } catch (error) {
    console.error("Ticket Creation Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// 2. Get Customer Tickets
exports.getCustomerTickets = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const tickets = await Ticket.find({ customer: userId })
      .populate("assignedWorker", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch tickets", error: error.message });
  }
};

// 3. Get Worker Tickets
exports.getWorkerTickets = async (req, res) => {
  try {
    const workerId = req.user?._id || req.user?.id;
    const tickets = await Ticket.find({ assignedWorker: workerId })
      .populate("customer", "name email")
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch worker tickets", error: error.message });
  }
};

// 4. Update Ticket Status
exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ message: "Status updated", ticket: updatedTicket });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};