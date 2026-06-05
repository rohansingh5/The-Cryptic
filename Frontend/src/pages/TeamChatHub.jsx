import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, Users, User, Trash2, FolderPlus, CheckSquare } from 'lucide-react';

const TeamChatHub = ({ userSession }) => {
  const [activeTab, setActiveTab] = useState('global');
  const [activeTabName, setActiveTabName] = useState('Global Operations Channel');
  
  const [employees, setEmployees] = useState([]);
  const [customRooms, setCustomRooms] = useState([]);
  const [messages, setMessages] = useState([]);
  const [inputVal, setInputVal] = useState('');

  // ROOM PROVISIONING STATE CONTROLS
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  const fetchChatLogs = async () => {
    if (!userSession?.id) return;
    try {
      const res = await axios.get(`http://localhost:5000/api/chat/messages?senderId=${userSession.id}&recipientId=${activeTab}`);
      setMessages(res.data);
      await axios.post('http://localhost:5000/api/chat/mark-read', { userId: userSession.id, recipientId: activeTab });
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSidebarCollections = async () => {
    if (!userSession?.id) return;
    try {
      // 1. Fetch employee workforce data rows
      const empRes = await axios.get('http://localhost:5000/api/team-leader/employees');
      const filteredStaff = empRes.data.filter(e => e._id !== userSession?.id);

      const staffWithBadgePromises = filteredStaff.map(async (member) => {
        const check = await axios.get(`http://localhost:5000/api/chat/messages?senderId=${userSession.id}&recipientId=${member._id}`);
        const unreadLogs = check.data.filter(m => m.senderId !== userSession.id && !m.readBy.includes(userSession.id));
        return { ...member, hasUnread: unreadLogs.length > 0 };
      });
      setEmployees(await Promise.all(staffWithBadgePromises));

      // 2. Fetch Custom group rooms assigned to this user session context
      const roomRes = await axios.get(`http://localhost:5000/api/chat/rooms?userId=${userSession.id}`);
      setCustomRooms(roomRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSidebarCollections();
    fetchChatLogs();
    const syncLoop = setInterval(() => {
      fetchChatLogs();
      fetchSidebarCollections();
    }, 2500);
    return () => clearInterval(syncLoop);
  }, [activeTab]);

  const handleMessageSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/chat/send', {
        senderId: userSession.id,
        senderName: userSession.name,
        recipientId: activeTab,
        role: userSession.role,
        text: inputVal
      });
      setInputVal('');
      fetchChatLogs();
    } catch (err) {
      alert('Failed to transmit message.');
    }
  };

  const handleMessageRecall = async (msgId) => {
    if (!window.confirm("Delete this message and show placeholder for everyone?")) return;
    try {
      await axios.delete(`http://localhost:5000/api/chat/message/${msgId}`, { data: { senderId: userSession.id } });
      fetchChatLogs();
    } catch (err) {
      alert('Action unauthorized.');
    }
  };

  const handleToggleMemberSelection = (empId) => {
    if (selectedMembers.includes(empId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== empId));
    } else {
      setSelectedMembers([...selectedMembers, empId]);
    }
  };

  const handleGroupRoomInitialization = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    try {
      await axios.post('http://localhost:5000/api/chat/create-room', {
        roomName: newRoomName,
        creatorId: userSession.id,
        memberIds: selectedMembers
      });
      alert(`Group Workspace "${newRoomName}" completely compiled and whitelisted inside database.`);
      setNewRoomName('');
      setSelectedMembers([]);
      setIsRoomModalOpen(false);
      fetchSidebarCollections();
    } catch (err) {
      alert('Error saving group configuration profiles.');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex gap-6">
      
      {/* SIDEBAR NAVIGATION GRID */}
      <div className="w-64 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-900 bg-slate-900/20 flex justify-between items-center">
          <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">Communication Desk</h3>
          
          {/* Team Leader Spawn Group Icon Utility Control */}
          {userSession?.role === 'TeamLeader' && (
            <button type="button" onClick={() => setIsRoomModalOpen(true)} className="p-1 hover:bg-slate-900 rounded-lg text-indigo-400 hover:text-indigo-200 transition-colors" title="Create Custom Group Chat">
              <FolderPlus size={15} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-5">
          {/* Section 1: Core Channels */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-600 px-2 tracking-wider">Global Channels</p>
            <button onClick={() => { setActiveTab('global'); setActiveTabName('Global Operations Channel'); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${activeTab === 'global' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
              <Users size={14} /> <span>Global Channel</span>
            </button>
          </div>

          {/* Section 2: Custom Team Groups Provisioned by TL */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-600 px-2 tracking-wider">Group Chat Spaces</p>
            {customRooms.length === 0 ? (
              <p className="text-[10px] text-slate-600 italic px-2 pt-1">No group rooms deployed</p>
            ) : (
              customRooms.map((room) => (
                <button key={room._id} onClick={() => { setActiveTab(room._id); setActiveTabName(`Group: ${room.name}`); }} className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${activeTab === room._id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
                  <span className="text-xs">👥</span>
                  <span className="truncate">{room.name}</span>
                </button>
              ))
            )}
          </div>

          {/* Section 3: Direct Messages */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase text-slate-600 px-2 tracking-wider">Direct Messages</p>
            {employees.map((staff) => (
              <button key={staff._id} onClick={() => { setActiveTab(staff._id); setActiveTabName(`Direct Chat: ${staff.name}`); }} className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-left transition-all ${activeTab === staff._id ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-slate-900'}`}>
                <div className="flex items-center gap-2 min-w-0">
                  <User size={14} />
                  <span className="truncate">{staff.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {staff.hasUnread && <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />}
                  <span className={`w-1.5 h-1.5 rounded-full ${staff.networkStatus === 'Online' ? 'bg-emerald-500' : 'bg-slate-700'}`} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* CHAT DISPLAY HUB PANEL WINDOW FRAME */}
      <div className="flex-1 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-900 bg-slate-900/40">
          <h2 className="font-bold text-white text-sm">{activeTabName}</h2>
        </div>

        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-600 text-xs italic">
              No messaging logs recorded inside this channel profile.
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.senderId === userSession?.id;
              return (
                <div key={m._id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                  <div className={`max-w-md rounded-2xl p-4 border relative group transition-all ${
                    m.isDeleted 
                      ? 'bg-slate-950/40 border-slate-900 text-slate-600 italic select-none' 
                      : isMe ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 rounded-tr-none' : 'bg-slate-900 border-slate-800 text-slate-300 rounded-tl-none'
                  }`}>
                    {!m.isDeleted && (
                      <div className="flex items-center gap-4 mb-1 justify-between">
                        <span className="text-[10px] font-bold uppercase text-slate-400">{isMe ? 'You' : m.senderName}</span>
                        <span className="text-[9px] text-slate-600 font-mono">{m.time}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs leading-relaxed">
                      {m.isDeleted && <span className="text-[10px] not-italic">🚫</span>}
                      <p>{m.text}</p>
                    </div>
                    {!m.isDeleted && <span className="text-[9px] text-slate-500 font-mono block mt-1 uppercase tracking-widest">{m.role}</span>}
                    {isMe && !m.isDeleted && (
                      <button type="button" onClick={() => handleMessageRecall(m._id)} className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 rounded-md opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={11} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleMessageSend} className="p-4 border-t border-slate-900 bg-slate-900/20 flex gap-3">
          <input type="text" value={inputVal} onChange={(e) => setInputVal(e.target.value)} placeholder="Type an update..." className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 outline-none" />
          <button type="submit" className="px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl"><Send size={14} /></button>
        </form>
      </div>

      {/* MANAGING SYSTEM GROUP WORKSPACE DEPLOYMENT LIGHTBOX (TL ONLY) */}
      {isRoomModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleGroupRoomInitialization} className="bg-slate-900 w-full max-w-sm rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Initialize Group Channel</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Deploy isolated chat rooms inside cloud matrix</p>
            </div>
            
            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold">Group Custom Name</label>
              <input type="text" required value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500" placeholder="e.g., Core Engineering Sprint" />
            </div>

            <div>
              <label className="block text-[10px] text-slate-400 uppercase mb-1.5 font-bold">Whitelist Team Members</label>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-2 max-h-36 overflow-y-auto space-y-1">
                {employees.map((member) => (
                  <div key={member._id} onClick={() => handleToggleMemberSelection(member._id)} className="flex items-center justify-between p-2 hover:bg-slate-900 rounded-lg cursor-pointer transition-colors text-xs text-slate-300">
                    <span>{member.name}</span>
                    <CheckSquare size={14} className={selectedMembers.includes(member._id) ? 'text-indigo-400' : 'text-slate-700'} />
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsRoomModalOpen(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
              <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Compile Group</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default TeamChatHub;