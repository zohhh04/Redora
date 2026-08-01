require("dotenv").config()

const app = require("./src/app")
const connectToDB = require("./src/config/db")

const PORT = process.env.PORT || 5000

connectToDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Redora server running on port ${PORT}`)
    })
  })
  .catch((e) => {
    console.log("Failed to start server:", e.message)
    process.exit(1)
  })
