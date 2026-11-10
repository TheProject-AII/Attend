const express = require("express");
const router = express.Router();

const terController = require("../controllers/terController");

router.get("/", terController.getRates);
router.post("/", terController.createRate);
router.put("/:id", terController.updateRate);
router.delete("/:id", terController.deleteRate);

module.exports = router;
