const successResponse = (res, statusCode = 200, message = 'Success', data = null, meta = null) => {
  const response = { success: true, message };
  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;
  return res.status(statusCode).json(response);
};

const errorResponse = (res, statusCode = 500, message = 'Server Error') => {
  return res.status(statusCode).json({ success: false, message });
};

module.exports = { successResponse, errorResponse };
