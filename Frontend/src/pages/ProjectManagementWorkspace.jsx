import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Calendar, User, ArrowRight, LayoutGrid, List, Clock } from 'lucide-react';

const ProjectManagementWorkspace = ({ userSession }) => {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // View Toggle State: 'board' | 'list' | 'timeline'
  const [viewMode, setViewMode] = useState('board'); 

  // FORM CONTROLS
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [deadline, setDeadline] = useState('');
  const [assignedTo, setAssignedTo] = useState('');

  const KanbanColumns = ['To-Do', 'In Progress', 'Under Review', 'Completed'];

  const syncTasksAndStaff = async () => {
    try {
      const taskRes = await axios.get(`http://localhost:5000/api/tasks?userId=${userSession.id}&role=${userSession.role}`);
      setTasks(taskRes.data);

      if (userSession.role === 'TeamLeader') {
        const empRes = await axios.get('http://localhost:5000/api/team-leader/employees');
        setEmployees(empRes.data.filter(e => e.role !== 'TeamLeader'));
      }
    } catch (err) {
      console.error("Error syncing PMS workspace context:", err);
    }
  };

  // Real-time synchronization loop
  useEffect(() => {
    syncTasksAndStaff();
    
    // Background polling loop to check for new tasks every 2.5 seconds
    const taskPoll = setInterval(syncTasksAndStaff, 2500);
    
    return () => clearInterval(taskPoll);
  }, [userSession]);

  const handleTaskSubmission = async (e) => {
    e.preventDefault();
    if (!title || !description || !deadline || !assignedTo) return;
    try {
      await axios.post('http://localhost:5000/api/tasks/create', {
        title,
        description,
        priority,
        deadline,
        assignedTo,
        createdBy: userSession.id
      });
      alert('New technical task successfully pinned to workspace.');
      setTitle('');
      setDescription('');
      setDeadline('');
      setAssignedTo('');
      setIsModalOpen(false);
      syncTasksAndStaff();
    } catch (err) {
      alert('Failed to deploy sprint target item.');
    }
  };

  const handleCycleStatus = async (taskId, currentStatus) => {
    const currentIndex = KanbanColumns.indexOf(currentStatus);
    if (currentIndex === KanbanColumns.length - 1) return; 
    const nextStatus = KanbanColumns[currentIndex + 1];

    try {
      await axios.put(`http://localhost:5000/api/tasks/${taskId}/status`, { status: nextStatus });
      syncTasksAndStaff();
    } catch (err) {
      alert('Status migration execution error.');
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      
      {/* HEADER BAR SUMMARY & TOGGLES */}
      <div className="border-b border-slate-800 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-white">Project Sprint Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">Track, delegate, and move team objectives in real time</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* VIEW TOGGLE CONTROLS */}
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button 
              type="button" 
              onClick={() => setViewMode('board')}
              className={`p-2 rounded-lg transition-all flex items-center justify-center ${viewMode === 'board' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              title="Kanban Board View"
            >
              <LayoutGrid size={16} />
            </button>
            <button 
              type="button" 
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-all flex items-center justify-center ${viewMode === 'list' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              title="Detailed List View"
            >
              <List size={16} />
            </button>
            <button 
              type="button" 
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition-all flex items-center justify-center ${viewMode === 'timeline' ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
              title="Gantt Timeline View"
            >
              <Clock size={16} />
            </button>
          </div>

          {userSession?.role === 'TeamLeader' && (
            <button type="button" onClick={() => setIsModalOpen(true)} className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-indigo-600/10">
              <Plus size={14} /> Assign Target
            </button>
          )}
        </div>
      </div>

      {/* CONDITIONAL RENDER 1: BOARD VIEW (Kanban Grid) */}
      {viewMode === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {KanbanColumns.map((col) => {
            const columnTasks = tasks.filter(t => t.status === col);
            return (
              <div key={col} className="bg-slate-950 rounded-2xl border border-slate-800/80 p-4 flex flex-col min-h-[450px]">
                <div className="flex items-center justify-between mb-3 border-b border-slate-900 pb-2">
                  <span className="text-xs font-black uppercase text-slate-400 tracking-wider">{col}</span>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-slate-900 rounded-md border border-slate-800 text-slate-500">{columnTasks.length}</span>
                </div>

                <div className="space-y-3 overflow-y-auto flex-1">
                  {columnTasks.map((task) => (
                    <div key={task._id} className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3 relative group hover:border-slate-700 transition-all">
                      <div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                          task.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-950 text-slate-500 border-slate-800'
                        }`}>
                          {task.priority}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-2 tracking-wide">{task.title}</h4>
                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed line-clamp-2">{task.description}</p>
                      </div>

                      <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-950 text-[10px] text-slate-400 font-medium">
                        <div className="flex items-center gap-1.5"><Calendar size={12} className="text-slate-600" /> <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span></div>
                        <div className="flex items-center gap-1.5"><User size={12} className="text-slate-600" /> <span>Assignee: {task.assignedToName}</span></div>
                      </div>

                      {col !== 'Completed' && (
                        <button type="button" onClick={() => handleCycleStatus(task._id, task.status)} className="w-full mt-2 py-1.5 bg-slate-950 hover:bg-indigo-900/40 text-slate-500 hover:text-indigo-400 border border-slate-800 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1">
                          Advance Stage <ArrowRight size={10} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONDITIONAL RENDER 2: LIST VIEW (Wide Screen Detailed Layout) */}
      {viewMode === 'list' && (
        <div className="space-y-6">
          {KanbanColumns.map((col) => {
            const columnTasks = tasks.filter(t => t.status === col);
            if (columnTasks.length === 0) return null; 
            
            return (
              <div key={col} className="bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
                <div className="bg-slate-900/50 px-5 py-3 border-b border-slate-800 flex items-center gap-3">
                  <h3 className="text-xs font-black uppercase text-white tracking-wider">{col}</h3>
                  <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-400">{columnTasks.length} Tasks</span>
                </div>
                
                <div className="divide-y divide-slate-800/50">
                  {columnTasks.map((task) => (
                    <div key={task._id} className="p-5 flex flex-col md:flex-row gap-6 hover:bg-slate-900/30 transition-colors">
                      
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                            task.priority === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : task.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 'bg-slate-900 text-slate-500 border-slate-800'
                          }`}>
                            {task.priority} Priority
                          </span>
                          <h4 className="text-sm font-bold text-white tracking-wide">{task.title}</h4>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-4xl">{task.description}</p>
                      </div>

                      <div className="flex flex-row md:flex-col items-center md:items-end justify-between gap-4 shrink-0 md:min-w-[200px]">
                        <div className="space-y-1.5 text-[11px] text-slate-400 font-medium text-right">
                          <div className="flex items-center justify-end gap-2"><User size={13} className="text-slate-600" /> <span>{task.assignedToName}</span></div>
                          <div className="flex items-center justify-end gap-2"><Calendar size={13} className="text-slate-600" /> <span>{new Date(task.deadline).toLocaleDateString()}</span></div>
                        </div>

                        {col !== 'Completed' && (
                          <button type="button" onClick={() => handleCycleStatus(task._id, task.status)} className="px-4 py-2 bg-slate-900 hover:bg-indigo-900/40 text-slate-400 hover:text-indigo-400 border border-slate-800 rounded-xl text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 whitespace-nowrap">
                            Advance Stage <ArrowRight size={12} />
                          </button>
                        )}
                      </div>
                      
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          {tasks.length === 0 && (
             <div className="p-10 text-center border border-dashed border-slate-800 rounded-2xl">
               <p className="text-slate-500 text-sm">No tasks deployed yet.</p>
             </div>
          )}
        </div>
      )}

      {/* CONDITIONAL RENDER 3: TIMELINE VIEW (Gantt Progress Map) */}
      {viewMode === 'timeline' && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6 overflow-hidden">
          <h3 className="text-sm font-bold text-white mb-6 uppercase tracking-wider">Delivery Timeline Map</h3>
          <div className="space-y-4">
            {tasks.map(task => {
              const today = new Date().getTime();
              const deadline = new Date(task.deadline).getTime();
              const daysLeft = Math.ceil((deadline - today) / (1000 * 3600 * 24));
              const isOverdue = daysLeft < 0;

              return (
                <div key={task._id} className="relative group">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="w-48 truncate font-bold text-slate-300">{task.title}</div>
                    <div className="flex-1 bg-slate-900 h-8 rounded-lg relative overflow-hidden border border-slate-800">
                      <div 
                        className={`absolute top-0 left-0 h-full rounded-lg transition-all ${task.status === 'Completed' ? 'bg-emerald-900/50 border border-emerald-500/50' : isOverdue ? 'bg-rose-900/50 border border-rose-500/50' : 'bg-indigo-900/50 border border-indigo-500/50'}`}
                        style={{ width: task.status === 'Completed' ? '100%' : `${Math.max(10, Math.min(100, 100 - (daysLeft * 5)))}%` }}
                      >
                        <span className="absolute inset-0 flex items-center px-3 text-[9px] font-bold uppercase tracking-widest text-white/70">
                          {task.status === 'Completed' ? 'Deployed' : isOverdue ? 'Overdue' : `${daysLeft} Days Left`}
                        </span>
                      </div>
                    </div>
                    <div className="w-24 text-right text-slate-500 font-mono text-[10px]">{new Date(task.deadline).toLocaleDateString()}</div>
                  </div>
                </div>
              );
            })}
            {tasks.length === 0 && <p className="text-slate-500 text-sm italic text-center py-8">No tasks active on timeline.</p>}
          </div>
        </div>
      )}

      {/* OVERLAY MODAL FORM POPUP */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleTaskSubmission} className="bg-slate-900 w-full max-w-md rounded-2xl border border-slate-800 p-5 space-y-4 shadow-2xl">
            <div>
              <h3 className="text-sm font-bold text-white">Deploy Technical Task Target</h3>
              <p className="text-[10px] text-slate-500 mt-0.5">Initialize and allocate new project responsibilities</p>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Objective Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none focus:border-indigo-500" placeholder="e.g., Integrate JWT Interceptor Core" />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Technical Guidelines / Descriptions</label>
              <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white h-24 resize-none outline-none focus:border-indigo-500" placeholder="Specify parameters and deliverables..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Priority Weight</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none">
                  <option value="Low">Low Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="High">High Priority</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Target Deadline</label>
                <input type="date" required value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1">Allocate Engineer (Assignee)</label>
              <select required value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white outline-none">
                <option value="">Select available engineer...</option>
                {employees.map((member) => (
                  <option key={member._id} value={member._id}>{member.name} ({member.email})</option>
                ))}
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 bg-slate-800 text-slate-300 text-xs font-bold rounded-xl">Cancel</button>
              <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Commit Task</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default ProjectManagementWorkspace;