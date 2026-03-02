// routes/teams.js — Team Collaboration
const express        = require('express')
const router         = express.Router()
const crypto         = require('crypto')
const Team           = require('../models/Team')
const User           = require('../models/User')
const { protect }    = require('../middleware/auth')
const { logActivity} = require('../utils/logger')

router.use(protect)

// ── GET my team ──
router.get('/my', async (req, res) => {
  try {
    const team = await Team.findOne({
      'members.user': req.user._id
    }).populate('members.user', 'name email role').populate('owner', 'name email')

    if (!team) return res.json({ success: true, team: null })
    res.json({ success: true, team })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, message: 'Error fetching team' })
  }
})

// ── CREATE team ──
router.post('/create', async (req, res) => {
  try {
    const { name, description } = req.body
    if (!name) return res.status(400).json({ success: false, message: 'Team name is required' })

    // Check if user already in a team
    const existing = await Team.findOne({ 'members.user': req.user._id })
    if (existing) return res.status(400).json({ success: false, message: 'You are already in a team. Leave it first.' })

    // Generate unique 8-char invite code
    const inviteCode = crypto.randomBytes(4).toString('hex').toUpperCase()

    const team = await Team.create({
      name,
      description,
      owner: req.user._id,
      inviteCode,
      members: [{ user: req.user._id, role: 'owner' }]
    })

    await logActivity(req, 'TEAM_CREATED', `Created team: "${name}"`, { teamId: team._id })
    res.status(201).json({ success: true, message: 'Team created!', team })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, message: 'Error creating team' })
  }
})

// ── JOIN team via invite code ──
router.post('/join', async (req, res) => {
  try {
    const { inviteCode } = req.body
    if (!inviteCode) return res.status(400).json({ success: false, message: 'Invite code is required' })

    // Check if user already in a team
    const existing = await Team.findOne({ 'members.user': req.user._id })
    if (existing) return res.status(400).json({ success: false, message: 'You are already in a team. Leave it first.' })

    const team = await Team.findOne({ inviteCode: inviteCode.toUpperCase() })
    if (!team) return res.status(404).json({ success: false, message: 'Invalid invite code' })

    // Add member
    team.members.push({ user: req.user._id, role: 'member' })
    await team.save()

    await logActivity(req, 'TEAM_JOINED', `Joined team: "${team.name}"`, { teamId: team._id })

    const populated = await Team.findById(team._id)
      .populate('members.user', 'name email role')
      .populate('owner', 'name email')

    res.json({ success: true, message: `Joined team "${team.name}"!`, team: populated })
  } catch (e) {
    console.error(e)
    res.status(500).json({ success: false, message: 'Error joining team' })
  }
})

// ── LEAVE team ──
router.post('/leave', async (req, res) => {
  try {
    const team = await Team.findOne({ 'members.user': req.user._id })
    if (!team) return res.status(404).json({ success: false, message: 'You are not in a team' })

    // Owner can't leave — must delete team
    if (team.owner.toString() === req.user._id.toString())
      return res.status(400).json({ success: false, message: 'You are the owner. Delete the team instead.' })

    team.members = team.members.filter(m => m.user.toString() !== req.user._id.toString())
    await team.save()

    await logActivity(req, 'TEAM_LEFT', `Left team: "${team.name}"`, { teamId: team._id })
    res.json({ success: true, message: 'Left team successfully' })
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error leaving team' })
  }
})

// ── DELETE team (owner only) ──
router.delete('/delete', async (req, res) => {
  try {
    const team = await Team.findOne({ owner: req.user._id })
    if (!team) return res.status(404).json({ success: false, message: 'Team not found or you are not the owner' })

    await Team.findByIdAndDelete(team._id)
    await logActivity(req, 'TEAM_DELETED', `Deleted team: "${team.name}"`, {}, 'warning')
    res.json({ success: true, message: 'Team deleted' })
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error deleting team' })
  }
})

// ── REMOVE member (owner/admin only) ──
router.delete('/members/:userId', async (req, res) => {
  try {
    const team = await Team.findOne({ 'members.user': req.user._id })
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' })

    const myMember = team.members.find(m => m.user.toString() === req.user._id.toString())
    if (!['owner', 'admin'].includes(myMember?.role))
      return res.status(403).json({ success: false, message: 'Not authorized' })

    team.members = team.members.filter(m => m.user.toString() !== req.params.userId)
    await team.save()

    res.json({ success: true, message: 'Member removed' })
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error removing member' })
  }
})

// ── UPDATE member role (owner only) ──
router.put('/members/:userId/role', async (req, res) => {
  try {
    const { role } = req.body
    const team = await Team.findOne({ owner: req.user._id })
    if (!team) return res.status(403).json({ success: false, message: 'Only owner can change roles' })

    const member = team.members.find(m => m.user.toString() === req.params.userId)
    if (!member) return res.status(404).json({ success: false, message: 'Member not found' })

    member.role = role
    await team.save()

    res.json({ success: true, message: 'Role updated' })
  } catch (e) {
    res.status(500).json({ success: false, message: 'Error updating role' })
  }
})

module.exports = router