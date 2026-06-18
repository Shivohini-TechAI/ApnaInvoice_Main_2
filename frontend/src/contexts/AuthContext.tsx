import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

import { API_URL } from '../utils/api';

export type UserRole =
  | 'admin'
  | 'project_manager'
  | 'team_leader'
  | 'team_member'
  | 'provider'
  | 'user';

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  whatsapp?: string;
  strongAreas?: string;
  role: UserRole;
  designation?: string;
  companyName?: string;
  signature_url?: string;

  projectName?: string;
  projectDescription?: string;
  projectStartDate?: string;
  projectEndDate?: string;
  projectSubmittedAt?: string;

  projectDetails?: {
    projectName: string;
    projectDescription: string;
    startDate: string;
    endDate: string;
    submittedAt?: string;
  };

  createdAt: string;
  personalTodos: PersonalTodo[];
}

export interface PersonalTodo {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface SystemSettings {
  maxProjectManagers: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, user?: any) => Promise<{ success: boolean; error?: string }>;
  signup: (
    email: string,
    password: string,
    name: string,
    phone: string,
    whatsapp: string,
    strongAreas?: string,
    role?: UserRole,
    roleCode?: string,
    designation?: string,
    companyName?: string
  ) => Promise<boolean>;
  logout: () => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<void>;
  deleteUser: (userId: string) => Promise<boolean>;
  getAllUsers: () => User[];
  updateUserStrongAreas: (userId: string, strongAreas: string) => Promise<void>;
  addPersonalTodo: (userId: string, todo: Omit<PersonalTodo, 'id' | 'createdAt'>) => Promise<void>;
  updatePersonalTodo: (userId: string, todoId: string, updates: Partial<PersonalTodo>) => Promise<void>;
  deletePersonalTodo: (userId: string, todoId: string) => Promise<void>;
  updateUserProfile: (
    userId: string,
    profileData: {
      name: string;
      email: string;
      phone: string;
      whatsapp: string;
      strongAreas: string;
    }
  ) => Promise<void>;
  getSystemSettings: () => SystemSettings;
  updateSystemSettings: (settings: SystemSettings) => void;
  updateUserPassword: (userId: string, newPassword: string) => Promise<void>;
  updateUserProjectDetails: (
    userId: string,
    projectDetails: {
      projectName: string;
      projectDescription: string;
      startDate: string;
      endDate: string;
    }
  ) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

function getToken() {
  return localStorage.getItem('token');
}

function mapBackendTodo(todo: any): PersonalTodo {
  return {
    id: todo.id,
    title: todo.title,
    completed: todo.completed || false,
    dueDate: todo.due_date || '',
    createdAt: todo.created_at || new Date().toISOString(),
  };
}

async function fetchUserTodos(userId: string): Promise<PersonalTodo[]> {
  const token = getToken();

  if (!token) return [];

  const response = await fetch(`${API_URL}/auth/users/${userId}/todos`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Fetch todos error:', data.message);
    return [];
  }

  return (data.todos || []).map((todo: any) => mapBackendTodo(todo));
}

function mapBackendUser(dataUser: any): User {
  return {
    id: dataUser.id,
    email: dataUser.email,
    name: dataUser.name || 'User',
    phone: dataUser.phone || '',
    whatsapp: dataUser.whatsapp || '',
    strongAreas: dataUser.strong_areas || '',
    role: dataUser.role || 'user',
    designation: dataUser.designation || '',
    companyName: dataUser.company_name || '',
    signature_url: dataUser.signature_url || '',
    projectName: dataUser.project_name,
    projectDescription: dataUser.project_description,
    projectStartDate: dataUser.project_start_date,
    projectEndDate: dataUser.project_end_date,
    projectSubmittedAt: dataUser.project_submitted_at,
    createdAt: dataUser.created_at || new Date().toISOString(),
    personalTodos: [],
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maxProjectManagers: 5,
  });

  const fetchAllUsers = async () => {
    try {
      const token = getToken();

      if (!token) return;

      const response = await fetch(`${API_URL}/auth/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Error fetching users:', data.message);
        return;
      }

      const allUsers: User[] = (data.users || []).map((profile: any) =>
        mapBackendUser(profile)
      );

      setUsers(allUsers);
    } catch (error) {
      console.error('Error fetching all users:', error);
    }
  };

  useEffect(() => {
    const savedSettings = localStorage.getItem('shivohub_settings');

    if (savedSettings) {
      setSystemSettings(JSON.parse(savedSettings));
    }

    const initializeAuth = async () => {
      try {
        const token = getToken();

        if (!token) {
          setUser(null);
          setUsers([]);
          return;
        }

        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok || !data.user) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setUser(null);
          setUsers([]);
          return;
        }

        const userProfile = mapBackendUser(data.user);
        userProfile.personalTodos = await fetchUserTodos(userProfile.id);

        setUser(userProfile);
        localStorage.setItem('user', JSON.stringify(userProfile));

        // fetch all users for UI (no role-based restriction)
        await fetchAllUsers();
      } catch (error) {
        console.error('Auth init error:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const login = async (token: string, providedUser?: any): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!token) return { success: false, error: 'Token required' };

      localStorage.setItem('token', token);

      let userProfile: User | null = null;

      if (providedUser) {
        userProfile = mapBackendUser(providedUser);
      } else {
        // fetch user profile using token
        const resp = await fetch(`${API_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await resp.json();
        if (!resp.ok || !data.user) {
          localStorage.removeItem('token');
          return { success: false, error: data.message || 'Failed to fetch user' };
        }
        userProfile = mapBackendUser(data.user);
      }

      if (!userProfile) return { success: false, error: 'Failed to get user profile' };

      userProfile.personalTodos = await fetchUserTodos(userProfile.id);

      setUser(userProfile);
      localStorage.setItem('user', JSON.stringify(userProfile));

      await fetchAllUsers();

      return { success: true };
    } catch (error: any) {
      console.error('Login error:', error);
      localStorage.removeItem('token');
      return { success: false, error: error.message || 'Login failed' };
    }
  };

const signup = async (
  email: string,
  password: string,
  name: string,
  phone: string,
  whatsapp: string,
  strongAreas: string = '',
  role: User['role'] = 'team_member',
  roleCode?: string,
  designation?: string,
  companyName?: string
): Promise<boolean> => {
  try {
    const roleToStore: User['role'] =
      designation === 'Delivery Boy' ? 'provider'
      : designation === 'Customer' ? 'user'
      : role;

    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
  name,
  email: email.trim().toLowerCase(),
  password,
  phone,
  whatsapp,
  strongAreas,
  role: roleToStore,
  roleCode,
  signupCode: roleCode,
  designation,
  companyName,
}),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Signup failed");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));

    const userProfile: User = {
      id: data.user.id,
      email: data.user.email,
      name: data.user.name,
      phone: data.user.phone,
      whatsapp: data.user.whatsapp,
      strongAreas: data.user.strong_areas,
      role: data.user.role,
      createdAt: data.user.created_at,
      personalTodos: [],
    };

    setUser(userProfile);

    return true;
  } catch (error: any) {
    console.error("Signup error:", error);
    throw new Error(error.message || "Signup failed");
  }
};

  const logout = async () => {
    try {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
      setUsers([]);
    } catch (error) {
      console.error('Error during logout:', error);
      setUser(null);
      setUsers([]);
    }
  };

  const updateUserRole = async (userId: string, role: UserRole) => {
    try {
      const token = getToken();

      if (!token) {
        throw new Error('Authentication token missing');
      }

      const response = await fetch(`${API_URL}/auth/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update user role');
      }

      await fetchAllUsers();

      if (user?.id === userId) {
        setUser((prev) => (prev ? { ...prev, role } : null));
      }
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update user role');
    }
  };

   const deleteUser = async (userId: string): Promise<boolean> => {
  try {
    const token = getToken();

    if (!token) {
      throw new Error('Authentication token missing');
    }

    const response = await fetch(`${API_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to delete user');
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));

    return true;
  } catch (error) {
    console.error('Delete user error:', error);
    return false;
  }
};

  const updateUserProfile = async (
    userId: string,
    profileData: {
      name: string;
      email: string;
      phone: string;
      whatsapp: string;
      strongAreas: string;
    }
  ) => {
    try {
      const token = getToken();

      if (!token) {
        throw new Error('Authentication token missing');
      }

      const response = await fetch(`${API_URL}/auth/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profileData.name,
          email: profileData.email.trim().toLowerCase(),
          phone: profileData.phone,
          whatsapp: profileData.whatsapp,
          strong_areas: profileData.strongAreas,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      const updatedUser = mapBackendUser(data.user);

      if (user?.id === userId) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                ...updatedUser,
                personalTodos: prev.personalTodos || [],
              }
            : updatedUser
        );

        localStorage.setItem('user', JSON.stringify(updatedUser));
      }

      // After profile update, refresh the users list for UI consistency
      await fetchAllUsers();
    } catch (error: any) {
      throw new Error(error.message || 'Failed to update profile');
    }
  };

  const updateUserStrongAreas = async (userId: string, strongAreas: string) => {
    if (!user) return;

    await updateUserProfile(userId, {
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      whatsapp: user.whatsapp || '',
      strongAreas,
    });
  };


const addPersonalTodo = async (
  userId: string,
  todoData: Omit<PersonalTodo, 'id' | 'createdAt'>
) => {
  const token = getToken();

  if (!token) return;

  const response = await fetch(`${API_URL}/auth/users/${userId}/todos`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: todoData.title,
      due_date: todoData.dueDate || null,
      completed: todoData.completed,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to add todo');
  }

  const newTodo = mapBackendTodo(data.todo);

  if (user?.id === userId) {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            personalTodos: [newTodo, ...(prev.personalTodos || [])],
          }
        : null
    );
  }
};


const updatePersonalTodo = async (
  userId: string,
  todoId: string,
  updates: Partial<PersonalTodo>
) => {
  const token = getToken();
  if (!token) return;

  const response = await fetch(`${API_URL}/auth/users/${userId}/todos/${todoId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      title: updates.title,
      due_date: updates.dueDate || null,
      completed: updates.completed,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to update todo');
  }

  const updatedTodo = mapBackendTodo(data.todo);

  if (user?.id === userId) {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            personalTodos: (prev.personalTodos || []).map((todo) =>
              todo.id === todoId ? updatedTodo : todo
            ),
          }
        : null
    );
  }
};


const deletePersonalTodo = async (userId: string, todoId: string) => {
  const token = getToken();

  if (!token) return;

  const response = await fetch(`${API_URL}/auth/users/${userId}/todos/${todoId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete todo');
  }

  if (user?.id === userId) {
    setUser((prev) =>
      prev
        ? {
            ...prev,
            personalTodos: (prev.personalTodos || []).filter(
              (todo) => todo.id !== todoId
            ),
          }
        : null
    );
  }
};

  const updateUserPassword = async (_userId: string, _newPassword: string) => {
    throw new Error('Password update API is not configured yet.');
  };

  const updateUserProjectDetails = async (
    userId: string,
    projectDetails: {
      projectName: string;
      projectDescription: string;
      startDate: string;
      endDate: string;
    }
  ) => {
    if (user?.id === userId) {
      setUser((prev) =>
        prev
          ? {
              ...prev,
              projectName: projectDetails.projectName,
              projectDescription: projectDetails.projectDescription,
              projectStartDate: projectDetails.startDate,
              projectEndDate: projectDetails.endDate,
              projectSubmittedAt: new Date().toISOString(),
            }
          : null
      );
    }
  };

  const getAllUsers = () => users;

  const getSystemSettings = () => systemSettings;

  const updateSystemSettings = (settings: SystemSettings) => {
    setSystemSettings(settings);
    localStorage.setItem('shivohub_settings', JSON.stringify(settings));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        updateUserRole,
        deleteUser,
        getAllUsers,
        updateUserStrongAreas,
        addPersonalTodo,
        updatePersonalTodo,
        deletePersonalTodo,
        updateUserProfile,
        getSystemSettings,
        updateSystemSettings,
        updateUserPassword,
        updateUserProjectDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { AuthContext };