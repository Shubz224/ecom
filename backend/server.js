const express = require("express");

const app = express();
const PORT = 3000  || process.env.PORT;

app.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Home page is good !",
  });
});


app.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
});
