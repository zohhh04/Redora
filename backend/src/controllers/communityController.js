const CommunityPost = require("../models/CommunityPost")
const User = require("../models/User")

// GET /api/community - list community posts (newest first)
const getPosts = async (req, res) => {
  try {
    const posts = await CommunityPost.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("author", "name role bloodGroup city")
    res.json({ posts })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// POST /api/community - create a post
const createPost = async (req, res) => {
  try {
    const text = (req.body.text || "").trim()
    const type = ["post", "need", "success", "appreciation"].includes(req.body.type)
      ? req.body.type
      : "post"
    if (!text) return res.status(400).json({ message: "Post text is required" })

    const post = await CommunityPost.create({
      author: req.user._id,
      text,
      type,
    })
    await post.populate("author", "name role bloodGroup city")
    res.status(201).json({ post })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// PATCH /api/community/:id/like - toggle a like by the current user
const toggleLike = async (req, res) => {
  try {
    const post = await CommunityPost.findById(req.params.id)
    if (!post) return res.status(404).json({ message: "Post not found" })

    const idx = post.likes.findIndex((id) => id.toString() === req.user._id.toString())
    if (idx >= 0) post.likes.splice(idx, 1)
    else post.likes.push(req.user._id)
    await post.save()

    res.json({ likes: post.likes.length, liked: idx < 0 })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

module.exports = { getPosts, createPost, toggleLike }