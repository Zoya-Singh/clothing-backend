const port = 4000;
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const { log } = require("console");

app.use(express.json());
app.use(cors({
    origin: [
        "https://clothing-frontend.vercel.app",
        "https://admin-clothing-store.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173"
    ]
}));

// Database Connection with MongoDB
mongoose.connect("mongodb+srv://zoyasinghsanjiv1:abcd1234@e-commerse.vwfp3dm.mongodb.net/?retryWrites=true&w=majority&appName=E-commerse");

// API Creation
app.get("/", (req, res) => {
    res.redirect("https://clothing-frontend.vercel.app");
});

// Image Storage Engine
const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage: storage });

// Serving static images
app.use('/images', (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    next();
}, express.static('upload/images'));

// Upload Endpoint for Images
app.post("/upload", upload.single('product'), (req, res) => {
    const imageURL = `https://clothing-store-6uv5.onrender.com/images/${req.file.filename}`;
    res.json({
        success: 1,
        image_url: imageURL
    });
});

//schema for creatin g products
const Product = mongoose.model("Products",{
    id:{
        type: Number,
        required:true,
    },
    image:{
        type: String,
        required:true,
    },
    category:{
        type: String,
        required:true,
    },
    new_price:{
        type: Number,
        required:true,
    },
    old_price:{
        type: Number,
        required:true,
    },
    date:{
        type: Number,
        default:Date.now,
    },
    available:{
        type: Boolean,
        default:true,
    },
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
       let last_product_array = products.slice(-1);
       let last_product = last_product_array[0];
       id = last_product.id + 1;
    }
    else{
        id = 1;
    }
  const product = new Product({
    id: id,
    name:req.body.name,
    image:req.body.image,
    category:req.body.category,
    new_price:req.body.new_price,
    old_price:req.body.old_price,
  });
  console.log(product);
  await product.save();
  res.json({
    success:true,
    name:req.body.name,
  })
})

//API for deleteing product

app.post('/removeproduct',async(req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        sucess:true,
        name:req.body.name
    })
})

//API to get all products
app.get('/allproducts',async(req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//Creating endpoint for reg of the user
app.post('/signup',async(req,res)=>{
    let check = await Users.findOne({email:req.body.email});
    if(check) {
        return res.status(400),json({success:false,errors:"existing user found with same email address"})
    }
    let cart = {};
    for(let i=0; i<300; i++) {
        cart[i]=0;
    }
    const user = new Users({
        name: req.body.username,
        email: req.body.email,
        password: req.body.password,
        cartData: cart,
    })
    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }
    const token = jwt.sign(data,'secret_ecom');
    res.json({success:true,token})
})


app.post('/login',async(req,res)=>{
    let user = await Users.findOne({email:req.body.email})
    if(user) {
        const passCompare = req.body.password === user.password;
        if(passCompare) {
                const data = {
                    user:{
                        id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({success:true,token});
        }
        else{
            res.json({success:false,errors:"Wrong Password"});  
        }
    }
    else{
        res.json({success:false,error:"Wrong Email Id"});
    }
})

// Cart management endpoints
app.post("/getcart", async (req, res) => {
    try {
        const token = req.headers['auth-token'];
        const decoded = jwt.verify(token, 'secret_ecom');
        const userId = decoded.user.id;
        
        const user = await Users.findOne({_id: userId});
        if (!user) {
            return res.status(404).json({success: false, error: "User not found"});
        }
        
        res.json(user.cartData);
    } catch (error) {
        res.status(400).json({success: false, error: error.message});
    }
});

app.post("/addtocart", async (req, res) => {
    try {
        const token = req.headers['auth-token'];
        const decoded = jwt.verify(token, 'secret_ecom');
        const userId = decoded.user.id;
        const itemId = req.body.itemId;
        
        const user = await Users.findOne({_id: userId});
        if (!user) {
            return res.status(404).json({success: false, error: "User not found"});
        }

        user.cartData[itemId] = (user.cartData[itemId] || 0) + 1;
        await user.save();
        
        res.json({success: true, cartData: user.cartData});
    } catch (error) {
        res.status(400).json({success: false, error: error.message});
    }
});

app.post("/removefromcart", async (req, res) => {
    try {
        const token = req.headers['auth-token'];
        const decoded = jwt.verify(token, 'secret_ecom');
        const userId = decoded.user.id;
        const itemId = req.body.itemId;
        
        const user = await Users.findOne({_id: userId});
        if (!user) {
            return res.status(404).json({success: false, error: "User not found"});
        }

        if (user.cartData[itemId] > 0) {
            user.cartData[itemId] -= 1;
        }
        await user.save();
        
        res.json({success: true, cartData: user.cartData});
    } catch (error) {
        res.status(400).json({success: false, error: error.message});
    }
});

app.listen(port, (error) => {
    if (!error) {
        console.log("Server Running on Port " + port);
    } else {
        console.log("Error: " + error);
    }
});


