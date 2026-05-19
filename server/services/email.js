const sendPasswordResetEmail = async (email, name, token) => {
  console.log(`[MOCK EMAIL] Sending password reset link to ${email} for ${name}. Token: ${token}`);
};

module.exports = {
  sendPasswordResetEmail,
};
