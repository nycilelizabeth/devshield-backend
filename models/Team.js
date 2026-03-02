// models/Team.js — Team / Workspace Model
const mongoose = require('mongoose')

const teamSchema = new mongoose.Schema({
  name:        { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  owner:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  inviteCode:  { type: String, unique: true, required: true },
  members: [{
    user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    role:     { type: String, enum: ['owner', 'admin', 'member'], default: 'member' },
    joinedAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Team', teamSchema)