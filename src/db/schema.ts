import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const emailCaptures = sqliteTable('email_captures', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull(),
  passwordAttempt: text('password_attempt').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: text('created_at').notNull(),
});