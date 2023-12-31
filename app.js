import dotenv from "dotenv";
dotenv.config();
import express from "express";
import bodyParser from "body-parser";
import mongoose from "mongoose";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { check , validationResult } from "express-validator";
import bcrypt from "bcrypt";
import session from "express-session";
const _dirname = dirname(fileURLToPath(import.meta.url));

mongoose.connect("mongodb://127.0.0.1:27017/ecommerceDB");

async function main(){

    const app = express();
    const port = 3000;

    app.use(bodyParser.urlencoded({extended: true}));

    app.use(express.static("public"));

    // Use the express-session middleware
    app.use(session({
        secret: process.env.SECRET_KEY, 
        resave: false,
        saveUninitialized: false,
    }));

    const userSchema = new mongoose.Schema({
        name: {
            type: String,
            required: [true , "please enter valid name"]
        },
        email: {
            type: String,
            required: [true , "please enter valid email"]
        },
        password: {
            type: String,
            required: [true , "please enter valid password"]
        },
        number: {
            type: String,
            required: [true , "please enter valid phone number"]
        },
        termsAndConditions: Boolean
    });

    const User = new mongoose.model("User" , userSchema);

    app.get("/", (req , res)=>{
        const isLoggedIn = req.session.isLoggedIn || false;
        res.render("index.ejs" , {isLoggedIn});
    });

    app.get("/signup" , (req , res)=>{
        res.sendFile(_dirname + "/public/signup.html");
    });

    app.post("/signup" ,  [
        // Express-validator validation rules
        check('name').notEmpty().withMessage('Name is required'),
        check('email').isEmail().withMessage('Invalid email address'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
        check('number').isMobilePhone().withMessage('Invalid phone number'),
        check('termsAndConditons').toBoolean().isBoolean().withMessage('Terms and conditions must be accepted'),
      ] , async (req , res)=>{
        // console.log(req.body);

        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { name, email, password, number, termsAndConditions } = req.body;

        // Check if a user with the same email already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.redirect('/signup?message=User already exists');
        }
    
        try {
          // A hashed password is used for security purposes/Password Storage, especially in the context of user authentication and data protection.
          const hashedPassword = await bcrypt.hash(password, 10);
          const user = new User({
            name,
            email,
            password: hashedPassword,
            number,
            termsAndConditions,
          });
    
          await user.save();
          res.redirect('/');
        } catch (error) {
          console.error(error);
          res.status(500).send('Error registering user');
        }
    });

    app.get("/login" , (req , res)=>{
        res.sendFile(_dirname + "/public/login.html");
    });

    app.post("/login", [
        check('email').isEmail().withMessage('Invalid email address'),
        check('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')], 
        async (req , res)=>{

        // console.log(req.body);
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email, password } = req.body;

        // Find a user with the provided email
        const user = await User.findOne({ email });
      
        // Check is user exists or not
        if (!user) {
          // Redirect to the login page with an error message
            return res.redirect("/login?error=User not found");
        }
      
        // If exists, Compare the provided password with the stored hashed password
        const passwordMatch = await bcrypt.compare(password, user.password);
      
        if (passwordMatch) {
           // Set the session to remember the login status
            req.session.isLoggedIn = true;
            // Redirect to the login page with a success message
            return res.redirect("/");
        } else {
          // Redirect to the login page with an error message
            return res.redirect("/login?error=Incorrect password");
        }

    });

    app.get("/logout", (req, res) => {
        req.session.isLoggedIn = false; // Clear the session to log the user out
        res.redirect("/");
    });
    

    app.get("/search" , (req , res)=>{
        const isLoggedIn = req.session.isLoggedIn || false;
        res.render("search.ejs" , {isLoggedIn});
    });

    app.get("/product" , (req , res)=>{
        const isLoggedIn = req.session.isLoggedIn || false;
        res.render("product.ejs" , {isLoggedIn});
    });

    app.post("/product" , (req , res)=>{
        // Retrieve product details from the request
        // console.log(req.body);
        const { name, price, size } = req.body;

        // Create a new cart item object
        const cartItem = { name, price, size };

        // Add the item to the user's cart stored in the session, if not create empty
        if(req.session.isLoggedIn === true){
            req.session.cart = req.session.cart || [];
            req.session.cart.push(cartItem);
            res.redirect("/cart");
        }else{
            res.redirect("/login")
        }
        
    })

    app.get("/cart" , (req , res) =>{
        if(req.session.isLoggedIn === true){
            const cartItems = req.session.cart || [];
            res.render('cart.ejs' , {cartItems});
        }else{
            res.redirect("/login");
        }
        
    })

    app.post("/cart" , (req , res)=>{
        // console.log(req.body);
        const { index } = req.body;
        if (req.session.cart && req.session.cart.length > index) {
            req.session.cart.splice(index, 1);
            res.redirect("/cart");
        } else {
            res.sendStatus(400);
        }
    })

    app.listen(port , () => {
        console.log(`Server running on port ${port}`);
    });   

}
main().catch(err => {
    console.log(err);
}); 