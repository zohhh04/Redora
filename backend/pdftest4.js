const { execSync } = require("child_process");
// Reuse the module's extractPdfText by loading chatController
const chat = require("./src/controllers/chatController");