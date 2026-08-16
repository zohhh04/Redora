const router = require("express").Router()
const { protect } = require("../middleware/authMiddleware")
const { getPosts, createPost, toggleLike } = require("../controllers/communityController")

router.get("/", protect, getPosts)
router.post("/", protect, createPost)
router.patch("/:id/like", protect, toggleLike)

module.exports = router