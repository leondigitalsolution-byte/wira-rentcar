
import { User } from '../types';
import { getStoredData, setStoredData } from './dataService';
import { supabase } from './supabaseClient';

const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    username: 'super',
    password: '123',
    name: 'Super Admin',
    email: 'super@WiraRentCar.com',
    phone: '081200000000',
    role: 'superadmin',
    image: 'https://i.pravatar.cc/150?u=super'
  },
  {
    id: 'u2',
    username: 'admin',
    password: '123',
    name: 'Staff Operasional',
    email: 'admin@WiraRentCar.com',
    phone: '081211111111',
    role: 'admin',
    image: 'https://i.pravatar.cc/150?u=admin'
  },
  {
    id: 'u3',
    username: 'driver',
    password: '123',
    name: 'Budi Santoso',
    email: 'budi@WiraRentCar.com',
    phone: '081234567890',
    role: 'driver',
    linkedDriverId: 'd1', // Link to dummy driver Budi
    image: 'https://i.pravatar.cc/150?u=d1'
  }
];

const initAuth = () => {
    const storedUsers = localStorage.getItem('users');
    
    if (!storedUsers) {
        setStoredData('users', INITIAL_USERS);
    } else {
        const users = JSON.parse(storedUsers) as User[];
        const superUser = users.find(u => u.username === 'super');
        const driverUser = users.find(u => u.username === 'driver');
        
        if (!superUser || superUser.role !== 'superadmin' || !driverUser) {
            const mergedUsers = [...INITIAL_USERS];
            users.forEach(u => {
                if (!mergedUsers.find(mu => mu.username === u.username)) {
                    mergedUsers.push(u);
                }
            });
            setStoredData('users', mergedUsers);
        }
    }
}

// Updated to Async to support future Supabase Auth integration
export const login = async (identifier: string, password: string): Promise<User | null> => {
  initAuth();
  
  // 1. Try Local Login (Offline First / Legacy)
  const users = getStoredData<User[]>('users', INITIAL_USERS);
  const user = users.find(u => 
    (u.username === identifier || u.email === identifier || u.phone === identifier) && 
    u.password === password
  );
  
  if (user) {
    const { password, ...userWithoutPassword } = user;
    localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
    return userWithoutPassword as User;
  }

  // 2. Future: Try Supabase Auth
  if (supabase) {
      const { data, error } = await supabase.auth.signInWithPassword({
          email: identifier,
          password: password
      });
      if (data.user && !error) {
          // Map Supabase user to App User type (simplified)
          const sbUser: User = {
              id: data.user.id,
              username: data.user.email?.split('@')[0] || 'user',
              name: data.user.user_metadata.full_name || 'User',
              email: data.user.email || '',
              role: data.user.user_metadata.role || 'admin',
              image: data.user.user_metadata.avatar_url
          };
          localStorage.setItem('currentUser', JSON.stringify(sbUser));
          return sbUser;
      }
  }

  return null;
};

export const logout = async () => {
  localStorage.removeItem('currentUser');
  if (supabase) await supabase.auth.signOut();
};

export const getCurrentUser = (): User | null => {
  const stored = localStorage.getItem('currentUser');
  return stored ? JSON.parse(stored) : null;
};

export const getUsers = (): User[] => {
    initAuth();
    return getStoredData<User[]>('users', []);
}

export const saveUser = (user: User) => {
    initAuth();
    const users = getStoredData<User[]>('users', []);
    const exists = users.find(u => u.id === user.id);
    let newUsers;
    if (exists) {
        newUsers = users.map(u => u.id === user.id ? user : u);
    } else {
        newUsers = [...users, user];
    }
    setStoredData('users', newUsers);
}

export const deleteUser = (id: string) => {
    initAuth();
    const users = getStoredData<User[]>('users', []);
    setStoredData('users', users.filter(u => u.id !== id));
}
