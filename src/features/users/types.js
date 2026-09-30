/**
 * Types du domaine Users.
 * @typedef {import('../auth/types').User} User
 *
 * @typedef {Object} UsersPage
 * @property {User[]} users
 * @property {number} total
 * @property {number} pages
 * @property {number} current_page
 * @property {number} per_page
 *
 * @typedef {Object} UserStatistics
 * @property {number} total
 * @property {number} active
 * @property {number} inactive
 * @property {{role: string, count: number}[]} by_role
 * @property {{department: string, count: number}[]} by_department
 *
 * @typedef {Object} UserInput
 * @property {string} matricule
 * @property {string} username
 * @property {string} [email]
 * @property {string} [full_name]
 * @property {number} role_id
 * @property {number} [department_id]
 * @property {boolean} [is_active]
 * @property {string} [password]
 */
export {};
