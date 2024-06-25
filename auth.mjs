import mongoose from "mongoose";
import { promisify } from "util";
import jwt from "jsonwebtoken";
const User = mongoose.model("User");

const authRequiredPaths = ["/view", "/add/post", "/add/comment/"];
export const checkJWT = async (req, res, next) => {
  try {
    if (req.cookies.jwt) {
      let token = req.cookies.jwt;
      const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
      const currentUser = await User.findById(decoded.id);
      req.user = currentUser;
      res.locals.user = currentUser;
    }
  } catch (error) {
    // do nothing here because we should make login work, otherwise userController cannot work. 
  }
  next();
};
export const verifyJWT = async (req, res, next) => {
  // if it is required path, enter authorization stage
  try {
    let token;
    if (req.cookies.jwt) token = req.cookies.jwt;
    if (!token) {
      res.render("login", { message: "please login first" });
      return;
    }
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      throw new Error("No user found with this jwt");
    }
    req.user = currentUser;
    res.locals.user = currentUser;
  } catch (error) {
    res.render("login", { message: error });
    return;
  }
  // if it is protected routes, then we check res.locals.user
  if (
    authRequiredPaths.reduce((prev, val) => {
      if (req.path.startsWith(val)) prev = true;
      return prev;
    }, false)
  ) {
    if (res.locals.user) next();
    else res.redirect("/login");
  } else {
    next();
  }
};
