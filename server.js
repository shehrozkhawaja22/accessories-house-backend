const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

/* ---------------------- MIDDLEWARE ---------------------- */

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

/* ---------------------- MONGODB ATLAS CONNECTION ---------------------- */

// MongoDB Atlas Connection String
const MONGODB_URI = "mongodb+srv://shehrozkhawaja22_db_user:SK22102002@cluster0.knwmnxu.mongodb.net/mystore";

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log("✅ MongoDB Atlas Connected Successfully!");
  createDefaultAdmin();
})
.catch(err => console.log("❌ MongoDB Connection Error:", err));

/* ---------------------- SCHEMAS ---------------------- */

const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  image: String,
  category: String,
  stock: { type: Number, default: 10 },
  rating: { type: Number, default: 5 },
  brand: { type: String, default: "The Accessories House" },
  specs: String,
  fast: { type: Boolean, default: true }
});

const CartSchema = new mongoose.Schema({
  productId: String,
  quantity: Number
});

const OrderSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  total: Number,
  items: Array,
  status: { type: String, default: "pending" },
  date: { type: Date, default: Date.now }
});

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  email: String,
  contact: String,
  role: String
});

const CategorySchema = new mongoose.Schema({
  name: String,
  createdAt: { type: Date, default: Date.now }
});

const ContactSchema = new mongoose.Schema({
  name: String,
  email: String,
  subject: String,
  message: String,
  status: { type: String, default: "unread" },
  date: { type: Date, default: Date.now }
});

const PaymentSchema = new mongoose.Schema({
  orderId: String,
  transactionId: String,
  paymentMethod: String,
  amount: Number,
  status: { type: String, default: "pending" },
  customerName: String,
  customerEmail: String,
  date: { type: Date, default: Date.now }
});

/* ---------------------- MODELS ---------------------- */

const Product = mongoose.model("Product", ProductSchema);
const Cart = mongoose.model("Cart", CartSchema);
const Order = mongoose.model("Order", OrderSchema);
const User = mongoose.model("User", UserSchema);
const Category = mongoose.model("Category", CategorySchema);
const Contact = mongoose.model("Contact", ContactSchema);
const Payment = mongoose.model("Payment", PaymentSchema);

/* ---------------------- CREATE DEFAULT ADMIN ---------------------- */

async function createDefaultAdmin() {
  try {
    const adminExists = await User.findOne({ username: "admin" });
    
    if (!adminExists) {
      const adminUser = new User({
        username: "admin",
        password: "admin123",
        email: "admin@accessorieshouse.com",
        contact: "1234567890",
        role: "Administrator"
      });
      
      await adminUser.save();
      console.log("✅ Default admin user created successfully!");
      console.log("   Username: admin");
      console.log("   Password: admin123");
    } else {
      console.log("✅ Admin user already exists");
    }
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

/* ---------------------- SERVE FRONTEND ---------------------- */

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

/* ---------------------- CATEGORY APIs ---------------------- */

app.get("/api/categories", async(req, res) => {
  try {
    const categories = await Category.find();
    res.json(categories);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.post("/api/categories", async(req, res) => {
  try {
    const category = new Category({ name: req.body.name });
    await category.save();
    res.json(category);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.delete("/api/categories/:id", async(req, res) => {
  try {
    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: "Category deleted" });
  } catch(err) {
    res.status(500).json(err);
  }
});

/* ---------------------- PRODUCT APIs ---------------------- */

app.post("/api/products", async(req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.json(product);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.get("/api/products", async(req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.get("/api/products/:id", async(req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    res.json(product);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.put("/api/products/:id", async(req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.delete("/api/products/:id", async(req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: "Product Deleted" });
  } catch(err) {
    res.status(500).json(err);
  }
});

/* ---------------------- CART APIs ---------------------- */

app.post("/api/cart", async(req, res) => {
  try {
    const item = new Cart(req.body);
    await item.save();
    res.json(item);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.get("/api/cart", async(req, res) => {
  try {
    const cart = await Cart.find();
    res.json(cart);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.delete("/api/cart/:id", async(req, res) => {
  try {
    await Cart.findByIdAndDelete(req.params.id);
    res.json({ message: "Item removed from cart" });
  } catch(err) {
    res.status(500).json(err);
  }
});

/* ---------------------- CHECKOUT / ORDERS ---------------------- */

app.post("/api/checkout", async(req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.json({ message: "Order placed successfully", orderId: order._id });
  } catch(err) {
    res.status(500).json(err);
  }
});

app.get("/api/orders", async(req, res) => {
  try {
    const orders = await Order.find().sort({ date: -1 });
    res.json(orders);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.put("/api/orders/:id", async(req, res) => {
  try {
    const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(order);
  } catch(err) {
    res.status(500).json(err);
  }
});

/* ---------------------- USER AUTH ---------------------- */

app.post("/api/register", async(req, res) => {
  try {
    const existingUser = await User.findOne({ username: req.body.username });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }
    
    const user = new User(req.body);
    await user.save();
    res.json({ message: "User registered successfully" });
  } catch(err) {
    res.status(500).json(err);
  }
});

app.post("/api/login", async(req, res) => {
  try {
    const user = await User.findOne({
      username: req.body.username,
      password: req.body.password
    });

    if (user) {
      res.json({
        message: "Login Successful",
        role: user.role,
        username: user.username
      });
    } else {
      res.status(401).json({
        message: "Invalid username or password"
      });
    }
  } catch(err) {
    res.status(500).json(err);
  }
});

app.get("/api/users", async(req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch(err) {
    res.status(500).json(err);
  }
});

/* ---------------------- CONTACT / QUERIES APIs ---------------------- */

app.post("/api/contact", async(req, res) => {
  try {
    const contactMessage = new Contact({
      name: req.body.name,
      email: req.body.email,
      subject: req.body.subject,
      message: req.body.message,
      status: "unread"
    });
    await contactMessage.save();
    res.json({ message: "Message received successfully", id: contactMessage._id });
  } catch(err) {
    res.status(500).json({ message: "Error saving message", error: err });
  }
});

app.get("/api/contact", async(req, res) => {
  try {
    const messages = await Contact.find().sort({ date: -1 });
    res.json(messages);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.put("/api/contact/:id", async(req, res) => {
  try {
    const message = await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
    res.json(message);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.delete("/api/contact/:id", async(req, res) => {
  try {
    await Contact.findByIdAndDelete(req.params.id);
    res.json({ message: "Message deleted" });
  } catch(err) {
    res.status(500).json(err);
  }
});

/* ---------------------- PAYMENT APIs ---------------------- */

app.post("/api/payments", async(req, res) => {
  try {
    const payment = new Payment(req.body);
    await payment.save();
    res.json({ message: "Payment recorded successfully", id: payment._id });
  } catch(err) {
    res.status(500).json(err);
  }
});

app.get("/api/payments/order/:orderId", async(req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    res.json(payment);
  } catch(err) {
    res.status(500).json(err);
  }
});

app.get("/api/payments", async(req, res) => {
  try {
    const payments = await Payment.find().sort({ date: -1 });
    res.json(payments);
  } catch(err) {
    res.status(500).json(err);
  }
});

/* ---------------------- START SERVER ---------------------- */

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🚀 Server running at http://0.0.0.0:${PORT}`);
  console.log(`📊 Admin Dashboard: http://0.0.0.0:${PORT}/admin`);
  console.log(`🛒 Store Frontend: http://0.0.0.0:${PORT}`);
  console.log(`🗄️  MongoDB Atlas Connected\n`);
});