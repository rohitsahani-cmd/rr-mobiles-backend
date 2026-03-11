const { signupValidation, loginValidation } = require("../middlewares/AuthValidation");
const {signup, login}=require('../controllers/AuthController')

const router=require("express").Router()

router.post('/signup',signupValidation,signup);
router.post('/login',loginValidation,login);

module.exports=router;