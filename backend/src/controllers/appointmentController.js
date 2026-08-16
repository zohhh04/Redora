const Appointment = require("../models/Appointment")

// GET /api/appointments - current user's appointments (upcoming first)
const getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ user: req.user._id }).sort({ date: 1 })
    res.json({ appointments })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/appointments - book an appointment
const createAppointment = async (req, res) => {
  try {
    const { type, centerName, centerCity, date, time, notes } = req.body
    if (!date) return res.status(400).json({ message: "Please pick a date" })

    const appointment = await Appointment.create({
      user: req.user._id,
      type: type === "reception" ? "reception" : "donation",
      centerName: (centerName || "").trim(),
      centerCity: (centerCity || "").trim(),
      date: new Date(date),
      time: (time || "").trim(),
      notes: (notes || "").trim(),
      status: "upcoming",
    })

    res.status(201).json({ message: "Appointment booked", appointment })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/appointments/:id - update status (done / cancelled)
const updateAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
    if (!appointment) return res.status(404).json({ message: "Appointment not found" })
    if (appointment.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized" })
    }
    const status = req.body.status
    if (!["upcoming", "done", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" })
    }
    appointment.status = status
    await appointment.save()
    res.json({ message: "Appointment updated", appointment })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getAppointments, createAppointment, updateAppointment }