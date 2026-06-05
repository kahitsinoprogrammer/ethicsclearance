const { query } = require("../config/database");
const {
  getCurrentTimestamp
} = require("../utils/time");

const createEmailVerificationOtp = async ({ expiresAt, otpHash, userId }) => {
  const createdAt = getCurrentTimestamp();

  const result = await query(
    `
      INSERT INTO email_verification_otps (
        user_id,
        otp_hash,
        expires_at,
        attempts,
        created_at
      )
      VALUES ($1, $2, $3, 0, $4)
      RETURNING
        id,
        user_id,
        otp_hash,
        expires_at,
        used_at,
        attempts,
        created_at
    `,
    [userId, otpHash, expiresAt, createdAt]
  );

  return result.rows[0] || null;
};

const findLatestActiveEmailVerificationOtp = async (userId) => {
  const result = await query(
    `
      SELECT
        id,
        user_id,
        otp_hash,
        expires_at,
        used_at,
        attempts,
        created_at
      FROM email_verification_otps
      WHERE user_id = $1
        AND used_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] || null;
};

const incrementEmailVerificationOtpAttempts = async (otpId) => {
  const result = await query(
    `
      UPDATE email_verification_otps
      SET attempts = attempts + 1
      WHERE id = $1
      RETURNING
        id,
        user_id,
        otp_hash,
        expires_at,
        used_at,
        attempts,
        created_at
    `,
    [otpId]
  );

  return result.rows[0] || null;
};

const invalidateActiveEmailVerificationOtps = async (userId) => {
  const usedAt = getCurrentTimestamp();

  await query(
    `
      UPDATE email_verification_otps
      SET used_at = $1
      WHERE user_id = $2
        AND used_at IS NULL
    `,
    [usedAt, userId]
  );
};

const markEmailVerificationOtpUsed = async (otpId) => {
  const usedAt = getCurrentTimestamp();

  const result = await query(
    `
      UPDATE email_verification_otps
      SET used_at = $1
      WHERE id = $2
      RETURNING
        id,
        user_id,
        otp_hash,
        expires_at,
        used_at,
        attempts,
        created_at
    `,
    [usedAt, otpId]
  );

  return result.rows[0] || null;
};

module.exports = {
  createEmailVerificationOtp,
  findLatestActiveEmailVerificationOtp,
  incrementEmailVerificationOtpAttempts,
  invalidateActiveEmailVerificationOtps,
  markEmailVerificationOtpUsed
};
