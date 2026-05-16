import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

const API_BASE = 'https://fitness-api.smartstockflow.co.uk/api';
const TOKEN_KEY = 'fitness_token';
const USER_KEY = 'fitness_user';

function App() {
  const [token, setToken] = useState(localStorage.getItem(TOKEN_KEY) || '');
  const [currentUser, setCurrentUser] = useState(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [authMode, setAuthMode] = useState('login');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [exercises, setExercises] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [stats, setStats] = useState({
    total_workouts: 0,
    total_calories: 0,
    calories_this_week: 0,
    top_exercise: 'No workouts yet',
    totals_by_exercise: []
  });

  const [exerciseName, setExerciseName] = useState('');
  const [caloriesPerMin, setCaloriesPerMin] = useState('');
  const [editingExerciseId, setEditingExerciseId] = useState(null);

  const [exerciseId, setExerciseId] = useState('');
  const [duration, setDuration] = useState('');
  const [editWorkoutId, setEditWorkoutId] = useState(null);

  const [filterExerciseId, setFilterExerciseId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetchCurrentUser(token);
      loadDashboardData(token);
    }
  }, [token]);

  const authHeaders = (customToken = token) => ({
    headers: {
      Authorization: `Bearer ${customToken}`
    }
  });

  const showMessage = (text, type = 'success') => {
    setMessage(text);
    setMessageType(type);

    setTimeout(() => {
      setMessage('');
    }, 3000);
  };

  const saveAuth = (user, newToken) => {
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    setCurrentUser(user);
    setToken(newToken);
  };

  const clearAuth = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setCurrentUser(null);
    setToken('');
    setExercises([]);
    setWorkouts([]);
    setStats({
      total_workouts: 0,
      total_calories: 0,
      calories_this_week: 0,
      top_exercise: 'No workouts yet',
      totals_by_exercise: []
    });
  };

  const fetchCurrentUser = async (customToken = token) => {
    try {
      const res = await axios.get(`${API_BASE}/user`, authHeaders(customToken));
      setCurrentUser(res.data.user);
      localStorage.setItem(USER_KEY, JSON.stringify(res.data.user));
    } catch (error) {
      clearAuth();
    }
  };

  const buildWorkoutParams = () => {
    const params = {};

    if (filterExerciseId) {
      params.exercise_id = filterExerciseId;
    }

    if (dateFrom) {
      params.date_from = dateFrom;
    }

    if (dateTo) {
      params.date_to = dateTo;
    }

    return params;
  };

  const loadDashboardData = async (customToken = token) => {
    try {
      setLoading(true);
      await Promise.all([
        fetchExercises(customToken),
        fetchWorkouts(customToken),
        fetchStats(customToken)
      ]);
    } catch (error) {
      showMessage('Failed to load dashboard data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchExercises = async (customToken = token) => {
    const res = await axios.get(`${API_BASE}/exercises`, authHeaders(customToken));
    setExercises(res.data);
  };

  const fetchWorkouts = async (customToken = token) => {
    const res = await axios.get(`${API_BASE}/workouts`, {
      ...authHeaders(customToken),
      params: buildWorkoutParams()
    });
    setWorkouts(res.data);
  };

  const fetchStats = async (customToken = token) => {
    const res = await axios.get(`${API_BASE}/workouts/stats`, authHeaders(customToken));
    setStats(res.data);
  };

  const resetWorkoutForm = () => {
    setExerciseId('');
    setDuration('');
    setEditWorkoutId(null);
  };

  const resetExerciseForm = () => {
    setExerciseName('');
    setCaloriesPerMin('');
    setEditingExerciseId(null);
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!registerName.trim() || !registerEmail.trim() || !registerPassword.trim()) {
      showMessage('Please fill in all register fields.', 'error');
      return;
    }

    if (registerPassword.length < 6) {
      showMessage('Password must be at least 6 characters.', 'error');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/register`, {
        name: registerName.trim(),
        email: registerEmail.trim(),
        password: registerPassword
      });

      saveAuth(res.data.user, res.data.token);
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      showMessage('Registration successful!');
    } catch (error) {
      showMessage(error.response?.data?.message || 'Registration failed.', 'error');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      showMessage('Please enter your email and password.', 'error');
      return;
    }

    try {
      const res = await axios.post(`${API_BASE}/login`, {
        email: loginEmail.trim(),
        password: loginPassword
      });

      saveAuth(res.data.user, res.data.token);
      setLoginEmail('');
      setLoginPassword('');
      showMessage('Login successful!');
    } catch (error) {
      showMessage(error.response?.data?.message || 'Login failed.', 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await axios.post(`${API_BASE}/logout`, {}, authHeaders());
    } catch (error) {
      // Clear auth even if token is already invalid.
    } finally {
      clearAuth();
      showMessage('Logged out successfully.');
    }
  };

  const handleExerciseSubmit = async (e) => {
    e.preventDefault();

    if (!exerciseName.trim() || !caloriesPerMin) {
      showMessage('Please enter exercise name and calories per minute.', 'error');
      return;
    }

    if (Number(caloriesPerMin) <= 0) {
      showMessage('Calories per minute must be greater than 0.', 'error');
      return;
    }

    try {
      if (editingExerciseId) {
        await axios.put(
          `${API_BASE}/exercises/${editingExerciseId}`,
          {
            name: exerciseName.trim(),
            calories_per_min: caloriesPerMin
          },
          authHeaders()
        );

        showMessage('Exercise updated successfully!');
      } else {
        await axios.post(
          `${API_BASE}/exercises`,
          {
            name: exerciseName.trim(),
            calories_per_min: caloriesPerMin
          },
          authHeaders()
        );

        showMessage('Exercise added successfully!');
      }

      resetExerciseForm();
      fetchExercises();
      fetchStats();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to save exercise.', 'error');
    }
  };

  const handleEditExercise = (exercise) => {
    setExerciseName(exercise.name);
    setCaloriesPerMin(String(exercise.calories_per_min));
    setEditingExerciseId(exercise.id);
    showMessage('Exercise loaded for editing.');
  };

  const handleDeleteExercise = async (id) => {
    try {
      await axios.delete(`${API_BASE}/exercises/${id}`, authHeaders());
      showMessage('Exercise deleted successfully.');
      fetchExercises();
      fetchWorkouts();
      fetchStats();

      if (String(id) === exerciseId) {
        resetWorkoutForm();
      }
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to delete exercise.', 'error');
    }
  };

  const handleWorkoutSubmit = async (e) => {
    e.preventDefault();

    if (!exerciseId || !duration) {
      showMessage('Please select an exercise and enter duration.', 'error');
      return;
    }

    if (Number(duration) <= 0) {
      showMessage('Duration must be greater than 0.', 'error');
      return;
    }

    try {
      if (editWorkoutId) {
        await axios.put(
          `${API_BASE}/workouts/${editWorkoutId}`,
          {
            exercise_id: exerciseId,
            duration
          },
          authHeaders()
        );

        showMessage('Workout updated successfully!');
      } else {
        await axios.post(
          `${API_BASE}/workouts`,
          {
            exercise_id: exerciseId,
            duration
          },
          authHeaders()
        );

        showMessage('Workout added successfully!');
      }

      resetWorkoutForm();
      fetchWorkouts();
      fetchStats();
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to save workout.', 'error');
    }
  };

  const handleEditWorkout = (workout) => {
    setExerciseId(String(workout.exercise_id));
    setDuration(String(workout.duration));
    setEditWorkoutId(workout.id);
    showMessage('Workout loaded for editing.');
  };

  const handleDeleteWorkout = async (id) => {
    try {
      await axios.delete(`${API_BASE}/workouts/${id}`, authHeaders());
      showMessage('Workout deleted successfully.');
      fetchWorkouts();
      fetchStats();

      if (editWorkoutId === id) {
        resetWorkoutForm();
      }
    } catch (error) {
      showMessage(error.response?.data?.message || 'Failed to delete workout.', 'error');
    }
  };

  const applyFilters = async () => {
    try {
      setLoading(true);
      await fetchWorkouts();
    } catch (error) {
      showMessage('Failed to apply filters.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = async () => {
    setFilterExerciseId('');
    setDateFrom('');
    setDateTo('');

    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/workouts`, authHeaders());
      setWorkouts(res.data);
    } catch (error) {
      showMessage('Failed to clear filters.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getExerciseName = (id) => {
    const exercise = exercises.find((item) => item.id === Number(id));
    return exercise ? exercise.name : 'Unknown Exercise';
  };

  const maxChartValue = Math.max(...stats.totals_by_exercise.map((item) => item.total_calories), 1);

  if (!token || !currentUser) {
    return (
      <div className="app-shell auth-shell">
        <div className="background-shape shape-one"></div>
        <div className="background-shape shape-two"></div>

        <main className="auth-card">
          <p className="eyebrow">Fitness Tracker</p>
          <h1 className="title auth-title">Welcome Back</h1>
          <p className="subtitle auth-subtitle">
            Register a new account or log in to manage your personal fitness dashboard.
          </p>

          {message && <div className={`message message-${messageType}`}>{message}</div>}

          <div className="auth-tabs">
            <button
              className={`tab-button ${authMode === 'login' ? 'tab-active' : ''}`}
              type="button"
              onClick={() => setAuthMode('login')}
            >
              Login
            </button>
            <button
              className={`tab-button ${authMode === 'register' ? 'tab-active' : ''}`}
              type="button"
              onClick={() => setAuthMode('register')}
            >
              Register
            </button>
          </div>

          {authMode === 'login' ? (
            <form className="workout-form" onSubmit={handleLogin}>
              <div className="form-group">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </div>

              <button className="primary-button" type="submit">
                Login
              </button>
            </form>
          ) : (
            <form className="workout-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label className="label">Name</label>
                <input
                  className="input"
                  type="text"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="form-group">
                <label className="label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  placeholder="Enter your email"
                />
              </div>

              <div className="form-group">
                <label className="label">Password</label>
                <input
                  className="input"
                  type="password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  placeholder="Create a password"
                />
              </div>

              <button className="primary-button" type="submit">
                Register
              </button>
            </form>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <div className="background-shape shape-one"></div>
      <div className="background-shape shape-two"></div>

      <main className="dashboard-card">
        <section className="hero">
          <div>
            <p className="eyebrow">Daily Fitness Dashboard</p>
            <h1 className="title">Fitness Tracker</h1>
            <p className="subtitle">
              Welcome, <strong>{currentUser.name}</strong>. You are viewing only your own workouts and stats.
            </p>
          </div>

          <div className="hero-actions">
            <button className="logout-button" type="button" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </section>

        {message && <div className={`message message-${messageType}`}>{message}</div>}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Total Workouts</span>
            <span className="stat-value">{stats.total_workouts}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Calories</span>
            <span className="stat-value">{stats.total_calories}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Calories This Week</span>
            <span className="stat-value">{stats.calories_this_week}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Top Exercise</span>
            <span className="stat-value stat-text">{stats.top_exercise}</span>
          </div>
        </section>

        <div className="content-grid">
          <section className="panel stack-panel">
            <div className="inner-panel">
              <div className="panel-header">
                <h2>{editingExerciseId ? 'Edit Exercise' : 'Add Exercise'}</h2>
                {editingExerciseId && (
                  <button className="ghost-button" type="button" onClick={resetExerciseForm}>
                    Cancel Edit
                  </button>
                )}
              </div>

              <form className="workout-form" onSubmit={handleExerciseSubmit}>
                <div className="form-group">
                  <label className="label">Exercise Name</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. Running"
                    value={exerciseName}
                    onChange={(e) => setExerciseName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="label">Calories Per Minute</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 10"
                    value={caloriesPerMin}
                    onChange={(e) => setCaloriesPerMin(e.target.value)}
                  />
                </div>

                <button className="primary-button" type="submit">
                  {editingExerciseId ? 'Update Exercise' : 'Add Exercise'}
                </button>
              </form>
            </div>

            <div className="inner-panel">
              <div className="panel-header">
                <h2>{editWorkoutId ? 'Edit Workout' : 'Add Workout'}</h2>
                {editWorkoutId && (
                  <button className="ghost-button" type="button" onClick={resetWorkoutForm}>
                    Cancel Edit
                  </button>
                )}
              </div>

              <form className="workout-form" onSubmit={handleWorkoutSubmit}>
                <div className="form-group">
                  <label className="label">Exercise</label>
                  <select
                    className="input"
                    value={exerciseId}
                    onChange={(e) => setExerciseId(e.target.value)}
                  >
                    <option value="">Select Exercise</option>
                    {exercises.map((exercise) => (
                      <option key={exercise.id} value={exercise.id}>
                        {exercise.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="label">Duration (minutes)</label>
                  <input
                    className="input"
                    type="number"
                    placeholder="e.g. 45"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </div>

                <button className="primary-button" type="submit">
                  {editWorkoutId ? 'Update Workout' : 'Add Workout'}
                </button>
              </form>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Search And Filter</h2>
            </div>

            <div className="filter-grid">
              <div className="form-group">
                <label className="label">Exercise</label>
                <select
                  className="input"
                  value={filterExerciseId}
                  onChange={(e) => setFilterExerciseId(e.target.value)}
                >
                  <option value="">All Exercises</option>
                  {exercises.map((exercise) => (
                    <option key={exercise.id} value={exercise.id}>
                      {exercise.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">From Date</label>
                <input
                  className="input"
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="label">To Date</label>
                <input
                  className="input"
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>

            <div className="button-row">
              <button className="primary-button compact-button" type="button" onClick={applyFilters}>
                Apply Filters
              </button>
              <button className="ghost-button compact-button" type="button" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>

            <div className="panel-header second-header">
              <h2>Workout History</h2>
              <span className="badge">{workouts.length} items</span>
            </div>

            {loading ? (
              <div className="empty-state">Loading workouts...</div>
            ) : workouts.length === 0 ? (
              <div className="empty-state">No workouts found for the selected filters.</div>
            ) : (
              <div className="workout-list">
                {workouts.map((workout) => (
                  <div className="workout-item" key={workout.id}>
                    <div className="workout-main">
                      <h3>{getExerciseName(workout.exercise_id)}</h3>
                      <p>
                        {workout.duration} min | {workout.calories_burned} cal |{' '}
                        {new Date(workout.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="workout-actions">
                      <button
                        className="action-button edit-button"
                        type="button"
                        onClick={() => handleEditWorkout(workout)}
                      >
                        Edit
                      </button>
                      <button
                        className="action-button delete-button"
                        type="button"
                        onClick={() => handleDeleteWorkout(workout.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="content-grid bottom-grid">
          <section className="panel">
            <div className="panel-header">
              <h2>Available Exercises</h2>
              <span className="badge">{exercises.length} exercises</span>
            </div>

            {exercises.length === 0 ? (
              <div className="empty-state">No exercises available yet.</div>
            ) : (
              <div className="exercise-grid">
                {exercises.map((exercise) => (
                  <div className="exercise-card" key={exercise.id}>
                    <div>
                      <h3>{exercise.name}</h3>
                      <p>{exercise.calories_per_min} cal / min</p>
                    </div>

                    <div className="exercise-actions">
                      <button
                        className="action-button edit-button"
                        type="button"
                        onClick={() => handleEditExercise(exercise)}
                      >
                        Edit
                      </button>
                      <button
                        className="action-button delete-button"
                        type="button"
                        onClick={() => handleDeleteExercise(exercise.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-header">
              <h2>Calories By Exercise</h2>
            </div>

            {stats.totals_by_exercise.length === 0 ? (
              <div className="empty-state">Add workouts to see the chart.</div>
            ) : (
              <div className="chart-list">
                {stats.totals_by_exercise.map((item) => (
                  <div className="chart-row" key={item.exercise_name}>
                    <div className="chart-meta">
                      <span>{item.exercise_name}</span>
                      <span>{item.total_calories} cal</span>
                    </div>
                    <div className="chart-track">
                      <div
                        className="chart-bar"
                        style={{ width: `${(item.total_calories / maxChartValue) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;