/**
 * Types du domaine Auth.
 * @typedef {Object} Role
 * @property {number} role_id
 * @property {string} name
 * @property {string} [description]
 *
 * @typedef {Object} Department
 * @property {number} department_id
 * @property {string} name
 * @property {string} code
 * @property {string} [description]
 *
 * @typedef {Object} User
 * @property {number} user_id
 * @property {string} matricule
 * @property {string} username
 * @property {string|null} email
 * @property {string|null} full_name
 * @property {boolean} is_active
 * @property {boolean} two_fa_enabled
 * @property {string|null} created_at
 * @property {string|null} last_login
 * @property {Role|null} role
 * @property {Department|null} department
 *
 * @typedef {Object} LoginResponse
 * @property {string} message
 * @property {boolean} requires_2fa
 * @property {number} [user_id]
 * @property {User} [user]
 *
 * @typedef {Object} SessionInfo
 * @property {string} session_id
 * @property {string} created_at
 * @property {string} last_seen
 * @property {string|null} ip
 * @property {string} user_agent
 */
export {};
