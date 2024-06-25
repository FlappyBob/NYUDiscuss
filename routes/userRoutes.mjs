import express from "express";
import {
  view,
  welcome,
  getLogin,
  postLogin,
  getRegister,
  postRegister,
  addComment,
  addPost,
  viewOnePost,
  showPost,
  getResetPassword,
  postResetPassword,
  viewMyPost,
  viewRecent
} from "../controllers/userController.mjs";
import * as auth from "../auth.mjs";
const router = express.Router();

router.use(auth.checkJWT);
router.route("/").get(welcome);
router.route("/welcome").get(welcome);
router.route("/login").get(getLogin).post(postLogin);
router.route("/register").get(getRegister).post(postRegister);

router.use(auth.verifyJWT);
router.route("/view").get(view);
router.route("/view-recent").get(viewRecent);
router.route("/view-mypost").get(viewMyPost);
router.route("/view/:postSlug").get(viewOnePost).post(addComment);
router.route("/add/post").get(showPost).post(addPost);
router.route("/resetPassword/:token").get(getResetPassword).post(postResetPassword);

export default router;
