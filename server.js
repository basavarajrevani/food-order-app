const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

console.log('Starting server...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'URI is set' : 'URI is missing');

// Basic test route
app.get('/', (req, res) => {
  res.send('Server is running!');
});

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Successfully connected to MongoDB Atlas!');
    console.log('Database Name: nomnomexpress');
    console.log('Collections will be created automatically when data is inserted');
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Define Order Schema
const orderSchema = new mongoose.Schema({
  items: [{
    name: String,
    price: Number,
    quantity: Number
  }],
  totalAmount: Number,
  deliveryAddress: String,
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'delivered'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Order = mongoose.model('Order', orderSchema);

// Define Chat Schema
const chatSchema = new mongoose.Schema({
  message: String,
  type: String, // 'user' or 'bot'
  timestamp: {
    type: Date,
    default: Date.now
  }
});

const Chat = mongoose.model('Chat', chatSchema);

// Test database route
app.get('/api/test-db', async (req, res) => {
  console.log('Test DB endpoint hit');
  try {
    const testChat = new Chat({
      message: 'Test message',
      type: 'bot'
    });
    const savedChat = await testChat.save();
    console.log('Test document saved:', savedChat);
    res.json({ message: 'Database connection successful!', testChat: savedChat });
  } catch (error) {
    console.error('Test DB error:', error);
    res.status(500).json({ error: error.message });
  }
});

// API Routes
app.get('/api/chats', async (req, res) => {
  try {
    const chats = await Chat.find().sort({ timestamp: -1 }).limit(50);
    res.json(chats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const chat = new Chat(req.body);
    await chat.save();
    res.status(201).json(chat);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders', async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/orders/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  console.log('Available routes:');
  console.log('- GET  /');
  console.log('- GET  /api/test-db');
  console.log('- GET  /api/chats');
  console.log('- POST /api/chat');
  console.log('- GET  /api/orders');
  console.log('- POST /api/orders');
  console.log('- GET  /api/orders/:id');
});
