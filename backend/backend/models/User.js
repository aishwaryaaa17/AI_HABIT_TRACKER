import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userScheme = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: { type: String, required: true, minlength: 6 },
    avatar: { type: String, default: "" },
    morningMotivation: { type: Boolean, default: false },

}, { timestamps: true });

userScheme.pre("save", async function(next) {
    if (!this.isModified("password")) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

userScheme.methods.matchPassword = function(plain) {
    return bcrypt.compare(plain, this.password);
};

userScheme.methods.toJSON = function() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
};

export default mongoose.model("User", userScheme);