const Ticket = require("../models/Ticket");
const User = require("../models/User");

// 1. Create Ticket
exports.createTicket = async (req, res) => {
  try {
    const { title, category, priority, description, assignedWorker, userName } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: "Title and description are required" });
    }

    const count = await Ticket.countDocuments();
    const generatedTicketId = `TKN-${1000 + count + 1}`;

    const ticket = new Ticket({
      ticketNumber: generatedTicketId,
      title,
      category: category || "General Support",
      priority: priority || "Normal",
      description,
      userName: userName || req.user?.name || "Customer",
      customer: req.user?._id || req.user?.id,
      assignedWorker: assignedWorker ? String(assignedWorker).trim() : "",
      status: "Pending"
    });

    const savedTicket = await ticket.save();
    console.log("New Ticket Created:", savedTicket);
    res.status(201).json({ success: true, ticket: savedTicket });
  } catch (error) {
    console.error("Create Ticket Error:", error);
    res.status(500).json({ message: error.message });
  }
};

// 2. Get All Tickets (Required for Admin Dashboard Stream)
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate("customer", "name email")
      .populate("assignedWorker", "name email department")
      .sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    console.error("Get All Tickets Error:", error);
    res.status(500).json({ message: "Failed to fetch all tickets", error: error.message });
  }
};

// 3. Get Customer Tickets
exports.getCustomerTickets = async (req, res) => {
  try {
    const userId = req.user?._id || req.user?.id;
    const tickets = await Ticket.find({ customer: userId }).sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch customer tickets", error: error.message });
  }
};

// 4. Get Worker Tickets
exports.getWorkerTickets = async (req, res) => {
  try {
    const workerId = req.user?._id || req.user?.id;
    let workerName = req.user?.name || "";

    if (!workerName && workerId) {
      const dbUser = await User.findById(workerId);
      if (dbUser) workerName = dbUser.name || "";
    }

    const cleanWorkerName = String(workerName).trim();
    const queryConditions = [];

    if (workerId) {
      queryConditions.push({ assignedWorker: String(workerId) });
    }

    if (cleanWorkerName) {
      const nameRegex = new RegExp(`^${cleanWorkerName}$`, "i");
      queryConditions.push({ assignedWorker: nameRegex });
    }

    const tickets = await Ticket.find({
      $or: queryConditions.length > 0 ? queryConditions : [{ assignedWorker: workerId }]
    }).sort({ createdAt: -1 });

    res.status(200).json(tickets);
  } catch (error) {
    console.error("Worker Tickets Error:", error);
    res.status(500).json({ message: "Failed to fetch worker tickets", error: error.message });
  }
};

// 5. Update Ticket Status (Admin/Worker Status Toggle)
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

    // 🛑 Worker Restriction (Freeze if Approved/Rejected unless user is Admin)
    const isAdmin = req.user?.role === 'admin';
    const isLocked = ["Approved", "Rejected"].includes(existingTicket.status);

    if (!isAdmin && isLocked) {
      return res.status(400).json({ 
        message: `Ticket is already ${existingTicket.status} and cannot be modified.` 
      });
    }

    existingTicket.status = status;
    const updatedTicket = await existingTicket.save();

    console.log(`Ticket ${id} status updated to: ${status}`);

    res.status(200).json({ 
      success: true, 
      message: "Status updated successfully", 
      ticket: updatedTicket 
    });
  } catch (error) {
    console.error("Update Status Error:", error);
    res.status(500).json({ message: "Failed to update status", error: error.message });
  }
};

// 6. Update Ticket Details (Customer Edit)
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, description, priority, assignedWorker } = req.body;

    const updateFields = {};
    if (title) updateFields.title = title;
    if (category) updateFields.category = category;
    if (description) updateFields.description = description;
    if (priority) updateFields.priority = priority;
    if (assignedWorker !== undefined) updateFields.assignedWorker = String(assignedWorker).trim();

    const updatedTicket = await Ticket.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updatedTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ success: true, message: "Ticket updated", ticket: updatedTicket });
  } catch (error) {
    res.status(500).json({ message: "Failed to update ticket", error: error.message });
  }
};

// 7. Delete Ticket
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTicket = await Ticket.findByIdAndDelete(id);

    if (!deletedTicket) {
      return res.status(404).json({ message: "Ticket not found" });
    }

    res.status(200).json({ success: true, message: "Ticket deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete ticket", error: error.message });
  }
};