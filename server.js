const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(cors()); 

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/restaurant', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log('Error connecting to MongoDB:', err));

// User schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    orders: [{
        items: [{ name: String, price: Number, quantity: Number }],
        totalAmount: Number,
        tokenNumber: Number,
        date: { type: Date, default: Date.now }
    }]
});

const User = mongoose.model('User', userSchema);

// Register endpoint
app.post('/signup', async (req, res) => {
    const { username, email, password } = req.body;
    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, email, password: hashedPassword });
        await newUser.save();

        console.log('Hashed Password:', hashedPassword);

        const token = jwt.sign({ userId: newUser._id }, 'your_jwt_secret');
        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Error signing up', error });
    }
});

// Login endpoint
// app.post('/login', async (req, res) => {
//     const { email, password } = req.body;
//     try {
//         const user = await User.findOne({ email });
//         if (!user) {
//             return res.status(400).json({ message: 'Invalid credentials' });
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.password);
//         if (!isPasswordValid) {
//             return res.status(400).json({ message: 'Invalid credentials' });
//         }

//         const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
       
//          // Fetch and send user orders along with the login response
//          res.status(200).json({
//             message: `Welcome back, ${user.username}!`,
//             token,
//             orders: user.orders // Include the user's orders
//         });
//     } catch (error) {
//         res.status(500).json({ message: 'Error logging in', error });
//     }
// });
// Login endpoint
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ userId: user._id }, 'your_jwt_secret');
        
        // Check if the user has any orders
        if (user.orders && user.orders.length > 0) {
            res.status(200).json({
                token,
                message: 'Welcome back! You have saved orders.',
                orders: user.orders
            });
        } else {
            res.status(200).json({
                token,
                message: 'Welcome! You have no previous orders.',
                orders: []
            });
        }
    } catch (error) {
        res.status(500).json({ message: 'Error logging in', error });
    }
});


// Place order endpoint
// Get user orders endpoint
app.post('/orders', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({
            message: 'Orders fetched successfully',
            orders: user.orders,
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders', error });
    }
});

app.post('/place-order', async (req, res) => {
    const { items, totalAmount } = req.body;
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const decoded = jwt.verify(token, 'your_jwt_secret');
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const tokenNumber = user.orders.length + 1;

        user.orders.push({ items, totalAmount, tokenNumber });
        await user.save();

        res.status(200).json({ message: 'Order placed successfully', tokenNumber });
    } catch (error) {
        res.status(500).json({ message: 'Error placing order', error });
    }
});




app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
