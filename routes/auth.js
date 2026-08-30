const express = require("express");
const router = express.Router();

const {
  register,
  login,
  forgotPassword
} = require("../controllers/authControllers");

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword); // Added forgot-password route

module.exports = router;