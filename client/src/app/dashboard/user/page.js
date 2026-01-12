'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSocket } from '../../../context/SocketContext';
import styles from '../dashboard.module.css';

export default function UserDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const socket = useSocket();
    const [tasks, setTasks] = useState([]);
    const [newTask, setNewTask] = useState({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        timeRequired: 30, // in minutes
        status: 'yet-to-start'
    });

    const [editingTask, setEditingTask] = useState(null);
    const [editForm, setEditForm] = useState({
        status: '',
        deadline: '',
        extensionReason: '',
        extraTimeNeeded: 0,
        remarks: ''
    });

    const [selectedDate, setSelectedDate] = useState('today');
    const [viewMode, setViewMode] = useState('pending');

    useEffect(() => {
        if (!socket) return;
        socket.on('task.new', (task) => {
            alert(`New Task Assigned: ${task.title}`);
            setTasks(prev => [task, ...prev]);
        });
        return () => socket.off('task.new');
    }, [socket]);

    useEffect(() => {
        if (status === 'loading') return;
        console.log(`[CLIENT] Session Status: ${status}, User: ${session?.user?.email}, Has Token: ${!!session?.user?.token}`);
        if (status === 'unauthenticated') router.push('/login');
        else if (session?.user?.role === 'admin') router.push('/dashboard/admin');
        else {
            fetchMyTasks();
        }
    }, [status, session, router]);

    const fetchMyTasks = async () => {
        if (!session?.user?.token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
                headers: { 'Authorization': `Bearer ${session.user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) { console.error(err); }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            console.log(`[CLIENT] Creating task with token: ${session?.user?.token?.substring(0, 10)}...`);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.user.token}`
                },
                body: JSON.stringify(newTask)
            });
            if (res.ok) {
                const createdTask = await res.json();
                setTasks([createdTask, ...tasks]);
                setNewTask({ title: '', description: '', priority: 'medium', deadline: '', timeRequired: 30, status: 'yet-to-start' });
            }
        } catch (err) { console.error(err); }
    };

    const openEditModal = (task) => {
        setEditingTask(task);
        // Convert UTC to local time for datetime-local input
        let localDeadline = '';
        if (task.deadline) {
            const date = new Date(task.deadline);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            localDeadline = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        setEditForm({
            status: task.status,
            deadline: localDeadline,
            extensionReason: task.extensionReason || '',
            extraTimeNeeded: 30,
            remarks: ''
        });
    };

    const handleUpdateTask = async (e) => {
        e.preventDefault();

        const isAdminAssigned = editingTask.assignedBy !== session.user.id;
        const isRequestingExtension = isAdminAssigned && (editForm.status !== 'completed' && isDeadlinePassed(editingTask.deadline));

        const body = {
            status: editForm.status,
            remarks: editForm.remarks
        };

        if (!isAdminAssigned) {
            body.deadline = editForm.deadline;
            body.extensionReason = editForm.extensionReason;
        } else if (isRequestingExtension) {
            body.extensionRequest = {
                reason: editForm.extensionReason,
                extraTimeNeeded: editForm.extraTimeNeeded
            };
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/tasks/${editingTask._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.user.token}`
                },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const updatedTask = await res.json();
                setTasks(tasks.map(t => t._id === updatedTask._id ? updatedTask : t));
                setEditingTask(null);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // Helper functions
    const isDeadlinePassed = (deadline) => {
        return new Date(deadline) < new Date();
    };

    const isToday = (date) => {
        const today = new Date();
        const taskDate = new Date(date);
        return taskDate.toDateString() === today.toDateString();
    };

    const formatLocalDateTime = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString('en-IN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const groupTasksByDate = (tasksList) => {
        const grouped = {};
        tasksList.forEach(task => {
            const date = new Date(task.deadline).toDateString();
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(task);
        });
        return grouped;
    };

    // Filter tasks
    const filteredTasks = tasks.filter(t => {
        if (viewMode === 'pending') return t.status !== 'completed';
        if (viewMode === 'completed') return t.status === 'completed';
        return true;
    });

    const tasksToShow = selectedDate === 'today'
        ? filteredTasks.filter(t => isToday(t.deadline))
        : selectedDate === 'all'
            ? filteredTasks
            : filteredTasks.filter(t => new Date(t.deadline).toDateString() === selectedDate);

    const groupedTasks = groupTasksByDate(tasksToShow);
    const allPendingCount = tasks.filter(t => t.status !== 'completed').length;

    if (status === 'loading' || !session) return <p>Loading...</p>;

    const isAdminAssigned = editingTask && editingTask.assignedBy !== session.user.id;
    const isPendingApproval = editingTask && editingTask.extensionRequest?.requested && editingTask.extensionRequest?.status === 'pending';

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>My Dashboard</h1>
                <div className={styles.profile}>
                    <span>{session.user.name}</span>
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className={styles.logoutBtn}>Logout</button>
                </div>
            </header>

            <main className={styles.main}>
                {/* Create Task Form */}
                <div className={styles.card}>
                    <h3>Create Personal Task</h3>
                    <form onSubmit={handleCreateTask} className={styles.form}>
                        <div className={styles.formGroup}>
                            <label>Title</label>
                            <input
                                placeholder="Task Title"
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Description</label>
                            <textarea
                                placeholder="Task Description"
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Deadline</label>
                            <input
                                type="datetime-local"
                                value={newTask.deadline}
                                onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Time Required (minutes)</label>
                            <input
                                type="number"
                                min="5"
                                step="5"
                                value={newTask.timeRequired}
                                onChange={(e) => setNewTask({ ...newTask, timeRequired: parseInt(e.target.value) })}
                                required
                            />
                        </div>
                        <div className={styles.formGroup}>
                            <label>Priority</label>
                            <select
                                value={newTask.priority}
                                onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                            </select>
                        </div>
                        <button type="submit" className={styles.btn}>Add Task</button>
                    </form>
                </div>

                {/* Task List with Filters */}
                <div className={styles.card}>
                    <div className={styles.taskHeader}>
                        <h3>My Tasks ({tasks.length})</h3>
                        <div className={styles.stats}>
                            <span className={styles.statBadge}>Total Pending: {allPendingCount}</span>
                        </div>
                    </div>

                    {/* View Mode Tabs */}
                    <div className={styles.tabs}>
                        <button
                            className={viewMode === 'pending' ? styles.tabActive : styles.tab}
                            onClick={() => setViewMode('pending')}
                        >
                            Pending
                        </button>
                        <button
                            className={viewMode === 'completed' ? styles.tabActive : styles.tab}
                            onClick={() => setViewMode('completed')}
                        >
                            Completed
                        </button>
                        <button
                            className={viewMode === 'all' ? styles.tabActive : styles.tab}
                            onClick={() => setViewMode('all')}
                        >
                            All
                        </button>
                    </div>

                    {/* Date Filter */}
                    <div className={styles.dateFilter}>
                        <button
                            className={selectedDate === 'today' ? styles.dateActive : styles.dateBtn}
                            onClick={() => setSelectedDate('today')}
                        >
                            Today
                        </button>
                        <button
                            className={selectedDate === 'all' ? styles.dateActive : styles.dateBtn}
                            onClick={() => setSelectedDate('all')}
                        >
                            All Dates
                        </button>
                    </div>

                    {/* Grouped Tasks */}
                    <div className={styles.taskGroups}>
                        {Object.keys(groupedTasks).length === 0 ? (
                            <p className={styles.emptyState}>No tasks found for the selected filter.</p>
                        ) : (
                            Object.entries(groupedTasks).map(([date, dateTasks]) => (
                                <div key={date} className={styles.dateGroup}>
                                    <h4 className={styles.dateHeader}>{date}</h4>
                                    <ul className={styles.list}>
                                        {dateTasks.map(t => (
                                            <li key={t._id} className={styles.taskItem}>
                                                <div className={styles.taskContent}>
                                                    <div className={styles.taskTop}>
                                                        <strong className={styles.taskTitle}>{t.title}</strong>
                                                        <span className={styles[`priority-${t.priority}`]}>{t.priority.toUpperCase()}</span>
                                                    </div>
                                                    <p className={styles.taskDesc}>{t.description || 'No description'}</p>
                                                    <div className={styles.taskMeta}>
                                                        <span>📅 Due: {formatLocalDateTime(t.deadline)}</span>
                                                        <span>⏱️ Time: {t.timeRequired} min</span>
                                                        <span className={styles.statusBadge}>{t.status.replace(/-/g, ' ')}</span>
                                                        {isDeadlinePassed(t.deadline) && t.status !== 'completed' && (
                                                            <span className={styles.overdueBadge}>⚠️ OVERDUE</span>
                                                        )}
                                                        {t.extensionRequest?.requested && t.extensionRequest?.status === 'pending' && (
                                                            <span className={styles.waitingBadge}>⏳ Waiting for Admin Approval</span>
                                                        )}
                                                    </div>
                                                    {t.extensionReason && (
                                                        <p className={styles.extensionNote}>📝 Extension Reason: {t.extensionReason}</p>
                                                    )}
                                                </div>
                                                {t.status !== 'completed' && (
                                                    <button onClick={() => openEditModal(t)} className={styles.editBtn}>
                                                        Edit / Update Status
                                                    </button>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </main>

            {/* Conditional Edit Modal */}
            {editingTask && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Update Task: {editingTask.title}</h3>

                        {isPendingApproval ? (
                            <div className={styles.alert}>
                                <p><strong>⏳ Waiting for Admin Approval</strong></p>
                                <p>You have already requested an extension for this task. Please wait for the admin to approve or reject your request.</p>
                                <div className={styles.modalActions}>
                                    <button type="button" onClick={() => setEditingTask(null)} className={styles.cancelBtn}>Close</button>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdateTask} className={styles.form}>
                                <div className={styles.formGroup}>
                                    <label>Status</label>
                                    <select
                                        value={editForm.status}
                                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                                    >
                                        <option value="yet-to-start">Yet to Start</option>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>

                                {/* Conditional Fields Based on Deadline and Status */}
                                {!isDeadlinePassed(editingTask.deadline) ? (
                                    // Before Deadline: Show Remarks
                                    <div className={styles.formGroup}>
                                        <label>Remarks (Optional)</label>
                                        <textarea
                                            value={editForm.remarks}
                                            onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                            placeholder="Add any notes or updates..."
                                        />
                                    </div>
                                ) : (
                                    // After Deadline: Different fields based on status
                                    <>
                                        {editForm.status === 'completed' ? (
                                            // If Completed: Ask reason for overdue completion
                                            <div className={styles.formGroup}>
                                                <label>Reason for Overdue Completion (Required)</label>
                                                <textarea
                                                    value={editForm.extensionReason}
                                                    onChange={(e) => setEditForm({ ...editForm, extensionReason: e.target.value })}
                                                    required
                                                    placeholder="Why was this task completed after the deadline?"
                                                />
                                            </div>
                                        ) : (
                                            // If Pending/Yet-to-Start: Ask for extension
                                            <>
                                                {isAdminAssigned ? (
                                                    // Request Extension for Admin-Assigned Tasks
                                                    <>
                                                        <div className={styles.formGroup}>
                                                            <label>Extra Time Needed (minutes)</label>
                                                            <input
                                                                type="number"
                                                                min="5"
                                                                step="5"
                                                                value={editForm.extraTimeNeeded}
                                                                onChange={(e) => setEditForm({ ...editForm, extraTimeNeeded: parseInt(e.target.value) })}
                                                                required
                                                            />
                                                        </div>
                                                        <div className={styles.formGroup}>
                                                            <label>Reason for Extension Request (Required)</label>
                                                            <textarea
                                                                value={editForm.extensionReason}
                                                                onChange={(e) => setEditForm({ ...editForm, extensionReason: e.target.value })}
                                                                required
                                                                placeholder="Why do you need more time? (Admin must approve)"
                                                            />
                                                        </div>
                                                    </>
                                                ) : (
                                                    // Direct Edit for Self-Assigned Tasks
                                                    <>
                                                        <div className={styles.formGroup}>
                                                            <label>Extend Deadline</label>
                                                            <input
                                                                type="datetime-local"
                                                                value={editForm.deadline}
                                                                onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className={styles.formGroup}>
                                                            <label>Reason for Extension (Required)</label>
                                                            <textarea
                                                                value={editForm.extensionReason}
                                                                onChange={(e) => setEditForm({ ...editForm, extensionReason: e.target.value })}
                                                                required
                                                                placeholder="Why do you need more time?"
                                                            />
                                                        </div>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </>
                                )}

                                <div className={styles.modalActions}>
                                    <button type="submit" className={styles.btn}>
                                        {isAdminAssigned && editForm.status !== 'completed' && isDeadlinePassed(editingTask.deadline) ? 'Send Request' : 'Save Changes'}
                                    </button>
                                    <button type="button" onClick={() => setEditingTask(null)} className={styles.cancelBtn}>Cancel</button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
