const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createToken } = require('../services/jwtAuth');

exports.register = async (req, res) => {
  const { username, password,name,email } = req.body;
  try {
    let user = await User.findOne({ username });
    if (user) return res.status(400).json({ msg: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    user = new User({ username, password: hashedPassword,name,email });
    await user.save();

    const token = createToken(user);
    res.json({ token });
  } catch (err) {
      console.error(err.message); 
    res.status(500).json({ msg: 'Server error' }); 

  }
};

exports.login = async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username }); 
    if (!user) return res.status(400).json({ msg: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ msg: 'Invalid credentials' });

    const token = createToken(user);
    res.json({ token });
  } catch (err) {
   console.error(err.message);
    res.status(500).json({ msg: 'Server error' }); 
  }
};
