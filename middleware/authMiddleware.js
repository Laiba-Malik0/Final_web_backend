const jwt = require('jsonwebtoken');

// 1. Protect Routes (Authentication Check)
const protect = (req, res, next) => {
  let token = req.headers.authorization;

  if (token && token.startsWith('Bearer')) {
    try {
      token = token.split(' ')[1];
      
      const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
      const decoded = jwt.verify(token, jwtSecret);
      
      req.user = decoded; // Contains id, role, etc.
      next();
    } catch (error) {
      // Terminal me repeated logs avoid karne ke liye error print skip kar rahe hain
      return res.status(401).json({ message: 'Unauthorized, Token Invalid or Expired' });
    }
  } else {
    return res.status(401).json({ message: 'No Token Provided, Authorization Denied' });
  }
};

// 2. Admin Only Middleware
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access Denied: Admins Only' });
  }
};

// 3. Dynamic Role Authorization Middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Access Denied: Role '${req.user?.role}' is not authorized` });
    }
    next();
  };
};

module.exports = { protect, adminOnly, authorize };