const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ✅ KEEP YOUR EXISTING MONGODB CONNECTION (IT WORKS!)
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://shehrozkhawaja22_db_user:SK22102002@cluster0.knwmnxu.mongodb.net:27017/mystore?ssl=true&retryWrites=true&w=majority&authSource=admin";

mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas Connected Successfully!");
    createDefaultAdmin();
  })
  .catch(err => console.log("❌ MongoDB Connection Error:", err));

// ========== EMAIL CONFIGURATION (Optional - won't break if not configured) ==========
let transporter = null;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    }
  });
  console.log("✅ Email configured");
} catch(error) {
  console.log("⚠️ Email not configured");
}

// Function to send email notification to admin
async function sendAdminEmailNotification(order) {
  if (!transporter) return;
  try {
    const productList = order.items.map(item => 
      `<li><strong>${item.name}</strong> - ₨${item.price} x ${item.quantity} = ₨${item.price * item.quantity}</li>`
    ).join('');

    await transporter.sendMail({
      from: 'your-email@gmail.com',
      to: 'admin@accessorieshouse.com',
      subject: `🆕 NEW ORDER #${order.trackingId || order._id}`,
      html: `<div><h2>New Order!</h2><p>Order ID: ${order.trackingId || order._id}</p><p>Customer: ${order.name}</p><p>Total: ₨${order.total}</p><ul>${productList}</ul></div>`
    });
    console.log('✅ Admin email sent');
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
}

// Function to send status update email to customer
async function sendCustomerStatusEmail(order, newStatus) {
  if (!transporter) return;
  try {
    await transporter.sendMail({
      from: 'your-email@gmail.com',
      to: order.email,
      subject: `Order #${order.trackingId || order._id} Status Update`,
      html: `<div><h2>Order Status: ${newStatus}</h2><p>Dear ${order.name},</p><p>Your order is now ${newStatus}</p></div>`
    });
    console.log('✅ Customer email sent');
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
}

// ========== STOCK MANAGEMENT FUNCTIONS ==========

// Function to deduct stock when order is placed
async function deductStock(orderItems) {
  const stockUpdates = [];
  
  for (const item of orderItems) {
    // Find the product in database
    const product = await Product.findById(item.productId);
    
    if (!product) {
      console.log(`❌ Product not found: ${item.productId}`);
      continue;
    }
    
    // Calculate new stock quantity
    const newStock = product.stock - item.quantity;
    
    if (newStock < 0) {
      throw new Error(`Insufficient stock for product: ${product.name}. Available: ${product.stock}, Requested: ${item.quantity}`);
    }
    
    // Update product stock
    product.stock = newStock;
    await product.save();
    
    stockUpdates.push({
      name: product.name,
      oldStock: product.stock + item.quantity,
      newStock: newStock,
      deducted: item.quantity
    });
    
    console.log(`📦 Stock deducted: ${product.name} - Old: ${product.stock + item.quantity}, New: ${newStock}`);
  }
  
  return stockUpdates;
}

// Function to revert stock (if order is cancelled/refunded)
async function revertStock(orderItems) {
  for (const item of orderItems) {
    const product = await Product.findById(item.productId);
    if (product) {
      product.stock += item.quantity;
      await product.save();
      console.log(`🔄 Stock reverted: ${product.name} - New stock: ${product.stock}`);
    }
  }
}

// SCHEMAS
const ProductSchema = new mongoose.Schema({
  name: String, 
  price: Number, 
  image: String,
  images: { type: [String], default: [] },
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
  status: { 
    type: String, 
    enum: ['pending', 'warehouse', 'shipped', 'delivered', 'cancelled'],
    default: 'pending'
  }, 
  trackingId: String,
  paymentMethod: String,
  transactionId: String,
  statusHistory: [{
    status: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
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

const Product = mongoose.model("Product", ProductSchema);
const Cart = mongoose.model("Cart", CartSchema);
const Order = mongoose.model("Order", OrderSchema);
const User = mongoose.model("User", UserSchema);
const Category = mongoose.model("Category", CategorySchema);
const Contact = mongoose.model("Contact", ContactSchema);
const Payment = mongoose.model("Payment", PaymentSchema);

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
      console.log("✅ Default admin user created!");
    }
  } catch (error) { 
    console.error("Error creating admin:", error); 
  }
}

// Root route
app.get("/", (req, res) => { 
  res.json({ message: "API is running!", status: "active" }); 
});

app.get("/admin", (req, res) => { 
  res.sendFile(path.join(__dirname, "admin.html")); 
});

// Categories API
app.get("/api/categories", async(req, res) => { 
  try { res.json(await Category.find()); } catch(err) { res.status(500).json(err); } 
});

app.post("/api/categories", async(req, res) => { 
  try { const category = new Category({ name: req.body.name }); await category.save(); res.json(category); } catch(err) { res.status(500).json(err); } 
});

app.delete("/api/categories/:id", async(req, res) => { 
  try { await Category.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); } catch(err) { res.status(500).json(err); } 
});

// Products API
app.post("/api/products", async(req, res) => { 
  try { const product = new Product(req.body); await product.save(); res.json(product); } catch(err) { res.status(500).json(err); } 
});

app.get("/api/products", async(req, res) => { 
  try { res.json(await Product.find()); } catch(err) { res.status(500).json(err); } 
});

app.get("/api/products/:id", async(req, res) => { 
  try { res.json(await Product.findById(req.params.id)); } catch(err) { res.status(500).json(err); } 
});

app.put("/api/products/:id", async(req, res) => { 
  try { res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch(err) { res.status(500).json(err); } 
});

app.delete("/api/products/:id", async(req, res) => { 
  try { await Product.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); } catch(err) { res.status(500).json(err); } 
});

// Cart API
app.post("/api/cart", async(req, res) => { 
  try { const item = new Cart(req.body); await item.save(); res.json(item); } catch(err) { res.status(500).json(err); } 
});

app.get("/api/cart", async(req, res) => { 
  try { res.json(await Cart.find()); } catch(err) { res.status(500).json(err); } 
});

app.delete("/api/cart/:id", async(req, res) => { 
  try { await Cart.findByIdAndDelete(req.params.id); res.json({ message: "Removed" }); } catch(err) { res.status(500).json(err); } 
});

// ========== UPDATED CHECKOUT WITH STOCK DEDUCTION ==========
app.post("/api/checkout", async(req, res) => { 
  try { 
    const orderData = req.body;
    
    // 🔴 DEDUCT STOCK FIRST
    try {
      const stockUpdates = await deductStock(orderData.items);
      console.log(`✅ Stock deducted for ${stockUpdates.length} products`);
    } catch (stockError) {
      console.error("Stock deduction failed:", stockError.message);
      return res.status(400).json({ 
        message: "Insufficient stock", 
        error: stockError.message 
      });
    }
    
    // Create order
    orderData.status = 'pending';
    orderData.statusHistory = [{
      status: 'pending',
      message: 'Order received and confirmed',
      timestamp: new Date()
    }];
    
    const order = new Order(orderData); 
    await order.save(); 
    
    // Send email notification to admin
    await sendAdminEmailNotification(order);
    
    res.json({ 
      message: "Order placed successfully", 
      orderId: order._id, 
      trackingId: order.trackingId 
    }); 
  } catch(err) { 
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message }); 
  } 
});

// Orders API
app.get("/api/orders", async(req, res) => { 
  try { res.json(await Order.find().sort({ date: -1 })); } catch(err) { res.status(500).json(err); } 
});

app.put("/api/orders/:id", async(req, res) => { 
  try { res.json(await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })); } catch(err) { res.status(500).json(err); } 
});

// ========== UPDATED TRACK ORDER - FIXED TO HANDLE BOTH ID FORMATS ==========
app.get("/api/orders/track/:id", async(req, res) => { 
  try { 
    const searchId = req.params.id;
    
    // Try to find by custom trackingId first, then by MongoDB _id
    let order = await Order.findOne({ trackingId: searchId });
    
    if (!order) {
      // If not found by trackingId, try by MongoDB _id
      order = await Order.findById(searchId);
    }
    
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Update order status (warehouse, shipped, delivered)
app.put("/api/orders/:id/status", async(req, res) => { 
  try { 
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    order.status = req.body.status;
    order.statusHistory.push({ status: req.body.status, message: 'Status updated', timestamp: new Date() });
    await order.save();
    await sendCustomerStatusEmail(order, req.body.status);
    res.json(order);
  } catch(err) { res.status(500).json(err); } 
});

// ========== NEW: Cancel order and revert stock ==========
app.put("/api/orders/:id/cancel", async(req, res) => { 
  try { 
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    if (order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order already cancelled' });
    }
    
    // Revert stock
    await revertStock(order.items);
    
    // Update order status
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      message: 'Order has been cancelled',
      timestamp: new Date()
    });
    
    await order.save();
    
    res.json({ message: 'Order cancelled and stock restored', order: order }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Users API
app.post("/api/register", async(req, res) => { 
  try { 
    if (await User.findOne({ username: req.body.username })) return res.status(400).json({ message: "User exists" }); 
    const user = new User(req.body); await user.save(); res.json({ message: "Registered" }); 
  } catch(err) { res.status(500).json(err); } 
});

app.post("/api/login", async(req, res) => { 
  try { 
    const user = await User.findOne({ username: req.body.username, password: req.body.password }); 
    user ? res.json({ message: "Login Successful", role: user.role, username: user.username }) : res.status(401).json({ message: "Invalid credentials" }); 
  } catch(err) { res.status(500).json(err); } 
});

app.get("/api/users", async(req, res) => { 
  try { res.json(await User.find().select('-password')); } catch(err) { res.status(500).json(err); } 
});

// Contact API
app.post("/api/contact", async(req, res) => { 
  try { const msg = new Contact(req.body); await msg.save(); res.json({ message: "Message sent" }); } catch(err) { res.status(500).json(err); } 
});

app.get("/api/contact", async(req, res) => { 
  try { res.json(await Contact.find().sort({ date: -1 })); } catch(err) { res.status(500).json(err); } 
});

// Payments API
app.post("/api/payments", async(req, res) => { 
  try { const payment = new Payment(req.body); await payment.save(); res.json({ message: "Payment recorded" }); } catch(err) { res.status(500).json(err); } 
});

app.get("/api/payments", async(req, res) => { 
  try { res.json(await Payment.find().sort({ date: -1 })); } catch(err) { res.status(500).json(err); } 
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
