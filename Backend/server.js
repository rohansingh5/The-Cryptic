import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// --- Database Connection Verification ---
if (!process.env.MONGO_URI || process.env.MONGO_URI.includes('your_mongodb_atlas')) {
  console.error('CRITICAL ERROR: Please configure a valid MONGO_URI inside your Backend/.env file!');
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB Atlas Connected Successfully');
    await seedAdminAccount();
  })
  .catch(err => console.error('Database connection error:', err));

// --- 1. DATABASE SCHEMA DEFINITIONS ---

// User Profile Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['User', 'TeamLeader'], default: 'User' },
  activeAux: { type: String, default: 'Off-Shift' },
  networkStatus: { type: String, default: 'Offline' },
  onlineSeconds: { type: Number, default: 0 },
  offlineSeconds: { type: Number, default: 0 },
  lastArchivedWeek: { type: Number, default: null }, 
  deletedChatsForUser: [{ type: String }]
});

const User = mongoose.model('User', userSchema);

// Weekly Attendance Archive Log Schema
const weeklyAttendanceLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  employeeName: { type: String, required: true },
  employeeEmail: { type: String, required: true },
  weekNumber: { type: Number, required: true },
  year: { type: Number, required: true },
  totalOnlineHours: { type: Number, required: true },
  totalOfflineHours: { type: Number, required: true },
  archivedAt: { type: Date, default: Date.now }
});

const WeeklyAttendanceLog = mongoose.model('WeeklyAttendanceLog', weeklyAttendanceLogSchema);

// NEW SYSTEM MODULE: Kanban Task Workspace Schema Definition
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  priority: { type: String, enum: ['Low', 'Medium', 'High'], default: 'Medium' },
  status: { type: String, enum: ['To-Do', 'In Progress', 'Under Review', 'Completed'], default: 'To-Do' },
  deadline: { type: Date, required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedToName: { type: String, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const Task = mongoose.model('Task', taskSchema);

// Room (Custom Group Chat) Schema
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const Room = mongoose.model('Room', roomSchema);

// Message Schema
const messageSchema = new mongoose.Schema({
  senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  senderName: { type: String, required: true },
  recipientId: { type: String, default: null },
  role: { type: String, required: true },
  text: { type: String, required: true },
  time: { type: String, required: true },
  isDeleted: { type: Boolean, default: false },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  deletedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

const Message = mongoose.model('Message', messageSchema);

// Audit Log Schema
const auditLogSchema = new mongoose.Schema({
  leaderName: { type: String, required: true },
  targetEmployeeName: { type: String, required: true },
  actionType: { type: String, required: true },
  reason: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

// --- HELPER FUNCTION: GET CURRENT ISO WEEK NUMBER ---
function getISOWeekNumber(date) {
  const target = new Date(date.valueOf());
  const dayNr = (date.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
  }
  return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
}

// --- 2. AUTOMATIC SYSTEM ADMINISTRATIVE SEEDING ---
async function seedAdminAccount() {
  try {
    const adminEmail = 'rohansingh45405@gmail.com';
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('12345', salt);

      const masterLeader = new User({
        name: 'Rohan (Team Leader)',
        email: adminEmail,
        password: hashedPassword,
        role: 'TeamLeader',
        activeAux: 'Off-Shift',
        networkStatus: 'Offline',
        lastArchivedWeek: getISOWeekNumber(new Date())
      });

      await masterLeader.save();
      console.log('--------------------------------------------------');
      console.log('SUCCESS: Master Team Leader Profile Seeded Natively!');
      console.log('--------------------------------------------------');
    }
  } catch (err) {
    console.error('Error executing initial user seed:', err);
  }
}

// --- 3. PROJECT WORKSPACE KANBAN TASK ENDPOINTS ---

// Create a New Sprint Task (TL Only)
app.post('/api/tasks/create', async (req, res) => {
  try {
    const { title, description, priority, deadline, assignedTo, createdBy } = req.body;
    
    const worker = await User.findById(assignedTo);
    if (!worker) return res.status(404).json({ message: "Assigned engineer profile missing." });

    const newTask = new Task({
      title,
      description,
      priority,
      deadline,
      assignedTo,
      assignedToName: worker.name,
      createdBy
    });

    await newTask.save();
    res.status(201).json(newTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fetch Active Tasks (Filtered conditionally by user permissions context)
app.get('/api/tasks', async (req, res) => {
  try {
    const { userId, role } = req.query;
    let query = {};
    
    if (role === 'User') {
      query.assignedTo = userId;
    }

    const tasks = await Task.find(query).sort({ deadline: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Task Column Lifecycle Status Stage
app.put('/api/tasks/:taskId/status', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      taskId,
      { status },
      { new: true }
    );
    res.json(updatedTask);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 4. CHAT HUB & CUSTOM ROOM CHAT API ENDPOINTS ---

app.post('/api/chat/send', async (req, res) => {
  try {
    const { senderId, senderName, recipientId, role, text } = req.body;
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const newMessage = new Message({
      senderId,
      senderName,
      recipientId: recipientId || 'global',
      role,
      text,
      time: timeString,
      readBy: [senderId]
    });
    
    await newMessage.save();
    res.status(201).json(newMessage);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/messages', async (req, res) => {
  try {
    const { senderId, recipientId } = req.query;
    let query = { deletedBy: { $ne: senderId } };

    if (!recipientId || recipientId === 'global') {
      query.recipientId = 'global';
    } else if (mongoose.Types.ObjectId.isValid(recipientId) && await Room.exists({ _id: recipientId })) {
      query.recipientId = recipientId;
    } else {
      query.$or = [
        { senderId: senderId, recipientId: recipientId },
        { senderId: recipientId, recipientId: senderId }
      ];
    }

    const history = await Message.find(query).sort({ createdAt: 1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/create-room', async (req, res) => {
  try {
    const { roomName, creatorId, memberIds } = req.body;
    const finalMembers = Array.from(new Set([...memberIds, creatorId]));

    const newRoom = new Room({
      name: roomName,
      creatorId,
      members: finalMembers
    });

    await newRoom.save();
    res.status(201).json(newRoom);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/chat/rooms', async (req, res) => {
  try {
    const { userId } = req.query;
    const availableRooms = await Room.find({ members: userId });
    res.json(availableRooms);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/mark-read', async (req, res) => {
  try {
    const { userId, recipientId } = req.body;
    let matchQuery = { readBy: { $ne: userId } };
    
    if (recipientId === 'global' || !mongoose.Types.ObjectId.isValid(recipientId)) {
      matchQuery.recipientId = recipientId || 'global';
    } else {
      matchQuery.senderId = recipientId;
      matchQuery.recipientId = userId;
    }

    await Message.updateMany(matchQuery, { $push: { readBy: userId } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/chat/message/:msgId', async (req, res) => {
  try {
    const { msgId } = req.params;
    const { senderId } = req.body;
    
    const message = await Message.findById(msgId);
    if (!message) return res.status(404).json({ message: 'Message not found.' });
    if (message.senderId.toString() !== senderId) return res.status(403).json({ message: 'Unauthorized action.' });

    message.text = "This message was deleted";
    message.isDeleted = true;
    
    await message.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat/clear-local', async (req, res) => {
  try {
    const { userId, targetId } = req.body;
    await Message.updateMany(
      {
        $or: [
          { senderId: userId, recipientId: targetId },
          { senderId: targetId, recipientId: userId }
        ]
      },
      { $push: { deletedBy: userId } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 5. WORKER CONTROLLER: AUX STATE SYNC & WEEKLY ARCHIVING ---
app.post('/api/user/sync-aux', async (req, res) => {
  try {
    const { userId, activeAux } = req.body;
    const networkStatus = activeAux === 'Online' ? 'Online' : 'Offline';
    
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User profile missing." });

    const currentDate = new Date();
    const currentWeek = getISOWeekNumber(currentDate);
    const currentYear = currentDate.getFullYear();

    if (activeAux === 'Off-Shift' && user.lastArchivedWeek !== null && user.lastArchivedWeek !== currentWeek) {
      if (user.onlineSeconds > 0 || user.offlineSeconds > 0) {
        const structuralArchiveLog = new WeeklyAttendanceLog({
          userId: user._id,
          employeeName: user.name,
          employeeEmail: user.email,
          weekNumber: user.lastArchivedWeek, 
          year: currentYear,
          totalOnlineHours: parseFloat((user.onlineSeconds / 3600).toFixed(2)),
          totalOfflineHours: parseFloat((user.offlineSeconds / 3600).toFixed(2))
        });
        await structuralArchiveLog.save();
      }
      user.onlineSeconds = 0;
      user.offlineSeconds = 0;
    }

    user.activeAux = activeAux;
    user.networkStatus = networkStatus;
    user.lastArchivedWeek = currentWeek;

    if (activeAux === 'Off-Shift') {
      user.onlineSeconds = 0;
      user.offlineSeconds = 0;
    }

    await user.save();
    res.json({ 
      success: true, 
      activeAux: user.activeAux, 
      onlineSeconds: user.onlineSeconds, 
      offlineSeconds: user.offlineSeconds 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/user/sync-metrics', async (req, res) => {
  try {
    const { userId, onlineSeconds, offlineSeconds } = req.body;
    await User.findByIdAndUpdate(userId, { onlineSeconds, offlineSeconds });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- 6. TEAM LEADER WORKFORCE MANAGEMENT ROUTES ---

app.post('/api/team-leader/time-override', async (req, res) => {
  try {
    const { leaderId, employeeId, targetSeconds, targetType, reason } = req.body;

    const leader = await User.findById(leaderId);
    if (!leader || leader.role !== 'TeamLeader') return res.status(403).json({ message: 'Access denied.' });

    const employee = await User.findById(employeeId);
    if (!employee) return res.status(404).json({ message: 'Employee file not found.' });

    if (targetType === 'Online') {
      employee.onlineSeconds = targetSeconds;
    } else {
      employee.offlineSeconds = targetSeconds;
    }

    await employee.save();

    const log = new AuditLog({
      leaderName: leader.name,
      targetEmployeeName: employee.name,
      actionType: 'TIME_OVERRIDE',
      reason: `${reason} (Updated ${targetType} hours to ${Math.floor(targetSeconds / 3600)}h)`
    });
    await log.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/team-leader/delete-account', async (req, res) => {
  try {
    const { leaderId, password, targetEmployeeId, reason } = req.body;

    const leader = await User.findById(leaderId);
    if (!leader || leader.role !== 'TeamLeader') return res.status(403).json({ message: 'Access denied.' });

    const isMatch = await bcrypt.compare(password, leader.password);
    if (!isMatch) return res.status(401).json({ message: 'Security authorization failed. Incorrect password.' });

    const employee = await User.findById(targetEmployeeId);
    if (!employee) return res.status(404).json({ message: 'Employee file not found.' });

    await User.findByIdAndDelete(targetEmployeeId);

    const log = new AuditLog({
      leaderName: leader.name,
      targetEmployeeName: employee.name,
      actionType: 'ACCOUNT_DELETION',
      reason: reason || 'Corporate offboarding initialization.'
    });
    await log.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/team-leader/employees', async (req, res) => {
  try {
    const staff = await User.find({}).select('-password');
    res.json(staff);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// NEW: Fetch Security Audit Ledger
app.get('/api/team-leader/audit-logs', async (req, res) => {
  try {
    const logs = await AuditLog.find({}).sort({ timestamp: -1 }).limit(50);
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/team-leader/attendance-history', async (req, res) => {
  try {
    const historyLogs = await WeeklyAttendanceLog.find({}).sort({ year: -1, weekNumber: -1 });
    res.json(historyLogs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/team-leader/provision', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already provisioned.' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newEmployee = new User({
      name,
      email,
      password: hashedPassword,
      role: role || 'User',
      activeAux: 'Off-Shift',
      networkStatus: 'Offline',
      onlineSeconds: 0,
      offlineSeconds: 0,
      lastArchivedWeek: getISOWeekNumber(new Date())
    });

    await newEmployee.save();
    res.status(201).json({ message: 'Employee profile saved successfully.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'Invalid credentials.' });

    let isMatch = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      isMatch = await bcrypt.compare(password, user.password);
    } else {
      isMatch = (password === user.password);
    }

    if (!isMatch) return res.status(400).json({ message: 'Authentication challenge failed.' });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({
      token,
      user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`The Cryptic Core running on port ${PORT}`));