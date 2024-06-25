import mongoose from "mongoose";
import sanitize from "mongo-sanitize";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const User = mongoose.model("User");
const Post = mongoose.model("Post");
const Comment = mongoose.model("Comment");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_TIME,
  });
};

// send req.cookie a token
const createSendToken = (user, req, res) => {
  const token = signToken(user._id);
  res.cookie("jwt", token, {
    expires: new Date(
      Date.now() + process.env.COOKIE_EXPIRES_TIME * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  });
};

export const getLogin = async (req, res, next) => {
  res.render("login");
};

export const postLogin = async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    // 1. Check if email and password exist
    if (!email || !password) {
      throw new Error("Email or password is not found!");
    }
    // 2. Check if user exist
    const foundUser = await User.findOne({
      username: sanitize(username),
    });
    if (!foundUser) {
      throw new Error("User not found!");
    }

    // 3. Check if password correct
    if (!(await bcrypt.compare(password, foundUser.password))) {
      throw new Error("password does not match");
    }

    // 4. login successful, enter the forum
    createSendToken(foundUser, req, res);
    await foundUser.save();

    res.redirect("/");
  } catch (err) {
    res.render("login", {
      message: `login unsuccessful: ${err}`,
    });
  }
};

export const getRegister = async (req, res, next) => {
  res.render("register");
};

export const postRegister = async (req, res, next) => {
  try {
    const { password, username, email } = req.body;
    console.log(`username: ${username}`);
    console.log(`email: ${email}`);
    console.log(`password: ${password}`);
    // 1. Check if email and password exist
    if (!email || !password) {
      throw new Error("Email or password is not found!");
    }

    // 2. check whether user existed.
    const existedUser = await User.findOne({
      username: sanitize(username),
    });
    if (existedUser) throw new Error("USERNAME ALREADY EXISTS");

    // 3. hash and add jwt to cookie
    const newUser = new User({
      username: sanitize(username),
      email: sanitize(email),
      password: password,
    });
    createSendToken(newUser, req, res);
    await newUser.save();
    // send user back to welcome page
    res.redirect("/");
  } catch (err) {
    res.render("register", {
      message: err,
    });
  }
};

// TODO: add route
export const viewRecent = async (req, res, next) => {
  try {
    let posts = await Post.find({});

    // view the posts within 3 days are called recent 
    if (posts) {
      posts = posts.filter((post) => {
        const timediff = Math.abs(Date.now() - post.datePosted.getTime());
        return timediff < 1000 * 60 * 60 * 24 * 3;
      });
    }

    res.render("view-recent", {
      user: res.locals.user,
      posts: posts,
    });
  } catch (error) {
    res.render("view-recent", {
      message: error,
    });
  }
};

// TODO: add route
export const viewMyPost = async (req, res, next) => {
  try {
    let previewComments;
    let previewPosts;
    const previewPostsComments = [];
    const posts = await Post.find({ user: req.user._id });
    const comments = await Comment.find({ user: req.user._id });

    if (posts) {
      const n = posts.length;
      previewPosts = posts.slice(0, n > 3 ? 3 : n);
    }
    if (comments) {
      const n = comments.length;
      previewComments = comments.slice(0, n > 9 ? 9 : n);
    }

    res.render("view-my-posts", {
      user: res.locals.user,
      posts: previewPosts,
      comments: previewComments,
    });
  } catch (error) {
    res.render("view-my-posts", {
      message: error,
    });
  }
};

export const view = async (req, res, next) => {
  try {
    const posts = await Post.find({});
    res.render("viewAll", {
      user: res.locals.user,
      posts: posts,
    });
  } catch (error) {
    res.render("viewAll", {
      message: error,
    });
  }
};

export const viewOnePost = async (req, res, next) => {
  const postSlug = req.params.postSlug;
  const post = await Post.findOne({ slug: postSlug }).populate("user");
  // create comment strings and display themt
  if (post) {
    res.render("view-one", {
      user: res.locals.user,
      post: post,
    });
  } else {
    res.redirect("/view");
  }
};

// route handler that renders the welcome page
export const welcome = async (req, res, next) => {
  res.render("welcome", {
    user: res.locals.user,
  });
};

// Post form is submitted, display the content of the posts
export const addPost = async (req, res, next) => {
  // console.log(`req.session.user: ${req.session.user}`);
  const post = new Post({
    user: res.locals.user._id,
    title: sanitize(req.body.postTitle),
    content: sanitize(req.body.postContent),
  });
  try {
    await post.save();
    res.redirect("/view");
  } catch (err) {
    res.render("add-post", {
      error: err,
    });
  }
};

// show the content of the posts
export const showPost = async (req, res, next) => {
  res.render("add-post", {
    user: res.locals.user,
  });
};

export const addComment = async (req, res, next) => {
  try {
    const postSlug = req.params.postSlug;
    // find the post by postSlug
    const post = await Post.findOne({ slug: postSlug });
    // TODO update the comments:
    const comment = new Comment({
      post: post._id,
      user: res.locals.user._id,
      content: sanitize(req.body.commentContent),
    });

    post.comments.push(comment.content);

    await comment.save();
    await post.save();
    res.redirect(`/view/${postSlug}`);
  } catch (err) {
    // TODO delete add-comment
    res.render("view-one", {
      error: err,
    });
  }
};

export const postResetPassword = async (req, res, next) => {
  try {
    // 1) Get user based on the token
    const hashedToken = req.params.token;

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // 2) If token has not expired, and there is user, set the new password
    if (!user) {
      res.render("login", {
        message: "please login again to refresh the reset password token",
      });
      return;
    }
    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // 3) Log the user in, send JWT
    createSendToken(user, req, res);
    res.redirect("/");
  } catch (error) {
    // TODO
    res.render("getResetPassword", { message: error });
  }
};

// render the given reset page, with hbs
export const getResetPassword = async (req, res, next) => {
  try {
    const hashedToken = req.params.token;
    if (!hashedToken)
      throw new Error("please login again to refresh the reset password token");
    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });
    // 2) If token has not expired, and there is user, set the new password
    if (!user)
      throw new Error("please login again to refresh the reset password token");
    res.render("getResetPassword");
  } catch (error) {
    res.render("login", {
      message: error,
    });
  }
};
