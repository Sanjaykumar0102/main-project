'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import styles from '../dashboard.module.css';

export default function AdminDashboard() {
    const { data: session, status } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [taskData, setTaskData] = useState({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        timeRequired: 30, // in minutes
        assignedTo: ''
    });
    const [message, setMessage] = useState('');
    const [activeTab, setActiveTab] = useState('assign'); // 'assign', 'users', 'tasks', 'requests'
    const [selectedDate, setSelectedDate] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'pending', 'completed'

    // Edit Modal State
    const [editingTask, setEditingTask] = useState(null);
    const [editForm, setEditForm] = useState({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        timeRequired: 30,
        status: ''
    });

    useEffect(() => {
        if (status === 'loading') return;
        if (status === 'unauthenticated') router.push('/login');
        else if (session?.user?.role !== 'admin') router.push('/dashboard/user');
        else {
            fetchUsers();
            fetchAllTasks();
        }
    }, [status, session, router]);

    const fetchUsers = async () => {
        if (!session?.user?.token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${session.user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (err) { console.error(err); }
    };

    const fetchAllTasks = async () => {
        if (!session?.user?.token) return;
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/all-tasks`, {
                headers: { 'Authorization': `Bearer ${session.user.token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTasks(data);
            }
        } catch (err) { console.error(err); }
    };

    const handleAssignTask = async (e) => {
        e.preventDefault();
        if (!taskData.assignedTo) {
            setMessage('Please select a user');
            return;
        }

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tasks`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.user.token}`
                },
                body: JSON.stringify(taskData)
            });

            if (res.ok) {
                setMessage('Task assigned successfully!');
                setTaskData({ title: '', description: '', priority: 'medium', deadline: '', timeRequired: 30, assignedTo: '' });
                fetchAllTasks(); // Refresh task list
            } else {
                setMessage('Failed to assign task');
            }
        } catch (err) {
            setMessage('Error assigning task');
        }
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
            title: task.title,
            description: task.description || '',
            priority: task.priority,
            deadline: localDeadline,
            timeRequired: task.timeRequired,
            status: task.status
        });
    };

    const handleUpdateTask = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/tasks/${editingTask._id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.user.token}`
                },
                body: JSON.stringify(editForm)
            });

            if (res.ok) {
                const updatedTask = await res.json();
                setTasks(tasks.map(t => t._id === updatedTask._id ? updatedTask : t));
                setEditingTask(null);
            }
        } catch (err) { console.error(err); }
    };

    const handleApproveExtension = async (taskId, extensionDetails) => {
        try {
            const newDeadline = new Date(new Date(tasks.find(t => t._id === taskId).deadline).getTime() + extensionDetails.extraTimeNeeded * 60 * 1000).toISOString();

            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/extension-request/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.user.token}`
                },
                body: JSON.stringify({
                    approved: true,
                    newDeadline
                })
            });

            if (res.ok) {
                fetchAllTasks(); // Refresh all
            }
        } catch (err) { console.error(err); }
    };

    const handleRejectExtension = async (taskId) => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/admin/extension-request/${taskId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.user.token}`
                },
                body: JSON.stringify({ approved: false })
            });

            if (res.ok) {
                fetchAllTasks(); // Refresh all
            }
        } catch (err) { console.error(err); }
    };

    // Helper functions
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

    const isToday = (date) => {
        const today = new Date();
        const taskDate = new Date(date);
        return taskDate.toDateString() === today.toDateString();
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

    const isDeadlinePassed = (deadline) => {
        return new Date(deadline) < new Date();
    };

    // Filter tasks
    const filteredTasks = tasks.filter(t => {
        if (statusFilter === 'pending') return t.status !== 'completed';
        if (statusFilter === 'completed') return t.status === 'completed';
        return true;
    });

    const tasksToShow = selectedDate === 'today'
        ? filteredTasks.filter(t => isToday(t.deadline))
        : filteredTasks;

    const groupedTasks = groupTasksByDate(tasksToShow);
    const totalPending = tasks.filter(t => t.status !== 'completed').length;
    const pendingRequests = tasks.filter(t => t.extensionRequest?.requested && t.extensionRequest?.status === 'pending');

    if (status === 'loading' || !session || session.user.role !== 'admin') {
        return <p>Loading...</p>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Admin Dashboard</h1>
                <div className={styles.profile}>
                    <span>{session.user.name} (Admin)</span>
                    <button onClick={() => signOut({ callbackUrl: '/login' })} className={styles.logoutBtn}>Logout</button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className={styles.adminTabs}>
                <button
                    className={activeTab === 'assign' ? styles.adminTabActive : styles.adminTab}
                    onClick={() => setActiveTab('assign')}
                >
                    📝 Assign Task
                </button>
                <button
                    className={activeTab === 'users' ? styles.adminTabActive : styles.adminTab}
                    onClick={() => setActiveTab('users')}
                >
                    👥 All Users ({users.length})
                </button>
                <button
                    className={activeTab === 'tasks' ? styles.adminTabActive : styles.adminTab}
                    onClick={() => setActiveTab('tasks')}
                >
                    📋 Assigned Tasks ({tasks.length})
                </button>
                <button
                    className={activeTab === 'requests' ? styles.adminTabActive : styles.adminTab}
                    onClick={() => setActiveTab('requests')}
                >
                    🔔 Requests ({pendingRequests.length})
                </button>
            </div>

            <main className={styles.main}>
                {/* Assign Task Tab */}
                {activeTab === 'assign' && (
                    <div className={styles.card}>
                        <h3>Assign Task to User</h3>
                        {message && <p className={styles.alert}>{message}</p>}
                        <form onSubmit={handleAssignTask} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={taskData.title}
                                    onChange={(e) => setTaskData({ ...taskData, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    value={taskData.description}
                                    onChange={(e) => setTaskData({ ...taskData, description: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Deadline</label>
                                <input
                                    type="datetime-local"
                                    value={taskData.deadline}
                                    onChange={(e) => setTaskData({ ...taskData, deadline: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Time Required (minutes)</label>
                                <input
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={taskData.timeRequired}
                                    onChange={(e) => setTaskData({ ...taskData, timeRequired: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Priority</label>
                                <select
                                    value={taskData.priority}
                                    onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                            <div className={styles.formGroup}>
                                <label>Assign To</label>
                                <select
                                    value={taskData.assignedTo}
                                    onChange={(e) => setTaskData({ ...taskData, assignedTo: e.target.value })}
                                    required
                                >
                                    <option value="">Select User</option>
                                    {users.map(user => (
                                        <option key={user._id} value={user._id}>
                                            {user.name} ({user.email})
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button type="submit" className={styles.btn}>Assign Task</button>
                        </form>
                    </div>
                )}

                {/* All Users Tab */}
                {activeTab === 'users' && (
                    <div className={styles.card}>
                        <h3>Registered Users</h3>
                        <div className={styles.userGrid}>
                            {users.map(user => (
                                <div key={user._id} className={styles.userCard}>
                                    <div className={styles.userInfo}>
                                        <strong>{user.name}</strong>
                                        <span className={styles.userEmail}>{user.email}</span>
                                        <span className={styles.userRole}>{user.role}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Assigned Tasks Tab */}
                {activeTab === 'tasks' && (
                    <div className={styles.card}>
                        <div className={styles.taskHeader}>
                            <h3>All Assigned Tasks</h3>
                            <div className={styles.stats}>
                                <span className={styles.statBadge}>Total Pending: {totalPending}</span>
                            </div>
                        </div>

                        {/* Status Filter */}
                        <div className={styles.tabs}>
                            <button
                                className={statusFilter === 'all' ? styles.tabActive : styles.tab}
                                onClick={() => setStatusFilter('all')}
                            >
                                All
                            </button>
                            <button
                                className={statusFilter === 'pending' ? styles.tabActive : styles.tab}
                                onClick={() => setStatusFilter('pending')}
                            >
                                Pending
                            </button>
                            <button
                                className={statusFilter === 'completed' ? styles.tabActive : styles.tab}
                                onClick={() => setStatusFilter('completed')}
                            >
                                Completed
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
                                <p className={styles.emptyState}>No tasks found.</p>
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
                                                            <span>👤 Assigned to: {t.assignedTo?.name || 'Unknown'}</span>
                                                            <span>📅 Due: {formatLocalDateTime(t.deadline)}</span>
                                                            <span>⏱️ Time: {t.timeRequired} min</span>
                                                            <span className={styles.statusBadge}>{t.status.replace(/-/g, ' ')}</span>
                                                            {isDeadlinePassed(t.deadline) && t.status !== 'completed' && (
                                                                <span className={styles.overdueBadge}>⚠️ OVERDUE</span>
                                                            )}
                                                            {t.extensionRequest?.requested && t.extensionRequest?.status === 'pending' && (
                                                                <span className={styles.waitingBadge}>⏳ Extension Requested</span>
                                                            )}
                                                        </div>
                                                        {t.extensionReason && (
                                                            <p className={styles.extensionNote}>📝 Extension Reason: {t.extensionReason}</p>
                                                        )}
                                                    </div>
                                                    {t.status !== 'completed' && (
                                                        <button onClick={() => openEditModal(t)} className={styles.editBtn}>
                                                            Edit
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
                )}

                {/* Requests Tab */}
                {activeTab === 'requests' && (
                    <div className={styles.card}>
                        <h3>Pending Extension Requests</h3>
                        {pendingRequests.length === 0 ? (
                            <p className={styles.emptyState}>No pending requests.</p>
                        ) : (
                            <div className={styles.requestGrid}>
                                {pendingRequests.map(t => (
                                    <div key={t._id} className={styles.requestCard}>
                                        <div className={styles.requestHeader}>
                                            <strong>{t.title}</strong>
                                            <span className={styles[`priority-${t.priority}`]}>{t.priority.toUpperCase()}</span>
                                        </div>
                                        <div className={styles.requestBody}>
                                            <p>👤 <strong>User:</strong> {t.assignedTo?.name}</p>
                                            <p>📅 <strong>Current Deadline:</strong> {formatLocalDateTime(t.deadline)}</p>
                                            <p>⏱️ <strong>Extra Time Requested:</strong> {t.extensionRequest.extraTimeNeeded} minutes</p>
                                            <p>📝 <strong>Reason:</strong> {t.extensionRequest.reason}</p>
                                        </div>
                                        <div className={styles.requestFooter}>
                                            <button
                                                className={styles.approveBtn}
                                                onClick={() => handleApproveExtension(t._id, t.extensionRequest)}
                                            >
                                                ✅ Approve
                                            </button>
                                            <button
                                                className={styles.rejectBtn}
                                                onClick={() => handleRejectExtension(t._id)}
                                            >
                                                ❌ Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Admin Edit Modal */}
            {editingTask && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3>Edit Task: {editingTask.title}</h3>
                        <form onSubmit={handleUpdateTask} className={styles.form}>
                            <div className={styles.formGroup}>
                                <label>Title</label>
                                <input
                                    type="text"
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Description</label>
                                <textarea
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Deadline</label>
                                <input
                                    type="datetime-local"
                                    value={editForm.deadline}
                                    onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Time Required (minutes)</label>
                                <input
                                    type="number"
                                    min="5"
                                    step="5"
                                    value={editForm.timeRequired}
                                    onChange={(e) => setEditForm({ ...editForm, timeRequired: parseInt(e.target.value) })}
                                    required
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Priority</label>
                                <select
                                    value={editForm.priority}
                                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                                >
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
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
                            <div className={styles.modalActions}>
                                <button type="submit" className={styles.btn}>Save Changes</button>
                                <button type="button" onClick={() => setEditingTask(null)} className={styles.cancelBtn}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
