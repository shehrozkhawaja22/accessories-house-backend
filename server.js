// server.js - Complete Backend with Email Notifications & Order Tracking
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB Connection (Update this with your actual MongoDB connection string)
mongoose.connect('mongodb://localhost:27017/accessories_house', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// ========== SCHEMAS ==========
const ProductSchema = new mongoose.Schema({
  name: String,
  price: Number,
  category: String,
  stock: { type: Number, default: 10 },
  rating: { type: Number, default: 5 },
  brand: String,
  image: String,
  images: [String],
  specs: String,
  fast: { type: Boolean, default: false }
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  name: { type: String, unique: true }
});

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  password: String,
  email: String,
  contact: String,
  role: { type: String, default: 'customer' }
});

const OrderSchema = new mongoose.Schema({
  name: String,
  email: String,
  phone: String,
  address: String,
  total: Number,
  items: [{
    productId: String,
    name: String,
    price: Number,
    quantity: { type: Number, default: 1 }
  }],
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
  }]
}, { timestamps: true });

const Product = mongoose.model('Product', ProductSchema);
const Category = mongoose.model('Category', CategorySchema);
const User = mongoose.model('User', UserSchema);
const Order = mongoose.model('Order', OrderSchema);

// ========== EMAIL CONFIGURATION (Gmail SMTP) ==========
// !!! UPDATE THESE WITH YOUR ACTUAL GMAIL DETAILS LATER !!!
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',    // ← UPDATE THIS: Your Gmail address
    pass: 'your-app-password'         // ← UPDATE THIS: Your 16-char App Password
  }
});

// Function to send email notification to admin
async function sendAdminEmailNotification(order) {
  const productList = order.items.map(item => 
    `<li><strong>${item.name}</strong> - ₨${item.price} x ${item.quantity} = ₨${item.price * item.quantity}</li>`
  ).join('');

  const mailOptions = {
    from: 'your-email@gmail.com',     // ← UPDATE THIS
    to: 'admin@accessorieshouse.com',  // ← UPDATE THIS: Your admin email
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
          <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
          <p><strong>Transaction ID:</strong> ${order.transactionId || 'N/A'}</p>
          <h3>Products Ordered:</h3>
          <ul>${productList}</ul>
          <p style="font-size: 18px; font-weight: bold; color: #B8860B;">Total Amount: ₨${order.total}</p>
          <hr style="border-color: #E8D58A;">
          <p style="font-size: 12px; color: #666;">Manage this order: <a href="https://yourdomain.com/admin">Admin Portal</a></p>
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

  const statusColors = {
    'warehouse': '#2196F3',
    'shipped': '#9C27B0',
    'delivered': '#4CAF50'
  };

  const mailOptions = {
    from: 'your-email@gmail.com',     // ← UPDATE THIS
    to: order.email,
    subject: `Order #${order.trackingId || order._id} Status Update`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #E8D58A; border-radius: 10px;">
        <div style="background: ${statusColors[newStatus]}; padding: 15px; text-align: center; border-radius: 8px 8px 0 0;">
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
          <p>Track your order here: <a href="https://yourdomain.com/tracking">Order Tracking</a></p>
          <hr style="border-color: #E8D58A;">
          <p style="font-size: 12px; color: #666;">Thank you for shopping with The Accessories House!</p>
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

// ========== API ENDPOINTS ==========

// Products
app.get('/api/products', async (req, res) => {
  const products = await Product.find();
  res.json(products);
});

app.post('/api/products', async (req, res) => {
  const product = new Product(req.body);
  await product.save();
  res.status(201).json(product);
});

app.put('/api/products/:id', async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(product);
});

app.delete('/api/products/:id', async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Categories
app.get('/api/categories', async (req, res) => {
  const categories = await Category.find();
  res.json(categories);
});

app.post('/api/categories', async (req, res) => {
  const category = new Category(req.body);
  await category.save();
  res.status(201).json(category);
});

app.delete('/api/categories/:id', async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.json({ message: 'Deleted' });
});

// Users
app.get('/api/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.post('/api/register', async (req, res) => {
  const user = new User(req.body);
  await user.save();
  res.status(201).json(user);
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username, password });
  if (user) {
    res.json({ username: user.username, role: user.role });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Orders
app.get('/api/orders', async (req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 });
  res.json(orders);
});

// Track order by ID
app.get('/api/orders/track/:id', async (req, res) => {
  const order = await Order.findOne({ 
    $or: [{ trackingId: req.params.id }, { _id: req.params.id }]
  });
  if (order) {
    res.json(order);
  } else {
    res.status(404).json({ message: 'Order not found' });
  }
});

// Checkout with email notification
app.post('/api/checkout', async (req, res) => {
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
    
    console.log(`📦 New order received: ${order._id}`);
    
    // 🔔 Send email notification to ADMIN
    await sendAdminEmailNotification(order);
    
    res.status(201).json(order);
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update order status (warehouse, shipped, delivered)
app.put('/api/orders/:id/status', async (req, res) => {
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
    
    console.log(`📧 Order ${order._id} status changed from ${oldStatus} to ${status}`);
    
    // 📧 Send email notification to CUSTOMER (only for warehouse, shipped, delivered)
    if (status !== 'pending') {
      await sendCustomerStatusEmail(order, status);
    }
    
    res.json(order);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ error: error.message });
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

// Contact form
app.post('/api/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  const mailOptions = {
    from: 'your-email@gmail.com',     // ← UPDATE THIS
    to: 'support@accessorieshouse.com', // ← UPDATE THIS
    subject: `Contact Form: ${subject}`,
    html: `<p><strong>Name:</strong> ${name}</p>
           <p><strong>Email:</strong> ${email}</p>
           <p><strong>Message:</strong> ${message}</p>`
  };
  
  try {
    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
