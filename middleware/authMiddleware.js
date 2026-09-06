const jwt = require('jsonwebtoken');

// 1. Protect Routes (Authentication Check)
const protect = (req, res, next) => {
  let token = req.headers.authorization;

  // Case-insensitive check for 'Bearer '
  if (token && token.toLowerCase().startsWith('bearer ')) {
    try {
      token = token.split(' ')[1];
      
      const jwtSecret = process.env.JWT_SECRET || 'fallback_secret_key';
      const decoded = jwt.verify(token, jwtSecret);
      
      req.user = decoded; // Contains id, role, etc.
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Unauthorized, Token Invalid or Expired' });
    }
  } else {
    return res.status(401).json({ message: 'No Token Provided, Authorization Denied' });
  }
};

// 2. Admin Only Middleware (Safe Case Check)
const adminOnly = (req, res, next) => {
  const userRole = req.user?.role?.toLowerCase()?.trim();

  if (userRole === 'admin') {
    next();
  } else {
    return res.status(403).json({ message: 'Access Denied: Admins Only' });
  }
};

// 3. Dynamic Role Authorization Middleware (Safe Case Check)
const authorize = (...roles) => {
  // Pass kiye gaye roles ko lowercase array mein convert kar rahe hain
  const normalizedRoles = roles.map((r) => r.toLowerCase().trim());

  return (req, res, next) => {
    const userRole = req.user?.role?.toLowerCase()?.trim();

    if (!userRole || !normalizedRoles.includes(userRole)) {
      return res.status(403).json({ 
        message: `Access Denied: Role '${req.user?.role}' is not authorized` 
      });
    }
    next();
  };
};

module.exports = { protect, adminOnly, authorize };