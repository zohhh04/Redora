const Message = require("../models/Message")
const BloodRequest = require("../models/BloodRequest")
const { translateText } = require("../utils/translate")

const canAccess = async (request, user) => {
  const isPatient = request.patient.toString() === user._id.toString()
  const isDonor = request.matchedDonor && request.matchedDonor.toString() === user._id.toString()
  return isPatient || isDonor
}

// GET /api/requests/:id/messages - messages for a request (patient or matched donor)
const getMessages = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: "Request not found" })
    if (!(await canAccess(request, req.user))) {
      return res.status(403).json({ message: "Not authorized" })
    }

    const targetLang = (req.query.lang || "").toLowerCase().trim() || "en"

    const messages = await Message.find({ request: request._id })
      .sort({ createdAt: 1 })
      .populate("from", "name role")

    // Auto-translate each message into the requesting user's chosen language.
    // The original text is always kept; the reader can flip back to it.
    const translated = await Promise.all(
      messages.map(async (m) => {
        const t = await translateText(m.text, targetLang)
        return {
          ...m.toObject(),
          originalText: m.text,
          text: t.isTranslated ? t.translatedText : m.text,
          translated: t.isTranslated,
          detectedLang: t.detectedLang,
        }
      })
    )

    res.json({ messages: translated, lang: targetLang })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/requests/:id/messages - send a message (patient or matched donor)
const createMessage = async (req, res) => {
  try {
    const trimmed = (req.body.text || "").trim()
    if (!trimmed) return res.status(400).json({ message: "Message cannot be empty" })
    if (trimmed.length > 500) {
      return res.status(400).json({ message: "Message is too long (max 500 characters)" })
    }

    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ message: "Request not found" })
    if (!(await canAccess(request, req.user))) {
      return res.status(403).json({ message: "Not authorized" })
    }

    const message = await Message.create({ request: request._id, from: req.user._id, text: trimmed })
    await message.populate("from", "name role")
    res.status(201).json({ message })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getMessages, createMessage }