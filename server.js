const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname));

const MONGODB_URI = "mongodb+srv://shehrozkhawaja22_db_user:SK22102002@cluster0.knwmnxu.mongodb.net/mystore";

mongoose.connect(MONGODB_URI)
.then(() => {
  console.log("✅ MongoDB Atlas Connected Successfully!");
  createDefaultAdmin();
})
.catch(err => console.log("❌ MongoDB Connection Error:", err));

// SCHEMAS
const ProductSchema = new mongoose.Schema({
  name: String, price: Number, image: String, category: String,
  stock: { type: Number, default: 10 }, rating: { type: Number, default: 5 },
  brand: { type: String, default: "The Accessories House" }, specs: String, fast: { type: Boolean, default: true }
});

const CartSchema = new mongoose.Schema({ productId: String, quantity: Number });
const OrderSchema = new mongoose.Schema({
  name: String, email: String, phone: String, address: String,
  total: Number, items: Array, status: { type: String, default: "pending" }, date: { type: Date, default: Date.now }
});
const UserSchema = new mongoose.Schema({ username: String, password: String, email: String, contact: String, role: String });
const CategorySchema = new mongoose.Schema({ name: String, createdAt: { type: Date, default: Date.now } });
const ContactSchema = new mongoose.Schema({
  name: String, email: String, subject: String, message: String,
  status: { type: String, default: "unread" }, date: { type: Date, default: Date.now }
});
const PaymentSchema = new mongoose.Schema({
  orderId: String, transactionId: String, paymentMethod: String, amount: Number,
  status: { type: String, default: "pending" }, customerName: String, customerEmail: String, date: { type: Date, default: Date.now }
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
      const adminUser = new User({ username: "admin", password: "admin123", email: "admin@accessorieshouse.com", contact: "1234567890", role: "Administrator" });
      await adminUser.save();
      console.log("✅ Default admin user created!");
    }
  } catch (error) { console.error("Error creating admin:", error); }
}

app.get("/", (req, res) => { res.sendFile(path.join(__dirname, "index.html")); });
app.get("/admin", (req, res) => { res.sendFile(path.join(__dirname, "admin.html")); });

// API Routes
app.get("/api/categories", async(req, res) => { try { res.json(await Category.find()); } catch(err) { res.status(500).json(err); } });
app.post("/api/categories", async(req, res) => { try { const category = new Category({ name: req.body.name }); await category.save(); res.json(category); } catch(err) { res.status(500).json(err); } });
app.delete("/api/categories/:id", async(req, res) => { try { await Category.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); } catch(err) { res.status(500).json(err); } });

app.post("/api/products", async(req, res) => { try { const product = new Product(req.body); await product.save(); res.json(product); } catch(err) { res.status(500).json(err); } });
app.get("/api/products", async(req, res) => { try { res.json(await Product.find()); } catch(err) { res.status(500).json(err); } });
app.get("/api/products/:id", async(req, res) => { try { res.json(await Product.findById(req.params.id)); } catch(err) { res.status(500).json(err); } });
app.put("/api/products/:id", async(req, res) => { try { res.json(await Product.findByIdAndUpdate(req.params.id, req.body, { new: true })); } catch(err) { res.status(500).json(err); } });
app.delete("/api/products/:id", async(req, res) => { try { await Product.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); } catch(err) { res.status(500).json(err); } });

app.post("/api/cart", async(req, res) => { try { const item = new Cart(req.body); await item.save(); res.json(item); } catch(err) { res.status(500).json(err); } });
app.get("/api/cart", async(req, res) => { try { res.json(await Cart.find()); } catch(err) { res.status(500).json(err); } });
app.delete("/api/cart/:id", async(req, res) => { try { await Cart.findByIdAndDelete(req.params.id); res.json({ message: "Removed" }); } catch(err) { res.status(500).json(err); } });

app.post("/api/checkout", async(req, res) => { try { const order = new Order(req.body); await order.save(); res.json({ message: "Order placed", orderId: order._id }); } catch(err) { res.status(500).json(err); } });
app.get("/api/orders", async(req, res) => { try { res.json(await Order.find().sort({ date: -1 })); } catch(err) { res.status(500).json(err); } });
app.put("/api/orders/:id", async(req, res) => { try { res.json(await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })); } catch(err) { res.status(500).json(err); } });

app.post("/api/register", async(req, res) => { try { if (await User.findOne({ username: req.body.username })) return res.status(400).json({ message: "User exists" }); const user = new User(req.body); await user.save(); res.json({ message: "Registered" }); } catch(err) { res.status(500).json(err); } });
app.post("/api/login", async(req, res) => { try { const user = await User.findOne({ username: req.body.username, password: req.body.password }); if (user) res.json({ message: "Login Successful", role: user.role, username: user.username }); else res.status(401).json({ message: "Invalid credentials" }); } catch(err) { res.status(500).json(err); } });
app.get("/api/users", async(req, res) => { try { res.json(await User.find().select('-password')); } catch(err) { res.status(500).json(err); } });

app.post("/api/contact", async(req, res) => { try { const msg = new Contact(req.body); await msg.save(); res.json({ message: "Message sent" }); } catch(err) { res.status(500).json(err); } });
app.get("/api/contact", async(req, res) => { try { res.json(await Contact.find().sort({ date: -1 })); } catch(err) { res.status(500).json(err); } });
app.put("/api/contact/:id", async(req, res) => { try { res.json(await Contact.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true })); } catch(err) { res.status(500).json(err); } });
app.delete("/api/contact/:id", async(req, res) => { try { await Contact.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); } catch(err) { res.status(500).json(err); } });

app.post("/api/payments", async(req, res) => { try { const payment = new Payment(req.body); await payment.save(); res.json({ message: "Payment recorded" }); } catch(err) { res.status(500).json(err); } });
app.get("/api/payments/order/:orderId", async(req, res) => { try { res.json(await Payment.findOne({ orderId: req.params.orderId })); } catch(err) { res.status(500).json(err); } });
app.get("/api/payments", async(req, res) => { try { res.json(await Payment.find().sort({ date: -1 })); } catch(err) { res.status(500).json(err); } });

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`✅ MongoDB Atlas Connected`);
});
