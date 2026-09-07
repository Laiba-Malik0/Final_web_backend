const Ticket = require("../models/Ticket");
const mongoose = require("mongoose");

// 1. CREATE TICKET
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
      assignedWorker: (assignedWorker && mongoose.Types.ObjectId.isValid(assignedWorker)) ? assignedWorker : null,
      status: "Pending"
    });

    const savedTicket = await ticket.save();
    
    // Populate before sending response so frontend immediately gets names
    const populatedTicket = await Ticket.findById(savedTicket._id)
      .populate("customer", "name email")
      .populate("assignedWorker", "name email department");

    res.status(201).json({ success: true, ticket: populatedTicket });
  } catch (error) {
    console.error("Create Ticket Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// 2. GET ALL TICKETS (ADMIN)
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

// 3. GET CUSTOMER TICKETS
exports.getCustomerTickets = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const tickets = await Ticket.find({ customer: userId })
      .populate("customer", "name email")
      .populate("assignedWorker", "name email department")
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customer tickets", error: error.message });
  }
};

// 4. GET WORKER TICKETS (FIXED: Handles String vs ObjectId)
exports.getWorkerTickets = async (req, res) => {
  try {
    const rawWorkerId = req.user?._id || req.user?.id;
    
    if (!rawWorkerId) {
      return res.status(401).json({ message: "Unauthorized: Worker ID missing" });
    }

    // Convert string ID to Mongoose ObjectId safely
    const workerObjectId = new mongoose.Types.ObjectId(rawWorkerId);

    // Match both string and ObjectId versions to guarantee finding all tickets
    const tickets = await Ticket.find({
      $or: [
        { assignedWorker: workerObjectId },
        { assignedWorker: rawWorkerId.toString() }
      ]
    })
      .populate("customer", "name email")
      .populate("assignedWorker", "name email department")
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    console.error("Worker Tickets Error:", error);
    res.status(500).json({ message: "Failed to fetch worker tickets", error: error.message });
  }
};

// 5. UPDATE STATUS (WORKER / ADMIN)
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
    await existingTicket.save();

    const updatedTicket = await Ticket.findById(id)
      .populate("customer", "name email")
      .populate("assignedWorker", "name email department");

    res.status(200).json({ 
      success: true, 
      message: "Status updated successfully", 
      ticket: updatedTicket 
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

// 6. UPDATE TICKET DETAILS (ADMIN)
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
      updateFields.assignedWorker = (assignedWorker && mongoose.Types.ObjectId.isValid(assignedWorker)) 
        ? assignedWorker 
        : null;
    }

    const updatedTicket = await Ticket.findByIdAndUpdate(id, updateFields, { new: true })
      .populate("customer", "name email")
      .populate("assignedWorker", "name email department");

    if (!updatedTicket) return res.status(404).json({ message: "Ticket not found" });

    res.status(200).json({ success: true, message: "Ticket updated", ticket: updatedTicket });
  } catch (error) {
    res.status(500).json({ message: "Failed to update ticket", error: error.message });
  }
};

// 7. DELETE TICKET (ADMIN)
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