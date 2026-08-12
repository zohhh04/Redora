const Notification = require("../models/Notification")

// GET /api/notifications?unread=true - list the current user's notifications
const getNotifications = async (req, res) => {
  try {
    const { unread } = req.query
    const filter = { user: req.user._id }
    if (unread === "true") filter.read = false

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("request", "bloodGroup units hospital city area urgency status patient")
      .populate("request.patient", "name")

    const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false })

    res.json({ notifications, unreadCount })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/notifications/:id/read - mark one notification as read
const markRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { read: true, readAt: new Date() },
      { new: true }
    )
    if (!notification) return res.status(404).json({ message: "Notification not found" })
    res.json({ notification })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/notifications/read-all - mark all of the current user's notifications as read
const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { user: req.user._id, read: false },
      { read: true, readAt: new Date() }
    )
    res.json({ message: "All notifications marked as read" })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getNotifications, markRead, markAllRead }
