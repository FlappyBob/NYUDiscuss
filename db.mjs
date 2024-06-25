// 1ST DRAFT DATA MODEL
import "./config.mjs";
import mongoose from "mongoose";

// Set up the slug
import slugify from "slugify";
import validator from "validator";
import uslug from "uslug";
import bcrypt from "bcryptjs";
import crypto from "crypto";

mongoose.connect(process.env.DSN);
const Schema = mongoose.Schema;

uslug("汉语/漢語");

// users
// * our site requires authentication...
// * so users have a username and password
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: [true, "Please provide a username"],
      validate: [validator.isAlpha, "Username must only contain characters"],
    },
    password: {
      type: String,
      required: [true, "Please provide a password"],
      minlength: [8, "password'length should be greater or equal to 8"],
    },
    email: {
      type: String,
      required: [true, "Please provide a email"],
      unique: true,
      validate: [validator.isEmail, "Please provide a valid email"],
    },
    registrationDate: { type: Date, default: Date.now },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// an item (or group of the same items) in a grocery list
//   require additional Item documents; just increase the quantity!)
const postSchema = new Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, unique: true },
    content: { type: String, required: true },
    // use space in exchange for time, comments stores comment data directly.
    comments: [{ type: String }],
    datePosted: { type: Date, default: Date.now },
    slug: { type: String, unique: true },
  },
  { timestamps: true }
);

// a grocery list
const commentSchema = new Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
    dateCommented: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// TODO: add remainder of setup for slugs, connection, registering models, etc. below
// userSchema.plugin(mongooseSlugPlugin, {tmpl: '<%=username%>'});
// postSchema.plugin(mongooseSlugPlugin, {tmpl: '<%=title%>'});

userSchema.pre("save", async function (next) {
  // hash the password before storing into the database.
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.pre("save", async function (next) {
  this.createPasswordResetToken();
  next();
});

postSchema.pre("save", function (next) {
  // TODO add some unique identifier as slug?
  this.slug = slugify(this.title);
  if (this.slug === "") {
    this.slug = uslug(this.title);
  }
  next();
});

// we will give this methods when user loginned, they are able to reset their password!
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  // console.log({ resetToken }, this.passwordResetToken);
  // 10 minutes valid time
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;
};

mongoose.model("User", userSchema);
mongoose.model("Post", postSchema);
mongoose.model("Comment", commentSchema);
