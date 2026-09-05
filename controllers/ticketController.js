const Ticket = require("../models/Ticket");

exports.createTicket = async (req, res) => {
  try {
    const { title, category, priority, description, assignedWorker, userName } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const generatedTicketId = `TKN-${Math.floor(100000 + Math.random() * 900000)}`;

    const ticket = new Ticket({
      ticketNumber: generatedTicketId,
      title,
      category: category || "General Support",
      priority: priority || "Normal",
      description,
      userName: userName || req.user?.name || "Customer",
      customer: req.user?._id || req.user?.id,
      assignedWorker: (assignedWorker && assignedWorker !== "") ? assignedWorker : null,
      status: "Pending"
    });

    const savedTicket = await ticket.save();
    res.status(201).json({ success: true, ticket: savedTicket });
  } catch (error) {
    console.error("Create Ticket Error:", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("customer", "name email")
      .populate("assignedWorker", "name email department")
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch all tickets", error: error.message });
  }
};

exports.getCustomerTickets = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const tickets = await Ticket.find({ customer: userId }).sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customer tickets", error: error.message });
  }
};

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

exports.updateTicketStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "New status is required" });
    }

    const existingTicket = await Ticket.findById(id);
    if (!existingTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    const isAdmin = req.user?.role === 'admin';
    const isLocked = ["Approved", "Rejected"].includes(existingTicket.status);

    if (!isAdmin && isLocked) {
      return res.status(400).json({ 
        message: `Ticket is already ${existingTicket.status} and cannot be modified.` 
      });
    }

    existingTicket.status = status;
    const updatedTicket = await existingTicket.save();

    res.status(200).json({ 
      success: true, 
      message: "Status updated successfully", 
      ticket: updatedTicket 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, priority, assignedWorker } = req.body;

    const updateFields = {};
    if (title) updateFields.title = title;
    if (category) updateFields.category = category;
    if (description) updateFields.description = description;
    if (priority) updateFields.priority = priority;
    if (assignedWorker !== undefined) {
      updateFields.assignedWorker = (assignedWorker && assignedWorker !== "") ? assignedWorker : null;
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updateFields, { new: true });
    if (!updatedTicket) return res.status(404).json({ message: "Ticket not found" });

    res.status(200).json({ success: true, message: "Ticket updated", ticket: updatedTicket });
  } catch (error) {
    res.status(500).json({ message: "Failed to update ticket", error: error.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTicket = await Ticket.findByIdAndDelete(id);
    if (!deletedTicket) return res.status(404).json({ message: "Ticket not found" });

    res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete ticket", error: error.message });
  }
};