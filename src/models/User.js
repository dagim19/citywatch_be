const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    fatherName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    subcity: { type: String, required: true },
    role: { type: String, default: "user" },
    password: { type: String, required: true }, // Store hashed passwords
    institution: { type: String, required: false },
    currentLocation:{type:Object, required: false},
    maintainerAvailable:{type:Boolean, required: false}
    //we'll use this to check which verifier is closest to the reported issue
    // Add other fields as needed (e.g., date of birth, address, etc.)
  },
  { timestamps: true }
); // Add timestamps for createdAt and updatedAt

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare entered password with hashed password
userSchema.methods.comparePassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
