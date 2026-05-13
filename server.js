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

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000,
  socketTimeoutMS: 45000,
})
.then(() => {
  console.log("✅ MongoDB Atlas Connected Successfully!");
  createDefaultAdmin();
})
.catch(err => console.log("❌ MongoDB Connection Error:", err));

// ========== EMAIL CONFIGURATION (Gmail SMTP) ==========
// UPDATE THESE WITH YOUR ACTUAL GMAIL DETAILS WHEN READY
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',    // ← UPDATE LATER
    pass: 'your-app-password'         // ← UPDATE LATER
  }
});

// Function to send email notification to admin
async function sendAdminEmailNotification(order) {
  const productList = order.items.map(item => 
    `<li><strong>${item.name}</strong> - ₨${item.price} x ${item.quantity} = ₨${item.price * item.quantity}</li>`
  ).join('');

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: 'admin@accessorieshouse.com',
    subject: `🆕 NEW ORDER #${order.trackingId || order._id}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E8D58A; border-radius: 10px;">
        <div style="background: linear-gradient(135deg, #D4A017, #B8860B); padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">🆕 NEW ORDER RECEIVED!</h2>
        </div>
        <div style="padding: 20px;">
          <p><strong>Order ID:</strong> ${order.trackingId || order._id}</p>
          <p><strong>Customer Name:</strong> ${order.name}</p>
          <p><strong>Email:</strong> ${order.email}</p>
          <p><strong>Phone:</strong> ${order.phone}</p>
          <p><strong>Address:</strong> ${order.address}</p>
          <p><strong>Payment Method:</strong> ${order.paymentMethod || 'N/A'}</p>
          <p><strong>Transaction ID:</strong> ${order.transactionId || 'N/A'}</p>
          <h3>Products Ordered:</h3>
          <ul>${productList}</ul>
          <p style="font-size: 18px; font-weight: bold; color: #B8860B;">Total Amount: ₨${order.total}</p>
          <hr>
          <p style="font-size: 12px; color: #666;">Manage this order in Admin Portal</p>
        </div>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Admin email notification sent');
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
}

// Function to send status update email to customer
async function sendCustomerStatusEmail(order, newStatus) {
  const statusMessages = {
    'warehouse': 'Your order is now being processed in our warehouse.',
    'shipped': 'Great news! Your order has been shipped and is on the way!',
    'delivered': 'Your order has been delivered. Hope you enjoy your purchase!'
  };

  const mailOptions = {
    from: 'your-email@gmail.com',
    to: order.email,
    subject: `Order #${order.trackingId || order._id} Status Update`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E8D58A; border-radius: 10px;">
        <div style="background: #2196F3; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="color: white; margin: 0;">Order Status Updated!</h2>
        </div>
        <div style="padding: 20px;">
          <p>Dear <strong>${order.name}</strong>,</p>
          <p>${statusMessages[newStatus]}</p>
          <div style="background: #F5F5F5; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <p><strong>Order ID:</strong> ${order.trackingId || order._id}</p>
            <p><strong>Total Amount:</strong> ₨${order.total}</p>
            <p><strong>Current Status:</strong> ${newStatus.toUpperCase()}</p>
          </div>
          <p>Thank you for shopping with The Accessories House!</p>
        </div>
      </div>
    `
  };
  
  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Customer status email sent');
  } catch (error) {
    console.error('❌ Email error:', error.message);
  }
}

// SCHEMAS - UPDATE OrderSchema to include tracking features
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

// UPDATED OrderSchema with tracking fields
const OrderSchema = new mongoose.Schema({
  name: String, 
  email: String, 
  phone: String, 
  address: String,
  total: Number, 
  items: Array, 
  status: { 
    type: String, 
    enum: ['pending', 'warehouse', 'shipped', 'delivered'],
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

// Root route - API status check
app.get("/", (req, res) => { 
  res.json({ 
    message: "The Accessories House API is running!", 
    status: "active",
    endpoints: [
      "/api/products",
      "/api/categories", 
      "/api/users", 
      "/api/orders",
      "/api/contact"
    ]
  }); 
});

app.get("/admin", (req, res) => { 
  res.sendFile(path.join(__dirname, "admin.html")); 
});

// ========== API Routes ==========

// Categories
app.get("/api/categories", async(req, res) => { 
  try { 
    res.json(await Category.find()); 
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
    res.json({ message: "Deleted" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Products
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
  try { 
    const products = await Product.find();
    console.log(`Sending ${products.length} products`);
    res.json(products); 
  } catch(err) { 
    console.error("Products error:", err);
    res.status(500).json(err); 
  } 
});

app.get("/api/products/:id", async(req, res) => { 
  try { 
    res.json(await Product.findById(req.params.id)); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.put("/api/products/:id", async(req, res) => { 
  try { 
    res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.delete("/api/products/:id", async(req, res) => { 
  try { 
    await Product.findByIdAndDelete(req.params.id); 
    res.json({ message: "Deleted" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Cart
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
    res.json(await Cart.find()); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.delete("/api/cart/:id", async(req, res) => { 
  try { 
    await Cart.findByIdAndDelete(req.params.id); 
    res.json({ message: "Removed" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Checkout with email notification
app.post("/api/checkout", async(req, res) => { 
  try { 
    const orderData = req.body;
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
    
    res.json({ message: "Order placed", orderId: order._id, trackingId: order.trackingId }); 
  } catch(err) { 
    console.error("Checkout error:", err);
    res.status(500).json(err); 
  } 
});

// Get all orders
app.get("/api/orders", async(req, res) => { 
  try { 
    res.json(await Order.find().sort({ date: -1 })); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// NEW: Track order by ID
app.get("/api/orders/track/:id", async(req, res) => { 
  try { 
    const order = await Order.findOne({ 
      $or: [{ trackingId: req.params.id }, { _id: req.params.id }]
    });
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ message: 'Order not found' });
    }
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// NEW: Update order status (warehouse, shipped, delivered)
app.put("/api/orders/:id/status", async(req, res) => { 
  try { 
    const { id } = req.params;
    const { status } = req.body;
    
    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    const oldStatus = order.status;
    order.status = status;
    order.statusHistory.push({
      status: status,
      message: getStatusMessage(status),
      timestamp: new Date()
    });
    
    await order.save();
    
    // Send email to customer for status updates
    if (status !== 'pending') {
      await sendCustomerStatusEmail(order, status);
    }
    
    console.log(`📧 Order ${order._id} status changed from ${oldStatus} to ${status}`);
    res.json(order); 
  } catch(err) { 
    console.error("Status update error:", err);
    res.status(500).json(err); 
  } 
});

function getStatusMessage(status) {
  const messages = {
    'warehouse': 'Order is being processed in warehouse',
    'shipped': 'Order has left the warehouse and is on the way',
    'delivered': 'Order has been delivered successfully'
  };
  return messages[status] || 'Status updated';
}

// Users
app.post("/api/register", async(req, res) => { 
  try { 
    if (await User.findOne({ username: req.body.username })) 
      return res.status(400).json({ message: "User exists" }); 
    const user = new User(req.body); 
    await user.save(); 
    res.json({ message: "Registered" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.post("/api/login", async(req, res) => { 
  try { 
    const user = await User.findOne({ username: req.body.username, password: req.body.password }); 
    if (user) 
      res.json({ message: "Login Successful", role: user.role, username: user.username }); 
    else 
      res.status(401).json({ message: "Invalid credentials" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.get("/api/users", async(req, res) => { 
  try { 
    res.json(await User.find().select('-password')); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Contact
app.post("/api/contact", async(req, res) => { 
  try { 
    const msg = new Contact(req.body); 
    await msg.save(); 
    res.json({ message: "Message sent" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.get("/api/contact", async(req, res) => { 
  try { 
    res.json(await Contact.find().sort({ date: -1 })); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.put("/api/contact/:id", async(req, res) => { 
  try { 
    res.json(await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.delete("/api/contact/:id", async(req, res) => { 
  try { 
    await Contact.findByIdAndDelete(req.params.id); 
    res.json({ message: "Deleted" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Payments
app.post("/api/payments", async(req, res) => { 
  try { 
    const payment = new Payment(req.body); 
    await payment.save(); 
    res.json({ message: "Payment recorded" }); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.get("/api/payments/order/:orderId", async(req, res) => { 
  try { 
    res.json(await Payment.findOne({ orderId: req.params.orderId })); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

app.get("/api/payments", async(req, res) => { 
  try { 
    res.json(await Payment.find().sort({ date: -1 })); 
  } catch(err) { 
    res.status(500).json(err); 
  } 
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ MongoDB Atlas Connected`);
});
